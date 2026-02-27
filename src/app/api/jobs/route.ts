import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import { Job, Jobseeker, Match } from '@/lib/models'
import { matchJobToCandidates } from '@/lib/matching/engine'

// GET - Fetch all jobs or single by ID
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const status = searchParams.get('status')

    if (id) {
      const job = await Job.findById(id)
      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 })
      }
      return NextResponse.json(job)
    }

    const query: any = {}
    if (status) query.status = status

    const jobs = await Job.find(query).sort({ createdAt: -1 })
    return NextResponse.json(jobs)
  } catch (error) {
    console.error('GET /api/jobs error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new job posting
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const body = await request.json()
    const job = await Job.create(body)

    // Auto-generate matches for existing jobseekers
    const jobseekers = await Jobseeker.find()
    if (jobseekers.length > 0) {
      const matches = matchJobToCandidates(job, jobseekers)
      
      for (const match of matches) {
        await Match.findOneAndUpdate(
          { jobseekerId: match.candidateId, jobId: job._id },
          {
            jobseekerId: match.candidateId,
            jobId: job._id,
            matchScore: match.matchScore,
            skillMatch: match.skillMatch,
            experienceMatch: match.experienceMatch,
            locationMatch: match.locationMatch,
            salaryMatch: match.salaryMatch,
            reasons: match.reasons,
            status: 'pending',
          },
          { upsert: true, new: true }
        )
      }
    }

    return NextResponse.json(job, { status: 201 })
  } catch (error) {
    console.error('POST /api/jobs error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update job
export async function PATCH(request: NextRequest) {
  try {
    await connectDB()
    
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 })
    }

    const job = await Job.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    )

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json(job)
  } catch (error) {
    console.error('PATCH /api/jobs error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
