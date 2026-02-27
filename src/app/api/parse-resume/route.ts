import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.OPENROUTER_API_KEY!

export interface AIResumeInsights {
  name: string
  email: string
  phone: string
  location: string
  skills: {
    name: string
    category: 'language' | 'framework' | 'tool' | 'soft' | 'domain'
    proficiency: 'beginner' | 'intermediate' | 'advanced' | 'expert'
    yearsUsed?: number
  }[]
  experience: {
    title: string
    company: string
    duration: string
    highlights: string[]
    techUsed: string[]
  }[]
  education: {
    degree: string
    institution: string
    year: string
    field?: string
  }[]
  salaryEstimate: {
    min: number
    max: number
    currency: string
    confidence: 'low' | 'medium' | 'high'
    reasoning: string
  }
  availability: string
  summary: string
  seniorityLevel: 'intern' | 'junior' | 'mid' | 'senior' | 'lead' | 'principal'
  totalYearsExperience: number
  topStrengths: string[]
  atsKeywords: string[]
  industryFit: string[]
  locationPreference: 'remote' | 'onsite' | 'hybrid' | 'unknown'
  rawTextExtracted: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { resumeText, fileName } = body

    if (!resumeText || resumeText.trim().length < 20) {
      return NextResponse.json({ error: 'Resume text too short or missing' }, { status: 400 })
    }

    const prompt = `You are an expert ATS resume analyzer and career advisor. Analyze this resume deeply and extract every piece of structured information. Be thorough - extract ALL skills mentioned explicitly or implied by experience. Estimate salary based on skills, experience level and location.

Return ONLY valid JSON (no markdown, no backticks), with this exact structure:

{
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "+1234567890",
  "location": "City, Country",
  "skills": [
    {
      "name": "React",
      "category": "framework",
      "proficiency": "advanced",
      "yearsUsed": 3
    }
  ],
  "experience": [
    {
      "title": "Job Title",
      "company": "Company",
      "duration": "2 years",
      "highlights": ["key achievement 1", "key achievement 2"],
      "techUsed": ["React", "Node.js"]
    }
  ],
  "education": [
    {
      "degree": "B.Tech",
      "institution": "University",
      "year": "2020",
      "field": "Computer Science"
    }
  ],
  "salaryEstimate": {
    "min": 8,
    "max": 15,
    "currency": "LPA",
    "confidence": "medium",
    "reasoning": "Based on 3 years experience with React and Node.js in Bangalore"
  },
  "availability": "Immediate",
  "summary": "2-3 sentence professional summary highlighting unique value",
  "seniorityLevel": "mid",
  "totalYearsExperience": 3,
  "topStrengths": ["Full-stack development", "System design", "Team leadership"],
  "atsKeywords": ["react", "node.js", "typescript", "mongodb", "aws", "ci/cd", "agile"],
  "industryFit": ["SaaS", "Fintech", "E-commerce"],
  "locationPreference": "hybrid"
}

IMPORTANT:
- category must be one of: language, framework, tool, soft, domain
- proficiency must be one of: beginner, intermediate, advanced, expert
- seniorityLevel must be one of: intern, junior, mid, senior, lead, principal
- salaryEstimate.min and max should be in LPA (Lakhs Per Annum) for Indian candidates, or annual USD (in thousands) for others
- Extract EVERY skill - both explicit and implied (e.g., if they used Docker, they likely know Linux/CLI)
- atsKeywords should be lowercase, optimized for ATS systems
- Be generous but realistic with proficiency estimates

Resume content:
${resumeText}

Return ONLY the JSON.`

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'DEET Resume Parser',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.15,
        max_tokens: 3000,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('OpenRouter API error:', response.status, errText)
      return NextResponse.json({ error: 'AI API error', details: errText }, { status: 502 })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || '{}'

    // Extract JSON - handle markdown code blocks
    let jsonStr = content
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1]
    }

    // Clean up any trailing/leading whitespace or characters
    jsonStr = jsonStr.trim()
    // Remove any BOM or invisible characters
    jsonStr = jsonStr.replace(/^\uFEFF/, '')

    let parsed: AIResumeInsights
    try {
      parsed = JSON.parse(jsonStr)
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr, 'Raw:', jsonStr.substring(0, 200))
      return NextResponse.json({ error: 'Failed to parse AI response', raw: jsonStr.substring(0, 500) }, { status: 500 })
    }

    // Add the raw text back
    parsed.rawTextExtracted = resumeText

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('POST /api/parse-resume error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
