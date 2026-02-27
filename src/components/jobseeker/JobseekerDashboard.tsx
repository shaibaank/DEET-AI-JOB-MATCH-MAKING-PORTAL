'use client'

import { useState, useEffect, useMemo } from 'react'
import { Phone, Search, SlidersHorizontal, MapPin, Wallet, Briefcase, Check, X, ArrowRight, User } from 'lucide-react'
import ResumeDropzone, { AIResumeInsights } from '../ui/ResumeDropzone'
import ResumePreview from '../ui/ResumePreview'
import SkillAutocomplete from '../ui/SkillAutocomplete'
import SalaryRangeSlider, { SingleSlider } from '../ui/SalaryRangeSlider'
import WorkModeToggle, { LocationSelector, ExperienceSelector } from '../ui/WorkModeToggle'
import MatchingLoader, { CascadeResults } from '../ui/MatchingLoader'
import JobDetailPanel, { ScoreBadge, AnimatedScoreBar } from '../ui/JobDetailPanel'
import ScreeningModal from './ScreeningModal'

interface JobseekerDashboardProps {
  syncData: any
  onJobseekerChange: (id: string | null) => void
  onRefresh: () => void
}

type ViewState = 'upload' | 'preview' | 'profile-builder' | 'matching' | 'results'

export default function JobseekerDashboard({ syncData, onJobseekerChange, onRefresh }: JobseekerDashboardProps) {
  // State
  const [viewState, setViewState] = useState<ViewState>('upload')
  const [jobseeker, setJobseeker] = useState<any>(null)
  const [matches, setMatches] = useState<any[]>([])
  const [screenings, setScreenings] = useState<any[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [showScreeningModal, setShowScreeningModal] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<any>(null)
  const [selectedJob, setSelectedJob] = useState<any>(null)
  const [resumeInsights, setResumeInsights] = useState<AIResumeInsights | null>(null)
  const [resumeFile, setResumeFile] = useState<File | null>(null)

  // Profile builder state
  const [profileName, setProfileName] = useState('')
  const [profileEmail, setProfileEmail] = useState('')
  const [profileSkills, setProfileSkills] = useState<string[]>([])
  const [profileSalary, setProfileSalary] = useState<[number, number]>([8, 20])
  const [profileWorkMode, setProfileWorkMode] = useState<'remote' | 'onsite' | 'hybrid'>('hybrid')
  const [profileLocation, setProfileLocation] = useState('')
  const [profileExperience, setProfileExperience] = useState('mid')

  // Filters state
  const [showFilters, setShowFilters] = useState(false)
  const [filterMinScore, setFilterMinScore] = useState(0)
  const [filterLocation, setFilterLocation] = useState('')
  const [filterSalaryMin, setFilterSalaryMin] = useState(0)

  // Always start fresh - user should input their details
  // No auto-fetch of existing jobseeker on mount

  const fetchMatches = async (jobseekerId: string) => {
    try {
      const res = await fetch(`/api/matches?jobseekerId=${jobseekerId}&includeDetails=true`)
      const data = await res.json()
      setMatches(data)
    } catch (error) {
      console.error('Error fetching matches:', error)
    }
  }

  const fetchScreenings = async (jobseekerId: string) => {
    try {
      const res = await fetch(`/api/screenings?jobseekerId=${jobseekerId}`)
      const data = await res.json()
      setScreenings(data)
    } catch (error) {
      console.error('Error fetching screenings:', error)
    }
  }

  // Handle AI-parsed resume from dropzone
  const handleResumeParsed = (insights: AIResumeInsights, file: File) => {
    setResumeInsights(insights)
    setResumeFile(file)
    setViewState('preview')
  }

  // Handle continue from preview → create jobseeker and go to profile builder
  const handlePreviewContinue = async () => {
    if (!resumeInsights) return
    setIsProcessing(true)
    try {
      const res = await fetch('/api/jobseekers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText: resumeInsights.rawTextExtracted,
          name: resumeInsights.name,
          email: resumeInsights.email,
          phone: resumeInsights.phone,
          location: resumeInsights.location,
          skills: resumeInsights.skills.map(s => s.name),
          experience: resumeInsights.experience.map(e => ({
            title: e.title,
            company: e.company,
            duration: e.duration,
            achievements: e.highlights,
          })),
          education: resumeInsights.education,
          availability: resumeInsights.availability,
        }),
      })
      const data = await res.json()
      setJobseeker(data)
      onJobseekerChange(data._id)
      
      // Populate profile builder from AI insights
      setProfileName(resumeInsights.name || data.name || '')
      setProfileEmail(resumeInsights.email || data.email || '')
      setProfileSkills(resumeInsights.skills.map(s => s.name) || data.skills || [])
      setProfileLocation(resumeInsights.location || data.location || '')
      if (resumeInsights.salaryEstimate) {
        setProfileSalary([resumeInsights.salaryEstimate.min, resumeInsights.salaryEstimate.max])
      }
      if (resumeInsights.locationPreference && ['remote', 'onsite', 'hybrid'].includes(resumeInsights.locationPreference)) {
        setProfileWorkMode(resumeInsights.locationPreference as 'remote' | 'onsite' | 'hybrid')
      }
      if (resumeInsights.seniorityLevel) {
        const levelMap: Record<string, string> = { intern: 'entry', junior: 'entry', mid: 'mid', senior: 'senior', lead: 'senior', principal: 'senior' }
        setProfileExperience(levelMap[resumeInsights.seniorityLevel] || 'mid')
      }
      
      setViewState('profile-builder')
      onRefresh()
    } catch (error) {
      console.error('Error creating profile:', error)
    }
    setIsProcessing(false)
  }

  // Handle find matches
  const handleFindMatches = async () => {
    if (!jobseeker) return
    
    setViewState('matching')
    
    // Update jobseeker with profile data
    try {
      await fetch('/api/jobseekers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: jobseeker._id,
          skills: profileSkills,
          salaryExpectation: { min: profileSalary[0], max: profileSalary[1] },
          location: profileLocation,
          availability: profileWorkMode,
        }),
      })

      // Recalculate matches
      const matchRes = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobseekerId: jobseeker._id, recalculate: true }),
      })
      const newMatches = await matchRes.json()
      setMatches(Array.isArray(newMatches) ? newMatches : [newMatches])
      
      await fetchMatches(jobseeker._id)
      onRefresh()
    } catch (error) {
      console.error('Error finding matches:', error)
    }
  }

  const handleMatchingComplete = () => {
    setViewState('results')
  }

  // Filter matches
  const filteredMatches = useMemo(() => {
    return matches.filter(m => {
      if (m.matchScore < filterMinScore) return false
      if (filterLocation && m.job?.location !== filterLocation) return false
      if (filterSalaryMin && m.job?.salaryRange?.min < filterSalaryMin) return false
      return true
    }).sort((a, b) => b.matchScore - a.matchScore)
  }, [matches, filterMinScore, filterLocation, filterSalaryMin])

  const startScreening = (job?: any) => {
    setSelectedJob(job)
    setShowScreeningModal(true)
  }

  // ============ RENDER UPLOAD STATE ============
  if (viewState === 'upload') {
    return (
      <div className="max-w-xl mx-auto py-12 px-6">
        <div className="text-center mb-12">
          <div className="overline mb-4">Get Started</div>
          <h1 className="font-serif text-4xl md:text-5xl text-charcoal mb-4">
            Find Your <em className="text-gold">Perfect</em> Match
          </h1>
          <p className="text-warmgrey max-w-md mx-auto">
            Drop your resume and our AI will instantly analyze your skills, experience, and career trajectory.
          </p>
        </div>
        
        <ResumeDropzone onParsed={handleResumeParsed} isProcessing={isProcessing} />
      </div>
    )
  }

  // ============ RENDER RESUME PREVIEW ============
  if (viewState === 'preview' && resumeInsights && resumeFile) {
    return (
      <ResumePreview
        insights={resumeInsights}
        file={resumeFile}
        onContinue={handlePreviewContinue}
        onReupload={() => {
          setResumeInsights(null)
          setResumeFile(null)
          setViewState('upload')
        }}
      />
    )
  }

  // ============ RENDER PROFILE BUILDER ============
  if (viewState === 'profile-builder') {
    const canProceed = profileSkills.length >= 3 && profileLocation

    return (
      <div className="max-w-2xl mx-auto py-8 px-6 animate-fadeInUp">
        {/* Header */}
        <div className="mb-10">
          <div className="overline mb-3">Profile Builder</div>
          <h1 className="font-serif text-3xl md:text-4xl text-charcoal mb-2">
            Complete Your <em className="text-gold">Profile</em>
          </h1>
          <p className="text-warmgrey">Fine-tune your preferences to get the best matches.</p>
        </div>

        {/* Profile preview */}
        <div className="flex items-center gap-4 p-6 bg-taupe/30 mb-8">
          <div className="w-16 h-16 bg-charcoal flex items-center justify-center text-white font-serif text-2xl">
            {profileName ? profileName[0].toUpperCase() : <User className="w-8 h-8" />}
          </div>
          <div>
            <h3 className="font-serif text-xl text-charcoal">{profileName || 'Your Name'}</h3>
            <p className="text-warmgrey text-sm">{profileEmail || 'email@example.com'}</p>
          </div>
        </div>

        {/* Name & Email */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="overline mb-3 block">Full Name</label>
            <input
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="John Doe"
              className="input-luxury"
            />
          </div>
          <div>
            <label className="overline mb-3 block">Email</label>
            <input
              type="email"
              value={profileEmail}
              onChange={(e) => setProfileEmail(e.target.value)}
              placeholder="john@example.com"
              className="input-luxury"
            />
          </div>
        </div>

        {/* Skills */}
        <div className="mb-8">
          <label className="overline mb-3 block">
            Your Skills <span className="text-gold">*</span>
          </label>
          <SkillAutocomplete 
            skills={profileSkills}
            onChange={setProfileSkills}
            placeholder="Type to add skills..."
          />
        </div>

        {/* Salary Range */}
        <SalaryRangeSlider
          value={profileSalary}
          onChange={setProfileSalary}
          min={0}
          max={100}
          label="Expected Salary (LPA)"
        />

        {/* Work Mode */}
        <WorkModeToggle
          value={profileWorkMode}
          onChange={setProfileWorkMode}
        />

        {/* Location */}
        <LocationSelector
          value={profileLocation}
          onChange={setProfileLocation}
        />

        {/* Experience */}
        <ExperienceSelector
          value={profileExperience}
          onChange={setProfileExperience}
        />

        {/* Validation message */}
        {!canProceed && (
          <div className="mb-6 p-4 bg-gold/10 border-l-4 border-gold text-sm text-charcoal">
            <strong>Almost there!</strong> Add at least 3 skills and select your location to continue.
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center justify-between pt-6 border-t border-charcoal/10">
          <button
            onClick={() => {
              setResumeInsights(null)
              setResumeFile(null)
              setViewState('upload')
            }}
            className="text-warmgrey hover:text-charcoal transition-colors duration-300"
          >
            ← Upload Different Resume
          </button>
          <button
            onClick={handleFindMatches}
            disabled={!canProceed}
            className="btn-luxury disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              Find My Matches
            </span>
          </button>
        </div>
      </div>
    )
  }

  // ============ RENDER MATCHING LOADER ============
  if (viewState === 'matching') {
    return (
      <MatchingLoader 
        isActive={true} 
        totalJobs={syncData?.stats?.totalJobs || 200}
        onComplete={handleMatchingComplete}
      />
    )
  }

  // ============ RENDER RESULTS ============
  return (
    <div className="flex h-full">
      {/* Left: Filters */}
      <div className={`${showFilters ? 'w-64' : 'w-0'} overflow-hidden transition-all duration-500 border-r border-charcoal/10`}>
        <div className="w-64 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-serif text-lg text-charcoal">Filters</h3>
            <button onClick={() => setShowFilters(false)} className="text-warmgrey hover:text-charcoal">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Min Score Filter */}
          <SingleSlider
            value={filterMinScore}
            onChange={setFilterMinScore}
            min={0}
            max={100}
            label="Minimum Score"
            formatValue={(v) => `${v}%`}
          />

          {/* Salary Filter */}
          <SingleSlider
            value={filterSalaryMin}
            onChange={setFilterSalaryMin}
            min={0}
            max={50}
            label="Min Salary (LPA)"
            formatValue={(v) => `₹${v}L`}
          />

          {/* Location Filter */}
          <div className="mt-6">
            <label className="text-sm text-warmgrey mb-2 block">Location</label>
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="w-full px-3 py-2 bg-transparent border border-charcoal/20 text-sm"
            >
              <option value="">All Locations</option>
              {Array.from(new Set(matches.map(m => m.job?.location).filter(Boolean))).map((loc: string) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          <button
            onClick={() => {
              setFilterMinScore(0)
              setFilterLocation('')
              setFilterSalaryMin(0)
            }}
            className="w-full mt-6 py-2 text-sm text-warmgrey hover:text-charcoal border border-charcoal/20 transition-colors duration-300"
          >
            Clear All Filters
          </button>
        </div>
      </div>

      {/* Center: Job Cards */}
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-alabaster z-10 p-6 border-b border-charcoal/10">
          <div className="flex items-center justify-between">
            <div>
              <div className="overline mb-1">
                {filteredMatches.length} Matches Found
              </div>
              <h2 className="font-serif text-2xl text-charcoal">
                Jobs for <em className="text-gold">{jobseeker?.name || 'You'}</em>
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 border transition-all duration-300
                  ${showFilters ? 'bg-charcoal text-white border-charcoal' : 'border-charcoal/20 text-charcoal hover:border-charcoal'}
                `}
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
              </button>
              <button
                onClick={() => setViewState('profile-builder')}
                className="px-4 py-2 border border-charcoal/20 text-charcoal hover:border-charcoal transition-colors duration-300"
              >
                Edit Profile
              </button>
            </div>
          </div>
        </div>

        {/* Semantic matching callout */}
        {filteredMatches.length > 0 && (
          <div className="mx-6 mt-6 p-4 bg-gold/5 border-l-4 border-gold">
            <p className="text-sm text-charcoal">
              <strong>Semantic Matching:</strong> Jobs are ranked by understanding skill relationships, 
              not just keyword matches. "Backend Development" matches Python roles because our engine 
              understands the connection.
            </p>
          </div>
        )}

        {/* Job list */}
        <div className="p-6">
          {filteredMatches.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto mb-6 bg-taupe flex items-center justify-center">
                <Briefcase className="w-10 h-10 text-warmgrey" />
              </div>
              <h3 className="font-serif text-2xl text-charcoal mb-2">No Matches Yet</h3>
              <p className="text-warmgrey mb-6">Load demo data or adjust your filters</p>
              <button onClick={() => setViewState('profile-builder')} className="btn-secondary">
                Update Profile
              </button>
            </div>
          ) : (
            <CascadeResults>
              {filteredMatches.map((match, index) => (
                <JobCard
                  key={match._id}
                  match={match}
                  jobseekerSkills={jobseeker?.skills || []}
                  isSelected={selectedMatch?._id === match._id}
                  onClick={() => setSelectedMatch(match)}
                  onPractice={() => startScreening(match.job)}
                  rank={index + 1}
                />
              ))}
            </CascadeResults>
          )}
        </div>
      </div>

      {/* Right: Detail Panel */}
      {selectedMatch && (
        <div className="w-96 border-l border-charcoal/10 overflow-y-auto">
          <JobDetailPanel
            match={selectedMatch}
            jobseekerSkills={jobseeker?.skills || []}
            onClose={() => setSelectedMatch(null)}
            onApply={() => {}}
            onPractice={() => startScreening(selectedMatch.job)}
          />
        </div>
      )}

      {/* Screening Modal */}
      {showScreeningModal && (
        <ScreeningModal
          jobseeker={jobseeker}
          job={selectedJob}
          onClose={() => {
            setShowScreeningModal(false)
            if (jobseeker) fetchScreenings(jobseeker._id)
            onRefresh()
          }}
        />
      )}
    </div>
  )
}

// Job Card Component
function JobCard({ 
  match, 
  jobseekerSkills, 
  isSelected, 
  onClick, 
  onPractice,
  rank 
}: { 
  match: any
  jobseekerSkills: string[]
  isSelected: boolean
  onClick: () => void
  onPractice: () => void
  rank: number
}) {
  const job = match.job
  if (!job) return null

  const matchedSkills = job.requiredSkills?.filter((skill: string) =>
    jobseekerSkills.some(js => js.toLowerCase().includes(skill.toLowerCase()) ||
                              skill.toLowerCase().includes(js.toLowerCase()))
  ) || []

  const missingSkills = job.requiredSkills?.filter((skill: string) =>
    !jobseekerSkills.some(js => js.toLowerCase().includes(skill.toLowerCase()) ||
                               skill.toLowerCase().includes(js.toLowerCase()))
  ).slice(0, 2) || []

  return (
    <div 
      onClick={onClick}
      className={`border-t border-charcoal/10 py-6 cursor-pointer transition-all duration-500 group
        ${isSelected ? 'bg-taupe/30 border-l-4 border-l-gold pl-5' : 'hover:bg-taupe/20'}
      `}
    >
      <div className="flex items-start gap-4">
        {/* Score */}
        <ScoreBadge score={match.matchScore} size="lg" showLabel />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-serif text-xl text-charcoal group-hover:text-gold transition-colors duration-300">
                {job.title}
              </h3>
              <p className="text-warmgrey">{job.company}</p>
            </div>
            <ArrowRight className="w-5 h-5 text-warmgrey group-hover:text-gold group-hover:translate-x-1 transition-all duration-300" />
          </div>

          {/* Meta */}
          <div className="flex flex-wrap gap-4 text-sm text-warmgrey mb-4">
            {job.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {job.location}
              </span>
            )}
            {job.salaryRange && (
              <span className="flex items-center gap-1">
                <Wallet className="w-3 h-3" />
                ₹{job.salaryRange.min}L - ₹{job.salaryRange.max}L
              </span>
            )}
          </div>

          {/* Skills */}
          <div className="flex flex-wrap gap-2">
            {matchedSkills.slice(0, 3).map((skill: string) => (
              <span key={skill} className="skill-pill">
                <Check className="w-3 h-3" />
                {skill}
              </span>
            ))}
            {missingSkills.map((skill: string) => (
              <span key={skill} className="skill-pill mismatch">
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
