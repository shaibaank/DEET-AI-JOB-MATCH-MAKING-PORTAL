import { IJobseeker } from '../models/Jobseeker'
import { IJob } from '../models/Job'
import { 
  calculateSemanticSkillMatch, 
  calculateSemanticLocationMatch,
  generateAIMatchReasons 
} from './semantic'
import { embeddingSkillMatch, recommendSkillGaps } from './embeddings'
import { getWeightsForJob, type WeightProfile } from './adaptive'

export interface MatchResult {
  jobId: string
  jobTitle: string
  company: string
  matchScore: number
  skillMatch: number
  experienceMatch: number
  locationMatch: number
  salaryMatch: number
  reasons: string[]
  matchedSkills: string[]
  missingSkills: string[]
  semanticInsights?: string[]
  embeddingScore?: number
  embeddingInsights?: string[]
  skillGaps?: { skill: string; relevance: number; reason: string }[]
  weightsUsed?: WeightProfile
}

// Default weights (used as fallback)
const WEIGHTS = {
  skills: 0.45,
  experience: 0.20,
  location: 0.15,
  salary: 0.20,
}

/**
 * Calculate skill match score using semantic matching
 * Uses skill graph and fuzzy matching for related skills
 */
function calculateSkillMatch(
  candidateSkills: string[],
  requiredSkills: string[],
  preferredSkills: string[] = []
): { score: number; matched: string[]; missing: string[]; semanticInsights: string[] } {
  // Use semantic matching
  const result = calculateSemanticSkillMatch(candidateSkills, requiredSkills, preferredSkills)
  
  return {
    score: result.score,
    matched: result.matched.map(m => m.job),
    missing: result.missing,
    semanticInsights: result.semanticInsights,
  }
}

/**
 * Calculate experience match score
 */
function calculateExperienceMatch(
  candidateExperience: IJobseeker['experience'],
  requiredYears: { min: number; max: number },
  requiredLevel: string
): number {
  // Estimate candidate years from experience entries
  let totalYears = 0
  for (const exp of candidateExperience) {
    const durationMatch = exp.duration?.match(/(\d+)/g)
    if (durationMatch) {
      totalYears += parseInt(durationMatch[0]) || 1
    } else {
      totalYears += 1 // Assume 1 year if not specified
    }
  }

  // Check if within range
  if (totalYears >= requiredYears.min && totalYears <= requiredYears.max) {
    return 100
  } else if (totalYears < requiredYears.min) {
    // Under-qualified penalty
    const diff = requiredYears.min - totalYears
    return Math.max(0, 100 - (diff * 15))
  } else {
    // Over-qualified (slight penalty)
    const diff = totalYears - requiredYears.max
    return Math.max(70, 100 - (diff * 5))
  }
}

/**
 * Calculate location match score using semantic matching
 */
function calculateLocationMatch(
  candidateLocation: string,
  jobLocation: string,
  isRemote: boolean
): number {
  const result = calculateSemanticLocationMatch(candidateLocation, jobLocation, isRemote)
  return result.score
}

/**
 * Calculate salary compatibility score
 */
function calculateSalaryMatch(
  candidateExpectation: IJobseeker['salaryExpectation'],
  jobSalary: IJob['salaryRange']
): number {
  if (!candidateExpectation?.min || !jobSalary?.min) {
    return 75 // Unknown, give decent score
  }

  const candMin = candidateExpectation.min
  const candMax = candidateExpectation.max || candMin * 1.3
  const jobMin = jobSalary.min
  const jobMax = jobSalary.max || jobMin * 1.3

  // Perfect overlap
  if (candMin >= jobMin && candMax <= jobMax) {
    return 100
  }

  // Partial overlap
  const overlapMin = Math.max(candMin, jobMin)
  const overlapMax = Math.min(candMax, jobMax)

  if (overlapMin <= overlapMax) {
    const overlapRange = overlapMax - overlapMin
    const totalRange = Math.max(candMax, jobMax) - Math.min(candMin, jobMin)
    return Math.round((overlapRange / totalRange) * 100)
  }

  // No overlap - penalize based on gap
  const gap = candMin > jobMax ? candMin - jobMax : jobMin - candMax
  const avgSalary = (candMin + jobMax) / 2
  const gapPercent = gap / avgSalary

  return Math.max(0, Math.round(100 - (gapPercent * 200)))
}

