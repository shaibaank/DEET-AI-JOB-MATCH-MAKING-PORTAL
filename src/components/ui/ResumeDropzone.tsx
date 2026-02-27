'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Upload, FileText, X, Sparkles, Brain, Zap, Target, MapPin, Wallet, Briefcase, Code } from 'lucide-react'

// Types from parse-resume API
interface SkillInsight {
  name: string
  category: 'language' | 'framework' | 'tool' | 'soft' | 'domain'
  proficiency: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  yearsUsed?: number
}

interface ExperienceInsight {
  title: string
  company: string
  duration: string
  highlights: string[]
  techUsed: string[]
}

export interface AIResumeInsights {
  name: string
  email: string
  phone: string
  location: string
  skills: SkillInsight[]
  experience: ExperienceInsight[]
  education: {
    degree: string
    institution: string
    year: string
    field?: string
  }[]
  salaryEstimate: {
    min: number
    max: number
    currency: string
    confidence: 'low' | 'medium' | 'high'
    reasoning: string
  }
  availability: string
  summary: string
  seniorityLevel: string
  totalYearsExperience: number
  topStrengths: string[]
  atsKeywords: string[]
  industryFit: string[]
  locationPreference: string
  rawTextExtracted: string
}

interface ResumeDropzoneProps {
  onParsed: (insights: AIResumeInsights, file: File) => void
  isProcessing?: boolean
}

// Loading animation stages
const ANALYSIS_STAGES = [
  { icon: FileText, label: 'Reading document', detail: 'Extracting text from your resume...', color: 'text-warmgrey' },
  { icon: Brain, label: 'AI Analysis', detail: 'GPT-4o understanding your profile...', color: 'text-gold' },
  { icon: Code, label: 'Extracting Skills', detail: 'Identifying technical & soft skills...', color: 'text-emerald-600' },
  { icon: Briefcase, label: 'Mapping Experience', detail: 'Analyzing your career trajectory...', color: 'text-blue-600' },
  { icon: Target, label: 'ATS Optimization', detail: 'Generating keyword insights...', color: 'text-purple-600' },
  { icon: Wallet, label: 'Salary Intelligence', detail: 'Estimating market value...', color: 'text-amber-600' },
  { icon: MapPin, label: 'Location Matching', detail: 'Understanding location preferences...', color: 'text-teal-600' },
  { icon: Sparkles, label: 'Building Profile', detail: 'Transforming data into insights...', color: 'text-gold' },
]

