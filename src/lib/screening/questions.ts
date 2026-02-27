import { IJobseeker } from '../models/Jobseeker'
import { IJob } from '../models/Job'

/**
 * Generate screening questions based on candidate profile and target job
 */
export function generateScreeningQuestions(
  candidate: IJobseeker,
  job?: IJob
): string[] {
  const questions: string[] = []

  // Question 1: Introduction based on most recent role
  if (candidate.experience?.length > 0) {
    const recentRole = candidate.experience[0]
    questions.push(
      `Tell me briefly about your role as ${recentRole.title} at ${recentRole.company}. What were your main responsibilities?`
    )
  } else {
    questions.push(
      `Tell me about yourself and your professional background.`
    )
  }

  // Question 2: Skill-based question
  if (candidate.skills?.length > 0) {
    const topSkill = candidate.skills[0]
    questions.push(
      `You mentioned ${topSkill} as one of your skills. Can you describe a specific project or situation where you applied this skill effectively?`
    )
  }

  // Question 3: Achievement-based (if available)
  if (candidate.experience?.[0]?.achievements?.length > 0) {
    const achievement = candidate.experience[0].achievements[0]
    questions.push(
      `You mentioned that you "${achievement}". Can you walk me through how you accomplished this?`
    )
  } else {
    questions.push(
      `What would you consider your most significant professional achievement so far?`
    )
  }

  // Question 4: Job-specific (if job provided)
  if (job) {
    const keySkill = job.requiredSkills?.[0] || 'the required skills'
    questions.push(
      `This role requires ${keySkill}. How does your experience align with these requirements?`
    )
  }

  // Question 5: Availability and logistics
  questions.push(
    `What is your current availability, and what are your salary expectations for this role?`
  )

  return questions
}

/**
 * Build Retell agent prompt with dynamic questions
 */
export function buildRetellPrompt(
  candidate: IJobseeker,
  questions: string[],
  job?: IJob
): string {
  const jobContext = job 
    ? `for the ${job.title} position at ${job.company}`
    : 'for this opportunity'

  return `You are a professional HR screener conducting a brief phone screening interview with ${candidate.name} ${jobContext}.

Your demeanor:
- Professional but friendly
- Speak clearly and at a moderate pace
- Keep the call under 5 minutes
- Listen actively and ask brief follow-up questions if answers are unclear

Interview structure:
1. Brief greeting: "Hi ${candidate.name}, thank you for taking the time to speak with me today. This will be a brief screening call, about 5 minutes. Ready to begin?"

2. Ask these questions one at a time, waiting for the candidate to respond:
${questions.map((q, i) => `   ${i + 1}. ${q}`).join('\n')}

3. After each answer:
   - Acknowledge briefly: "Thank you" or "I see"
   - If the answer is unclear, ask ONE follow-up: "Could you give me a specific example?"
   - Move to the next question

4. Closing:
   - Thank them for their time
   - Say "We'll be in touch shortly with next steps"
   - End the call professionally

Important:
- Do NOT interrupt the candidate while they're speaking
- Keep your responses brief (under 15 words between questions)
- If candidate asks you a question, politely redirect: "Great question - let's cover that in a follow-up conversation"
- If candidate seems stuck, offer encouragement: "Take your time"`
}

/**
 * Score a transcript based on content, communication, and professionalism
 */
