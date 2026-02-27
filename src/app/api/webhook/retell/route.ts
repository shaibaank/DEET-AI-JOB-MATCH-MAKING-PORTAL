import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import { Screening, Jobseeker } from '@/lib/models'
import { scoreTranscript } from '@/lib/screening/questions'

// Retell webhook handler
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const body = await request.json()
    const { event, call } = body

    console.log('Retell webhook received:', event, call?.call_id)

    if (event === 'call_ended' || event === 'call_analyzed') {
      const screening = await Screening.findOne({ callId: call.call_id })
      
      if (screening && call.transcript) {
        const jobseeker = await Jobseeker.findById(screening.jobseekerId)
        
        if (jobseeker) {
          const scores = scoreTranscript(call.transcript, jobseeker, screening.questions)
          
          await Screening.findByIdAndUpdate(screening._id, {
            transcript: call.transcript,
            scores,
            feedback: scores.feedback,
            status: 'completed',
            duration: call.call_duration_ms ? Math.round(call.call_duration_ms / 1000) : 0,
          })

          console.log('Screening updated with transcript:', screening._id)
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
