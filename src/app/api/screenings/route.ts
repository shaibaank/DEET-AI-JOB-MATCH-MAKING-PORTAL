import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import { Screening, Jobseeker, Job } from '@/lib/models'
import {
  generateAIScreeningQuestions,
  generateScreeningQuestions,
  buildRetellDynamicVars,
  scoreTranscript,
  evaluateTranscript,
  generateScreeningSummary,
} from '@/lib/screening/questions'
import { createRetellCall, createRetellWebCall, getRetellCall } from '@/lib/retell/client'

// GET - Fetch screenings (with optional AI evaluation data)
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
    const { jobseekerId, jobId, phoneNumber, mode = 'phone' } = body

    const jobseeker = await Jobseeker.findById(jobseekerId)
    if (!jobseeker) {
      return NextResponse.json({ error: 'Jobseeker not found' }, { status: 404 })
    }

    let job = null
    if (jobId) {
      job = await Job.findById(jobId)
    }

    // Get stored resume text for resume-aware question generation
    const resumeText = jobseeker.resumeText || ''

    // Generate AI-powered questions (falls back to template if OpenRouter fails)
    let questions: string[]
    try {
      const aiResult = await generateAIScreeningQuestions(jobseeker, job || undefined, resumeText)
      questions = aiResult.questions
    } catch {
      questions = generateScreeningQuestions(jobseeker, job || undefined)
    }

    // Build dynamic variables for Retell LLM (replaces full prompt injection)
    const dynamicVariables = buildRetellDynamicVars(
      jobseeker,
      questions,
      job || undefined,
      resumeText
    )

    // Determine the phone number to call
    const callNumber = phoneNumber || jobseeker.phone || process.env.USER_PHONE!

    // Create screening record with resume context
    const screening = await Screening.create({
      jobseekerId,
      jobId,
      phoneNumber: callNumber,
      questions,
      resumeText: resumeText.slice(0, 2000), // snapshot for evaluation context
      jobRole: job?.title || '',
      status: 'pending',
    })

    const metadata = {
      screening_id: screening._id.toString(),
      jobseeker_id: jobseekerId,
      job_id: jobId || '',
    }

    try {
      if (mode === 'web') {
        const webCall = await createRetellWebCall({
          dynamicVariables: dynamicVariables as any,
          metadata,
        })

        await Screening.findByIdAndUpdate(screening._id, {
          callId: webCall.call_id,
          status: 'in-progress',
        })

        return NextResponse.json({
          screening: { ...screening.toObject(), callId: webCall.call_id, status: 'in-progress' },
          call: webCall,
          questions,
          mode: 'web',
        })
      } else {
        // Phone call — uses retell-sdk with dynamic variables
        const call = await createRetellCall({
          toNumber: callNumber,
          dynamicVariables: dynamicVariables as any,
          metadata,
        })

        await Screening.findByIdAndUpdate(screening._id, {
          callId: call.call_id,
          status: 'in-progress',
        })

        return NextResponse.json({
          screening: { ...screening.toObject(), callId: call.call_id, status: 'in-progress' },
          call,
          questions,
          mode: 'phone',
        })
      }
    } catch (retellError: any) {
      console.error('Retell API error:', retellError?.message || retellError)
      // Return screening without call for demo fallback
      return NextResponse.json({
        screening,
        questions,
        mode: 'demo',
        message: 'Call not initiated – using demo mode',
      })
    }
  } catch (error) {
    console.error('POST /api/screenings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update screening (transcript, scores, evaluation, status check)
export async function PATCH(request: NextRequest) {
  try {
    await connectDB()

    const body = await request.json()
    const { id, transcript, selfEvaluation, action } = body

    const screening = await Screening.findById(id)
    if (!screening) {
      return NextResponse.json({ error: 'Screening not found' }, { status: 404 })
    }

    // ─── Transcript submitted (demo mode or manual) ──────────────
    if (transcript) {
      const jobseeker = await Jobseeker.findById(screening.jobseekerId)
      if (!jobseeker) {
        return NextResponse.json({ error: 'Jobseeker not found' }, { status: 404 })
      }

      // Quick keyword scores first
      const scores = scoreTranscript(transcript, jobseeker, screening.questions)

      // Mark as analyzing while AI evaluation runs
      await Screening.findByIdAndUpdate(id, {
        transcript,
        scores,
        feedback: scores.feedback,
        status: 'analyzing',
      })

      // Run deep AI evaluation (async-safe – awaited here)
      let job = null
      if (screening.jobId) {
        job = await Job.findById(screening.jobId)
      }

      const aiEvaluation = await evaluateTranscript(
        transcript,
        jobseeker,
        screening.questions,
        job || undefined
      )

      // Compute blended overall from AI detailed scores
      const ds = aiEvaluation.detailedScores
      const aiOverall = Math.round(
        ds.technicalDepth * 0.30 +
        ds.communicationClarity * 0.25 +
        ds.problemSolving * 0.20 +
        ds.cultureFit * 0.15 +
        ds.confidence * 0.10
      )

      await Screening.findByIdAndUpdate(id, {
        aiEvaluation,
        scores: { ...scores, overall: aiOverall },
        status: 'completed',
      })

      const updated = await Screening.findById(id)
      return NextResponse.json({
        screening: updated,
        summary: generateScreeningSummary({ ...scores, overall: aiOverall }, jobseeker.name),
      })
    }

    // ─── Self-evaluation update ──────────────────────────────────
    if (selfEvaluation) {
      await Screening.findByIdAndUpdate(id, { selfEvaluation })
    }

    // ─── Check Retell call status ────────────────────────────────
    if (action === 'check-status' && screening.callId) {
      try {
        const callDetails = await getRetellCall(screening.callId)

        if (callDetails.transcript && screening.status !== 'completed') {
          const jobseeker = await Jobseeker.findById(screening.jobseekerId)
          if (jobseeker) {
            const scores = scoreTranscript(callDetails.transcript, jobseeker, screening.questions)

            await Screening.findByIdAndUpdate(id, {
              transcript: callDetails.transcript,
              transcriptObject: callDetails.transcript_object || [],
              recordingUrl: callDetails.recording_url,
              scores,
              feedback: scores.feedback,
              status: 'analyzing',
              duration: callDetails.end_timestamp && callDetails.start_timestamp
                ? Math.round((callDetails.end_timestamp - callDetails.start_timestamp) / 1000)
                : 0,
            })

            // Trigger async AI evaluation
            let job = null
            if (screening.jobId) job = await Job.findById(screening.jobId)

            const aiEvaluation = await evaluateTranscript(
              callDetails.transcript,
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

            await Screening.findByIdAndUpdate(id, {
              aiEvaluation,
              scores: { ...scores, overall: aiOverall },
              status: 'completed',
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
