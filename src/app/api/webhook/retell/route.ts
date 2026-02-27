import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import { Screening, Jobseeker, Job } from '@/lib/models'
import { scoreTranscript, evaluateTranscript } from '@/lib/screening/questions'

// Retell webhook handler
export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const body = await request.json()
    const { event, call } = body

    console.log('Retell webhook received:', event, call?.call_id)

    // ─── call_ended  →  store transcript + quick score ───────────
    if (event === 'call_ended' && call?.transcript) {
      const screening = await Screening.findOne({ callId: call.call_id })
      if (!screening) {
        console.warn('No screening found for call_id:', call.call_id)
        return NextResponse.json({ received: true })
      }

      const jobseeker = await Jobseeker.findById(screening.jobseekerId)
      if (!jobseeker) {
        return NextResponse.json({ received: true })
      }

      const scores = scoreTranscript(call.transcript, jobseeker, screening.questions)

      await Screening.findByIdAndUpdate(screening._id, {
        transcript: call.transcript,
        transcriptObject: call.transcript_object || [],
        recordingUrl: call.recording_url || '',
        scores,
        feedback: scores.feedback,
        status: 'analyzing',
        duration: call.call_duration_ms
          ? Math.round(call.call_duration_ms / 1000)
          : call.duration_ms
            ? Math.round(call.duration_ms / 1000)
            : 0,
      })

      console.log('Screening transcript saved, starting AI evaluation:', screening._id)

      // Run deep AI evaluation
      let job = null
      if (screening.jobId) job = await Job.findById(screening.jobId)

      const aiEvaluation = await evaluateTranscript(
        call.transcript,
        jobseeker,
        screening.questions,
        job || undefined
      )

      const ds = aiEvaluation.detailedScores
      const aiOverall = Math.round(
        ds.technicalDepth * 0.30 +
        ds.communicationClarity * 0.25 +
        ds.problemSolving * 0.20 +
        ds.cultureFit * 0.15 +
        ds.confidence * 0.10
      )

      await Screening.findByIdAndUpdate(screening._id, {
        aiEvaluation,
        scores: { ...scores, overall: aiOverall },
        status: 'completed',
      })

      console.log('AI evaluation complete for screening:', screening._id)
    }

    // ─── call_analyzed  →  store Retell's own analysis ───────────
    if (event === 'call_analyzed' && call?.call_analysis) {
      const screening = await Screening.findOne({ callId: call.call_id })
      if (screening) {
        await Screening.findByIdAndUpdate(screening._id, {
          callAnalysis: call.call_analysis,
          recordingUrl: call.recording_url || screening.recordingUrl,
        })
        console.log('Retell call_analysis stored for screening:', screening._id)
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
