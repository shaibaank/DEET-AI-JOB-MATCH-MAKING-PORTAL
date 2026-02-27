'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  FileText, Code, Briefcase, GraduationCap, MapPin, Wallet, 
  Target, Award, TrendingUp, Sparkles, ChevronDown, ChevronUp,
  CheckCircle, AlertCircle, Zap, Star, ArrowRight, Eye
} from 'lucide-react'
import type { AIResumeInsights } from './ResumeDropzone'

interface ResumePreviewProps {
  insights: AIResumeInsights
  file: File
  onContinue: () => void
  onReupload: () => void
}

const PROFICIENCY_COLORS: Record<string, string> = {
  beginner: 'bg-blue-100 text-blue-700 border-blue-200',
  intermediate: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  advanced: 'bg-purple-100 text-purple-700 border-purple-200',
  expert: 'bg-gold/20 text-amber-800 border-gold',
}

const PROFICIENCY_WIDTH: Record<string, string> = {
  beginner: 'w-1/4',
  intermediate: 'w-2/4',
  advanced: 'w-3/4',
  expert: 'w-full',
}

const CATEGORY_ICONS: Record<string, typeof Code> = {
  language: Code,
  framework: Zap,
  tool: Target,
  soft: Star,
  domain: Briefcase,
}

const CATEGORY_LABELS: Record<string, string> = {
  language: 'Languages',
  framework: 'Frameworks',
  tool: 'Tools & Platforms',
  soft: 'Soft Skills',
  domain: 'Domain Knowledge',
}

const CONFIDENCE_STYLE: Record<string, string> = {
  low: 'text-red-600 bg-red-50',
  medium: 'text-amber-600 bg-amber-50',
  high: 'text-emerald-600 bg-emerald-50',
}

