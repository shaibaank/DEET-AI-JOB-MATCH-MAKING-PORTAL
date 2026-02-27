import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IJob extends Document {
  title: string
  company: string
  description: string
  requiredSkills: string[]
  preferredSkills: string[]
  experienceLevel: string
  experienceYears: { min: number; max: number }
  location: string
  remote: boolean
  salaryRange: {
    min: number
    max: number
    currency: string
  }
  employerId: string
  status: 'active' | 'closed' | 'draft'
  createdAt: Date
  updatedAt: Date
}

const JobSchema = new Schema<IJob>(
  {
    title: { type: String, required: true },
    company: { type: String, required: true },
    description: { type: String, default: '' },
    requiredSkills: [{ type: String }],
    preferredSkills: [{ type: String }],
    experienceLevel: { type: String, default: 'Mid-level' },
    experienceYears: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 10 },
    },
    location: { type: String, default: '' },
    remote: { type: Boolean, default: false },
    salaryRange: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 0 },
      currency: { type: String, default: 'USD' },
    },
    employerId: { type: String, default: '' },
    status: { type: String, enum: ['active', 'closed', 'draft'], default: 'active' },
  },
  { timestamps: true }
)

export const Job: Model<IJob> = mongoose.models.Job || mongoose.model<IJob>('Job', JobSchema)
