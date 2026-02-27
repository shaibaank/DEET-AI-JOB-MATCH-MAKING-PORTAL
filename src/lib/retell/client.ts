import Retell from 'retell-sdk'

const RETELL_API_KEY = process.env.RETELL_API_KEY!
const RETELL_AGENT_ID = 'agent_00311b58a3f3c5056643d7fcee'
const TWILIO_PHONE = process.env.TWILIO_PHONE || '+14642628169'

// Singleton Retell SDK client
let _client: Retell | null = null
function getClient(): Retell {
  if (!_client) {
    _client = new Retell({ apiKey: RETELL_API_KEY })
  }
  return _client
}

/* ====================================================================
   TYPES
   ==================================================================== */

export interface RetellCallResponse {
  call_id: string
  agent_id: string
  call_status: string
  start_timestamp?: number
  end_timestamp?: number
  transcript?: string
  transcript_object?: Array<{ role: string; content: string }>
  recording_url?: string
  call_analysis?: Record<string, any>
  metadata?: Record<string, string>
}

export interface ScreeningDynamicVars {
  candidate_name: string
  company: string
  job_role: string
  question_1: string
  question_2: string
  question_3: string
  question_4: string
  question_5: string
  resume_summary?: string
  job_description?: string
}

export interface CreateCallOptions {
  toNumber: string
  dynamicVariables: ScreeningDynamicVars
  metadata?: Record<string, string>
}

/* ====================================================================
   CREATE PHONE CALL  (retell-sdk + dynamic variables)
   ==================================================================== */

export async function createRetellCall(
  options: CreateCallOptions
): Promise<RetellCallResponse> {
  const client = getClient()

  const call = await client.call.createPhoneCall({
    from_number: TWILIO_PHONE,
    to_number: options.toNumber,
    override_agent_id: RETELL_AGENT_ID,
    retell_llm_dynamic_variables: options.dynamicVariables as unknown as Record<string, unknown>,
    ...(options.metadata ? { metadata: options.metadata } : {}),
  })

  return {
    call_id: call.call_id,
    agent_id: call.agent_id,
    call_status: call.call_status,
    start_timestamp: call.start_timestamp,
    end_timestamp: call.end_timestamp,
    transcript: call.transcript,
    transcript_object: call.transcript_object as any,
    recording_url: call.recording_url,
    call_analysis: call.call_analysis as any,
    metadata: call.metadata as any,
  }
}

/* ====================================================================
   CREATE WEB CALL  (retell-sdk + dynamic variables)
   ==================================================================== */

export async function createRetellWebCall(
  options?: {
    dynamicVariables?: ScreeningDynamicVars
    metadata?: Record<string, string>
  }
): Promise<{ access_token: string; call_id: string }> {
  const client = getClient()

  const call = await client.call.createWebCall({
    agent_id: RETELL_AGENT_ID,
    ...(options?.dynamicVariables
      ? { retell_llm_dynamic_variables: options.dynamicVariables as unknown as Record<string, unknown> }
      : {}),
    ...(options?.metadata ? { metadata: options.metadata } : {}),
  })

  return {
    access_token: call.access_token,
    call_id: call.call_id,
  }
}

/* ====================================================================
   GET CALL DETAILS
   ==================================================================== */

export async function getRetellCall(callId: string): Promise<RetellCallResponse> {
  const client = getClient()
  const call = await client.call.retrieve(callId)

  return {
    call_id: call.call_id,
    agent_id: call.agent_id,
    call_status: call.call_status,
    start_timestamp: call.start_timestamp,
    end_timestamp: call.end_timestamp,
    transcript: call.transcript,
    transcript_object: call.transcript_object as any,
    recording_url: call.recording_url,
    call_analysis: call.call_analysis as any,
    metadata: call.metadata as any,
  }
}

/* ====================================================================
   LIST RECENT CALLS
   ==================================================================== */

export async function listRetellCalls(limit = 10): Promise<RetellCallResponse[]> {
  const client = getClient()
  const calls = await client.call.list({ limit })

  return (calls as any[]).map((c: any) => ({
    call_id: c.call_id,
    agent_id: c.agent_id,
    call_status: c.call_status,
    start_timestamp: c.start_timestamp,
    end_timestamp: c.end_timestamp,
    transcript: c.transcript,
    transcript_object: c.transcript_object,
    recording_url: c.recording_url,
    call_analysis: c.call_analysis,
    metadata: c.metadata,
  }))
}
