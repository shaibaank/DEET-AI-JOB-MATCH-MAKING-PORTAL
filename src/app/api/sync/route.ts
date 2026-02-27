import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import { Jobseeker, Job, Match, Screening } from '@/lib/models'
import { getMatchingMetrics } from '@/lib/matching/engine'

// GET - Sync endpoint for real-time polling
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const since = searchParams.get('since')
    const jobseekerId = searchParams.get('jobseekerId')
    const employerId = searchParams.get('employerId')

    const sinceDate = since ? new Date(parseInt(since)) : new Date(Date.now() - 5000)

    // Fetch recent updates
    const [
      recentJobseekers,
      recentJobs,
      recentMatches,
      recentScreenings,
    ] = await Promise.all([
      Jobseeker.find({ updatedAt: { $gte: sinceDate } }),
      Job.find({ updatedAt: { $gte: sinceDate } }),
      Match.find({ updatedAt: { $gte: sinceDate } }),
      Screening.find({ updatedAt: { $gte: sinceDate } }),
    ])

    // Get aggregate stats
    const [
      totalJobseekers,
      totalJobs,
      totalMatches,
      completedScreenings,
    ] = await Promise.all([
      Jobseeker.countDocuments(),
      Job.countDocuments({ status: 'active' }),
      Match.countDocuments(),
      Screening.countDocuments({ status: 'completed' }),
    ])

    // Get match statistics
    const allMatches = await Match.find()
    const matchMetrics = getMatchingMetrics(
      allMatches.map(m => ({
        jobId: m.jobId,
        jobTitle: '',
        company: '',
        matchScore: m.matchScore,
        skillMatch: m.skillMatch,
        experienceMatch: m.experienceMatch,
        locationMatch: m.locationMatch,
        salaryMatch: m.salaryMatch,
        reasons: m.reasons,
        matchedSkills: [],
        missingSkills: [],
      }))
    )

    // Top candidates (for employer view)
    const topCandidates = await Match.find({ matchScore: { $gte: 70 } })
      .sort({ matchScore: -1 })
      .limit(5)
      .lean()

    // Enrich top candidates
    const enrichedTopCandidates = await Promise.all(
      topCandidates.map(async (match) => {
        const [jobseeker, job, screening] = await Promise.all([
          Jobseeker.findById(match.jobseekerId),
          Job.findById(match.jobId),
          Screening.findOne({ jobseekerId: match.jobseekerId }).sort({ createdAt: -1 }),
        ])

        return {
          ...match,
          candidateName: jobseeker?.name || 'Unknown',
          candidateLocation: jobseeker?.location || '',
          candidateSkills: jobseeker?.skills?.slice(0, 3) || [],
          jobTitle: job?.title || '',
          company: job?.company || '',
          screeningScore: screening?.scores?.overall || null,
          screeningStatus: screening?.status || null,
        }
      })
    )

    return NextResponse.json({
      timestamp: Date.now(),
      updates: {
        jobseekers: recentJobseekers,
        jobs: recentJobs,
        matches: recentMatches,
        screenings: recentScreenings,
      },
      stats: {
        totalJobseekers,
        totalJobs,
        totalMatches,
        completedScreenings,
        ...matchMetrics,
      },
      topCandidates: enrichedTopCandidates,
    })
  } catch (error) {
    console.error('GET /api/sync error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
