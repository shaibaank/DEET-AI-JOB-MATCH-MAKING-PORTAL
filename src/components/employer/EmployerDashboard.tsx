'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  Briefcase, Users, Filter, ChevronDown, Phone, Mail, MapPin, 
  CheckCircle, XCircle, Star, TrendingUp, Award, Plus, X, Search,
  GitCompare, Check
} from 'lucide-react'
import SkillAutocomplete from '../ui/SkillAutocomplete'
import SalaryRangeSlider, { SingleSlider } from '../ui/SalaryRangeSlider'
import WorkModeToggle, { LocationSelector, ExperienceSelector } from '../ui/WorkModeToggle'
import MatchingLoader from '../ui/MatchingLoader'
import { ScoreBadge, AnimatedScoreBar, LeaderboardMedal } from '../ui/JobDetailPanel'

interface EmployerDashboardProps {
  syncData: any
  activeJobseeker: string | null
  onRefresh: () => void
}

type ViewState = 'dashboard' | 'post-job' | 'matching' | 'candidates'

export default function EmployerDashboard({ syncData, activeJobseeker, onRefresh }: EmployerDashboardProps) {
  // State
  const [viewState, setViewState] = useState<ViewState>('dashboard')
  const [jobs, setJobs] = useState<any[]>([])
  const [candidates, setCandidates] = useState<any[]>([])
  const [selectedJob, setSelectedJob] = useState<string | null>(null)
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [filterScore, setFilterScore] = useState(0)
  const [filterSkillMatch, setFilterSkillMatch] = useState(0)
  const [sortBy, setSortBy] = useState<'score' | 'skills' | 'location' | 'salary'>('score')
  const [compareList, setCompareList] = useState<any[]>([])
  const [showComparison, setShowComparison] = useState(false)

  // Job posting state
  const [jobTitle, setJobTitle] = useState('')
  const [jobCompany, setJobCompany] = useState('')
  const [jobSkills, setJobSkills] = useState<string[]>([])
  const [jobSalary, setJobSalary] = useState<[number, number]>([8, 25])
  const [jobLocation, setJobLocation] = useState('')
  const [jobExperience, setJobExperience] = useState('mid')
  const [jobWorkMode, setJobWorkMode] = useState<'remote' | 'onsite' | 'hybrid'>('hybrid')

  useEffect(() => {
    fetchJobs()
    fetchCandidates()
  }, [])

  useEffect(() => {
    if (syncData?.timestamp) {
      fetchCandidates()
    }
  }, [syncData?.timestamp])

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/jobs?status=active')
      const data = await res.json()
      setJobs(data)
      if (data.length > 0 && !selectedJob) {
        setSelectedJob(data[0]._id)
      }
    } catch (error) {
      console.error('Error fetching jobs:', error)
    }
  }

  const fetchCandidates = async () => {
    try {
      const query = selectedJob 
        ? `/api/matches?jobId=${selectedJob}&includeDetails=true`
        : '/api/matches?includeDetails=true'
      const res = await fetch(query)
      const data = await res.json()
      setCandidates(data)
    } catch (error) {
      console.error('Error fetching candidates:', error)
    }
  }

  useEffect(() => {
    if (selectedJob) {
      fetchCandidates()
    }
  }, [selectedJob])

  const handlePostJob = async () => {
    if (!jobTitle || !jobCompany || jobSkills.length < 2) return
    
    setViewState('matching')
    
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: jobTitle,
          company: jobCompany,
          requiredSkills: jobSkills,
          salaryRange: { min: jobSalary[0], max: jobSalary[1] },
          location: jobLocation,
          experienceLevel: jobExperience,
          remote: jobWorkMode === 'remote',
          status: 'active',
        }),
      })
      const newJob = await res.json()
      setSelectedJob(newJob._id)
      await fetchJobs()
      await fetchCandidates()
      onRefresh()
    } catch (error) {
      console.error('Error posting job:', error)
    }
  }

  const handleMatchingComplete = () => {
    setViewState('candidates')
  }

  const updateMatchStatus = async (matchId: string, status: string) => {
    try {
      await fetch('/api/matches', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: matchId, status }),
      })
      fetchCandidates()
      onRefresh()
    } catch (error) {
      console.error('Error updating match:', error)
    }
  }

  const toggleCompare = (candidate: any) => {
    setCompareList(prev => {
      const exists = prev.find(c => c._id === candidate._id)
      if (exists) return prev.filter(c => c._id !== candidate._id)
      if (prev.length >= 3) return prev // Max 3
      return [...prev, candidate]
    })
  }

  const batchInvite = async (minScore: number) => {
    const toInvite = filteredCandidates.filter(c => c.matchScore >= minScore && c.status === 'pending')
    for (const c of toInvite) {
      await updateMatchStatus(c._id, 'invited')
    }
  }

  // Filter and sort candidates
  const filteredCandidates = useMemo(() => {
    let result = candidates.filter(c => {
      if (c.matchScore < filterScore) return false
      if (c.skillMatch < filterSkillMatch) return false
      return true
    })

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'skills': return b.skillMatch - a.skillMatch
        case 'location': return b.locationMatch - a.locationMatch
        case 'salary': return b.salaryMatch - a.salaryMatch
        default: return b.matchScore - a.matchScore
      }
    })

    return result
  }, [candidates, filterScore, filterSkillMatch, sortBy])

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-taupe', text: 'text-warmgrey', label: 'New' },
      applied: { bg: 'bg-score-good/10', text: 'text-score-good', label: 'Applied' },
      invited: { bg: 'bg-score-excellent/10', text: 'text-score-excellent', label: 'Invited' },
      rejected: { bg: 'bg-score-poor/10', text: 'text-score-poor', label: 'Rejected' },
      saved: { bg: 'bg-gold/10', text: 'text-gold', label: 'Shortlisted' },
    }
    return badges[status] || badges.pending
  }

  // ============ RENDER MATCHING LOADER ============
  if (viewState === 'matching') {
    return (
      <MatchingLoader 
        isActive={true} 
        totalJobs={syncData?.stats?.totalJobseekers || 30}
        onComplete={handleMatchingComplete}
      />
    )
  }

  // ============ RENDER POST JOB FORM ============
  if (viewState === 'post-job') {
    const canPost = jobTitle && jobCompany && jobSkills.length >= 2 && jobLocation

    return (
      <div className="max-w-2xl mx-auto py-8 px-6 animate-fadeInUp">
        {/* Header */}
        <div className="mb-10">
          <div className="overline mb-3">Post a Job</div>
          <h1 className="font-serif text-3xl md:text-4xl text-charcoal mb-2">
            Find Your <em className="text-gold">Perfect</em> Candidate
          </h1>
          <p className="text-warmgrey">Define your requirements and let AI find the best matches.</p>
        </div>

        {/* Job Details */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="overline mb-3 block">Job Title <span className="text-gold">*</span></label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Senior Software Engineer"
              className="input-luxury"
            />
          </div>
          <div>
            <label className="overline mb-3 block">Company <span className="text-gold">*</span></label>
            <input
              type="text"
              value={jobCompany}
              onChange={(e) => setJobCompany(e.target.value)}
              placeholder="Your Company"
              className="input-luxury"
            />
          </div>
        </div>

        {/* Required Skills */}
        <div className="mb-8">
          <label className="overline mb-3 block">Required Skills <span className="text-gold">*</span></label>
          <SkillAutocomplete 
            skills={jobSkills}
            onChange={setJobSkills}
            placeholder="Type to add required skills..."
          />
        </div>

        {/* Salary Budget */}
        <SalaryRangeSlider
          value={jobSalary}
          onChange={setJobSalary}
          min={0}
          max={100}
          label="Salary Budget (LPA)"
        />

        {/* Work Mode */}
        <WorkModeToggle
          value={jobWorkMode}
          onChange={setJobWorkMode}
        />

        {/* Location */}
        <LocationSelector
          value={jobLocation}
          onChange={setJobLocation}
        />

        {/* Experience Level */}
        <ExperienceSelector
          value={jobExperience}
          onChange={setJobExperience}
        />

        {/* Validation */}
        {!canPost && (
          <div className="mb-6 p-4 bg-gold/10 border-l-4 border-gold text-sm text-charcoal">
            <strong>Almost there!</strong> Add job title, company, at least 2 skills, and location.
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-charcoal/10">
          <button
            onClick={() => setViewState('dashboard')}
            className="text-warmgrey hover:text-charcoal transition-colors duration-300"
          >
            ← Back to Dashboard
          </button>
          <button
            onClick={handlePostJob}
            disabled={!canPost}
            className="btn-luxury disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              Find Candidates
            </span>
          </button>
        </div>
      </div>
    )
  }

  // ============ RENDER DASHBOARD / CANDIDATES ============
  return (
    <div className="flex h-full">
      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {/* Stats Overview */}
        {syncData?.stats && (
          <div className="p-6 border-b border-charcoal/10">
            <div className="grid grid-cols-4 gap-4">
              <StatCard 
                icon={<Briefcase className="w-5 h-5" />}
                label="Active Jobs"
                value={syncData.stats.totalJobs}
              />
              <StatCard 
                icon={<Users className="w-5 h-5" />}
                label="Candidates"
                value={syncData.stats.totalJobseekers}
              />
              <StatCard 
                icon={<TrendingUp className="w-5 h-5" />}
                label="Matches"
                value={syncData.stats.totalMatches}
              />
              <StatCard 
                icon={<Award className="w-5 h-5" />}
                label="Avg Match"
                value={`${syncData.stats.averageScore || 0}%`}
              />
            </div>
          </div>
        )}

        {/* Match Distribution */}
        {syncData?.stats?.distribution && (
          <div className="p-6 border-b border-charcoal/10">
            <h3 className="overline mb-4">Match Quality Distribution</h3>
            <div className="flex gap-3">
              {[
                { label: 'Excellent', value: syncData.stats.distribution.excellent, color: 'bg-score-excellent' },
                { label: 'Good', value: syncData.stats.distribution.good, color: 'bg-score-good' },
                { label: 'Fair', value: syncData.stats.distribution.fair, color: 'bg-score-fair' },
                { label: 'Poor', value: syncData.stats.distribution.poor, color: 'bg-score-poor' },
              ].map(item => (
                <div key={item.label} className="flex-1 p-4 bg-taupe/30 text-center">
                  <div className={`w-3 h-3 ${item.color} mx-auto mb-2`} />
                  <div className="font-serif text-2xl text-charcoal">{item.value}</div>
                  <div className="text-xs text-warmgrey">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Job Selector & Actions */}
        <div className="p-6 border-b border-charcoal/10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="overline mb-1">Viewing Candidates For</div>
              <select
                value={selectedJob || ''}
                onChange={(e) => setSelectedJob(e.target.value)}
                className="font-serif text-xl text-charcoal bg-transparent border-none p-0 cursor-pointer focus:outline-none"
              >
                <option value="">All Jobs</option>
                {jobs.map((job) => (
                  <option key={job._id} value={job._id}>
                    {job.title} - {job.company}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setViewState('post-job')}
              className="btn-luxury"
            >
              <span className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Post New Job
              </span>
            </button>
          </div>

          {/* Filters & Sort */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 border transition-all duration-300
                ${showFilters ? 'bg-charcoal text-white border-charcoal' : 'border-charcoal/20 text-charcoal hover:border-charcoal'}
              `}
            >
              <Filter className="w-4 h-4" />
              Filters
              {(filterScore > 0 || filterSkillMatch > 0) && (
                <span className="w-2 h-2 bg-gold" />
              )}
            </button>

            {/* Sort buttons */}
            <div className="flex items-center gap-1 ml-auto">
              <span className="text-xs text-warmgrey mr-2">Sort by:</span>
              {[
                { id: 'score', label: 'Score' },
                { id: 'skills', label: 'Skills' },
                { id: 'location', label: 'Location' },
                { id: 'salary', label: 'Salary' },
              ].map(sort => (
                <button
                  key={sort.id}
                  onClick={() => setSortBy(sort.id as any)}
                  className={`px-3 py-1.5 text-xs font-medium transition-all duration-300
                    ${sortBy === sort.id 
                      ? 'bg-charcoal text-white' 
                      : 'bg-taupe/50 text-warmgrey hover:bg-taupe'}
                  `}
                >
                  {sort.label}
                </button>
              ))}
            </div>
          </div>

          {/* Expandable filters */}
          {showFilters && (
            <div className="mt-4 p-4 bg-taupe/20 animate-fadeInUp">
              <div className="grid md:grid-cols-2 gap-6">
                <SingleSlider
                  value={filterScore}
                  onChange={setFilterScore}
                  min={0}
                  max={100}
                  label="Min Match Score"
                  formatValue={(v) => `${v}%`}
                />
                <SingleSlider
                  value={filterSkillMatch}
                  onChange={setFilterSkillMatch}
                  min={0}
                  max={100}
                  label="Min Skill Match"
                  formatValue={(v) => `${v}%`}
                />
              </div>
              <button
                onClick={() => { setFilterScore(0); setFilterSkillMatch(0); }}
                className="text-sm text-warmgrey hover:text-charcoal mt-3"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        {/* Candidate Leaderboard */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-xl text-charcoal">
              Candidate Leaderboard
              <span className="text-warmgrey font-sans text-sm ml-2">
                ({filteredCandidates.length} candidates)
              </span>
            </h3>
            {filteredCandidates.filter(c => c.matchScore >= 80 && c.status === 'pending').length > 0 && (
              <button
                onClick={() => batchInvite(80)}
                className="flex items-center gap-2 px-3 py-1.5 border border-score-excellent/30 text-score-excellent text-xs tracking-wider uppercase hover:bg-score-excellent/10 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                Invite All 80%+
              </button>
            )}
          </div>

          {filteredCandidates.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto mb-6 bg-taupe flex items-center justify-center">
                <Users className="w-10 h-10 text-warmgrey" />
              </div>
              <h3 className="font-serif text-2xl text-charcoal mb-2">No Candidates Yet</h3>
              <p className="text-warmgrey mb-6">Post a job or load demo data to see candidates</p>
              <button onClick={() => setViewState('post-job')} className="btn-secondary">
                Post a Job
              </button>
            </div>
          ) : (
            <div className="space-y-0">
              {filteredCandidates.map((candidate, index) => (
                <CandidateRow
                  key={candidate._id}
                  candidate={candidate}
                  rank={index + 1}
                  isActive={candidate.jobseekerId === activeJobseeker}
                  isSelected={selectedCandidate?._id === candidate._id}
                  isComparing={compareList.some((c: any) => c._id === candidate._id)}
                  statusBadge={getStatusBadge(candidate.status)}
                  onSelect={() => setSelectedCandidate(candidate)}
                  onInvite={() => updateMatchStatus(candidate._id, 'invited')}
                  onReject={() => updateMatchStatus(candidate._id, 'rejected')}
                  onShortlist={() => updateMatchStatus(candidate._id, 'saved')}
                  onToggleCompare={() => toggleCompare(candidate)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Candidate Detail Panel */}
      {selectedCandidate && !showComparison && (
        <div className="w-96 border-l border-charcoal/10 overflow-y-auto animate-slideInRight">
          <CandidateDetailPanel
            candidate={selectedCandidate}
            onClose={() => setSelectedCandidate(null)}
            onInvite={() => updateMatchStatus(selectedCandidate._id, 'invited')}
            onReject={() => updateMatchStatus(selectedCandidate._id, 'rejected')}
            onShortlist={() => updateMatchStatus(selectedCandidate._id, 'saved')}
          />
        </div>
      )}

      {/* Comparison Panel */}
      {showComparison && compareList.length >= 2 && (
        <div className="fixed inset-0 bg-charcoal/50 z-50 flex items-center justify-center p-6">
          <ComparisonModal
            candidates={compareList}
            onClose={() => setShowComparison(false)}
          />
        </div>
      )}

      {/* Floating Compare Bar */}
      {compareList.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-charcoal text-white p-4 z-40 animate-fadeInUp">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GitCompare className="w-5 h-5 text-gold" />
              <span className="text-sm">{compareList.length} candidate{compareList.length > 1 ? 's' : ''} selected</span>
              <div className="flex gap-2 ml-2">
                {compareList.map(c => (
                  <span key={c._id} className="px-2 py-1 bg-white/10 text-xs">
                    {c.jobseeker?.name || 'Candidate'}
                    <button onClick={() => toggleCompare(c)} className="ml-1 text-warmgrey hover:text-white">×</button>
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCompareList([])}
                className="text-xs text-warmgrey hover:text-white transition-colors"
              >
                Clear
              </button>
              <button
                onClick={() => setShowComparison(true)}
                disabled={compareList.length < 2}
                className="px-4 py-2 bg-gold text-charcoal text-xs tracking-widest uppercase font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gold/90 transition-colors"
              >
                Compare
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Stat Card Component
function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="p-4 bg-taupe/20">
      <div className="flex items-center gap-2 text-warmgrey mb-2">
        {icon}
        <span className="text-xs tracking-wider uppercase">{label}</span>
      </div>
      <div className="font-serif text-3xl text-charcoal">{value}</div>
    </div>
  )
}

// Candidate Row Component
function CandidateRow({ 
  candidate, 
  rank,
  isActive,
  isSelected,
  isComparing,
  statusBadge,
  onSelect,
  onInvite,
  onReject,
  onShortlist,
  onToggleCompare,
}: { 
  candidate: any
  rank: number
  isActive: boolean
  isSelected: boolean
  isComparing: boolean
  statusBadge: { bg: string; text: string; label: string }
  onSelect: () => void
  onInvite: () => void
  onReject: () => void
  onShortlist: () => void
  onToggleCompare: () => void
}) {
  return (
    <div 
      onClick={onSelect}
      className={`border-t border-charcoal/10 py-5 cursor-pointer transition-all duration-500 group
        ${isSelected ? 'bg-taupe/30 border-l-4 border-l-gold pl-5' : 'hover:bg-taupe/20'}
        ${isActive ? 'ring-2 ring-gold/30' : ''}
        ${isComparing ? 'bg-gold/5' : ''}
      `}
    >
      <div className="flex items-center gap-4">
        {/* Compare checkbox */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleCompare(); }}
          className={`w-5 h-5 border flex-shrink-0 flex items-center justify-center transition-all
            ${isComparing ? 'bg-gold border-gold' : 'border-charcoal/20 hover:border-gold'}
          `}
          title="Add to compare"
        >
          {isComparing && <Check className="w-3 h-3 text-white" />}
        </button>
        {/* Rank & Medal */}
        <div className="w-10 flex-shrink-0 text-center">
          <LeaderboardMedal rank={rank} />
        </div>

        {/* Avatar */}
        <div className="w-12 h-12 bg-charcoal text-white flex items-center justify-center font-serif text-lg flex-shrink-0">
          {candidate.jobseeker?.name?.[0]?.toUpperCase() || '?'}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-serif text-lg text-charcoal group-hover:text-gold transition-colors duration-300">
              {candidate.jobseeker?.name || 'Candidate'}
            </h4>
            <span className={`px-2 py-0.5 text-[10px] tracking-wider uppercase ${statusBadge.bg} ${statusBadge.text}`}>
              {statusBadge.label}
            </span>
            {isActive && (
              <span className="px-2 py-0.5 bg-gold text-white text-[10px] tracking-wider uppercase animate-pulse">
                Active
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs text-warmgrey">
            {candidate.jobseeker?.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {candidate.jobseeker.location}
              </span>
            )}
            {candidate.job?.title && (
              <span className="flex items-center gap-1">
                <Briefcase className="w-3 h-3" />
                {candidate.job.title}
              </span>
            )}
          </div>

          {/* Skills preview */}
          {candidate.jobseeker?.skills?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {candidate.jobseeker.skills.slice(0, 3).map((skill: string) => (
                <span key={skill} className="px-2 py-0.5 bg-taupe text-xs text-warmgrey">
                  {skill}
                </span>
              ))}
              {candidate.jobseeker.skills.length > 3 && (
                <span className="text-xs text-warmgrey">+{candidate.jobseeker.skills.length - 3}</span>
              )}
            </div>
          )}
        </div>

        {/* Score */}
        <ScoreBadge score={candidate.matchScore} size="md" showLabel />

        {/* Mini score bars */}
        <div className="w-32 hidden lg:block">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-warmgrey w-12">Skills</span>
              <div className="flex-1 h-1 bg-taupe">
                <div className="h-full bg-charcoal transition-all duration-500" style={{ width: `${candidate.skillMatch}%` }} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-warmgrey w-12">Exp</span>
              <div className="flex-1 h-1 bg-taupe">
                <div className="h-full bg-charcoal transition-all duration-500" style={{ width: `${candidate.experienceMatch}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onInvite(); }}
            className="p-2 hover:bg-score-excellent/10 text-score-excellent transition-colors duration-300"
            title="Invite"
          >
            <CheckCircle className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onShortlist(); }}
            className="p-2 hover:bg-gold/10 text-gold transition-colors duration-300"
            title="Shortlist"
          >
            <Star className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onReject(); }}
            className="p-2 hover:bg-score-poor/10 text-score-poor transition-colors duration-300"
            title="Reject"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Candidate Detail Panel
function CandidateDetailPanel({ 
  candidate, 
  onClose, 
  onInvite, 
  onReject, 
  onShortlist 
}: { 
  candidate: any
  onClose: () => void
  onInvite: () => void
  onReject: () => void
  onShortlist: () => void
}) {
  const jobseeker = candidate.jobseeker

  return (
    <div className="h-full flex flex-col bg-alabaster">
      {/* Header */}
      <div className="p-6 border-b border-charcoal/10">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-charcoal text-white flex items-center justify-center font-serif text-2xl">
              {jobseeker?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <h2 className="font-serif text-2xl text-charcoal">{jobseeker?.name || 'Candidate'}</h2>
              <p className="text-warmgrey">{jobseeker?.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-taupe transition-colors duration-300">
            <X className="w-5 h-5 text-warmgrey" />
          </button>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap gap-4 text-sm text-warmgrey">
          {jobseeker?.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {jobseeker.location}
            </span>
          )}
          {jobseeker?.phone && (
            <span className="flex items-center gap-1">
              <Phone className="w-4 h-4" />
              {jobseeker.phone}
            </span>
          )}
        </div>
      </div>

      {/* Score */}
      <div className="p-6 border-b border-charcoal/10">
        <div className="flex items-center gap-4 mb-6">
          <div className={`text-5xl font-serif ${
            candidate.matchScore >= 85 ? 'text-score-excellent' :
            candidate.matchScore >= 70 ? 'text-score-good' :
            candidate.matchScore >= 50 ? 'text-score-fair' : 'text-score-poor'
          } score-glow`}>
            {candidate.matchScore}%
          </div>
          <div>
            <div className="font-medium text-charcoal">Compatibility Score</div>
            <div className="text-sm text-warmgrey">Based on 4 dimensions</div>
          </div>
        </div>

        <AnimatedScoreBar label="Skills Match" score={candidate.skillMatch} delay={100} />
        <AnimatedScoreBar label="Experience Match" score={candidate.experienceMatch} delay={200} />
        <AnimatedScoreBar label="Location Match" score={candidate.locationMatch} delay={300} />
        <AnimatedScoreBar label="Salary Match" score={candidate.salaryMatch} delay={400} />
      </div>

      {/* Skills */}
      <div className="p-6 flex-1 overflow-y-auto">
        {jobseeker?.skills?.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-charcoal mb-3">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {jobseeker.skills.map((skill: string) => (
                <span key={skill} className="skill-pill">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Match reasons */}
        {candidate.reasons?.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-charcoal mb-3">Why They Match</h3>
            <div className="space-y-2">
              {candidate.reasons.map((reason: string, i: number) => (
                <p key={i} className="text-sm text-warmgrey flex gap-2">
                  <span className="text-gold">→</span>
                  {reason}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Experience */}
        {jobseeker?.experience?.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-charcoal mb-3">Experience</h3>
            <div className="space-y-4">
              {jobseeker.experience.map((exp: any, i: number) => (
                <div key={i} className="border-l-2 border-taupe pl-4">
                  <div className="font-medium text-charcoal">{exp.title}</div>
                  <div className="text-sm text-warmgrey">{exp.company} • {exp.duration}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-6 border-t border-charcoal/10">
        <div className="grid grid-cols-3 gap-3">
          <button onClick={onInvite} className="btn-luxury text-center">
            <span>Invite</span>
          </button>
          <button onClick={onShortlist} className="btn-secondary text-center">
            Shortlist
          </button>
          <button 
            onClick={onReject}
            className="py-3 px-4 border border-score-poor/30 text-score-poor text-xs tracking-widest uppercase hover:bg-score-poor/10 transition-colors duration-300"
          >
            Reject
          </button>
        </div>
        <div className="flex items-center justify-center gap-4 mt-4">
          <button className="flex items-center gap-2 text-sm text-warmgrey hover:text-charcoal transition-colors duration-300">
            <Phone className="w-4 h-4" />
            Call
          </button>
          <button className="flex items-center gap-2 text-sm text-warmgrey hover:text-charcoal transition-colors duration-300">
            <Mail className="w-4 h-4" />
            Email
          </button>
        </div>
      </div>
    </div>
  )
}

// Comparison Modal
function ComparisonModal({ candidates, onClose }: { candidates: any[]; onClose: () => void }) {
  const dimensions = [
    { key: 'matchScore', label: 'Overall Match' },
    { key: 'skillMatch', label: 'Skills' },
    { key: 'experienceMatch', label: 'Experience' },
    { key: 'locationMatch', label: 'Location' },
    { key: 'salaryMatch', label: 'Salary' },
  ]

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-score-excellent'
    if (score >= 70) return 'text-score-good'
    if (score >= 50) return 'text-score-fair'
    return 'text-score-poor'
  }

  const getBarColor = (score: number) => {
    if (score >= 85) return 'bg-score-excellent'
    if (score >= 70) return 'bg-score-good'
    if (score >= 50) return 'bg-score-fair'
    return 'bg-score-poor'
  }

  // Find best score per dimension
  const bestScores: Record<string, number> = {}
  for (const dim of dimensions) {
    bestScores[dim.key] = Math.max(...candidates.map(c => c[dim.key] || 0))
  }

  // Collect all skills across candidates
  const allSkillsSet: Record<string, boolean> = {}
  candidates.forEach(c => (c.jobseeker?.skills || []).forEach((s: string) => { allSkillsSet[s] = true }))
  const allSkills = Object.keys(allSkillsSet)

  return (
    <div className="bg-alabaster w-full max-w-4xl max-h-[85vh] overflow-y-auto animate-scaleIn shadow-2xl">
      {/* Header */}
      <div className="sticky top-0 bg-charcoal text-white p-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <GitCompare className="w-5 h-5 text-gold" />
          <h2 className="font-serif text-xl">Candidate Comparison</h2>
          <span className="text-xs text-warmgrey ml-2">{candidates.length} candidates</span>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Candidate Headers */}
      <div className="grid border-b border-charcoal/10" style={{ gridTemplateColumns: `200px repeat(${candidates.length}, 1fr)` }}>
        <div className="p-4" />
        {candidates.map(c => (
          <div key={c._id} className="p-4 text-center border-l border-charcoal/10">
            <div className="w-14 h-14 bg-charcoal text-white flex items-center justify-center font-serif text-xl mx-auto mb-2">
              {c.jobseeker?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="font-serif text-lg text-charcoal">{c.jobseeker?.name || 'Candidate'}</div>
            <div className="text-xs text-warmgrey flex items-center justify-center gap-1 mt-1">
              <MapPin className="w-3 h-3" />
              {c.jobseeker?.location || 'N/A'}
            </div>
          </div>
        ))}
      </div>

      {/* Score Dimensions */}
      <div className="border-b border-charcoal/10">
        <div className="p-4 overline">Score Breakdown</div>
        {dimensions.map(dim => (
          <div 
            key={dim.key} 
            className="grid border-t border-charcoal/5 hover:bg-taupe/20 transition-colors"
            style={{ gridTemplateColumns: `200px repeat(${candidates.length}, 1fr)` }}
          >
            <div className="p-4 flex items-center text-sm text-warmgrey font-medium">{dim.label}</div>
            {candidates.map(c => {
              const score = c[dim.key] || 0
              const isBest = score === bestScores[dim.key] && candidates.length > 1
              return (
                <div key={c._id} className="p-4 border-l border-charcoal/5">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-serif text-2xl ${getScoreColor(score)} ${isBest ? 'score-glow' : ''}`}>
                      {score}%
                    </span>
                    {isBest && (
                      <span className="px-1.5 py-0.5 bg-gold/10 text-gold text-[9px] tracking-wider uppercase">Best</span>
                    )}
                  </div>
                  <div className="h-1.5 bg-taupe">
                    <div className={`h-full ${getBarColor(score)} transition-all duration-700`} style={{ width: `${score}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Skill Comparison */}
      <div className="p-4">
        <div className="overline mb-4">Skill Coverage</div>
        <div 
          className="grid gap-2"
          style={{ gridTemplateColumns: `200px repeat(${candidates.length}, 1fr)` }}
        >
          <div className="text-xs text-warmgrey font-medium p-2">Skill</div>
          {candidates.map(c => (
            <div key={c._id} className="text-xs text-warmgrey text-center p-2 font-medium">
              {c.jobseeker?.name?.split(' ')[0] || 'N/A'}
            </div>
          ))}
          {allSkills.slice(0, 15).map(skill => (
            <>
              <div key={`${skill}-label`} className="text-sm text-charcoal p-2 border-t border-charcoal/5">{skill}</div>
              {candidates.map(c => {
                const has = c.jobseeker?.skills?.includes(skill)
                return (
                  <div key={`${skill}-${c._id}`} className="flex items-center justify-center p-2 border-t border-charcoal/5 border-l border-charcoal/5">
                    {has ? (
                      <div className="w-5 h-5 bg-score-excellent/10 flex items-center justify-center">
                        <Check className="w-3 h-3 text-score-excellent" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 bg-score-poor/5 flex items-center justify-center">
                        <X className="w-3 h-3 text-warmgrey/30" />
                      </div>
                    )}
                  </div>
                )
              })}
            </>
          ))}
        </div>
      </div>
    </div>
  )
}
