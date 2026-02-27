import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IAIEvaluation {
  strengths: string[]
  weaknesses: string[]
  detailedScores: {
    technicalDepth: number
    communicationClarity: number
    problemSolving: number
    cultureFit: number
    confidence: number
  }
  suggestions: string[]
  careerPath: {
    currentLevel: string
    recommendedNext: string
    skillGaps: string[]
    timeline: string
  }
  overallAssessment: string
  interviewReadiness: 'ready' | 'almost' | 'needs-work' | 'not-ready'
}

export interface IScreening extends Document {
  jobseekerId: string
  jobId?: string
  callId?: string
  phoneNumber?: string
  transcript: string
  transcriptObject?: Array<{ role: string; content: string }>
  resumeText?: string
  jobRole?: string
  recordingUrl?: string
  scores: {
    content: number
    communication: number
    professional: number
    overall: number
  }
  feedback: string[]
  selfEvaluation: {
    statedResults: boolean
    describedChallenge: boolean
    underNinetySeconds: boolean
    mentionedSkills: boolean
  }
  questions: string[]
  aiEvaluation?: IAIEvaluation
  callAnalysis?: Record<string, any>
  status: 'pending' | 'in-progress' | 'completed' | 'analyzing' | 'failed'
  duration: number
  createdAt: Date
  updatedAt: Date
}

const AIEvaluationSchema = new Schema(
  {
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
    detailedScores: {
      technicalDepth: { type: Number, default: 0 },
      communicationClarity: { type: Number, default: 0 },
      problemSolving: { type: Number, default: 0 },
      cultureFit: { type: Number, default: 0 },
      confidence: { type: Number, default: 0 },
    },
    suggestions: [{ type: String }],
    careerPath: {
      currentLevel: { type: String, default: '' },
      recommendedNext: { type: String, default: '' },
      skillGaps: [{ type: String }],
      timeline: { type: String, default: '' },
    },
    overallAssessment: { type: String, default: '' },
    interviewReadiness: {
      type: String,
      enum: ['ready', 'almost', 'needs-work', 'not-ready'],
      default: 'needs-work',
    },
  },
  { _id: false }
)

const ScreeningSchema = new Schema<IScreening>(
  {
    jobseekerId: { type: String, required: true },
    jobId: { type: String },
    callId: { type: String },
    phoneNumber: { type: String },
    transcript: { type: String, default: '' },
    transcriptObject: [{ role: { type: String }, content: { type: String } }],
    resumeText: { type: String, default: '' },
    jobRole: { type: String, default: '' },
    recordingUrl: { type: String },
    scores: {
      content: { type: Number, default: 0 },
      communication: { type: Number, default: 0 },
      professional: { type: Number, default: 0 },
      overall: { type: Number, default: 0 },
    },
    feedback: [{ type: String }],
    selfEvaluation: {
      statedResults: { type: Boolean, default: false },
      describedChallenge: { type: Boolean, default: false },
      underNinetySeconds: { type: Boolean, default: false },
      mentionedSkills: { type: Boolean, default: false },
    },
    questions: [{ type: String }],
    aiEvaluation: { type: AIEvaluationSchema },
    callAnalysis: { type: Schema.Types.Mixed },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'analyzing', 'failed'],
      default: 'pending',
    },
    duration: { type: Number, default: 0 },
  },
  { timestamps: true }
)

export const Screening: Model<IScreening> =
  mongoose.models.Screening || mongoose.model<IScreening>('Screening', ScreeningSchema)
