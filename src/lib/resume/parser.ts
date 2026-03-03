// Resume parsing using OpenRouter API
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!

export interface ParsedResume {
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
  salaryExpectation?: {
    min: number
    max: number
    currency: string
  }
  availability: string
  summary: string
}

export async function parseResumeText(resumeText: string): Promise<ParsedResume> {
  const prompt = `Parse the following resume and extract structured information. Return ONLY valid JSON with this exact structure:

{
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "+1234567890",
  "location": "City, State/Country",
  "skills": ["skill1", "skill2", "skill3"],
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "duration": "2 years",
      "achievements": ["achievement 1", "achievement 2"]
    }
  ],
  "education": [
    {
      "degree": "Degree Name",
      "institution": "University Name",
      "year": "2020"
    }
  ],
  "availability": "Immediate / 2 weeks / 1 month",
  "summary": "Brief 2-3 sentence professional summary"
}

Resume text:
${resumeText}

Return ONLY the JSON, no other text.`

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://beyondats.app',
        'X-Title': 'beyondATS Resume Parser',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.1-8b-instruct:free',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 1000,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content || '{}'
    
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = content
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1]
    }

    return JSON.parse(jsonStr.trim())
  } catch (error) {
    console.error('Resume parsing error:', error)
    // Return a default structure on error
    return {
      name: 'Unknown',
      email: '',
      phone: '',
      location: '',
      skills: [],
      experience: [],
      education: [],
      availability: 'Unknown',
      summary: 'Could not parse resume',
    }
  }
}

/**
 * Calculate profile completion percentage
 */
export function calculateProfileCompletion(profile: ParsedResume): number {
  let score = 0
  const checks = [
    { field: 'name', weight: 10 },
    { field: 'email', weight: 10 },
    { field: 'phone', weight: 5 },
    { field: 'location', weight: 10 },
    { field: 'skills', weight: 20, isArray: true, minLength: 3 },
    { field: 'experience', weight: 25, isArray: true, minLength: 1 },
    { field: 'education', weight: 10, isArray: true, minLength: 1 },
    { field: 'availability', weight: 10 },
  ]

  for (const check of checks) {
    const value = (profile as any)[check.field]
    if (check.isArray) {
      if (Array.isArray(value) && value.length >= (check.minLength || 1)) {
        score += check.weight
      } else if (Array.isArray(value) && value.length > 0) {
        score += check.weight * 0.5
      }
    } else if (value && String(value).trim().length > 0) {
      score += check.weight
    }
  }

  return Math.min(100, score)
}
