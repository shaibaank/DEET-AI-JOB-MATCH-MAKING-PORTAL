const RETELL_API_KEY = process.env.RETELL_API_KEY!
const RETELL_AGENT_ID = process.env.RETELL_AGENT_ID!
const RETELL_BASE_URL = 'https://api.retellai.com'

export interface RetellCallResponse {
  call_id: string
  agent_id: string
  call_status: string
  start_timestamp?: number
  end_timestamp?: number
  transcript?: string
  recording_url?: string
}

/**
 * Create a Retell phone call
 */
export async function createRetellCall(
  toNumber: string,
  dynamicVariables?: Record<string, string>
): Promise<RetellCallResponse> {
  const response = await fetch(`${RETELL_BASE_URL}/v2/create-phone-call`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RETELL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      agent_id: RETELL_AGENT_ID,
      to_number: toNumber,
      from_number: process.env.TWILIO_PHONE,
      retell_llm_dynamic_variables: dynamicVariables,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Retell API error: ${error}`)
  }

  return response.json()
}

/**
 * Create a Retell web call (for browser-based calling)
 */
export async function createRetellWebCall(
  dynamicVariables?: Record<string, string>
): Promise<{ access_token: string; call_id: string }> {
  const response = await fetch(`${RETELL_BASE_URL}/v2/create-web-call`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RETELL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      agent_id: RETELL_AGENT_ID,
      retell_llm_dynamic_variables: dynamicVariables,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Retell API error: ${error}`)
  }

  return response.json()
}

/**
 * Get call details
 */
export async function getRetellCall(callId: string): Promise<RetellCallResponse> {
  const response = await fetch(`${RETELL_BASE_URL}/v2/get-call/${callId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${RETELL_API_KEY}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Retell API error: ${error}`)
  }

  return response.json()
}

/**
 * List recent calls
 */
export async function listRetellCalls(limit = 10): Promise<RetellCallResponse[]> {
  const response = await fetch(`${RETELL_BASE_URL}/v2/list-calls?limit=${limit}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${RETELL_API_KEY}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Retell API error: ${error}`)
  }

  return response.json()
}
