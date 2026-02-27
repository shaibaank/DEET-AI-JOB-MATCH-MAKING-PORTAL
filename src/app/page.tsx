'use client'

import { useState, useEffect, useCallback } from 'react'
import JobseekerDashboard from '@/components/jobseeker/JobseekerDashboard'
import EmployerDashboard from '@/components/employer/EmployerDashboard'
import AnalyticsReport from '@/components/shared/AnalyticsReport'
import Header from '@/components/shared/Header'
import { Check } from 'lucide-react'

interface SyncData {
  timestamp: number
  stats: {
    totalJobseekers: number
    totalJobs: number
    totalMatches: number
    completedScreenings: number
    averageScore: number
    distribution: { excellent: number; good: number; fair: number; poor: number }
  }
  topCandidates: any[]
  updates: {
    jobseekers: any[]
    jobs: any[]
    matches: any[]
    screenings: any[]
  }
}

export default function Home() {
  const [syncData, setSyncData] = useState<SyncData | null>(null)
  const [lastSync, setLastSync] = useState<number>(Date.now())
  const [isLoading, setIsLoading] = useState(true)
  const [activeJobseeker, setActiveJobseeker] = useState<string | null>(null)
  const [notification, setNotification] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<'jobseeker' | 'employer' | 'analytics'>('jobseeker')

  // Polling for real-time updates
  const fetchSync = useCallback(async () => {
    try {
      const res = await fetch(`/api/sync?since=${lastSync}`)
      const data = await res.json()
      setSyncData(data)
      setLastSync(data.timestamp)
      setIsLoading(false)

      // Check for new updates
      if (data.updates.screenings?.length > 0) {
        const newScreening = data.updates.screenings[0]
        if (newScreening.status === 'completed') {
          setNotification(`Screening completed! Score: ${newScreening.scores?.overall || 'N/A'}`)
          setTimeout(() => setNotification(null), 5000)
        }
      }
    } catch (error) {
      console.error('Sync error:', error)
      setIsLoading(false)
    }
  }, [lastSync])

  useEffect(() => {
    fetchSync()
    const interval = setInterval(fetchSync, 3000)
    return () => clearInterval(interval)
  }, [fetchSync])

  // Seed demo data
  const seedDemoData = async () => {
    setIsLoading(true)
    try {
      await fetch('/api/seed', { method: 'POST' })
      await fetchSync()
      setNotification('Demo data loaded!')
      setTimeout(() => setNotification(null), 3000)
    } catch (error) {
      console.error('Seed error:', error)
    }
    setIsLoading(false)
  }

  return (
    <main className="min-h-screen bg-alabaster">
      {/* Notification toast */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 animate-fadeInUp">
          <div className="bg-charcoal text-alabaster px-5 py-3 shadow-lg flex items-center gap-3">
            <div className="w-5 h-5 bg-score-excellent flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm">{notification}</span>
          </div>
        </div>
      )}

      {/* Header with view toggle */}
      <Header 
        stats={syncData?.stats} 
        onSeedData={seedDemoData}
        isLoading={isLoading}
        activeView={activeView}
        onViewChange={setActiveView}
      />

      {/* Main Content */}
      <div className="min-h-[calc(100vh-112px)]">
        {/* View container with transition */}
        <div className="relative">
          {/* Jobseeker View */}
          <div 
            className={`transition-all duration-700 ease-luxury ${
              activeView === 'jobseeker' 
                ? 'opacity-100 translate-x-0' 
                : 'opacity-0 -translate-x-8 pointer-events-none absolute inset-0'
            }`}
          >
            {activeView === 'jobseeker' && (
              <JobseekerDashboard 
                syncData={syncData}
                onJobseekerChange={setActiveJobseeker}
                onRefresh={fetchSync}
              />
            )}
          </div>

          {/* Employer View */}
          <div 
            className={`transition-all duration-700 ease-luxury ${
              activeView === 'employer' 
                ? 'opacity-100 translate-x-0' 
                : 'opacity-0 translate-x-8 pointer-events-none absolute inset-0'
            }`}
          >
            {activeView === 'employer' && (
              <EmployerDashboard 
                syncData={syncData}
                activeJobseeker={activeJobseeker}
                onRefresh={fetchSync}
              />
            )}
          </div>

          {/* Analytics View */}
          <div 
            className={`transition-all duration-700 ease-luxury ${
              activeView === 'analytics' 
                ? 'opacity-100 translate-x-0' 
                : 'opacity-0 translate-x-8 pointer-events-none absolute inset-0'
            }`}
          >
            {activeView === 'analytics' && (
              <AnalyticsReport />
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-charcoal/10 py-8">
        <div className="max-w-7xl mx-auto px-8 lg:px-12 flex items-center justify-between">
          <p className="text-xs text-warmgrey tracking-wide">
            DEET — AI-Powered Job Matching Engine
          </p>
          <p className="text-xs text-warmgrey/60">
            Hackathon MVP • {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </main>
  )
}
