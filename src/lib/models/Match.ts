import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IMatch extends Document {
  jobseekerId: string
  jobId: string
  matchScore: number
  skillMatch: number
  experienceMatch: number
  locationMatch: number
  salaryMatch: number
  reasons: string[]
  status: 'pending' | 'applied' | 'invited' | 'rejected' | 'saved'
  employerNotes: string
  createdAt: Date
  updatedAt: Date
}

const MatchSchema = new Schema<IMatch>(
  {
    jobseekerId: { type: String, required: true },
    jobId: { type: String, required: true },
    matchScore: { type: Number, default: 0 },
    skillMatch: { type: Number, default: 0 },
    experienceMatch: { type: Number, default: 0 },
    locationMatch: { type: Number, default: 0 },
    salaryMatch: { type: Number, default: 0 },
    reasons: [{ type: String }],
    status: {
      type: String,
      enum: ['pending', 'applied', 'invited', 'rejected', 'saved'],
      default: 'pending',
    },
    employerNotes: { type: String, default: '' },
  },
  { timestamps: true }
)

// Compound index to prevent duplicate matches
MatchSchema.index({ jobseekerId: 1, jobId: 1 }, { unique: true })

export const Match: Model<IMatch> =
  mongoose.models.Match || mongoose.model<IMatch>('Match', MatchSchema)