/**
 * Generate human-readable match reasons
 */
function generateReasons(
  skillMatch: number,
  experienceMatch: number,
  locationMatch: number,
  salaryMatch: number,
  matchedSkills: string[],
  missingSkills: string[]
): string[] {
  const reasons: string[] = []

  if (skillMatch >= 80) {
    reasons.push(`Strong skill match: ${matchedSkills.slice(0, 3).join(', ')}`)
  } else if (skillMatch >= 50) {
    reasons.push(`Partial skill match: ${matchedSkills.slice(0, 2).join(', ')}`)
  }

  if (missingSkills.length > 0 && missingSkills.length <= 2) {
    reasons.push(`Could improve: ${missingSkills.join(', ')}`)
  }

  if (experienceMatch >= 90) {
    reasons.push('Experience level matches well')
  } else if (experienceMatch < 60) {
    reasons.push('May need more experience')
  }

  if (locationMatch >= 90) {
    reasons.push('Location compatible')
  } else if (locationMatch < 50) {
    reasons.push('May require relocation')
  }

  if (salaryMatch >= 80) {
    reasons.push('Salary expectations align')
  } else if (salaryMatch < 50) {
    reasons.push('Salary gap may need discussion')
  }

  return reasons
}

/**
 * Main matching engine function
 * Matches a jobseeker against multiple jobs using hybrid approach:
 * - Semantic skill graph + embedding vectors for skill matching
 * - Adaptive weights learned from employer feedback
 */
export function matchJobseekerToJobs(
  jobseeker: IJobseeker,
  jobs: IJob[],
  jobId?: string // optional: use adaptive weights for specific job
): MatchResult[] {
  const results: MatchResult[] = []

  for (const job of jobs) {
    // Use adaptive weights if available
    const weights = getWeightsForJob(jobId || job._id?.toString())

    // Calculate individual scores
    const skillResult = calculateSkillMatch(
      jobseeker.skills,
      job.requiredSkills,
      job.preferredSkills
    )

    // Embedding-based skill match (hybrid approach)
    const embResult = embeddingSkillMatch(
      jobseeker.skills,
      [...job.requiredSkills, ...job.preferredSkills]
    )

    // Blend semantic + embedding scores (70% semantic, 30% embedding)
    const blendedSkillScore = Math.round(skillResult.score * 0.7 + embResult.score * 0.3)

    const experienceScore = calculateExperienceMatch(
      jobseeker.experience,
      job.experienceYears,
      job.experienceLevel
    )

    const locationScore = calculateLocationMatch(
      jobseeker.location,
      job.location,
      job.remote
    )

    const salaryScore = calculateSalaryMatch(
      jobseeker.salaryExpectation,
      job.salaryRange
    )

    // Calculate weighted overall score with adaptive weights
    const overallScore = Math.round(
      blendedSkillScore * weights.skills +
      experienceScore * weights.experience +
      locationScore * weights.location +
      salaryScore * weights.salary
    )

    // Generate reasons (include semantic + embedding insights)
    const reasons = generateReasons(
      blendedSkillScore,
      experienceScore,
      locationScore,
      salaryScore,
      skillResult.matched,
      skillResult.missing
    )
    
    // Add semantic and embedding insights
    const allReasons = [
      ...reasons, 
      ...skillResult.semanticInsights.slice(0, 2),
      ...embResult.embeddingInsights.slice(0, 2)
    ]

    // Compute skill gaps for upskilling recommendations
    const skillGaps = recommendSkillGaps(
      jobseeker.skills,
      job.requiredSkills
    ).slice(0, 5)

    results.push({
      jobId: job._id.toString(),
      jobTitle: job.title,
      company: job.company,
      matchScore: overallScore,
      skillMatch: blendedSkillScore,
      experienceMatch: Math.round(experienceScore),
      locationMatch: Math.round(locationScore),
      salaryMatch: Math.round(salaryScore),
      reasons: allReasons,
      matchedSkills: skillResult.matched,
      missingSkills: skillResult.missing,
      semanticInsights: skillResult.semanticInsights,
      embeddingScore: embResult.score,
      embeddingInsights: embResult.embeddingInsights,
      skillGaps,
      weightsUsed: weights,
    })
  }

  // Sort by match score (descending)
  return results.sort((a, b) => b.matchScore - a.matchScore)
}