export default function ResumePreview({ insights, file, onContinue, onReupload }: ResumePreviewProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [showAllSkills, setShowAllSkills] = useState(false)
  const [animatedSections, setAnimatedSections] = useState<Set<string>>(new Set())
  const [showRawText, setShowRawText] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Stagger section animations on mount
  useEffect(() => {
    const sections = ['header', 'summary', 'skills', 'experience', 'education', 'insights', 'ats']
    sections.forEach((section, i) => {
      setTimeout(() => {
        setAnimatedSections(prev => {
          const next = new Set(Array.from(prev))
          next.add(section)
          return next
        })
      }, i * 150)
    })
  }, [])

  const sectionVisible = (name: string) => animatedSections.has(name)

  // Group skills by category
  const skillsByCategory = (insights.skills || []).reduce((acc, skill) => {
    const cat = skill.category || 'tool'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(skill)
    return acc
  }, {} as Record<string, typeof insights.skills>)

  const displayedSkills = showAllSkills ? insights.skills : (insights.skills || []).slice(0, 12)

  // Calculate overall profile strength
  const profileStrength = (() => {
    let score = 0
    if (insights.name && insights.name !== 'Unknown') score += 10
    if (insights.email) score += 10
    if (insights.location) score += 10
    if ((insights.skills || []).length >= 5) score += 25
    else if ((insights.skills || []).length > 0) score += 10
    if ((insights.experience || []).length >= 2) score += 25
    else if ((insights.experience || []).length > 0) score += 15
    if ((insights.education || []).length > 0) score += 10
    if (insights.totalYearsExperience > 0) score += 10
    return Math.min(100, score)
  })()

  return (
    <div ref={containerRef} className="max-w-3xl mx-auto py-8 px-6">
      {/* ===== HEADER SECTION ===== */}
      <div className={`transition-all duration-700 ${sectionVisible('header') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="overline mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              Resume Analyzed
            </div>
            <h1 className="font-serif text-3xl md:text-4xl text-charcoal mb-1">
              {insights.name || 'Your Profile'}
            </h1>
            <div className="flex items-center gap-4 text-warmgrey text-sm">
              {insights.email && <span>{insights.email}</span>}
              {insights.phone && <span>· {insights.phone}</span>}
            </div>
          </div>
          
          {/* Profile Strength Meter */}
          <div className="text-right">
            <div className="text-xs text-warmgrey mb-1">Profile Strength</div>
            <div className="flex items-center gap-2">
              <div className="w-20 h-2 bg-charcoal/10 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-gold to-emerald-500 transition-all duration-1000 ease-out"
                  style={{ width: `${profileStrength}%` }} 
                />
              </div>
              <span className="text-sm font-semibold text-charcoal">{profileStrength}%</span>
            </div>
          </div>
        </div>

        {/* Quick info pills */}
        <div className="flex flex-wrap gap-3 mb-8">
          {insights.location && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-taupe/50 text-charcoal text-sm">
              <MapPin className="w-3.5 h-3.5" /> {insights.location}
            </span>
          )}
          {insights.seniorityLevel && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-taupe/50 text-charcoal text-sm capitalize">
              <TrendingUp className="w-3.5 h-3.5" /> {insights.seniorityLevel} Level
            </span>
          )}
          {insights.totalYearsExperience > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-taupe/50 text-charcoal text-sm">
              <Briefcase className="w-3.5 h-3.5" /> {insights.totalYearsExperience} years exp
            </span>
          )}
          {insights.locationPreference && insights.locationPreference !== 'unknown' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-taupe/50 text-charcoal text-sm capitalize">
              <Target className="w-3.5 h-3.5" /> {insights.locationPreference}
            </span>
          )}
          {insights.availability && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-sm">
              <Zap className="w-3.5 h-3.5" /> {insights.availability}
            </span>
          )}
        </div>

        {/* File badge */}
        <div className="flex items-center gap-3 p-3 bg-charcoal/5 mb-8">
          <FileText className="w-5 h-5 text-charcoal/50" />
          <span className="text-sm text-charcoal">{file.name}</span>
          <span className="text-xs text-warmgrey">({(file.size / 1024).toFixed(1)} KB)</span>
          <button 
            onClick={() => setShowRawText(!showRawText)}
            className="ml-auto text-xs text-warmgrey hover:text-charcoal flex items-center gap-1 transition-colors"
          >
            <Eye className="w-3 h-3" />
            {showRawText ? 'Hide' : 'View'} raw text
          </button>
        </div>

        {showRawText && (
          <div className="mb-8 p-4 bg-charcoal/5 text-xs text-warmgrey font-mono max-h-48 overflow-y-auto whitespace-pre-wrap border-l-2 border-charcoal/20">
            {insights.rawTextExtracted || 'No raw text available'}
          </div>
        )}
      </div>

      {/* ===== SUMMARY ===== */}
      <div className={`mb-8 transition-all duration-700 delay-100 ${sectionVisible('summary') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {insights.summary && (
          <div className="p-6 bg-gradient-to-r from-gold/5 to-transparent border-l-4 border-gold">
            <p className="text-charcoal leading-relaxed italic font-serif text-lg">
              "{insights.summary}"
            </p>
          </div>
        )}
      </div>

      {/* ===== SKILLS WITH PROFICIENCY ===== */}
      <div className={`mb-8 transition-all duration-700 delay-200 ${sectionVisible('skills') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl text-charcoal flex items-center gap-2">
            <Code className="w-5 h-5 text-gold" />
            Skills & Expertise
            <span className="text-xs text-warmgrey font-sans ml-2">({(insights.skills || []).length} found)</span>
          </h2>
        </div>

        {/* Skill categories */}
        {Object.entries(skillsByCategory).map(([category, skills]) => {
          const CatIcon = CATEGORY_ICONS[category] || Code
          return (
            <div key={category} className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <CatIcon className="w-3.5 h-3.5 text-warmgrey" />
                <span className="text-xs text-warmgrey uppercase tracking-wider">
                  {CATEGORY_LABELS[category] || category}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill, i) => (
                  <div 
                    key={i}
                    className={`group relative inline-flex items-center gap-1.5 px-3 py-1.5 border text-sm transition-all duration-300 hover:scale-105 cursor-default
                      ${PROFICIENCY_COLORS[skill.proficiency] || 'bg-taupe text-charcoal border-charcoal/10'}
                    `}
                  >
                    <span className="font-medium">{skill.name}</span>
                    {skill.yearsUsed && (
                      <span className="text-[10px] opacity-60">{skill.yearsUsed}y</span>
                    )}
                    
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-charcoal text-white text-xs 
                                    opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-20">
                      {skill.name} · {skill.proficiency}
                      {skill.yearsUsed ? ` · ${skill.yearsUsed} years` : ''}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-charcoal" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {/* Skill proficiency legend */}
        <div className="flex items-center gap-3 mt-4 text-[10px] text-warmgrey">
          <span>Proficiency:</span>
          {['beginner', 'intermediate', 'advanced', 'expert'].map(p => (
            <span key={p} className={`px-2 py-0.5 border ${PROFICIENCY_COLORS[p]} capitalize`}>
              {p}
            </span>
          ))}
        </div>
      </div>

      {/* ===== EXPERIENCE ===== */}
      <div className={`mb-8 transition-all duration-700 delay-300 ${sectionVisible('experience') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <h2 className="font-serif text-xl text-charcoal flex items-center gap-2 mb-4">
          <Briefcase className="w-5 h-5 text-gold" />
          Experience
        </h2>
        
        <div className="space-y-4">
          {(insights.experience || []).map((exp, i) => (
            <div key={i} className="relative pl-6 border-l-2 border-charcoal/10 hover:border-gold transition-colors duration-300">
              <div className="absolute left-[-5px] top-1 w-2 h-2 bg-gold" />
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-charcoal">{exp.title}</h3>
                  <p className="text-warmgrey text-sm">{exp.company} · {exp.duration}</p>
                </div>
              </div>
              
              {exp.highlights && exp.highlights.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {exp.highlights.map((h, j) => (
                    <li key={j} className="text-sm text-warmgrey flex items-start gap-2">
                      <span className="text-gold mt-1.5 flex-shrink-0">›</span>
                      {h}
                    </li>
                  ))}
                </ul>
              )}

              {exp.techUsed && exp.techUsed.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {exp.techUsed.map((tech, j) => (
                    <span key={j} className="text-[10px] px-2 py-0.5 bg-charcoal/5 text-charcoal/70">
                      {tech}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ===== EDUCATION ===== */}
      {insights.education && insights.education.length > 0 && (
        <div className={`mb-8 transition-all duration-700 delay-[350ms] ${sectionVisible('education') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h2 className="font-serif text-xl text-charcoal flex items-center gap-2 mb-4">
            <GraduationCap className="w-5 h-5 text-gold" />
            Education
          </h2>
          
          <div className="space-y-3">
            {insights.education.map((edu, i) => (
              <div key={i} className="flex items-start gap-4 p-4 bg-taupe/20 hover:bg-taupe/40 transition-colors duration-300">
                <div className="w-10 h-10 bg-charcoal/5 flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="w-5 h-5 text-charcoal/40" />
                </div>
                <div>
                  <h3 className="font-medium text-charcoal text-sm">{edu.degree}</h3>
                  <p className="text-warmgrey text-sm">{edu.institution}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-warmgrey">
                    {edu.year && <span>{edu.year}</span>}
                    {edu.field && <span>· {edu.field}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== INSIGHTS PANEL ===== */}
      <div className={`mb-8 transition-all duration-700 delay-[400ms] ${sectionVisible('insights') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <h2 className="font-serif text-xl text-charcoal flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-gold" />
          AI Insights
        </h2>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Salary Estimate */}
          {insights.salaryEstimate && (
            <div className="p-5 border border-charcoal/10 hover:border-gold/50 transition-colors duration-300">
              <div className="flex items-center gap-2 mb-3">
                <Wallet className="w-4 h-4 text-gold" />
                <span className="text-xs text-warmgrey uppercase tracking-wider">Market Value</span>
              </div>
              <div className="font-serif text-2xl text-charcoal mb-1">
                ₹{insights.salaryEstimate.min}L – ₹{insights.salaryEstimate.max}L
              </div>
              <span className={`inline-block text-[10px] px-2 py-0.5 capitalize ${CONFIDENCE_STYLE[insights.salaryEstimate.confidence] || ''}`}>
                {insights.salaryEstimate.confidence} confidence
              </span>
              <p className="text-xs text-warmgrey mt-2 leading-relaxed">
                {insights.salaryEstimate.reasoning}
              </p>
            </div>
          )}

          {/* Top Strengths */}
          {insights.topStrengths && insights.topStrengths.length > 0 && (
            <div className="p-5 border border-charcoal/10 hover:border-gold/50 transition-colors duration-300">
              <div className="flex items-center gap-2 mb-3">
                <Award className="w-4 h-4 text-gold" />
                <span className="text-xs text-warmgrey uppercase tracking-wider">Top Strengths</span>
              </div>
              <div className="space-y-2">
                {insights.topStrengths.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-charcoal">
                    <div className="w-5 h-5 bg-emerald-50 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                    </div>
                    {s}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Industry Fit */}
          {insights.industryFit && insights.industryFit.length > 0 && (
            <div className="p-5 border border-charcoal/10 hover:border-gold/50 transition-colors duration-300">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-gold" />
                <span className="text-xs text-warmgrey uppercase tracking-wider">Industry Fit</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {insights.industryFit.map((ind, i) => (
                  <span key={i} className="px-3 py-1 bg-purple-50 text-purple-700 text-sm border border-purple-200">
                    {ind}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Seniority & Experience */}
          <div className="p-5 border border-charcoal/10 hover:border-gold/50 transition-colors duration-300">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-gold" />
              <span className="text-xs text-warmgrey uppercase tracking-wider">Career Level</span>
            </div>
            <div className="font-serif text-2xl text-charcoal capitalize mb-1">
              {insights.seniorityLevel || 'Not determined'}
            </div>
            <p className="text-sm text-warmgrey">
              {insights.totalYearsExperience || 0} years of professional experience
            </p>
          </div>
        </div>
      </div>

      {/* ===== ATS KEYWORDS ===== */}
      {insights.atsKeywords && insights.atsKeywords.length > 0 && (
        <div className={`mb-8 transition-all duration-700 delay-500 ${sectionVisible('ats') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h2 className="font-serif text-xl text-charcoal flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-gold" />
            ATS Keywords
            <span className="text-xs font-sans text-warmgrey ml-2">Optimized for job matching</span>
          </h2>
          
          <div className="flex flex-wrap gap-2">
            {insights.atsKeywords.map((kw, i) => (
              <span 
                key={i}
                className="px-3 py-1 bg-charcoal text-white text-xs tracking-wide hover:bg-gold hover:text-charcoal transition-colors duration-300 cursor-default"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ===== ACTION BAR ===== */}
      <div className={`flex items-center justify-between pt-8 border-t border-charcoal/10 transition-all duration-700 delay-[600ms] ${sectionVisible('ats') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <button
          onClick={onReupload}
          className="text-warmgrey hover:text-charcoal transition-colors duration-300 text-sm"
        >
          ← Upload Different Resume
        </button>
        <button
          onClick={onContinue}
          className="btn-luxury"
        >
          <span className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Continue to Profile
            <ArrowRight className="w-4 h-4" />
          </span>
        </button>
      </div>
    </div>
  )
}