export function scoreTranscript(
  transcript: string,
  candidate: IJobseeker,
  questions: string[]
): {
  content: number
  communication: number
  professional: number
  overall: number
  feedback: string[]
} {
  const text = transcript.toLowerCase()
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 10)
  
  // Content Analysis (0-50 points)
  let contentScore = 0
  const feedback: string[] = []

  // Check for skill mentions
  const skillsMentioned = candidate.skills.filter(
    skill => text.includes(skill.toLowerCase())
  )
  const skillPoints = Math.min(15, skillsMentioned.length * 5)
  contentScore += skillPoints
  
  if (skillsMentioned.length >= 2) {
    feedback.push(`Good: Mentioned relevant skills (${skillsMentioned.slice(0, 3).join(', ')})`)
  } else {
    feedback.push('Improve: Mention more specific skills from your experience')
  }

  // Check for specific examples (numbers, percentages, metrics)
  const hasMetrics = /\d+%|\$\d+|\d+\s*(users|customers|projects|years|months|team|people)/i.test(transcript)
  if (hasMetrics) {
    contentScore += 15
    feedback.push('Good: Used specific metrics and numbers')
  } else {
    feedback.push('Improve: Include specific numbers and measurable results')
  }

  // Check for company/role mentions
  const hasCompanyMentions = candidate.experience.some(
    exp => text.includes(exp.company.toLowerCase()) || text.includes(exp.title.toLowerCase())
  )
  if (hasCompanyMentions) {
    contentScore += 10
  }

  // STAR structure indicators
  const hasSTAR = /situation|task|action|result|challenge|approach|outcome|achieved/i.test(transcript)
  if (hasSTAR) {
    contentScore += 10
    feedback.push('Good: Used structured answer format')
  } else {
    feedback.push('Improve: Structure answers with Situation-Task-Action-Result')
  }

  // Communication Analysis (0-30 points)
  let commScore = 30

  // Filler words penalty
  const fillerCount = (text.match(/\b(um|uh|like|you know|basically|actually|so yeah)\b/g) || []).length
  const fillerPenalty = Math.min(15, fillerCount * 2)
  commScore -= fillerPenalty
  
  if (fillerCount > 5) {
    feedback.push(`Improve: Reduce filler words (found ${fillerCount} instances)`)
  }

  // Sentence length analysis (too short or too long is bad)
  const avgWords = sentences.length > 0
    ? sentences.reduce((sum, s) => sum + s.split(' ').length, 0) / sentences.length
    : 0

  if (avgWords > 30) {
    commScore -= 10
    feedback.push('Improve: Keep answers more concise')
  } else if (avgWords < 8) {
    commScore -= 10
    feedback.push('Improve: Provide more detailed responses')
  } else {
    feedback.push('Good: Answer length is appropriate')
  }

  // Professional Signals (0-20 points)
  let profScore = 10

  // Polite phrases
  const hasPolite = /thank you|appreciate|pleased|glad to|happy to/i.test(transcript)
  if (hasPolite) {
    profScore += 5
  }

  // Clear availability statement
  const hasAvailability = /available|start|notice|weeks?|months?|immediate/i.test(transcript)
  if (hasAvailability) {
    profScore += 5
    feedback.push('Good: Clearly communicated availability')
  }

  // Calculate overall score
  const overall = Math.round(
    (contentScore / 50) * 45 +
    (commScore / 30) * 30 +
    (profScore / 20) * 25
  )

  return {
    content: Math.max(0, Math.min(100, contentScore * 2)),
    communication: Math.max(0, Math.min(100, Math.round(commScore * 3.33))),
    professional: Math.max(0, Math.min(100, profScore * 5)),
    overall: Math.max(0, Math.min(100, overall)),
    feedback,
  }
}

/**
 * Generate AI summary of screening performance
 */
export function generateScreeningSummary(
  scores: { content: number; communication: number; professional: number; overall: number },
  candidateName: string
): string {
  let summary = `${candidateName} scored ${scores.overall}/100 overall. `

  if (scores.overall >= 85) {
    summary += 'Strong candidate with excellent communication and relevant experience. Recommend advancing to interview.'
  } else if (scores.overall >= 70) {
    summary += 'Good candidate with solid potential. Some areas could be strengthened. Consider for interview.'
  } else if (scores.overall >= 55) {
    summary += 'Moderate performance. May need coaching or additional screening before interview.'
  } else {
    summary += 'Below expectations. Recommend additional practice or may not be right fit for role.'
  }

  return summary
}
