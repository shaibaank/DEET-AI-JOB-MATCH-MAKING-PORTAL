import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import { Jobseeker, Job, Match } from '@/lib/models'
import { matchJobseekerToJobs } from '@/lib/matching/engine'
import { parseResumeText, calculateProfileCompletion } from '@/lib/resume/parser'

// GET - Fetch all jobseekers or single by ID
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (id) {
      const jobseeker = await Jobseeker.findById(id)
      if (!jobseeker) {
        return NextResponse.json({ error: 'Jobseeker not found' }, { status: 404 })
      }
      return NextResponse.json(jobseeker)
    }

    const jobseekers = await Jobseeker.find().sort({ createdAt: -1 })
    return NextResponse.json(jobseekers)
  } catch (error) {
    console.error('GET /api/jobseekers error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new jobseeker from resume
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const body = await request.json()
    const { resumeText, ...directData } = body

    let profileData = directData

    // If resume text provided, parse it
    if (resumeText) {
      const parsed = await parseResumeText(resumeText)
      profileData = {
        ...parsed,
        ...directData, // Allow overrides
        resumeText,
        profileComplete: calculateProfileCompletion(parsed),
      }
    }

    const jobseeker = await Jobseeker.create(profileData)

    // Auto-generate matches for this jobseeker
    const jobs = await Job.find({ status: 'active' })
    if (jobs.length > 0) {
      const matches = matchJobseekerToJobs(jobseeker, jobs)
      
      // Save matches to database
      for (const match of matches) {
        await Match.findOneAndUpdate(
          { jobseekerId: jobseeker._id, jobId: match.jobId },
          {
            jobseekerId: jobseeker._id,
            jobId: match.jobId,
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

    return NextResponse.json(jobseeker, { status: 201 })
  } catch (error) {
    console.error('POST /api/jobseekers error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update jobseeker
export async function PATCH(request: NextRequest) {
  try {
    await connectDB()
    
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 })
    }

    const jobseeker = await Jobseeker.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    )

    if (!jobseeker) {
      return NextResponse.json({ error: 'Jobseeker not found' }, { status: 404 })
    }

    // Recalculate matches if skills or experience changed
    if (updates.skills || updates.experience || updates.location || updates.salaryExpectation) {
      const jobs = await Job.find({ status: 'active' })
      const matches = matchJobseekerToJobs(jobseeker, jobs)
      
      for (const match of matches) {
        await Match.findOneAndUpdate(
          { jobseekerId: jobseeker._id, jobId: match.jobId },
          {
            matchScore: match.matchScore,
            skillMatch: match.skillMatch,
            experienceMatch: match.experienceMatch,
            locationMatch: match.locationMatch,
            salaryMatch: match.salaryMatch,
            reasons: match.reasons,
          },
          { upsert: true }
        )
      }
    }

    return NextResponse.json(jobseeker)
  } catch (error) {
    console.error('PATCH /api/jobseekers error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
