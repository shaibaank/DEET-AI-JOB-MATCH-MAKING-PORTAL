'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Target, MapPin, Wallet, Briefcase } from 'lucide-react'

interface MatchingLoaderProps {
  isActive: boolean
  totalJobs?: number
  onComplete?: () => void
}

const MATCHING_STAGES = [
  { icon: Sparkles, label: 'Analyzing your skills', dimension: 'Skills' },
  { icon: Briefcase, label: 'Comparing experience levels', dimension: 'Experience' },
  { icon: MapPin, label: 'Checking location preferences', dimension: 'Location' },
  { icon: Wallet, label: 'Matching salary expectations', dimension: 'Salary' },
]

export default function MatchingLoader({ isActive, totalJobs = 200, onComplete }: MatchingLoaderProps) {
  const [progress, setProgress] = useState(0)
  const [currentStage, setCurrentStage] = useState(0)
  const [isCompleting, setIsCompleting] = useState(false)

  useEffect(() => {
    if (!isActive) {
      setProgress(0)
      setCurrentStage(0)
      setIsCompleting(false)
      return
    }

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          setIsCompleting(true)
          setTimeout(() => onComplete?.(), 500)
          clearInterval(progressInterval)
          return 100
        }
        return prev + 2
      })
    }, 50)

    const stageInterval = setInterval(() => {
      setCurrentStage(prev => (prev + 1) % MATCHING_STAGES.length)
    }, 600)

    return () => {
      clearInterval(progressInterval)
      clearInterval(stageInterval)
    }
  }, [isActive, onComplete])

  if (!isActive) return null

  const CurrentIcon = MATCHING_STAGES[currentStage].icon

  return (
    <div className={`fixed inset-0 bg-alabaster/95 z-50 flex items-center justify-center transition-opacity duration-500 ${isCompleting ? 'opacity-0' : 'opacity-100'}`}>
      <div className="text-center max-w-lg px-8">
        {/* Animated icon */}
        <div className="relative w-24 h-24 mx-auto mb-10">
          <div className="absolute inset-0 bg-taupe animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <CurrentIcon className="w-10 h-10 text-charcoal" />
          </div>
          {/* Rotating border */}
          <div className="absolute inset-0 border-2 border-charcoal/20">
            <div 
              className="absolute top-0 left-0 h-0.5 bg-gold transition-all duration-75"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Main message */}
        <h2 className="font-serif text-3xl md:text-4xl text-charcoal mb-4">
          Finding Your <em className="text-gold">Perfect</em> Matches
        </h2>
        
        {/* Dynamic status */}
        <p className="text-warmgrey mb-8 transition-all duration-300">
          Analyzing {totalJobs}+ jobs across 4 dimensions...
        </p>

        {/* Progress bar */}
        <div className="progress-bar w-full max-w-xs mx-auto mb-6">
          <div 
            className="progress-bar-fill"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Stage indicators */}
        <div className="flex items-center justify-center gap-6">
          {MATCHING_STAGES.map((stage, index) => {
            const StageIcon = stage.icon
            const isActive = index === currentStage
            const isPast = progress > ((index + 1) / MATCHING_STAGES.length) * 100
            
            return (
              <div 
                key={stage.dimension}
                className={`flex flex-col items-center gap-2 transition-all duration-300
                  ${isActive ? 'opacity-100 scale-110' : isPast ? 'opacity-60' : 'opacity-30'}
                `}
              >
                <div className={`w-10 h-10 flex items-center justify-center transition-colors duration-500
                  ${isPast ? 'bg-charcoal text-white' : isActive ? 'bg-gold text-white' : 'bg-taupe text-warmgrey'}
                `}>
                  <StageIcon className="w-5 h-5" />
                </div>
                <span className="text-[10px] tracking-widest uppercase text-warmgrey">
                  {stage.dimension}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Inline loader for cards
export function InlineLoader({ text = 'Processing...' }: { text?: string }) {
  return (
    <div className="flex items-center gap-3 py-4">
      <div className="w-5 h-5 border-2 border-charcoal/20 border-t-gold animate-spin" />
      <span className="text-warmgrey text-sm">{text}</span>
    </div>
  )
}

// Shimmer skeleton for cards
export function CardSkeleton() {
  return (
    <div className="border-t border-charcoal/10 py-6 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="h-6 w-48 bg-taupe mb-2" />
          <div className="h-4 w-32 bg-taupe/50" />
        </div>
        <div className="w-16 h-16 bg-taupe" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-2 bg-taupe" />
        ))}
      </div>
    </div>
  )
}

// Results cascade container
interface CascadeResultsProps {
  children: React.ReactNode[]
  isLoading?: boolean
}

export function CascadeResults({ children, isLoading = false }: CascadeResultsProps) {
  const [visibleCount, setVisibleCount] = useState(0)

  useEffect(() => {
    if (isLoading) {
      setVisibleCount(0)
      return
    }

    const timer = setInterval(() => {
      setVisibleCount(prev => {
        if (prev >= children.length) {
          clearInterval(timer)
          return prev
        }
        return prev + 1
      })
    }, 100)

    return () => clearInterval(timer)
  }, [isLoading, children.length])

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {children.slice(0, visibleCount).map((child, index) => (
        <div 
          key={index}
          className="animate-cascadeIn opacity-0"
          style={{ 
            animationDelay: `${index * 100}ms`,
            animationFillMode: 'forwards'
          }}
        >
          {child}
        </div>
      ))}
    </div>
  )
}
