'use client'

import { useState, useEffect } from 'react'
import {
  X, Phone, PhoneCall, Mic, CheckCircle, AlertCircle,
  Loader, TrendingUp, Target, Brain, Users, Shield,
  ArrowRight, Sparkles, ChevronRight,
} from 'lucide-react'
import ScoreBadge from '../shared/ScoreBadge'

interface ScreeningModalProps {
  jobseeker: any
  job?: any
  onClose: () => void
}

type Step = 'consent' | 'phone-input' | 'calling' | 'analyzing' | 'results'

const DIMENSION_META: Record<string, { label: string; icon: any; color: string }> = {
  technicalDepth:       { label: 'Technical Depth',       icon: Brain,    color: 'text-blue-400' },
  communicationClarity: { label: 'Communication',         icon: Users,    color: 'text-purple-400' },
  problemSolving:       { label: 'Problem Solving',       icon: Target,   color: 'text-emerald-400' },
  cultureFit:           { label: 'Culture Fit',           icon: Shield,   color: 'text-amber-400' },
  confidence:           { label: 'Confidence',            icon: TrendingUp, color: 'text-rose-400' },
}

const READINESS_MAP: Record<string, { label: string; color: string }> = {
  ready:       { label: 'Interview Ready',   color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
  almost:      { label: 'Almost Ready',      color: 'bg-blue-500/20 text-blue-400 border-blue-500/40' },
  'needs-work':{ label: 'Needs Practice',    color: 'bg-amber-500/20 text-amber-400 border-amber-500/40' },
  'not-ready': { label: 'Not Ready Yet',     color: 'bg-red-500/20 text-red-400 border-red-500/40' },
}

export default function ScreeningModal({ jobseeker, job, onClose }: ScreeningModalProps) {
  const [step, setStep] = useState<Step>('consent')
  const [screening, setScreening] = useState<any>(null)
  const [phoneNumber, setPhoneNumber] = useState(jobseeker?.phone || '')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [pollTimer, setPollTimer] = useState<NodeJS.Timeout | null>(null)

  // Cleanup polling on unmount
  useEffect(() => {
    return () => { if (pollTimer) clearTimeout(pollTimer) }
  }, [pollTimer])

  /* ─── Start phone call ──────────────────────────────────────── */
  const startPhoneCall = async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter your phone number')
      return
    }
    setError('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/screenings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobseekerId: jobseeker._id,
          jobId: job?._id,
          phoneNumber: phoneNumber.trim(),
          mode: 'phone',
        }),
      })
      const data = await res.json()
      setScreening(data)

      if (data.mode === 'demo') {
        // Retell unavailable — skip to results placeholder
        setStep('results')
      } else {
        setStep('calling')
        pollCallStatus(data.screening._id || data.screening?._id)
      }
    } catch (err) {
      console.error('Start call error:', err)
      setError('Failed to start call. Please try again.')
    }
    setIsLoading(false)
  }

  /* ─── Poll for call completion ──────────────────────────────── */
  const pollCallStatus = (screeningId: string) => {
    const poll = async () => {
      try {
        const res = await fetch('/api/screenings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: screeningId, action: 'check-status' }),
        })
        const data = await res.json()

        if (data.hasTranscript || data.callStatus === 'ended' || data.callStatus === 'error') {
          // Fetch updated screening with AI evaluation
          setStep('analyzing')
          await waitForEvaluation(screeningId)
          return
        }
      } catch (err) {
        console.error('Poll error:', err)
      }
      // Keep polling every 4 seconds
      const t = setTimeout(poll, 4000)
      setPollTimer(t)
    }
    const t = setTimeout(poll, 5000) // first check after 5s
    setPollTimer(t)
  }

  /* ─── Wait for AI evaluation to complete ───────────────────── */
  const waitForEvaluation = async (screeningId: string, retries = 15) => {
    for (let i = 0; i < retries; i++) {
      await new Promise(r => setTimeout(r, 3000))
      try {
        const res = await fetch(`/api/screenings?id=${screeningId}`)
        const data = await res.json()
        if (data.status === 'completed' || data.aiEvaluation) {
          setScreening({ screening: data })
          setStep('results')
          return
        }
      } catch (err) {
        console.error('Eval poll error:', err)
      }
    }
    // Timeout — show whatever we have
    const res = await fetch(`/api/screenings?id=${screeningId}`)
    const data = await res.json()
    setScreening({ screening: data })
    setStep('results')
  }

  /* ─── Render helpers ────────────────────────────────────────── */
  const renderDimensionBar = (key: string, score: number) => {
    const meta = DIMENSION_META[key]
    if (!meta) return null
    const Icon = meta.icon
    return (
      <div key={key} className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-charcoal">
            <Icon className={`w-4 h-4 ${meta.color}`} />
            {meta.label}
          </span>
          <span className="font-semibold text-charcoal">{score}</span>
        </div>
        <div className="h-2 bg-charcoal/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${score}%`,
              background: score >= 80 ? '#10B981' : score >= 60 ? '#3B82F6' : score >= 40 ? '#F59E0B' : '#EF4444',
            }}
          />
        </div>
      </div>
    )
  }

  const s = screening?.screening

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-alabaster rounded-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto shadow-2xl animate-fadeIn border border-charcoal/10">
        {/* ─── Header ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between p-5 border-b border-charcoal/10 sticky top-0 bg-alabaster z-10">
          <div>
            <p className="overline mb-0.5">AI Screening</p>
            <h3 className="font-serif text-lg text-charcoal">
              {step === 'consent'     && 'Phone Screening'}
              {step === 'phone-input' && 'Enter Your Number'}
              {step === 'calling'     && 'Call in Progress'}
              {step === 'analyzing'   && 'Analyzing Responses'}
              {step === 'results'     && 'Screening Results'}
            </h3>
          </div>
          <button onClick={onClose} className="text-warmgrey hover:text-charcoal transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ─── Content ────────────────────────────────────────── */}
        <div className="p-6">

          {/* ────── CONSENT ────── */}
          {step === 'consent' && (
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 bg-gold/10 rounded-lg border border-gold/30">
                <Mic className="w-7 h-7 text-gold flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-charcoal">AI Voice Interview</h4>
                  <p className="text-sm text-warmgrey mt-1">
                    Our AI interviewer "Priya" will call your phone and conduct a 5–7 minute screening.
                    Your responses are recorded, transcribed, and evaluated by AI.
                  </p>
                </div>
              </div>

              {job && (
                <div className="p-4 bg-charcoal/5 rounded-lg">
                  <p className="text-xs overline mb-1">Screening For</p>
                  <p className="font-serif text-charcoal">{job.title}</p>
                  <p className="text-sm text-warmgrey">{job.company}</p>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm font-medium text-charcoal">What to expect:</p>
                {[
                  'AI generates personalized questions from your resume',
                  '5 screening questions about your experience & skills',
                  'Full transcript evaluation with detailed scoring',
                  'Career path analysis & improvement suggestions',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-sm text-warmgrey">
                    <CheckCircle className="w-4 h-4 text-score-excellent flex-shrink-0" />
                    {item}
                  </div>
                ))}
              </div>

              <button
                onClick={() => setStep('phone-input')}
                className="w-full btn-luxury flex items-center justify-center gap-2"
              >
                <Phone className="w-4 h-4" />
                Start Screening
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ────── PHONE INPUT ────── */}
          {step === 'phone-input' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Phone className="w-8 h-8 text-gold" />
                </div>
                <h4 className="font-serif text-xl text-charcoal mb-1">Your Phone Number</h4>
                <p className="text-sm text-warmgrey">
                  Enter the number where you'd like to receive the screening call.
                </p>
              </div>

              <div>
                <label className="text-xs overline mb-2 block">Phone Number</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => { setPhoneNumber(e.target.value); setError('') }}
                  placeholder="+91 79978 54857"
                  className="input-luxury text-lg tracking-wide"
                  autoFocus
                />
                <p className="text-xs text-warmgrey mt-2">
                  Include country code (e.g. +91 for India, +1 for US)
                </p>
                {error && (
                  <p className="text-sm text-red-500 mt-2 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {error}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('consent')}
                  className="px-5 py-2.5 border border-charcoal/20 text-charcoal hover:border-charcoal transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={startPhoneCall}
                  disabled={isLoading || !phoneNumber.trim()}
                  className="flex-1 btn-luxury flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <><Loader className="w-4 h-4 animate-spin" /> Connecting...</>
                  ) : (
                    <><PhoneCall className="w-4 h-4" /> Call Me Now</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ────── CALLING ────── */}
          {step === 'calling' && (
            <div className="text-center py-8 space-y-6">
              <div className="w-24 h-24 rounded-full bg-score-excellent/10 flex items-center justify-center mx-auto animate-pulse">
                <PhoneCall className="w-12 h-12 text-score-excellent" />
              </div>
              <div>
                <h4 className="font-serif text-xl text-charcoal mb-2">
                  Calling {phoneNumber}
                </h4>
                <p className="text-warmgrey text-sm">
                  Answer the incoming call from our AI interviewer Priya.
                  <br />The call will last about 5–7 minutes.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-warmgrey">
                <Loader className="w-4 h-4 animate-spin" />
                Waiting for call to complete…
              </div>
              <div className="p-3 bg-charcoal/5 rounded-lg text-xs text-warmgrey">
                <strong>Tip:</strong> Speak clearly, give specific examples with numbers, and mention relevant skills.
              </div>
            </div>
          )}

          {/* ────── ANALYZING ────── */}
          {step === 'analyzing' && (
            <div className="text-center py-10 space-y-6">
              <div className="w-20 h-20 bg-gold/10 rounded-full flex items-center justify-center mx-auto">
                <Sparkles className="w-10 h-10 text-gold animate-pulse" />
              </div>
              <div>
                <h4 className="font-serif text-xl text-charcoal mb-2">
                  Analyzing Your Interview
                </h4>
                <p className="text-warmgrey text-sm">
                  AI is evaluating your transcript across 5 dimensions.
                  <br />This takes about 15–30 seconds.
                </p>
              </div>
              <div className="space-y-2 max-w-xs mx-auto">
                {['Transcription complete', 'Scoring technical depth', 'Evaluating communication', 'Building career path'].map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-warmgrey">
                    <Loader className="w-3.5 h-3.5 animate-spin text-gold" />
                    {s}…
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ────── RESULTS ────── */}
          {step === 'results' && s && (
            <div className="space-y-6">
              {/* Overall score + readiness badge */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-serif text-2xl text-charcoal">
                    {s.scores?.overall ?? 0}<span className="text-warmgrey text-base">/100</span>
                  </h4>
                  {s.aiEvaluation?.interviewReadiness && (
                    <span className={`inline-block mt-1 px-3 py-0.5 text-xs font-semibold rounded-full border ${
                      READINESS_MAP[s.aiEvaluation.interviewReadiness]?.color || ''
                    }`}>
                      {READINESS_MAP[s.aiEvaluation.interviewReadiness]?.label}
                    </span>
                  )}
                </div>
                <ScoreBadge score={s.scores?.overall || 0} size="lg" />
              </div>

              {/* 5-dimension bars */}
              {s.aiEvaluation?.detailedScores && (
                <div className="space-y-3 p-4 bg-charcoal/5 rounded-lg">
                  <h5 className="text-xs overline">Performance Breakdown</h5>
                  {Object.entries(s.aiEvaluation.detailedScores).map(([key, score]) =>
                    renderDimensionBar(key, score as number)
                  )}
                </div>
              )}

              {/* Overall assessment */}
              {s.aiEvaluation?.overallAssessment && (
                <div className="p-4 bg-gold/5 rounded-lg border-l-4 border-gold">
                  <p className="text-sm text-charcoal leading-relaxed">
                    {s.aiEvaluation.overallAssessment}
                  </p>
                </div>
              )}

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-2 gap-4">
                {s.aiEvaluation?.strengths?.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-xs overline text-score-excellent">Strengths</h5>
                    {s.aiEvaluation.strengths.map((str: string, i: number) => (
                      <p key={i} className="text-sm text-charcoal flex items-start gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-score-excellent mt-0.5 flex-shrink-0" />
                        {str}
                      </p>
                    ))}
                  </div>
                )}
                {s.aiEvaluation?.weaknesses?.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-xs overline text-score-poor">Areas to Improve</h5>
                    {s.aiEvaluation.weaknesses.map((w: string, i: number) => (
                      <p key={i} className="text-sm text-charcoal flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-score-poor mt-0.5 flex-shrink-0" />
                        {w}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* Suggestions */}
              {s.aiEvaluation?.suggestions?.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs overline">Suggestions</h5>
                  {s.aiEvaluation.suggestions.map((sug: string, i: number) => (
                    <p key={i} className="text-sm text-warmgrey flex items-start gap-1.5">
                      <ChevronRight className="w-3.5 h-3.5 text-gold mt-0.5 flex-shrink-0" />
                      {sug}
                    </p>
                  ))}
                </div>
              )}

              {/* Career Path card */}
              {s.aiEvaluation?.careerPath && (
                <div className="p-4 bg-charcoal/5 rounded-lg space-y-3">
                  <h5 className="text-xs overline">Career Path</h5>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="px-3 py-1 bg-charcoal text-white rounded-full text-xs font-medium">
                      {s.aiEvaluation.careerPath.currentLevel}
                    </span>
                    <ArrowRight className="w-4 h-4 text-gold" />
                    <span className="px-3 py-1 bg-gold/20 text-charcoal rounded-full text-xs font-medium">
                      {s.aiEvaluation.careerPath.recommendedNext}
                    </span>
                    {s.aiEvaluation.careerPath.timeline && (
                      <span className="text-xs text-warmgrey ml-auto">
                        ~{s.aiEvaluation.careerPath.timeline}
                      </span>
                    )}
                  </div>
                  {s.aiEvaluation.careerPath.skillGaps?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {s.aiEvaluation.careerPath.skillGaps.map((gap: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded-full border border-red-200">
                          {gap}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Duration */}
              {s.duration > 0 && (
                <p className="text-xs text-warmgrey text-center">
                  Call duration: {Math.floor(s.duration / 60)}m {s.duration % 60}s
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setScreening(null); setStep('consent') }}
                  className="flex-1 px-4 py-2.5 border border-charcoal/20 text-charcoal font-medium hover:border-charcoal transition-colors"
                >
                  Practice Again
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 btn-luxury"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {/* Results fallback when screening data is missing */}
          {step === 'results' && !s && (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-warmgrey mx-auto mb-4" />
              <p className="text-warmgrey">No screening data available.</p>
              <button
                onClick={() => { setScreening(null); setStep('consent') }}
                className="mt-4 btn-luxury"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