/**
 * Match a job against multiple jobseekers (for employer view)
 * Returns ranked candidates
 */
export function matchJobToCandidates(
  job: IJob,
  jobseekers: IJobseeker[]
): (MatchResult & { candidateId: string; candidateName: string })[] {
  return jobseekers.map(jobseeker => {
    const match = matchJobseekerToJobs(jobseeker, [job])[0]
    return {
      ...match,
      candidateId: jobseeker._id.toString(),
      candidateName: jobseeker.name,
    }
  }).sort((a, b) => b.matchScore - a.matchScore)
}

/**
 * Get algorithm performance metrics (comprehensive)
 */
export function getMatchingMetrics(matches: MatchResult[]): {
  averageScore: number
  distribution: { excellent: number; good: number; fair: number; poor: number }
  topReasons: string[]
  dimensionAverages: { skills: number; experience: number; location: number; salary: number }
  scoreHistogram: number[]
  embeddingVsSemanticDelta: number
  topSkillGaps: { skill: string; count: number }[]
  qualityIndex: number
} {
  const total = matches.length
  if (total === 0) {
    return {
      averageScore: 0,
      distribution: { excellent: 0, good: 0, fair: 0, poor: 0 },
      topReasons: [],
      dimensionAverages: { skills: 0, experience: 0, location: 0, salary: 0 },
      scoreHistogram: Array(10).fill(0),
      embeddingVsSemanticDelta: 0,
      topSkillGaps: [],
      qualityIndex: 0,
    }
  }

  const avgScore = matches.reduce((sum, m) => sum + m.matchScore, 0) / total
  
  const distribution = {
    excellent: matches.filter(m => m.matchScore >= 85).length,
    good: matches.filter(m => m.matchScore >= 70 && m.matchScore < 85).length,
    fair: matches.filter(m => m.matchScore >= 50 && m.matchScore < 70).length,
    poor: matches.filter(m => m.matchScore < 50).length,
  }

  // Dimension averages
  const dimensionAverages = {
    skills: Math.round(matches.reduce((s, m) => s + m.skillMatch, 0) / total),
    experience: Math.round(matches.reduce((s, m) => s + m.experienceMatch, 0) / total),
    location: Math.round(matches.reduce((s, m) => s + m.locationMatch, 0) / total),
    salary: Math.round(matches.reduce((s, m) => s + m.salaryMatch, 0) / total),
  }

  // Score histogram (10 buckets: 0-9, 10-19, ..., 90-100)
  const scoreHistogram = Array(10).fill(0)
  for (const m of matches) {
    const bucket = Math.min(9, Math.floor(m.matchScore / 10))
    scoreHistogram[bucket]++
  }

  // Embedding vs semantic delta
  const embeddingScores = matches.filter(m => m.embeddingScore !== undefined)
  const embeddingVsSemanticDelta = embeddingScores.length > 0
    ? Math.round(
        embeddingScores.reduce((s, m) => s + ((m.embeddingScore || 0) - m.skillMatch), 0) / embeddingScores.length
      )
    : 0

  // Top skill gaps across all matches
  const gapCounts: Record<string, number> = {}
  for (const m of matches) {
    for (const skill of m.missingSkills) {
      gapCounts[skill] = (gapCounts[skill] || 0) + 1
    }
  }
  const topSkillGaps = Object.entries(gapCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([skill, count]) => ({ skill, count }))

  // Quality index: weighted score of distribution
  const qualityIndex = Math.round(
    (distribution.excellent * 100 + distribution.good * 75 + distribution.fair * 50 + distribution.poor * 25) / total
  )

  // Aggregate top reasons
  const reasonCounts: Record<string, number> = {}
  for (const match of matches) {
    for (const reason of match.reasons) {
      const key = reason.split(':')[0]
      reasonCounts[key] = (reasonCounts[key] || 0) + 1
    }
  }

  const topReasons = Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([reason]) => reason)

  return {
    averageScore: Math.round(avgScore),
    distribution,
    topReasons,
    dimensionAverages,
    scoreHistogram,
    embeddingVsSemanticDelta,
    topSkillGaps,
    qualityIndex,
  }
}
