const mongoose = require('mongoose')

const callSchema = new mongoose.Schema({
  phoneNumber:      { type: String, required: true },
  callId:           { type: String },
  status:           { type: String, enum: ['initiated', 'in_progress', 'completed', 'failed', 'no_answer'], default: 'initiated' },
  transcript:       { type: String, default: null },
  transcriptObject: [{ role: { type: String }, content: { type: String } }],
  duration:         { type: Number, default: null },
  recordingUrl:     { type: String, default: null },
}, { timestamps: true })

module.exports = mongoose.model('call', callSchema)