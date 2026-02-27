'use client'

interface ScoreBadgeProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

export default function ScoreBadge({ score, size = 'md', showLabel = false }: ScoreBadgeProps) {
  const getScoreColor = (score: number) => {
    if (score >= 85) return 'bg-score-excellent'
    if (score >= 70) return 'bg-score-good'
    if (score >= 50) return 'bg-score-fair'
    return 'bg-score-poor'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 85) return 'Excellent'
    if (score >= 70) return 'Good'
    if (score >= 50) return 'Fair'
    return 'Needs Work'
  }

  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-lg',
  }

  return (
    <div className="flex items-center gap-2">
      <div 
        className={`${sizes[size]} ${getScoreColor(score)} rounded-full flex items-center justify-center font-bold text-white`}
      >
        {score}
      </div>
      {showLabel && (
        <span className="text-sm text-slate-300">{getScoreLabel(score)}</span>
      )}
    </div>
  )
}

export function ProgressRing({ 
  progress, 
  size = 60,
  strokeWidth = 4,
  color = '#3b82f6'
}: { 
  progress: number
  size?: number
  strokeWidth?: number
  color?: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="progress-ring" width={size} height={size}>
        {/* Background circle */}
        <circle
          stroke="rgba(255,255,255,0.1)"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress circle */}
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-semibold text-white">{progress}%</span>
      </div>
    </div>
  )
}

export function MatchScoreBar({ 
  label, 
  score, 
  color = 'blue' 
}: { 
  label: string
  score: number
  color?: 'blue' | 'purple' | 'green' | 'yellow'
}) {
  const colors = {
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
  }

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="text-white font-medium">{score}%</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div 
          className={`h-full ${colors[color]} rounded-full transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  )
}
