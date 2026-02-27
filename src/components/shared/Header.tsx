'use client'

import { Users, Briefcase, Target, Database, Sparkles, BarChart3 } from 'lucide-react'

interface HeaderProps {
  stats?: {
    totalJobseekers: number
    totalJobs: number
    totalMatches: number
    completedScreenings: number
    averageScore: number
  }
  onSeedData: () => void
  isLoading: boolean
  activeView: 'jobseeker' | 'employer' | 'analytics'
  onViewChange: (view: 'jobseeker' | 'employer' | 'analytics') => void
}

export default function Header({ stats, onSeedData, isLoading, activeView, onViewChange }: HeaderProps) {
  return (
    <header className="border-b border-charcoal/10 bg-alabaster">
      <div className="px-8 lg:px-12">
        {/* Top bar */}
        <div className="h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-charcoal flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-gold" />
            </div>
            <div>
              <h1 className="text-xl font-serif font-semibold text-charcoal tracking-tight">
                DEET
              </h1>
              <p className="text-[10px] tracking-[0.2em] uppercase text-warmgrey">
                AI Job Matching
              </p>
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div className="hidden lg:flex items-center gap-8">
              <StatBadge 
                icon={<Users className="w-3.5 h-3.5" />}
                label="Candidates"
                value={stats.totalJobseekers}
              />
              <StatBadge 
                icon={<Briefcase className="w-3.5 h-3.5" />}
                label="Jobs"
                value={stats.totalJobs}
              />
              <StatBadge 
                icon={<Target className="w-3.5 h-3.5" />}
                label="Matches"
                value={stats.totalMatches}
              />
              <div className="h-8 w-px bg-charcoal/10" />
              <div className="text-center">
                <div className="text-2xl font-serif font-semibold text-charcoal">
                  {stats.averageScore || 0}%
                </div>
                <div className="text-[10px] tracking-[0.15em] uppercase text-warmgrey">
                  Avg Match
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4">
            <button
              onClick={onSeedData}
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2.5 border border-charcoal/20 
                       text-charcoal text-xs tracking-widest uppercase
                       hover:bg-charcoal hover:text-alabaster 
                       transition-all duration-500 disabled:opacity-50"
            >
              <Database className="w-3.5 h-3.5" />
              {isLoading ? 'Loading...' : 'Demo Data'}
            </button>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-0 -mb-px">
          <button
            onClick={() => onViewChange('jobseeker')}
            className={`relative px-6 py-3 text-xs tracking-[0.15em] uppercase transition-all duration-500
              ${activeView === 'jobseeker' 
                ? 'text-charcoal' 
                : 'text-warmgrey hover:text-charcoal'
              }`}
          >
            Job Seeker
            {activeView === 'jobseeker' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold" />
            )}
          </button>
          <button
            onClick={() => onViewChange('employer')}
            className={`relative px-6 py-3 text-xs tracking-[0.15em] uppercase transition-all duration-500
              ${activeView === 'employer' 
                ? 'text-charcoal' 
                : 'text-warmgrey hover:text-charcoal'
              }`}
          >
            Employer
            {activeView === 'employer' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold" />
            )}
          </button>
          <button
            onClick={() => onViewChange('analytics')}
            className={`relative px-6 py-3 text-xs tracking-[0.15em] uppercase transition-all duration-500 flex items-center gap-1.5
              ${activeView === 'analytics' 
                ? 'text-charcoal' 
                : 'text-warmgrey hover:text-charcoal'
              }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Analytics
            {activeView === 'analytics' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold" />
            )}
          </button>
        </div>
      </div>
    </header>
  )
}

function StatBadge({ 
  icon, 
  label, 
  value 
}: { 
  icon: React.ReactNode
  label: string
  value: number
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="p-2 bg-taupe/50 text-charcoal">
        {icon}
      </div>
      <div>
        <div className="text-lg font-serif font-semibold text-charcoal">{value}</div>
        <div className="text-[10px] tracking-[0.15em] uppercase text-warmgrey">{label}</div>
      </div>
    </div>
  )
}
