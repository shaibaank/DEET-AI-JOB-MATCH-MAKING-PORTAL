'use client'

import { X, MapPin, Briefcase, Wallet, Check, AlertCircle } from 'lucide-react'
import { useState, useEffect } from 'react'

interface ScoreBarProps {
  label: string
  score: number
  color?: 'green' | 'blue' | 'yellow' | 'red'
  delay?: number
}

export function AnimatedScoreBar({ label, score, color = 'green', delay = 0 }: ScoreBarProps) {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => setWidth(score), delay)
    return () => clearTimeout(timer)
  }, [score, delay])

  const colors = {
    green: 'bg-score-excellent',
    blue: 'bg-score-good',
    yellow: 'bg-score-fair',
    red: 'bg-score-poor',
  }

  const getColor = () => {
    if (score >= 80) return 'bg-score-excellent'
    if (score >= 60) return 'bg-score-good'
    if (score >= 40) return 'bg-score-fair'
    return 'bg-score-poor'
  }

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-warmgrey">{label}</span>
        <span className="text-lg font-serif text-charcoal">{score}%</span>
      </div>
      <div className="h-1 bg-taupe overflow-hidden">
        <div 
          className={`h-full ${getColor()} transition-all duration-700 ease-luxury`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  )
}

interface JobDetailPanelProps {
  match: {
    _id: string
    matchScore: number
    skillMatch: number
    experienceMatch: number
    locationMatch: number
    salaryMatch: number
    reasons?: string[]
    job?: {
      title: string
      company: string
      description?: string
      location?: string
      remote?: boolean
      salaryRange?: { min: number; max: number }
      requiredSkills?: string[]
      preferredSkills?: string[]
      experienceLevel?: string
    }
  }
  jobseekerSkills?: string[]
  onClose: () => void
  onApply?: () => void
  onPractice?: () => void
}

export default function JobDetailPanel({ 
  match, 
  jobseekerSkills = [],
  onClose, 
  onApply, 
  onPractice 
}: JobDetailPanelProps) {
  const job = match.job
  
  if (!job) return null

  const matchedSkills = job.requiredSkills?.filter(skill => 
    jobseekerSkills.some(js => js.toLowerCase().includes(skill.toLowerCase()) || 
                              skill.toLowerCase().includes(js.toLowerCase()))
  ) || []
  
  const missingSkills = job.requiredSkills?.filter(skill => 
    !jobseekerSkills.some(js => js.toLowerCase().includes(skill.toLowerCase()) || 
                               skill.toLowerCase().includes(js.toLowerCase()))
  ) || []

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-score-excellent'
    if (score >= 70) return 'text-score-good'
    if (score >= 50) return 'text-score-fair'
    return 'text-score-poor'
  }

  return (
    <div className="h-full flex flex-col bg-alabaster animate-slideInRight">
      {/* Header */}
      <div className="p-6 border-b border-charcoal/10">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="overline mb-2">{job.company}</div>
            <h2 className="font-serif text-2xl text-charcoal">{job.title}</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-taupe transition-colors duration-300"
          >
            <X className="w-5 h-5 text-warmgrey" />
          </button>
        </div>

        {/* Meta info */}
        <div className="flex flex-wrap gap-4 text-sm text-warmgrey">
          {job.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {job.location}
              {job.remote && ' (Remote OK)'}
            </span>
          )}
          {job.experienceLevel && (
            <span className="flex items-center gap-1">
              <Briefcase className="w-4 h-4" />
              {job.experienceLevel}
            </span>
          )}
          {job.salaryRange && (
            <span className="flex items-center gap-1">
              <Wallet className="w-4 h-4" />
              ₹{job.salaryRange.min}L - ₹{job.salaryRange.max}L
            </span>
          )}
        </div>
      </div>

      {/* Score section */}
      <div className="p-6 border-b border-charcoal/10">
        <div className="flex items-center gap-4 mb-6">
          <div className={`text-5xl font-serif ${getScoreColor(match.matchScore)} score-glow`}>
            {match.matchScore}%
          </div>
          <div>
            <div className="font-medium text-charcoal">Match Score</div>
            <div className="text-sm text-warmgrey">Based on 4 dimensions</div>
          </div>
        </div>

        {/* Score breakdown */}
        <AnimatedScoreBar label="Skills Match" score={match.skillMatch} delay={100} />
        <AnimatedScoreBar label="Experience Match" score={match.experienceMatch} delay={200} />
        <AnimatedScoreBar label="Location Match" score={match.locationMatch} delay={300} />
        <AnimatedScoreBar label="Salary Match" score={match.salaryMatch} delay={400} />
      </div>

      {/* Skills analysis */}
      <div className="p-6 flex-1 overflow-y-auto">
        {/* Matched skills */}
        {matchedSkills.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-charcoal mb-3 flex items-center gap-2">
              <Check className="w-4 h-4 text-score-excellent" />
              Skills You Match ({matchedSkills.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {matchedSkills.map(skill => (
                <span key={skill} className="skill-pill">
                  <Check className="w-3 h-3" />
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Missing skills */}
        {missingSkills.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-charcoal mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-score-fair" />
              Skills to Develop ({missingSkills.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {missingSkills.map(skill => (
                <span key={skill} className="skill-pill mismatch">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Match explanation */}
        {match.reasons && match.reasons.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-charcoal mb-3">Why You Match</h3>
            <div className="space-y-2">
              {match.reasons.map((reason, i) => (
                <p key={i} className="text-sm text-warmgrey flex gap-2">
                  <span className="text-gold">→</span>
                  {reason}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Job description */}
        {job.description && (
          <div>
            <h3 className="text-sm font-medium text-charcoal mb-3">About the Role</h3>
            <p className="text-sm text-warmgrey leading-relaxed">
              {job.description}
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-6 border-t border-charcoal/10">
        <div className="flex gap-3">
          <button onClick={onApply} className="flex-1 btn-luxury">
            <span>Apply Now</span>
          </button>
          <button onClick={onPractice} className="btn-secondary">
            Practice Interview
          </button>
        </div>
      </div>
    </div>
  )
}

// Score badge component
interface ScoreBadgeProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

export function ScoreBadge({ score, size = 'md', showLabel = false }: ScoreBadgeProps) {
  const getColor = () => {
    if (score >= 85) return 'bg-score-excellent text-white'
    if (score >= 70) return 'bg-score-good text-white'
    if (score >= 50) return 'bg-score-fair text-white'
    return 'bg-score-poor text-white'
  }

  const sizes = {
    sm: 'w-10 h-10 text-sm',
    md: 'w-14 h-14 text-lg',
    lg: 'w-20 h-20 text-2xl',
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`${sizes[size]} ${getColor()} flex items-center justify-center font-serif font-medium`}>
        {score}
      </div>
      {showLabel && (
        <span className="text-[10px] text-warmgrey tracking-wider uppercase">Match</span>
      )}
    </div>
  )
}

// Leaderboard medal
export function LeaderboardMedal({ rank }: { rank: number }) {
  if (rank > 3) return <span className="w-8 text-center font-medium text-warmgrey">#{rank}</span>
  
  const medals = {
    1: { emoji: '🥇', class: 'medal-gold' },
    2: { emoji: '🥈', class: 'medal-silver' },
    3: { emoji: '🥉', class: 'medal-bronze' },
  }

  const medal = medals[rank as 1 | 2 | 3]

  return (
    <span className={`w-8 text-center text-xl ${medal.class}`}>
      {medal.emoji}
    </span>
  )
}
