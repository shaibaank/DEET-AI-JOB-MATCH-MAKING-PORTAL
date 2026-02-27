import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IJobseeker extends Document {
  name: string
  email: string
  phone: string
  location: string
  skills: string[]
  experience: {
    title: string
    company: string
    duration: string
    achievements: string[]
  }[]
  education: {
    degree: string
    institution: string
    year: string
  }[]
  salaryExpectation: {
    min: number
    max: number
    currency: string
  }
  availability: string
  resumeText: string
  profileComplete: number
  createdAt: Date
  updatedAt: Date
}

const JobseekerSchema = new Schema<IJobseeker>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, default: '' },
    location: { type: String, default: '' },
    skills: [{ type: String }],
    experience: [
      {
        title: String,
        company: String,
        duration: String,
        achievements: [String],
      },
    ],
    education: [
      {
        degree: String,
        institution: String,
        year: String,
      },
    ],
    salaryExpectation: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 0 },
      currency: { type: String, default: 'USD' },
    },
    availability: { type: String, default: 'Immediate' },
    resumeText: { type: String, default: '' },
    profileComplete: { type: Number, default: 0 },
  },
  { timestamps: true }
)

export const Jobseeker: Model<IJobseeker> =
  mongoose.models.Jobseeker || mongoose.model<IJobseeker>('Jobseeker', JobseekerSchema)
