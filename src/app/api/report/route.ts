import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import { Match, Job, Jobseeker, type IJob, type IJobseeker } from '@/lib/models'
import { matchJobToCandidates, getMatchingMetrics, type MatchResult } from '@/lib/matching/engine'
import { getAdaptationMetrics } from '@/lib/matching/adaptive'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await connectDB()
    
    const [jobs, jobseekers, matches] = await Promise.all([
      Job.find({}).lean(),
      Jobseeker.find({}).lean(),
      Match.find({}).lean(),
    ])

    // 1. Generate fresh matching metrics for all job-candidate pairs
    const allMatchResults: MatchResult[] = []
    for (const job of jobs) {
      const results = matchJobToCandidates(job as unknown as IJob, jobseekers as unknown as IJobseeker[])
      allMatchResults.push(...results)
    }

    const metrics = getMatchingMetrics(allMatchResults)

    // 2. Build feedback analysis from stored matches
    const statusCounts = { pending: 0, applied: 0, invited: 0, rejected: 0, saved: 0 }
    for (const m of matches) {
      const status = (m as any).status || 'pending'
      if (status in statusCounts) statusCounts[status as keyof typeof statusCounts]++
    }

    const totalFeedback = statusCounts.invited + statusCounts.rejected
    const precision = totalFeedback > 0 
      ? Math.round((statusCounts.invited / totalFeedback) * 100) 
      : null

    // 3. Score correlation with actions
    const invitedScores = matches
      .filter((m: any) => m.status === 'invited')
      .map((m: any) => m.matchScore || 0)
    const rejectedScores = matches
      .filter((m: any) => m.status === 'rejected')
      .map((m: any) => m.matchScore || 0)

    const avgInvitedScore = invitedScores.length > 0
      ? Math.round(invitedScores.reduce((s: number, v: number) => s + v, 0) / invitedScores.length)
      : null
    const avgRejectedScore = rejectedScores.length > 0
      ? Math.round(rejectedScores.reduce((s: number, v: number) => s + v, 0) / rejectedScores.length)
      : null

    // 4. Per-job analysis
    const jobAnalysis = jobs.map(job => {
      const jobId = (job as any)._id.toString()
      const jobMatches = allMatchResults.filter(m => m.jobId === jobId)
      const storedMatches = matches.filter((m: any) => m.jobId?.toString() === jobId)
      const adaptation = getAdaptationMetrics(jobId)
      
      return {
        jobId,
        title: (job as any).title,
        company: (job as any).company,
        totalCandidates: jobMatches.length,
        avgScore: jobMatches.length > 0 
          ? Math.round(jobMatches.reduce((s, m) => s + m.matchScore, 0) / jobMatches.length)
          : 0,
        topScore: jobMatches.length > 0 ? Math.max(...jobMatches.map(m => m.matchScore)) : 0,
        invited: storedMatches.filter((m: any) => m.status === 'invited').length,
        rejected: storedMatches.filter((m: any) => m.status === 'rejected').length,
        weights: adaptation.weights,
        isAdapted: adaptation.isAdapted,
        weightDeviation: adaptation.deviationFromDefault,
      }
    })

    // 5. Overall algorithm stats
    const algorithmStats = {
      totalMatches: allMatchResults.length,
      totalJobs: jobs.length,
      totalCandidates: jobseekers.length,
      storedMatches: matches.length,
      averageScore: metrics.averageScore,
      qualityIndex: metrics.qualityIndex,
      scoreDistribution: metrics.distribution,
      scoreHistogram: metrics.scoreHistogram,
      dimensionAverages: metrics.dimensionAverages,
      embeddingVsSemanticDelta: metrics.embeddingVsSemanticDelta,
      topSkillGaps: metrics.topSkillGaps,
      topReasons: metrics.topReasons,
    }

    // 6. Feedback analysis
    const feedbackAnalysis = {
      totalFeedback,
      statusCounts,
      precision,
      avgInvitedScore,
      avgRejectedScore,
      scoreSeparation: avgInvitedScore && avgRejectedScore 
        ? avgInvitedScore - avgRejectedScore 
        : null,
    }

    return NextResponse.json({
      algorithmStats,
      feedbackAnalysis,
      jobAnalysis,
      generatedAt: new Date().toISOString(),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
