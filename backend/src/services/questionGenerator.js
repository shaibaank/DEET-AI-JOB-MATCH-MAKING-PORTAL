const OpenAI = require('openai')

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1'
})

const generateQuestions = async (jobRole, resumeText) => {
  const response = await openai.chat.completions.create({
    model: 'openai/gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a technical recruiter. Return ONLY a valid JSON array of exactly 5 strings. No explanation, no markdown, no extra text.'
      },
      {
        role: 'user',
        content: `
          Read this resume and generate 5 personalised screening questions.

          Job Role: ${jobRole}
          Resume: ${resumeText}

          Rules:
          - Q1: Ask about a SPECIFIC project or company in their resume
          - Q2: Ask about a SPECIFIC skill listed in their resume
          - Q3: Technical depth question based on their experience
          - Q4: Behavioral question relevant to their background
          - Q5: "What is your notice period and expected CTC for this ${jobRole} role?"
          - Under 20 words each, conversational tone

          Return ONLY:
          ["question1", "question2", "question3", "question4", "question5"]
        `
      }
    ],
    temperature: 0.7
  })

  const content = response.choices[0].message.content.trim()
  const clean = content.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}

module.exports = { generateQuestions }