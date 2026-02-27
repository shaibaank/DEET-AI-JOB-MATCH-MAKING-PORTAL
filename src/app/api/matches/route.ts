import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import { Match, Jobseeker, Job, Screening } from '@/lib/models'
import { matchJobseekerToJobs, matchJobToCandidates, getMatchingMetrics } from '@/lib/matching/engine'

// GET - Fetch matches with optional filtering
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const jobseekerId = searchParams.get('jobseekerId')
    const jobId = searchParams.get('jobId')
    const minScore = searchParams.get('minScore')
    const status = searchParams.get('status')
    const includeDetails = searchParams.get('includeDetails') === 'true'

    const query: any = {}
    if (jobseekerId) query.jobseekerId = jobseekerId
    if (jobId) query.jobId = jobId
    if (minScore) query.matchScore = { $gte: parseInt(minScore) }
    if (status) query.status = status

    const matches = await Match.find(query).sort({ matchScore: -1 })

    // If includeDetails, fetch related data
    if (includeDetails) {
      const enrichedMatches = await Promise.all(
        matches.map(async (match) => {
          const [jobseeker, job, screening] = await Promise.all([
            Jobseeker.findById(match.jobseekerId),
            Job.findById(match.jobId),
            Screening.findOne({ jobseekerId: match.jobseekerId, jobId: match.jobId })
              .sort({ createdAt: -1 }),
          ])

          return {
            ...match.toObject(),
            jobseeker: jobseeker ? {
              name: jobseeker.name,
              email: jobseeker.email,
              location: jobseeker.location,
              skills: jobseeker.skills.slice(0, 5),
            } : null,
            job: job ? {
              title: job.title,
              company: job.company,
              location: job.location,
            } : null,
            latestScreening: screening ? {
              score: screening.scores.overall,
              status: screening.status,
              createdAt: screening.createdAt,
            } : null,
          }
        })
      )

      return NextResponse.json(enrichedMatches)
    }

    return NextResponse.json(matches)
  } catch (error) {
    console.error('GET /api/matches error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Recalculate matches
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const body = await request.json()
    const { jobseekerId, jobId, action } = body

    if (action === 'recalculate-all') {
      // Recalculate all matches
      const jobseekers = await Jobseeker.find()
      const jobs = await Job.find({ status: 'active' })
      
      let totalMatches = 0
      for (const jobseeker of jobseekers) {
        const matches = matchJobseekerToJobs(jobseeker, jobs)
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
            },
            { upsert: true }
          )
          totalMatches++
        }
      }

      return NextResponse.json({ 
        success: true, 
        matchesUpdated: totalMatches 
      })
    }

    if (jobseekerId) {
      // Recalculate for specific jobseeker
      const jobseeker = await Jobseeker.findById(jobseekerId)
      if (!jobseeker) {
        return NextResponse.json({ error: 'Jobseeker not found' }, { status: 404 })
      }

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

      return NextResponse.json({ success: true, matches })
    }

    if (jobId) {
      // Recalculate for specific job
      const job = await Job.findById(jobId)
      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 })
      }

      const jobseekers = await Jobseeker.find()
      const matches = matchJobToCandidates(job, jobseekers)
      
      for (const match of matches) {
        await Match.findOneAndUpdate(
          { jobseekerId: match.candidateId, jobId: job._id },
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

      return NextResponse.json({ success: true, matches })
    }

    return NextResponse.json({ error: 'jobseekerId or jobId required' }, { status: 400 })
  } catch (error) {
    console.error('POST /api/matches error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update match status (apply, save, invite, reject)
export async function PATCH(request: NextRequest) {
  try {
    await connectDB()
    
    const body = await request.json()
    const { id, jobseekerId, jobId, status, employerNotes } = body

    const query = id 
      ? { _id: id }
      : { jobseekerId, jobId }

    const updates: any = {}
    if (status) updates.status = status
    if (employerNotes !== undefined) updates.employerNotes = employerNotes

    const match = await Match.findOneAndUpdate(
      query,
      { $set: updates },
      { new: true }
    )

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    return NextResponse.json(match)
  } catch (error) {
    console.error('PATCH /api/matches error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
