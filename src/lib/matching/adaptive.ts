/**
 * Adaptive Weight Learning
 * Learns optimal matching weights from employer feedback (invite/reject signals)
 * Uses simple gradient-based adjustment per job posting
 */

import { connectToDatabase } from '../mongodb'
import Match from '../models/Match'

export interface WeightProfile {
  skills: number
  experience: number
  location: number
  salary: number
}

// Default weights
const DEFAULT_WEIGHTS: WeightProfile = {
  skills: 0.45,
  experience: 0.20,
  location: 0.15,
  salary: 0.20,
}

// In-memory weights per job (jobId → weights)
const learnedWeights = new Map<string, WeightProfile>()

// Learning rate for weight adjustment
const LEARNING_RATE = 0.03
const MIN_WEIGHT = 0.05
const MAX_WEIGHT = 0.60

/**
 * Get current weights for a job (learned or default)
 */
export function getWeightsForJob(jobId?: string): WeightProfile {
  if (jobId && learnedWeights.has(jobId)) {
    return { ...learnedWeights.get(jobId)! }
  }
  return { ...DEFAULT_WEIGHTS }
}

/**
 * Normalize weights to sum to 1.0
 */
function normalizeWeights(w: WeightProfile): WeightProfile {
  const sum = w.skills + w.experience + w.location + w.salary
  if (sum === 0) return { ...DEFAULT_WEIGHTS }
  return {
    skills: Math.max(MIN_WEIGHT, Math.min(MAX_WEIGHT, w.skills / sum)),
    experience: Math.max(MIN_WEIGHT, Math.min(MAX_WEIGHT, w.experience / sum)),
    location: Math.max(MIN_WEIGHT, Math.min(MAX_WEIGHT, w.location / sum)),
    salary: Math.max(MIN_WEIGHT, Math.min(MAX_WEIGHT, w.salary / sum)),
  }
}

/**
 * Learn from a single feedback signal
 * When a high-scoring dimension led to an invite, increase its weight
 * When a high-scoring dimension led to a reject, decrease its weight
 */
export function learnFromFeedback(
  jobId: string,
  matchDimensions: { skillMatch: number; experienceMatch: number; locationMatch: number; salaryMatch: number },
  action: 'invited' | 'rejected'
): WeightProfile {
  const current = getWeightsForJob(jobId)
  const signal = action === 'invited' ? 1 : -1
  const avgScore = (matchDimensions.skillMatch + matchDimensions.experienceMatch + 
                    matchDimensions.locationMatch + matchDimensions.salaryMatch) / 4

  // Adjust weights: if a dimension is above average and action is positive, boost it
  // If a dimension is above average and action is negative, reduce it
  const dims = [
    { key: 'skills' as const, score: matchDimensions.skillMatch },
    { key: 'experience' as const, score: matchDimensions.experienceMatch },
    { key: 'location' as const, score: matchDimensions.locationMatch },
    { key: 'salary' as const, score: matchDimensions.salaryMatch },
  ]

  for (const dim of dims) {
    const deviation = (dim.score - avgScore) / 100
    current[dim.key] += signal * deviation * LEARNING_RATE
  }

  const normalized = normalizeWeights(current)
  learnedWeights.set(jobId, normalized)
  return normalized
}

/**
 * Learn weights from all historical feedback for a job
 * Call this on server start or when recalculating
 */
export async function learnFromHistory(jobId: string): Promise<WeightProfile> {
  try {
    await connectToDatabase()
    
    const feedbackMatches = await Match.find({
      jobId,
      status: { $in: ['invited', 'rejected'] }
    }).lean()

    if (feedbackMatches.length < 2) {
      return DEFAULT_WEIGHTS
    }

    // Reset to defaults and replay feedback
    learnedWeights.set(jobId, { ...DEFAULT_WEIGHTS })

    for (const m of feedbackMatches) {
      learnFromFeedback(jobId, {
        skillMatch: (m as any).skillMatch || 0,
        experienceMatch: (m as any).experienceMatch || 0,
        locationMatch: (m as any).locationMatch || 0,
        salaryMatch: (m as any).salaryMatch || 0,
      }, (m as any).status as 'invited' | 'rejected')
    }

    return getWeightsForJob(jobId)
  } catch {
    return DEFAULT_WEIGHTS
  }
}

/**
 * Get adaptation metrics for reporting
 */
export function getAdaptationMetrics(jobId: string): {
  isAdapted: boolean
  weights: WeightProfile
  deviationFromDefault: number
} {
  const weights = getWeightsForJob(jobId)
  const isAdapted = learnedWeights.has(jobId)
  
  const deviation = isAdapted
    ? Math.round(
        (Math.abs(weights.skills - DEFAULT_WEIGHTS.skills) +
         Math.abs(weights.experience - DEFAULT_WEIGHTS.experience) +
         Math.abs(weights.location - DEFAULT_WEIGHTS.location) +
         Math.abs(weights.salary - DEFAULT_WEIGHTS.salary)) * 100
      )
    : 0

  return { isAdapted, weights, deviationFromDefault: deviation }
}
