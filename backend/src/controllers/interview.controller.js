// controllers/interview.controller.js
const Retell = require('retell-sdk')
const Call = require('../models/call.model')
const { generateQuestions } = require('../services/questionGenerator')
const { extractTextFromPDF } = require('../services/pdfParser')

const client = new Retell({
  apiKey: process.env.RETELL_API_KEY
})

const triggerCall = async (req, res) => {
  try {
    const { phoneNumber, candidateName, jobRole } = req.body

    if (!phoneNumber)  return res.status(400).json({ error: 'phoneNumber is required' })
    if (!jobRole)      return res.status(400).json({ error: 'jobRole is required' })
    if (!req.file)     return res.status(400).json({ error: 'resume PDF is required' })

    // 1. Parse PDF → text
    const resumeText = await extractTextFromPDF(req.file.buffer)

    // 2. Generate questions from resume + role
    const questions = await generateQuestions(jobRole, resumeText)

    // 3. Save to DB
    const callRecord = await Call.create({
      phoneNumber,
      candidateName: candidateName || 'Candidate',
      jobRole,
      resumeText,
      questions,
      status: 'initiated'
    })

    // 4. Trigger Retell call
    const call = await client.call.createPhoneCall({
      from_number: '+14642628169',
      to_number: `+91${phoneNumber}`,
      agent_id: 'agent_00311b58a3f3c5056643d7fcee',
      retell_llm_dynamic_variables: {
        candidate_name: candidateName || 'there',
        company: 'HireFlow',
        job_role: jobRole,
        question_1: questions[0],
        question_2: questions[1],
        question_3: questions[2],
        question_4: questions[3],
        question_5: questions[4],
      }
    })

    // 5. Update record with callId
    callRecord.callId = call.call_id
    callRecord.status = 'in_progress'
    await callRecord.save()

    res.status(200).json({
      success: true,
      callId: call.call_id,
      questions,
      message: `Call initiated to +91${phoneNumber}`
    })

  } catch (err) {
    console.error('Retell error:', err)
    res.status(500).json({ error: err.message })
  }
}

const handleWebhook = async (req, res) => {
  try {
    const { event, call } = req.body
    console.log('Webhook event:', event, '| Call ID:', call?.call_id)

    switch (event) {

      case 'call_started':
        await Call.findOneAndUpdate(
          { callId: call.call_id },
          { status: 'in_progress' }
        )
        break

      case 'call_ended':
        await Call.findOneAndUpdate(
          { callId: call.call_id },
          {
            status: 'completed',
            transcript: call.transcript || null,
            transcriptObject: call.transcript_object || [],
            duration: call.duration_ms
              ? Math.floor(call.duration_ms / 1000)
              : null,
            recordingUrl: call.recording_url || null,
          }
        )
        console.log('✅ Transcript saved:', call.call_id)
        break

      case 'call_analyzed':
        await Call.findOneAndUpdate(
          { callId: call.call_id },
          {
            status: 'completed',
            transcript: call.transcript || null,
            transcriptObject: call.transcript_object || [],
          }
        )
        break
    }

    res.status(200).json({ received: true })

  } catch (err) {
    console.error('Webhook error:', err)
    res.status(200).json({ received: true })
  }
}



const getCallStatus = async (req, res) => {
  try {
    const { callId } = req.params

    const callRecord = await Call.findOne({ callId })
    if (!callRecord) return res.status(404).json({ error: 'Call not found' })

    res.status(200).json({
      success: true,
      callId:          callRecord.callId,
      status:          callRecord.status,
      candidateName:   callRecord.candidateName,
      jobRole:         callRecord.jobRole,
      questions:       callRecord.questions,
      duration:        callRecord.duration,
      transcript:      callRecord.transcript,
      transcriptObject: callRecord.transcriptObject,
      recordingUrl:    callRecord.recordingUrl,
    })

  } catch (err) {
    console.error('getCallStatus error:', err)
    res.status(500).json({ error: err.message })
  }
}


const getAllCalls = async (req, res) => {
  try {
    const calls = await Call.find()
      .sort({ createdAt: -1 })
      .select('-resumeText') // exclude heavy field

    res.status(200).json({ success: true, calls })

  } catch (err) {
    console.error('getAllCalls error:', err)
    res.status(500).json({ error: err.message })
  }
}

module.exports = { triggerCall , handleWebhook, getCallStatus, getAllCalls }