import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import { Screening, Jobseeker, Job } from '@/lib/models'
import { generateScreeningQuestions, scoreTranscript, generateScreeningSummary } from '@/lib/screening/questions'
import { createRetellCall, createRetellWebCall, getRetellCall } from '@/lib/retell/client'

// GET - Fetch screenings
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const jobseekerId = searchParams.get('jobseekerId')
    const jobId = searchParams.get('jobId')
    const status = searchParams.get('status')

    if (id) {
      const screening = await Screening.findById(id)
      if (!screening) {
        return NextResponse.json({ error: 'Screening not found' }, { status: 404 })
      }
      return NextResponse.json(screening)
    }

    const query: any = {}
    if (jobseekerId) query.jobseekerId = jobseekerId
    if (jobId) query.jobId = jobId
    if (status) query.status = status

    const screenings = await Screening.find(query).sort({ createdAt: -1 })
    return NextResponse.json(screenings)
  } catch (error) {
    console.error('GET /api/screenings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Start a new screening call
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const body = await request.json()
    const { jobseekerId, jobId, mode = 'phone' } = body

    const jobseeker = await Jobseeker.findById(jobseekerId)
    if (!jobseeker) {
      return NextResponse.json({ error: 'Jobseeker not found' }, { status: 404 })
    }

    let job = null
    if (jobId) {
      job = await Job.findById(jobId)
    }

    // Generate questions
    const questions = generateScreeningQuestions(jobseeker, job || undefined)

    // Create screening record
    const screening = await Screening.create({
      jobseekerId,
      jobId,
      questions,
      status: 'pending',
    })

    // Prepare dynamic variables for Retell
    const dynamicVariables = {
      candidate_name: jobseeker.name,
      questions: questions.join('\n'),
      job_title: job?.title || 'this position',
      company: job?.company || 'the company',
    }

    try {
      if (mode === 'web') {
        // Create web call for browser-based screening
        const webCall = await createRetellWebCall(dynamicVariables)
        
        await Screening.findByIdAndUpdate(screening._id, {
          callId: webCall.call_id,
          status: 'in-progress',
        })

        return NextResponse.json({
          screening,
          call: webCall,
          questions,
          mode: 'web',
        })
      } else {
        // Create phone call
        const phoneNumber = jobseeker.phone || process.env.USER_PHONE!
        const call = await createRetellCall(phoneNumber, dynamicVariables)
        
        await Screening.findByIdAndUpdate(screening._id, {
          callId: call.call_id,
          status: 'in-progress',
        })

        return NextResponse.json({
          screening,
          call,
          questions,
          mode: 'phone',
        })
      }
    } catch (retellError) {
      console.error('Retell API error:', retellError)
      // Return screening without call for demo fallback
      return NextResponse.json({
        screening,
        questions,
        mode: 'demo',
        message: 'Call not initiated - using demo mode',
      })
    }
  } catch (error) {
    console.error('POST /api/screenings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update screening (with transcript, scores, etc.)
export async function PATCH(request: NextRequest) {
  try {
    await connectDB()
    
    const body = await request.json()
    const { id, transcript, selfEvaluation, action } = body

    const screening = await Screening.findById(id)
    if (!screening) {
      return NextResponse.json({ error: 'Screening not found' }, { status: 404 })
    }

    // If transcript provided, score it
    if (transcript) {
      const jobseeker = await Jobseeker.findById(screening.jobseekerId)
      if (jobseeker) {
        const scores = scoreTranscript(transcript, jobseeker, screening.questions)
        
        await Screening.findByIdAndUpdate(id, {
          transcript,
          scores,
          feedback: scores.feedback,
          status: 'completed',
        })

        const updated = await Screening.findById(id)
        return NextResponse.json({
          screening: updated,
          summary: generateScreeningSummary(scores, jobseeker.name),
        })
      }
    }

    // Update self-evaluation
    if (selfEvaluation) {
      await Screening.findByIdAndUpdate(id, {
        selfEvaluation,
      })
    }

    // Check call status action
    if (action === 'check-status' && screening.callId) {
      try {
        const callDetails = await getRetellCall(screening.callId)
        
        if (callDetails.transcript) {
          const jobseeker = await Jobseeker.findById(screening.jobseekerId)
          if (jobseeker) {
            const scores = scoreTranscript(callDetails.transcript, jobseeker, screening.questions)
            
            await Screening.findByIdAndUpdate(id, {
              transcript: callDetails.transcript,
              scores,
              feedback: scores.feedback,
              status: 'completed',
              duration: callDetails.end_timestamp && callDetails.start_timestamp
                ? Math.round((callDetails.end_timestamp - callDetails.start_timestamp) / 1000)
                : 0,
            })
          }
        }

        return NextResponse.json({
          callStatus: callDetails.call_status,
          hasTranscript: !!callDetails.transcript,
        })
      } catch (retellError) {
        console.error('Retell status check error:', retellError)
      }
    }

    const updated = await Screening.findById(id)
    return NextResponse.json(updated)
  } catch (error) {
    console.error('PATCH /api/screenings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