export default function ResumeDropzone({ onParsed, isProcessing = false }: ResumeDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [analysisStage, setAnalysisStage] = useState(0)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [progressPercent, setProgressPercent] = useState(0)
  const [particlePositions, setParticlePositions] = useState<{x: number, y: number, delay: number}[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const stageIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Generate random particles for animation
  useEffect(() => {
    const particles = Array.from({ length: 12 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 2,
    }))
    setParticlePositions(particles)
  }, [])

  // Progress animation
  useEffect(() => {
    if (isAnalyzing) {
      setProgressPercent(0)
      setAnalysisStage(0)
      
      let progress = 0
      progressIntervalRef.current = setInterval(() => {
        progress += Math.random() * 3 + 0.5
        if (progress > 92) progress = 92
        setProgressPercent(progress)
      }, 150)

      let stage = 0
      stageIntervalRef.current = setInterval(() => {
        stage = (stage + 1) % ANALYSIS_STAGES.length
        setAnalysisStage(stage)
      }, 1800)

      return () => {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
        if (stageIntervalRef.current) clearInterval(stageIntervalRef.current)
      }
    }
  }, [isAnalyzing])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const extractTextFromFile = async (uploadedFile: File): Promise<string> => {
    if (uploadedFile.type.includes('text') || uploadedFile.name.endsWith('.txt')) {
      return await uploadedFile.text()
    }

    if (uploadedFile.type.includes('pdf') || uploadedFile.name.endsWith('.pdf')) {
      try {
        const arrayBuffer = await uploadedFile.arrayBuffer()
        const pdfjsLib = await loadPdfJs()
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        
        let fullText = ''
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const content = await page.getTextContent()
          const pageText = content.items.map((item: any) => item.str).join(' ')
          fullText += pageText + '\n'
        }
        
        if (fullText.trim().length > 50) {
          return fullText.trim()
        }
      } catch (pdfErr) {
        console.warn('PDF.js extraction failed:', pdfErr)
      }
    }

    try {
      const text = await uploadedFile.text()
      if (text.trim().length > 50) return text.trim()
    } catch {
      // ignore
    }

    throw new Error('Could not extract text from file. Try a .pdf or .txt file.')
  }

  const analyzeResume = async (text: string, uploadedFile: File) => {
    setIsAnalyzing(true)
    setError(null)

    try {
      const res = await fetch('/api/parse-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          resumeText: text, 
          fileName: uploadedFile.name 
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to analyze resume')
      }

      const insights: AIResumeInsights = await res.json()
      
      // Finish progress animation
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
      setProgressPercent(100)
      
      await new Promise(resolve => setTimeout(resolve, 600))
      
      setIsAnalyzing(false)
      onParsed(insights, uploadedFile)
    } catch (err: any) {
      console.error('Resume analysis error:', err)
      setError(err.message || 'Failed to analyze resume. Please try again.')
      setIsAnalyzing(false)
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
      if (stageIntervalRef.current) clearInterval(stageIntervalRef.current)
    }
  }

  const processFile = async (uploadedFile: File) => {
    setError(null)
    
    const validExtensions = ['.pdf', '.txt', '.doc', '.docx']
    const hasValidExt = validExtensions.some(ext => uploadedFile.name.toLowerCase().endsWith(ext))
    
    if (!hasValidExt && !uploadedFile.type.includes('pdf') && !uploadedFile.type.includes('text')) {
      setError('Please upload a PDF, DOC, or text file')
      return
    }

    if (uploadedFile.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB')
      return
    }

    setFile(uploadedFile)

    try {
      const text = await extractTextFromFile(uploadedFile)
      await analyzeResume(text, uploadedFile)
    } catch (err: any) {
      setError(err.message || 'Could not read file')
    }
  }

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      await processFile(droppedFile)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      await processFile(selectedFile)
    }
  }

  const clearFile = () => {
    setFile(null)
    setError(null)
    setIsAnalyzing(false)
    setProgressPercent(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
    if (stageIntervalRef.current) clearInterval(stageIntervalRef.current)
  }

  // ============ ANALYZING STATE ============
  if (isAnalyzing) {
    const stage = ANALYSIS_STAGES[analysisStage]
    const StageIcon = stage.icon
    
    return (
      <div className="animate-fadeInUp">
        <div className="relative overflow-hidden bg-gradient-to-br from-alabaster via-taupe/20 to-alabaster border border-charcoal/10 p-10"
             style={{ minHeight: '420px' }}>
          
          {/* Floating particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particlePositions.map((p, i) => (
              <div 
                key={i}
                className="absolute w-1 h-1 bg-gold/30 rounded-full"
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  animation: `resumeFloat ${3 + p.delay}s ease-in-out infinite`,
                  animationDelay: `${p.delay}s`,
                }}
              />
            ))}
          </div>

          {/* File badge */}
          {file && (
            <div className="flex items-center gap-3 mb-8 relative z-10">
              <div className="w-10 h-10 bg-charcoal/5 flex items-center justify-center">
                <FileText className="w-5 h-5 text-charcoal/60" />
              </div>
              <div>
                <p className="text-sm font-medium text-charcoal">{file.name}</p>
                <p className="text-xs text-warmgrey">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
          )}

          {/* Central animation */}
          <div className="flex flex-col items-center justify-center relative z-10 py-6">
            <div className="relative mb-8">
              <div className="absolute inset-0 w-24 h-24 border-2 border-gold/20 animate-ping" 
                   style={{ animationDuration: '2s' }} />
              <div className="absolute -inset-2 w-28 h-28 border border-dashed border-charcoal/10 animate-spin"
                   style={{ animationDuration: '8s' }} />
              <div className="w-24 h-24 bg-white shadow-lg flex items-center justify-center transition-all duration-500">
                <StageIcon className={`w-10 h-10 transition-all duration-500 ${stage.color}`} />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-gold animate-pulse" />
              <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-gold/60 animate-pulse" 
                   style={{ animationDelay: '0.5s' }} />
            </div>

            <div className="text-center mb-8">
              <h3 className="font-serif text-2xl text-charcoal mb-2 transition-all duration-500">
                {stage.label}
              </h3>
              <p className="text-warmgrey text-sm transition-all duration-500">
                {stage.detail}
              </p>
            </div>

            {/* Progress bar */}
            <div className="w-full max-w-sm mb-4">
              <div className="h-1 bg-charcoal/10 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-gold via-amber-400 to-gold transition-all duration-300 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-xs text-warmgrey">Analyzing</span>
                <span className="text-xs text-charcoal font-medium">{Math.round(progressPercent)}%</span>
              </div>
            </div>

            {/* Stage dots */}
            <div className="flex items-center gap-1.5 mt-2">
              {ANALYSIS_STAGES.map((_, i) => (
                <div 
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === analysisStage ? 'bg-gold w-4' : 
                    i < analysisStage ? 'bg-charcoal/30 w-1.5' : 'bg-charcoal/10 w-1.5'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="text-center mt-4 relative z-10">
            <p className="text-[10px] text-warmgrey/60 flex items-center justify-center gap-1">
              <Zap className="w-3 h-3" />
              Powered by GPT-4o · Semantic Analysis
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ============ DEFAULT DROP ZONE ============
  return (
    <div className="animate-fadeInUp">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative overflow-hidden cursor-pointer transition-all duration-500 border-2 border-dashed p-12
          ${isDragging 
            ? 'border-gold bg-gold/5 scale-[1.02]' 
            : 'border-charcoal/20 hover:border-charcoal/40 hover:bg-taupe/20'}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.doc,.docx"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        {isDragging && (
          <div className="absolute inset-0 bg-gradient-to-br from-gold/5 via-transparent to-gold/5 animate-pulse" />
        )}

        <div className="flex flex-col items-center text-center relative z-10">
          <div className={`w-20 h-20 mb-6 flex items-center justify-center transition-all duration-500
            ${isDragging ? 'bg-gold/10 scale-110' : 'bg-taupe'}
          `}>
            <Upload className={`w-10 h-10 transition-all duration-500
              ${isDragging ? 'text-gold -translate-y-1' : 'text-charcoal'}
            `} />
          </div>
          
          <h3 className="font-serif text-2xl text-charcoal mb-2">
            {isDragging ? 'Drop it here!' : 'Drop your resume'}
          </h3>
          <p className="text-warmgrey mb-3">
            {isDragging ? 'We\'ll analyze it instantly' : 'or click to browse — auto-parsed by AI'}
          </p>
          
          <div className="flex items-center gap-1.5 text-xs text-warmgrey/60 mb-6">
            <Sparkles className="w-3 h-3 text-gold" />
            <span>Instant AI analysis · Skills · Experience · Salary insights</span>
          </div>

          <div className="flex items-center gap-6 text-xs text-warmgrey">
            <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> PDF</span>
            <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> DOC</span>
            <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> TXT</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm flex items-start gap-3">
          <X className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Analysis Failed</p>
            <p className="text-red-600 mt-1">{error}</p>
            <button 
              onClick={clearFile}
              className="mt-2 text-red-800 underline hover:no-underline text-xs"
            >
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Lazy-load PDF.js from CDN
async function loadPdfJs(): Promise<any> {
  if ((window as any).pdfjsLib) return (window as any).pdfjsLib

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    script.onload = () => {
      const lib = (window as any).pdfjsLib
      lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
      resolve(lib)
    }
    script.onerror = reject
    document.head.appendChild(script)
  })
}
