'use client'

import { useState, useEffect } from 'react'
import { 
  BarChart3, TrendingUp, Target, Zap, Brain, Layers, 
  ArrowUpRight, ArrowDownRight, Minus, RefreshCw, AlertTriangle
} from 'lucide-react'

interface ReportData {
  algorithmStats: {
    totalMatches: number
    totalJobs: number
    totalCandidates: number
    storedMatches: number
    averageScore: number
    qualityIndex: number
    scoreDistribution: { excellent: number; good: number; fair: number; poor: number }
    scoreHistogram: number[]
    dimensionAverages: { skills: number; experience: number; location: number; salary: number }
    embeddingVsSemanticDelta: number
    topSkillGaps: { skill: string; count: number }[]
    topReasons: string[]
  }
  feedbackAnalysis: {
    totalFeedback: number
    statusCounts: { pending: number; applied: number; invited: number; rejected: number; saved: number }
    precision: number | null
    avgInvitedScore: number | null
    avgRejectedScore: number | null
    scoreSeparation: number | null
  }
  jobAnalysis: {
    jobId: string
    title: string
    company: string
    totalCandidates: number
    avgScore: number
    topScore: number
    invited: number
    rejected: number
    weights: { skills: number; experience: number; location: number; salary: number }
    isAdapted: boolean
    weightDeviation: number
  }[]
  generatedAt: string
}

