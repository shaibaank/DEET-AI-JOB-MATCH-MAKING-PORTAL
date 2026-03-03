import { IJobseeker } from '../models/Jobseeker'
import { IJob } from '../models/Job'
import { IAIEvaluation } from '../models/Screening'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

/* ====================================================================
   OPENROUTER HELPER
   ==================================================================== */

async function callOpenRouter(
  systemPrompt: string,
  userPrompt: string,
  json = true
): Promise<string> {
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://beyondats.vercel.app',
      'X-Title': 'beyondATS Jobs Screening',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
      ...(json ? { response_format: { type: 'json_object' } } : {}),
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenRouter error: ${err}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

/* ====================================================================
   AI QUESTION GENERATION  (OpenRouter)
   ==================================================================== */

export async function generateAIScreeningQuestions(
  candidate: IJobseeker,
  job?: IJob,
  resumeText?: string
): Promise<{ questions: string[]; idealHints: string[] }> {
  const systemPrompt = `You are a technical recruiter who creates tailored screening questions.
Return a JSON object with exactly this shape:
{
  "questions": ["q1", "q2", "q3", "q4", "q5"],
  "idealHints": ["hint1", "hint2", "hint3", "hint4", "hint5"]
}
Each idealHint briefly describes what a strong answer should include for the corresponding question.
Generate exactly 5 questions. Keep questions conversational, under 20 words each, and specific to the candidate's actual resume.`

  // Build a rich context from resume text + structured profile
  const resumeContext = resumeText
    ? `\nFull Resume Text:\n${resumeText.slice(0, 3000)}\n`
    : ''

  const jobRole = job?.title || 'the target role'

  const userPrompt = `Candidate profile:
- Name: ${candidate.name}
- Skills: ${candidate.skills?.join(', ') || 'Not specified'}
- Experience: ${candidate.experience?.map(e => `${e.title} at ${e.company} (${e.duration})`).join('; ') || 'Not specified'}
- Education: ${candidate.education?.map(e => `${e.degree} from ${e.institution}`).join('; ') || 'Not specified'}
${resumeContext}${job ? `
Target role:
- Title: ${job.title}
- Company: ${job.company}
- Required Skills: ${(job as any).requiredSkills?.join(', ') || 'Not specified'}
- Description: ${(job as any).description?.slice(0, 500) || 'Not specified'}` : ''}

Generate 5 personalized screening questions following these rules:
1. Q1: Ask about a SPECIFIC project or company mentioned in their resume
2. Q2: Ask about a SPECIFIC skill listed in their resume
3. Q3: Technical depth question based on their experience
4. Q4: Behavioral question relevant to their background${job ? ` and fit for the ${job.title} role` : ''}
5. Q5: "What is your notice period and expected CTC for this ${jobRole} role?"
- Keep each question under 20 words, conversational tone`

  try {
    const raw = await callOpenRouter(systemPrompt, userPrompt)
    const parsed = JSON.parse(raw)
    return {
      questions: parsed.questions || [],
      idealHints: parsed.idealHints || [],
    }
  } catch (error) {
    console.error('AI question generation failed, using fallback:', error)
    // Fallback to template-based
    const questions = generateScreeningQuestions(candidate, job)
    return {
      questions,
      idealHints: questions.map(() => 'Provide specific examples with measurable results'),
    }
  }
}

/* ====================================================================
   TEMPLATE-BASED QUESTION GENERATION  (fallback)
   ==================================================================== */

export function generateScreeningQuestions(
  candidate: IJobseeker,
  job?: IJob
): string[] {
  const questions: string[] = []

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

  if (candidate.skills?.length > 0) {
    const topSkill = candidate.skills[0]
    questions.push(
      `You mentioned ${topSkill} as one of your skills. Can you describe a specific project or situation where you applied this skill effectively?`
    )
  }

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

  if (job) {
    const keySkill = (job as any).requiredSkills?.[0] || 'the required skills'
    questions.push(
      `This role requires ${keySkill}. How does your experience align with these requirements?`
    )
  }

  questions.push(
    `What is your current availability, and what are your salary expectations for this role?`
  )

  return questions
}

/* ====================================================================
   BUILD DYNAMIC VARIABLES FOR RETELL  (replaces full prompt injection)
   ==================================================================== */

export function buildRetellDynamicVars(
  candidate: IJobseeker,
  questions: string[],
  job?: IJob,
  resumeText?: string
): Record<string, string> {
  const q = questions
  return {
    candidate_name: candidate.name || 'Candidate',
    company: job?.company || 'HireFlow',
    job_role: job?.title || 'this role',
    question_1: q[0] || 'Tell me about your most recent role.',
    question_2: q[1] || 'What is your strongest technical skill?',
    question_3: q[2] || 'Describe a challenging problem you solved.',
    question_4: q[3] || 'How do you work in a team?',
    question_5: q[4] || 'What is your notice period and expected CTC?',
    resume_summary: resumeText ? resumeText.slice(0, 500) : '',
    job_description: (job as any)?.description ? (job as any).description.slice(0, 300) : '',
  }
}

/* ====================================================================
   AI TRANSCRIPT EVALUATION  (OpenRouter  – full depth)
   ==================================================================== */

export async function evaluateTranscript(
  transcript: string,
  candidate: IJobseeker,
  questions: string[],
  job?: IJob
): Promise<IAIEvaluation> {
  const systemPrompt = `You are a senior HR analyst who evaluates phone screening transcripts.
Return a JSON object with EXACTLY this shape (no markdown, no extra keys):
{
  "strengths": ["strength1", "strength2", ...],
  "weaknesses": ["weakness1", "weakness2", ...],
  "detailedScores": {
    "technicalDepth": <0-100>,
    "communicationClarity": <0-100>,
    "problemSolving": <0-100>,
    "cultureFit": <0-100>,
    "confidence": <0-100>
  },
  "suggestions": ["suggestion1", "suggestion2", ...],
  "careerPath": {
    "currentLevel": "<Junior|Mid|Senior|Lead|Principal>",
    "recommendedNext": "<next role title>",
    "skillGaps": ["gap1", "gap2", ...],
    "timeline": "<estimated time to next level>"
  },
  "overallAssessment": "<2-3 sentence summary>",
  "interviewReadiness": "<ready|almost|needs-work|not-ready>"
}

Scoring guide:
- technicalDepth: Did they demonstrate real knowledge with specifics, tools, architectures?
- communicationClarity: Were answers structured, concise, free of excessive fillers?
- problemSolving: Did they show analytical thinking, decision-making, trade-off evaluation?
- cultureFit: Professional demeanor, enthusiasm, team orientation, alignment with role?
- confidence: Assertive delivery, ownership of achievements, no excessive hedging?`

  const userPrompt = `CANDIDATE: ${candidate.name}
SKILLS: ${candidate.skills?.join(', ') || 'N/A'}
EXPERIENCE: ${candidate.experience?.map(e => `${e.title} at ${e.company} (${e.duration})`).join('; ') || 'N/A'}
${job ? `TARGET ROLE: ${job.title} at ${job.company}` : ''}

SCREENING QUESTIONS ASKED:
${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

FULL TRANSCRIPT:
${transcript}

Evaluate this candidate's screening performance. Be specific, citing exact phrases from the transcript.`

  try {
    const raw = await callOpenRouter(systemPrompt, userPrompt)
    const parsed: IAIEvaluation = JSON.parse(raw)
    // Clamp scores 0-100
    const ds = parsed.detailedScores
    ds.technicalDepth = Math.max(0, Math.min(100, ds.technicalDepth))
    ds.communicationClarity = Math.max(0, Math.min(100, ds.communicationClarity))
    ds.problemSolving = Math.max(0, Math.min(100, ds.problemSolving))
    ds.cultureFit = Math.max(0, Math.min(100, ds.cultureFit))
    ds.confidence = Math.max(0, Math.min(100, ds.confidence))
    return parsed
  } catch (error) {
    console.error('AI evaluation failed:', error)
    return {
      strengths: ['Completed the screening call'],
      weaknesses: ['AI evaluation could not be completed — fallback scores used'],
      detailedScores: {
        technicalDepth: 50,
        communicationClarity: 50,
        problemSolving: 50,
        cultureFit: 50,
        confidence: 50,
      },
      suggestions: ['Retry screening for AI-powered evaluation'],
      careerPath: {
        currentLevel: 'Mid',
        recommendedNext: 'Senior',
        skillGaps: [],
        timeline: 'N/A',
      },
      overallAssessment: 'Screening completed but AI evaluation encountered an error. Scores are placeholder values.',
      interviewReadiness: 'needs-work',
    }
  }
}

/* ====================================================================
   BASIC TRANSCRIPT SCORING  (keyword-based fallback)
   ==================================================================== */

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

  let contentScore = 0
  const feedback: string[] = []

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

  const hasMetrics = /\d+%|\$\d+|\d+\s*(users|customers|projects|years|months|team|people)/i.test(transcript)
  if (hasMetrics) {
    contentScore += 15
    feedback.push('Good: Used specific metrics and numbers')
  } else {
    feedback.push('Improve: Include specific numbers and measurable results')
  }

  const hasCompanyMentions = candidate.experience.some(
    exp => text.includes(exp.company.toLowerCase()) || text.includes(exp.title.toLowerCase())
  )
  if (hasCompanyMentions) {
    contentScore += 10
  }

  const hasSTAR = /situation|task|action|result|challenge|approach|outcome|achieved/i.test(transcript)
  if (hasSTAR) {
    contentScore += 10
    feedback.push('Good: Used structured answer format')
  } else {
    feedback.push('Improve: Structure answers with Situation-Task-Action-Result')
  }

  let commScore = 30
  const fillerCount = (text.match(/\b(um|uh|like|you know|basically|actually|so yeah)\b/g) || []).length
  const fillerPenalty = Math.min(15, fillerCount * 2)
  commScore -= fillerPenalty

  if (fillerCount > 5) {
    feedback.push(`Improve: Reduce filler words (found ${fillerCount} instances)`)
  }

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

  let profScore = 10
  const hasPolite = /thank you|appreciate|pleased|glad to|happy to/i.test(transcript)
  if (hasPolite) profScore += 5

  const hasAvailability = /available|start|notice|weeks?|months?|immediate/i.test(transcript)
  if (hasAvailability) {
    profScore += 5
    feedback.push('Good: Clearly communicated availability')
  }

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

/* ====================================================================
   SUMMARY HELPER
   ==================================================================== */

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
