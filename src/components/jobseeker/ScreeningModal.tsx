'use client'

import { useState } from 'react'
import { X, Phone, PhoneCall, Mic, CheckCircle, AlertCircle, Loader } from 'lucide-react'
import ScoreBadge, { MatchScoreBar } from '../shared/ScoreBadge'

interface ScreeningModalProps {
  jobseeker: any
  job?: any
  onClose: () => void
}

export default function ScreeningModal({ jobseeker, job, onClose }: ScreeningModalProps) {
  const [step, setStep] = useState<'consent' | 'calling' | 'demo' | 'results'>('consent')
  const [screening, setScreening] = useState<any>(null)
  const [demoTranscript, setDemoTranscript] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const startCall = async (mode: 'phone' | 'demo') => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/screenings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobseekerId: jobseeker._id,
          jobId: job?._id,
          mode: mode === 'demo' ? 'demo' : 'phone',
        }),
      })
      const data = await res.json()
      setScreening(data)
      
      if (mode === 'demo') {
        setStep('demo')
      } else {
        setStep('calling')
        // Poll for call completion
        checkCallStatus(data.screening._id)
      }
    } catch (error) {
      console.error('Start call error:', error)
    }
    setIsLoading(false)
  }

  const checkCallStatus = async (screeningId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/screenings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: screeningId, action: 'check-status' }),
        })
        const data = await res.json()
        
        if (data.hasTranscript || data.callStatus === 'ended') {
          clearInterval(interval)
          const updatedRes = await fetch(`/api/screenings?id=${screeningId}`)
          const updated = await updatedRes.json()
          setScreening({ screening: updated })
          setStep('results')
        }
      } catch (error) {
        console.error('Check status error:', error)
      }
    }, 3000)

    // Timeout after 5 minutes
    setTimeout(() => clearInterval(interval), 300000)
  }

  const submitDemoTranscript = async () => {
    if (!demoTranscript.trim() || !screening?.screening?._id) return
    
    setIsLoading(true)
    try {
      const res = await fetch('/api/screenings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: screening.screening._id,
          transcript: demoTranscript,
        }),
      })
      const data = await res.json()
      setScreening({ screening: data.screening, summary: data.summary })
      setStep('results')
    } catch (error) {
      console.error('Submit transcript error:', error)
    }
    setIsLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-2xl w-full max-w-lg mx-4 overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-lg font-display font-semibold text-white">
            {step === 'consent' && 'Practice Screening Call'}
            {step === 'calling' && 'Call in Progress'}
            {step === 'demo' && 'Demo Mode'}
            {step === 'results' && 'Screening Results'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'consent' && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                <Mic className="w-8 h-8 text-blue-400" />
                <div>
                  <h4 className="font-semibold text-white">Voice Recording Notice</h4>
                  <p className="text-sm text-slate-400">
                    This practice call will record your voice for feedback. Your responses will be analyzed by AI.
                  </p>
                </div>
              </div>

              {job && (
                <div className="p-4 bg-white/5 rounded-lg">
                  <p className="text-sm text-slate-400">Practicing for:</p>
                  <p className="font-medium text-white">{job.title} at {job.company}</p>
                </div>
              )}

              <div className="space-y-3">
                <p className="text-sm text-slate-300">Questions will be based on:</p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm text-slate-400">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    Your work experience
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-400">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    Your listed skills
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-400">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    Availability & expectations
                  </li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => startCall('phone')}
                  disabled={isLoading}
                  className="flex-1 btn-primary btn-jobseeker flex items-center justify-center gap-2"
                >
                  <Phone className="w-4 h-4" />
                  Call My Phone
                </button>
                <button
                  onClick={() => startCall('demo')}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 rounded-lg bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
                >
                  Demo Mode
                </button>
              </div>
            </div>
          )}

          {step === 'calling' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
                <PhoneCall className="w-10 h-10 text-green-400" />
              </div>
              <h4 className="text-xl font-display font-semibold text-white mb-2">
                Calling Your Phone...
              </h4>
              <p className="text-slate-400 mb-4">
                Answer the incoming call from {process.env.NEXT_PUBLIC_TWILIO_PHONE || '+1 (464) 262-8169'}
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                <Loader className="w-4 h-4 animate-spin" />
                Waiting for call to complete...
              </div>
            </div>
          )}

          {step === 'demo' && (
            <div className="space-y-4">
              <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                  <span className="font-semibold text-white">Demo Mode</span>
                </div>
                <p className="text-sm text-slate-400">
                  Paste a mock transcript to test the scoring system.
                </p>
              </div>

              {screening?.questions && (
                <div>
                  <p className="text-sm font-medium text-white mb-2">Questions that would be asked:</p>
                  <ol className="space-y-2">
                    {screening.questions.map((q: string, i: number) => (
                      <li key={i} className="text-sm text-slate-400">
                        {i + 1}. {q}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-white mb-2 block">
                  Paste Mock Transcript:
                </label>
                <textarea
                  value={demoTranscript}
                  onChange={(e) => setDemoTranscript(e.target.value)}
                  placeholder="Interviewer: Tell me about your role...&#10;Candidate: I worked as a Senior Developer at Tech Corp for 3 years, where I led a team of 5 developers and increased deployment efficiency by 40%..."
                  className="w-full h-40 bg-white/5 border border-white/10 rounded-lg p-3 text-white text-sm resize-none"
                />
              </div>

              <button
                onClick={submitDemoTranscript}
                disabled={isLoading || !demoTranscript.trim()}
                className="w-full btn-primary btn-jobseeker flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  'Analyze Transcript'
                )}
              </button>
            </div>
          )}

          {step === 'results' && screening?.screening && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xl font-display font-bold text-white">
                    Overall Score
                  </h4>
                  <p className="text-sm text-slate-400">
                    {screening.screening.scores?.overall >= 85 ? 'Excellent performance!' :
                     screening.screening.scores?.overall >= 70 ? 'Good job!' :
                     screening.screening.scores?.overall >= 50 ? 'Room for improvement' :
                     'Keep practicing!'}
                  </p>
                </div>
                <ScoreBadge score={screening.screening.scores?.overall || 0} size="lg" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-white/5 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {screening.screening.scores?.content || 0}
                  </div>
                  <div className="text-xs text-slate-400">Content</div>
                </div>
                <div className="p-3 bg-white/5 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-400">
                    {screening.screening.scores?.communication || 0}
                  </div>
                  <div className="text-xs text-slate-400">Communication</div>
                </div>
                <div className="p-3 bg-white/5 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {screening.screening.scores?.professional || 0}
                  </div>
                  <div className="text-xs text-slate-400">Professional</div>
                </div>
              </div>

              {screening.screening.feedback?.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-sm font-semibold text-white">Feedback</h5>
                  {screening.screening.feedback.map((fb: string, i: number) => (
                    <p key={i} className={`text-sm flex items-start gap-2 ${
                      fb.startsWith('Good') ? 'text-green-400' : 'text-yellow-400'
                    }`}>
                      {fb.startsWith('Good') ? (
                        <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      )}
                      {fb}
                    </p>
                  ))}
                </div>
              )}

              {screening.summary && (
                <div className="p-4 bg-white/5 rounded-lg">
                  <p className="text-sm text-slate-300">{screening.summary}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('consent')}
                  className="flex-1 px-4 py-2 rounded-lg bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
                >
                  Practice Again
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 btn-primary btn-jobseeker"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