export default function AnalyticsReport() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchReport = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/report')
      if (!res.ok) throw new Error('Failed to fetch report')
      const report = await res.json()
      setData(report)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchReport() }, [])

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-12 px-8">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-taupe/50 w-64" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-taupe/30" />)}
          </div>
          <div className="h-64 bg-taupe/30" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-48 bg-taupe/30" />
            <div className="h-48 bg-taupe/30" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="max-w-6xl mx-auto py-16 px-8 text-center">
        <AlertTriangle className="w-12 h-12 text-gold mx-auto mb-4" />
        <h2 className="font-serif text-2xl text-charcoal mb-2">Could not load report</h2>
        <p className="text-warmgrey mb-6">{error || 'No data available'}</p>
        <button onClick={fetchReport} className="btn-secondary">Try Again</button>
      </div>
    )
  }

  const { algorithmStats: stats, feedbackAnalysis: feedback, jobAnalysis } = data
  const histMax = Math.max(...stats.scoreHistogram, 1)

  return (
    <div className="max-w-6xl mx-auto py-8 px-8 lg:px-12 animate-fadeInUp">
      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <div className="overline mb-2">Deliverable 4</div>
          <h1 className="font-serif text-3xl md:text-4xl text-charcoal mb-1">
            Algorithm <em className="text-gold">Performance</em> Report
          </h1>
          <p className="text-warmgrey text-sm">
            Generated {new Date(data.generatedAt).toLocaleString()}
          </p>
        </div>
        <button onClick={fetchReport} className="flex items-center gap-2 px-4 py-2 border border-charcoal/20 text-xs tracking-widest uppercase text-charcoal hover:bg-charcoal hover:text-white transition-all duration-300">
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <KPICard 
          icon={<Target className="w-5 h-5" />}
          label="Quality Index"
          value={stats.qualityIndex}
          suffix="%"
          trend={stats.qualityIndex >= 70 ? 'up' : stats.qualityIndex >= 50 ? 'neutral' : 'down'}
        />
        <KPICard 
          icon={<BarChart3 className="w-5 h-5" />}
          label="Avg Match Score"
          value={stats.averageScore}
          suffix="%"
          trend={stats.averageScore >= 65 ? 'up' : 'neutral'}
        />
        <KPICard 
          icon={<Brain className="w-5 h-5" />}
          label="Embedding Delta"
          value={Math.abs(stats.embeddingVsSemanticDelta)}
          suffix="pts"
          description={stats.embeddingVsSemanticDelta > 0 ? 'Embeddings score higher' : stats.embeddingVsSemanticDelta < 0 ? 'Semantic scores higher' : 'Scores aligned'}
        />
        <KPICard 
          icon={<Zap className="w-5 h-5" />}
          label="Precision"
          value={feedback.precision ?? 0}
          suffix="%"
          description={feedback.totalFeedback > 0 ? `${feedback.totalFeedback} feedback signals` : 'No feedback yet'}
          trend={feedback.precision !== null && feedback.precision >= 60 ? 'up' : 'neutral'}
        />
      </div>

      {/* Score Histogram + Distribution */}
      <div className="grid md:grid-cols-3 gap-6 mb-10">
        {/* Histogram */}
        <div className="md:col-span-2 border-t border-charcoal pt-6">
          <h3 className="overline mb-1">Score Distribution Histogram</h3>
          <p className="text-xs text-warmgrey mb-6">{stats.totalMatches} total match calculations</p>
          
          <div className="flex items-end gap-1 h-40">
            {stats.scoreHistogram.map((count, i) => {
              const height = (count / histMax) * 100
              const label = `${i * 10}-${i === 9 ? 100 : (i + 1) * 10 - 1}`
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-warmgrey">{count}</span>
                  <div 
                    className="w-full transition-all duration-700 ease-luxury"
                    style={{ 
                      height: `${Math.max(height, 2)}%`,
                      background: i >= 8 ? '#10B981' : i >= 7 ? '#3B82F6' : i >= 5 ? '#F59E0B' : '#EF4444',
                      opacity: count > 0 ? 1 : 0.2,
                    }}
                  />
                  <span className="text-[9px] text-warmgrey">{label}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Quality Breakdown */}
        <div className="border-t border-charcoal pt-6">
          <h3 className="overline mb-6">Quality Breakdown</h3>
          <div className="space-y-4">
            {[
              { label: 'Excellent', value: stats.scoreDistribution.excellent, color: 'bg-score-excellent', range: '85-100' },
              { label: 'Good', value: stats.scoreDistribution.good, color: 'bg-score-good', range: '70-84' },
              { label: 'Fair', value: stats.scoreDistribution.fair, color: 'bg-score-fair', range: '50-69' },
              { label: 'Poor', value: stats.scoreDistribution.poor, color: 'bg-score-poor', range: '0-49' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-charcoal font-medium">{item.label} <span className="text-warmgrey">({item.range})</span></span>
                  <span className="text-charcoal font-serif text-lg">{item.value}</span>
                </div>
                <div className="h-1.5 bg-taupe">
                  <div 
                    className={`h-full ${item.color} transition-all duration-700`} 
                    style={{ width: `${stats.totalMatches ? (item.value / stats.totalMatches) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dimension Analysis + Feedback */}
      <div className="grid md:grid-cols-2 gap-6 mb-10">
        {/* Dimension Averages */}
        <div className="border-t border-charcoal pt-6">
          <h3 className="overline mb-6">Matching Dimension Averages</h3>
          <div className="space-y-5">
            {[
              { key: 'skills', label: 'Skills Match', icon: <Layers className="w-4 h-4" /> },
              { key: 'experience', label: 'Experience Match', icon: <TrendingUp className="w-4 h-4" /> },
              { key: 'location', label: 'Location Match', icon: <Target className="w-4 h-4" /> },
              { key: 'salary', label: 'Salary Match', icon: <BarChart3 className="w-4 h-4" /> },
            ].map(dim => {
              const val = stats.dimensionAverages[dim.key as keyof typeof stats.dimensionAverages]
              return (
                <div key={dim.key}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-sm text-charcoal">
                      {dim.icon}
                      {dim.label}
                    </div>
                    <span className="font-serif text-xl text-charcoal">{val}%</span>
                  </div>
                  <div className="h-2 bg-taupe">
                    <div 
                      className="h-full bg-charcoal transition-all duration-700 ease-luxury"
                      style={{ width: `${val}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Feedback Analysis */}
        <div className="border-t border-charcoal pt-6">
          <h3 className="overline mb-6">Employer Feedback Analysis</h3>
          
          {feedback.totalFeedback === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-taupe/50 mx-auto mb-4 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-warmgrey" />
              </div>
              <p className="text-warmgrey text-sm">No employer feedback yet.</p>
              <p className="text-warmgrey/60 text-xs mt-1">Invite or reject candidates to generate feedback signals.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Status breakdown */}
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(feedback.statusCounts).map(([status, count]) => (
                  <div key={status} className="text-center p-3 bg-taupe/20">
                    <div className="font-serif text-xl text-charcoal">{count}</div>
                    <div className="text-[10px] tracking-wider uppercase text-warmgrey">{status}</div>
                  </div>
                ))}
              </div>

              {/* Score separation */}
              {feedback.avgInvitedScore !== null && feedback.avgRejectedScore !== null && (
                <div className="p-4 bg-taupe/20">
                  <div className="text-xs text-warmgrey mb-3">Score Separation (higher = better algorithm)</div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 text-center">
                      <div className="text-score-excellent font-serif text-2xl">{feedback.avgInvitedScore}%</div>
                      <div className="text-[10px] text-warmgrey">Avg Invited</div>
                    </div>
                    <div className="text-center">
                      <div className={`font-serif text-xl ${(feedback.scoreSeparation || 0) > 10 ? 'text-score-excellent' : 'text-score-fair'}`}>
                        +{feedback.scoreSeparation || 0}
                      </div>
                      <div className="text-[10px] text-warmgrey">Gap</div>
                    </div>
                    <div className="flex-1 text-center">
                      <div className="text-score-poor font-serif text-2xl">{feedback.avgRejectedScore}%</div>
                      <div className="text-[10px] text-warmgrey">Avg Rejected</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Skill Gap Analysis */}
      {stats.topSkillGaps.length > 0 && (
        <div className="border-t border-charcoal pt-6 mb-10">
          <h3 className="overline mb-1">Top Skill Gaps Across All Matches</h3>
          <p className="text-xs text-warmgrey mb-6">Most frequently missing skills across all candidate-job pairs</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.topSkillGaps.map((gap, i) => (
              <div key={gap.skill} className="p-4 bg-taupe/20 border-l-2 border-l-gold">
                <div className="font-serif text-lg text-charcoal mb-1">{gap.skill}</div>
                <div className="text-xs text-warmgrey">Missing in {gap.count} match{gap.count !== 1 ? 'es' : ''}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-Job Analysis */}
      {jobAnalysis.length > 0 && (
        <div className="border-t border-charcoal pt-6 mb-10">
          <h3 className="overline mb-1">Per-Job Analysis</h3>
          <p className="text-xs text-warmgrey mb-6">Performance breakdown and adaptive weight status for each job posting</p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-charcoal text-left">
                  <th className="pb-3 text-xs tracking-wider uppercase text-warmgrey font-medium">Job</th>
                  <th className="pb-3 text-xs tracking-wider uppercase text-warmgrey font-medium text-center">Candidates</th>
                  <th className="pb-3 text-xs tracking-wider uppercase text-warmgrey font-medium text-center">Avg</th>
                  <th className="pb-3 text-xs tracking-wider uppercase text-warmgrey font-medium text-center">Top</th>
                  <th className="pb-3 text-xs tracking-wider uppercase text-warmgrey font-medium text-center">Invited</th>
                  <th className="pb-3 text-xs tracking-wider uppercase text-warmgrey font-medium text-center">Rejected</th>
                  <th className="pb-3 text-xs tracking-wider uppercase text-warmgrey font-medium text-center">Weights</th>
                </tr>
              </thead>
              <tbody>
                {jobAnalysis.map(job => (
                  <tr key={job.jobId} className="border-b border-charcoal/10 hover:bg-taupe/20 transition-colors">
                    <td className="py-4">
                      <div className="font-medium text-charcoal">{job.title}</div>
                      <div className="text-xs text-warmgrey">{job.company}</div>
                    </td>
                    <td className="py-4 text-center font-serif text-lg">{job.totalCandidates}</td>
                    <td className="py-4 text-center">
                      <span className={`font-serif text-lg ${job.avgScore >= 70 ? 'text-score-excellent' : job.avgScore >= 50 ? 'text-score-fair' : 'text-score-poor'}`}>
                        {job.avgScore}%
                      </span>
                    </td>
                    <td className="py-4 text-center font-serif text-lg text-score-excellent">{job.topScore}%</td>
                    <td className="py-4 text-center">
                      <span className="px-2 py-1 bg-score-excellent/10 text-score-excellent text-xs">{job.invited}</span>
                    </td>
                    <td className="py-4 text-center">
                      <span className="px-2 py-1 bg-score-poor/10 text-score-poor text-xs">{job.rejected}</span>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-1 justify-center">
                        {job.isAdapted ? (
                          <span className="px-2 py-1 bg-gold/10 text-gold text-[10px] tracking-wider uppercase">Adapted</span>
                        ) : (
                          <span className="px-2 py-1 bg-taupe text-warmgrey text-[10px] tracking-wider uppercase">Default</span>
                        )}
                      </div>
                      <div className="flex gap-1 mt-1 justify-center">
                        <WeightDot label="S" value={job.weights.skills} />
                        <WeightDot label="E" value={job.weights.experience} />
                        <WeightDot label="L" value={job.weights.location} />
                        <WeightDot label="$" value={job.weights.salary} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Algorithm Info */}
      <div className="border-t border-charcoal pt-6 pb-8">
        <h3 className="overline mb-4">Algorithm Architecture</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="p-5 bg-taupe/20">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-gold" />
              <span className="text-sm font-medium text-charcoal">Hybrid Skill Matching</span>
            </div>
            <p className="text-xs text-warmgrey leading-relaxed">
              Combines semantic skill graph (40+ skill families with Levenshtein fuzzy matching) 
              with 8-dimensional embedding vectors (cosine similarity). 
              Blended 70/30 for robust matching.
            </p>
          </div>
          <div className="p-5 bg-taupe/20">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-4 h-4 text-gold" />
              <span className="text-sm font-medium text-charcoal">Adaptive Weight Learning</span>
            </div>
            <p className="text-xs text-warmgrey leading-relaxed">
              Gradient-based weight adjustment per job posting. Learns from employer invite/reject 
              signals to optimize scoring dimensions (skills, experience, location, salary).
            </p>
          </div>
          <div className="p-5 bg-taupe/20">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-gold" />
              <span className="text-sm font-medium text-charcoal">Multi-Dimensional Scoring</span>
            </div>
            <p className="text-xs text-warmgrey leading-relaxed">
              4 scoring dimensions with configurable weights. Includes semantic location matching 
              with city/region graphs, salary overlap calculation, and experience-level gating.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// KPI Card Component
function KPICard({ 
  icon, label, value, suffix = '', description, trend 
}: { 
  icon: React.ReactNode
  label: string
  value: number
  suffix?: string
  description?: string
  trend?: 'up' | 'down' | 'neutral'
}) {
  return (
    <div className="p-5 bg-taupe/20 border-t-2 border-t-charcoal">
      <div className="flex items-center justify-between mb-3">
        <span className="text-warmgrey">{icon}</span>
        {trend === 'up' && <ArrowUpRight className="w-4 h-4 text-score-excellent" />}
        {trend === 'down' && <ArrowDownRight className="w-4 h-4 text-score-poor" />}
        {trend === 'neutral' && <Minus className="w-4 h-4 text-warmgrey" />}
      </div>
      <div className="font-serif text-3xl text-charcoal mb-1">
        {value}{suffix}
      </div>
      <div className="text-[10px] tracking-wider uppercase text-warmgrey">{label}</div>
      {description && <div className="text-[10px] text-warmgrey/60 mt-1">{description}</div>}
    </div>
  )
}

// Weight Dot
function WeightDot({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100)
  return (
    <div className="text-center" title={`${label}: ${pct}%`}>
      <div className="text-[9px] text-warmgrey">{label}</div>
      <div className="text-[10px] font-medium text-charcoal">{pct}</div>
    </div>
  )
}
