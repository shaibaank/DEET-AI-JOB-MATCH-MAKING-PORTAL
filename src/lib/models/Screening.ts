import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IScreening extends Document {
  jobseekerId: string
  jobId?: string
  callId?: string
  transcript: string
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
  status: 'pending' | 'in-progress' | 'completed' | 'failed'
  duration: number
  createdAt: Date
  updatedAt: Date
}

const ScreeningSchema = new Schema<IScreening>(
  {
    jobseekerId: { type: String, required: true },
    jobId: { type: String },
    callId: { type: String },
    transcript: { type: String, default: '' },
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
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'failed'],
      default: 'pending',
    },
    duration: { type: Number, default: 0 },
  },
  { timestamps: true }
)

export const Screening: Model<IScreening> =
  mongoose.models.Screening || mongoose.model<IScreening>('Screening', ScreeningSchema)
