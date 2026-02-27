/**
 * Semantic Matching Engine using OpenRouter API
 * Provides AI-powered skill matching and semantic understanding
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

// Skill knowledge graph - maps related skills
const SKILL_GRAPH: Record<string, string[]> = {
  // Programming Languages
  'javascript': ['typescript', 'es6', 'node.js', 'nodejs', 'js', 'ecmascript', 'react', 'vue', 'angular'],
  'typescript': ['javascript', 'es6', 'node.js', 'react', 'angular', 'js'],
  'python': ['django', 'flask', 'fastapi', 'pandas', 'numpy', 'machine learning', 'data science', 'py'],
  'java': ['spring', 'spring boot', 'kotlin', 'jvm', 'maven', 'gradle'],
  'go': ['golang', 'gin', 'fiber'],
  'rust': ['systems programming', 'webassembly', 'wasm'],
  'c++': ['c', 'systems programming', 'embedded', 'cpp'],
  'ruby': ['rails', 'ruby on rails', 'sinatra'],
  'php': ['laravel', 'symfony', 'wordpress'],
  
  // Frontend
  'react': ['react.js', 'reactjs', 'next.js', 'nextjs', 'redux', 'hooks', 'jsx', 'javascript', 'typescript'],
  'vue': ['vue.js', 'vuejs', 'nuxt', 'nuxt.js', 'vuex', 'javascript'],
  'angular': ['angularjs', 'typescript', 'rxjs', 'ngrx'],
  'nextjs': ['next.js', 'react', 'vercel', 'server side rendering', 'ssr'],
  'html': ['html5', 'css', 'web development', 'frontend'],
  'css': ['sass', 'scss', 'less', 'tailwind', 'bootstrap', 'styled-components'],
  'tailwind': ['tailwindcss', 'css', 'responsive design'],
  
  // Backend
  'node.js': ['nodejs', 'express', 'fastify', 'nestjs', 'javascript', 'typescript', 'backend'],
  'express': ['express.js', 'node.js', 'rest api', 'api development'],
  'django': ['python', 'rest framework', 'drf', 'backend'],
  'flask': ['python', 'rest api', 'backend', 'microservices'],
  'spring': ['spring boot', 'java', 'microservices', 'backend'],
  'fastapi': ['python', 'async', 'rest api', 'pydantic'],
  
  // Databases
  'mongodb': ['mongo', 'nosql', 'mongoose', 'document database'],
  'postgresql': ['postgres', 'psql', 'sql', 'relational database'],
  'mysql': ['sql', 'mariadb', 'relational database'],
  'redis': ['caching', 'in-memory database', 'pub/sub'],
  'elasticsearch': ['elastic', 'search', 'full-text search', 'elk'],
  'sql': ['mysql', 'postgresql', 'sqlite', 'database', 'queries'],
  
  // Cloud & DevOps
  'aws': ['amazon web services', 'ec2', 's3', 'lambda', 'cloud', 'dynamodb', 'ecs', 'eks'],
  'gcp': ['google cloud', 'google cloud platform', 'compute engine', 'bigquery'],
  'azure': ['microsoft azure', 'cloud', 'azure functions'],
  'docker': ['containers', 'containerization', 'kubernetes', 'devops'],
  'kubernetes': ['k8s', 'container orchestration', 'docker', 'helm', 'devops'],
  'terraform': ['infrastructure as code', 'iac', 'devops', 'cloud'],
  'ci/cd': ['jenkins', 'github actions', 'gitlab ci', 'circleci', 'devops'],
  
  // Data & ML
  'machine learning': ['ml', 'deep learning', 'ai', 'artificial intelligence', 'tensorflow', 'pytorch', 'scikit-learn'],
  'data science': ['python', 'pandas', 'numpy', 'statistics', 'data analysis', 'machine learning'],
  'tensorflow': ['deep learning', 'neural networks', 'keras', 'machine learning', 'ai'],
  'pytorch': ['deep learning', 'neural networks', 'machine learning', 'ai'],
  'nlp': ['natural language processing', 'text processing', 'transformers', 'bert', 'gpt'],
  
  // Other
  'git': ['version control', 'github', 'gitlab', 'bitbucket'],
  'api': ['rest', 'graphql', 'grpc', 'api development', 'microservices'],
  'graphql': ['api', 'apollo', 'queries', 'mutations'],
  'agile': ['scrum', 'kanban', 'sprint', 'project management'],
  'testing': ['jest', 'mocha', 'pytest', 'unit testing', 'integration testing', 'tdd'],
}

// City/Location knowledge
const LOCATION_GRAPH: Record<string, string[]> = {
  // India
  'bangalore': ['bengaluru', 'karnataka', 'india', 'south india'],
  'bengaluru': ['bangalore', 'karnataka', 'india', 'south india'],
  'mumbai': ['bombay', 'maharashtra', 'india', 'west india'],
  'delhi': ['new delhi', 'ncr', 'india', 'north india'],
  'hyderabad': ['telangana', 'india', 'south india'],
  'chennai': ['madras', 'tamil nadu', 'india', 'south india'],
  'pune': ['maharashtra', 'india', 'west india'],
  'gurgaon': ['gurugram', 'ncr', 'haryana', 'india', 'north india'],
  'noida': ['ncr', 'uttar pradesh', 'india', 'north india'],
  
  // US
  'san francisco': ['sf', 'bay area', 'california', 'usa', 'silicon valley'],
  'new york': ['nyc', 'ny', 'manhattan', 'usa', 'east coast'],
  'seattle': ['washington', 'wa', 'usa', 'pacific northwest'],
  'austin': ['texas', 'tx', 'usa'],
  'boston': ['massachusetts', 'ma', 'usa', 'east coast'],
  'los angeles': ['la', 'california', 'usa', 'west coast'],
  
  // Remote
  'remote': ['work from home', 'wfh', 'distributed', 'anywhere'],
}

/**
 * Calculate semantic similarity between two skills
 * Uses the skill graph for fuzzy matching
 */
export function getSemanticSkillSimilarity(skill1: string, skill2: string): number {
  const s1 = skill1.toLowerCase().trim()
  const s2 = skill2.toLowerCase().trim()
  
  // Exact match
  if (s1 === s2) return 1.0
  
  // One contains the other
  if (s1.includes(s2) || s2.includes(s1)) return 0.9
  
  // Check skill graph for related skills
  const s1Related = SKILL_GRAPH[s1] || []
  const s2Related = SKILL_GRAPH[s2] || []
  
  // Direct relationship in graph
  if (s1Related.includes(s2) || s2Related.includes(s1)) return 0.85
  
  // Check for common related skills (transitive relationship)
  const commonRelated = s1Related.filter(r => s2Related.includes(r))
  if (commonRelated.length > 0) return 0.7
  
  // Check if both are variants of a common base skill
  for (const [base, variants] of Object.entries(SKILL_GRAPH)) {
    if ((variants.includes(s1) || base === s1) && (variants.includes(s2) || base === s2)) {
      return 0.75
    }
  }
  
  // Fuzzy string matching (Levenshtein-like)
  const longer = s1.length > s2.length ? s1 : s2
  const shorter = s1.length > s2.length ? s2 : s1
  const longerLength = longer.length
  
  if (longerLength === 0) return 1.0
  
  const editDistance = levenshteinDistance(shorter, longer)
  const similarity = (longerLength - editDistance) / longerLength
  
  return similarity > 0.7 ? similarity * 0.8 : 0
}

/**
 * Simple Levenshtein distance for fuzzy matching
 */
function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length
  const n = s2.length
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))
  
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
  }
  
  return dp[m][n]
}

/**
 * Calculate semantic skill match between candidate skills and job requirements
 */
export function calculateSemanticSkillMatch(
  candidateSkills: string[],
  requiredSkills: string[],
  preferredSkills: string[] = []
): {
  score: number
  matched: { candidate: string; job: string; similarity: number }[]
  missing: string[]
  semanticInsights: string[]
} {
  const matched: { candidate: string; job: string; similarity: number }[] = []
  const missing: string[] = []
  const semanticInsights: string[] = []
  
  // Track matched job skills
  const matchedJobSkills = new Set<string>()
  
  // Check each required skill
  for (const reqSkill of requiredSkills) {
    let bestMatch = { candidate: '', similarity: 0 }
    
    for (const candSkill of candidateSkills) {
      const similarity = getSemanticSkillSimilarity(candSkill, reqSkill)
      if (similarity > bestMatch.similarity) {
        bestMatch = { candidate: candSkill, similarity }
      }
    }
    
    if (bestMatch.similarity >= 0.7) {
      matched.push({ 
        candidate: bestMatch.candidate, 
        job: reqSkill, 
        similarity: bestMatch.similarity 
      })
      matchedJobSkills.add(reqSkill)
      
      // Add semantic insight for non-exact matches
      if (bestMatch.similarity < 1 && bestMatch.similarity >= 0.7) {
        semanticInsights.push(
          `"${bestMatch.candidate}" matches "${reqSkill}" (${Math.round(bestMatch.similarity * 100)}% similar)`
        )
      }
    } else {
      missing.push(reqSkill)
    }
  }
  
  // Check preferred skills (bonus)
  let preferredScore = 0
  for (const prefSkill of preferredSkills) {
    for (const candSkill of candidateSkills) {
      const similarity = getSemanticSkillSimilarity(candSkill, prefSkill)
      if (similarity >= 0.7 && !matchedJobSkills.has(prefSkill)) {
        preferredScore += similarity * 0.5
        matched.push({ candidate: candSkill, job: prefSkill, similarity })
        break
      }
    }
  }
  
  // Calculate score
  const requiredScore = requiredSkills.length > 0
    ? matched.filter(m => requiredSkills.map(r => r.toLowerCase()).includes(m.job.toLowerCase())).reduce((sum, m) => sum + m.similarity, 0) / requiredSkills.length
    : 1
  
  const finalScore = Math.min(100, (requiredScore * 100) + preferredScore)
  
  return {
    score: Math.round(finalScore),
    matched,
    missing,
    semanticInsights,
  }
}

/**
 * Calculate semantic location match
 */
export function calculateSemanticLocationMatch(
  candidateLocation: string,
  jobLocation: string,
  isRemote: boolean
): { score: number; insight: string } {
  if (isRemote) {
    return { score: 100, insight: 'Remote position - location flexible' }
  }
  
  if (!candidateLocation || !jobLocation) {
    return { score: 50, insight: 'Location information incomplete' }
  }
  
  const candLoc = candidateLocation.toLowerCase().trim()
  const jobLoc = jobLocation.toLowerCase().trim()
  
  // Exact match
  if (candLoc === jobLoc) {
    return { score: 100, insight: 'Exact location match' }
  }
  
  // One contains the other
  if (candLoc.includes(jobLoc) || jobLoc.includes(candLoc)) {
    return { score: 95, insight: 'Location match found' }
  }
  
  // Check location graph
  const candGraph = LOCATION_GRAPH[candLoc] || []
  const jobGraph = LOCATION_GRAPH[jobLoc] || []
  
  // In same region
  if (candGraph.includes(jobLoc) || jobGraph.includes(candLoc)) {
    return { score: 90, insight: 'Same metro area' }
  }
  
  // Check common area (e.g., both in India)
  const commonArea = candGraph.filter(c => jobGraph.includes(c))
  if (commonArea.length > 0) {
    if (commonArea.includes('india') || commonArea.includes('usa')) {
      return { score: 60, insight: `Same country: ${commonArea[0]}` }
    }
    return { score: 70, insight: `Same region: ${commonArea[0]}` }
  }
  
  // Fuzzy string match
  const similarity = 1 - (levenshteinDistance(candLoc, jobLoc) / Math.max(candLoc.length, jobLoc.length))
  if (similarity > 0.7) {
    return { score: Math.round(similarity * 80), insight: 'Similar location name' }
  }
  
  return { score: 30, insight: 'May require relocation' }
}

/**
 * Use LLM to generate intelligent match reasons
 */
export async function generateAIMatchReasons(
  candidateSkills: string[],
  jobSkills: string[],
  matchedSkills: { candidate: string; job: string; similarity: number }[],
  missingSkills: string[],
  overallScore: number
): Promise<string[]> {
  if (!OPENROUTER_API_KEY) {
    // Fallback to rule-based reasons
    return generateRuleBasedReasons(matchedSkills, missingSkills, overallScore)
  }
  
  try {
    const prompt = `You are a job matching AI. Generate 2-3 SHORT, specific reasons explaining this match.

Candidate skills: ${candidateSkills.join(', ')}
Job requires: ${jobSkills.join(', ')}
Matched skills: ${matchedSkills.map(m => `${m.candidate}→${m.job}`).join(', ')}
Missing skills: ${missingSkills.join(', ')}
Overall score: ${overallScore}%

Give 2-3 brief, professional reasons (max 15 words each). Focus on semantic connections.
Format: One reason per line, no numbering.`

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://deet.app',
        'X-Title': 'DEET Job Matching',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.1-8b-instruct:free',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''
    
    return content.split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 5 && line.length < 100)
      .slice(0, 3)
  } catch (error) {
    console.error('LLM reason generation error:', error)
    return generateRuleBasedReasons(matchedSkills, missingSkills, overallScore)
  }
}

/**
 * Fallback rule-based reason generation
 */
function generateRuleBasedReasons(
  matchedSkills: { candidate: string; job: string; similarity: number }[],
  missingSkills: string[],
  overallScore: number
): string[] {
  const reasons: string[] = []
  
  // Highlight semantic matches
  const semanticMatches = matchedSkills.filter(m => m.similarity < 1 && m.similarity >= 0.7)
  if (semanticMatches.length > 0) {
    const example = semanticMatches[0]
    reasons.push(`"${example.candidate}" demonstrates ${example.job} capability`)
  }
  
  // Highlight exact matches
  const exactMatches = matchedSkills.filter(m => m.similarity === 1)
  if (exactMatches.length >= 3) {
    reasons.push(`Strong alignment: ${exactMatches.slice(0, 3).map(m => m.job).join(', ')}`)
  } else if (exactMatches.length > 0) {
    reasons.push(`Core skill match: ${exactMatches.map(m => m.job).join(', ')}`)
  }
  
  // Missing skills (not blocking)
  if (missingSkills.length === 1) {
    reasons.push(`Could develop: ${missingSkills[0]}`)
  } else if (missingSkills.length > 1 && missingSkills.length <= 3) {
    reasons.push(`Growth areas: ${missingSkills.slice(0, 2).join(', ')}`)
  }
  
  // Overall score-based
  if (overallScore >= 85) {
    reasons.push('Excellent overall compatibility')
  } else if (overallScore >= 70) {
    reasons.push('Good match with room to grow')
  }
  
  return reasons.slice(0, 3)
}

/**
 * Enhanced skill extraction using LLM
 */
export async function extractSkillsFromResume(resumeText: string): Promise<{
  skills: string[]
  experience: { title: string; company: string; duration: string }[]
  location: string
  name: string
  email: string
}> {
  if (!OPENROUTER_API_KEY) {
    // Fallback to basic extraction
    return basicResumeExtraction(resumeText)
  }
  
  try {
    const prompt = `Extract structured information from this resume. Return ONLY valid JSON.

Resume:
${resumeText.slice(0, 3000)}

Return JSON with this exact structure:
{
  "name": "Full Name",
  "email": "email@example.com",
  "location": "City, Country",
  "skills": ["skill1", "skill2", ...],
  "experience": [
    {"title": "Job Title", "company": "Company Name", "duration": "2 years"}
  ]
}

Extract ALL technical skills mentioned. Be thorough with skills.`

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://deet.app',
        'X-Title': 'DEET Resume Parsing',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.1-8b-instruct:free',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 800,
        temperature: 0.1,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || '{}'
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        name: parsed.name || '',
        email: parsed.email || '',
        location: parsed.location || '',
        skills: Array.isArray(parsed.skills) ? parsed.skills : [],
        experience: Array.isArray(parsed.experience) ? parsed.experience : [],
      }
    }
    
    return basicResumeExtraction(resumeText)
  } catch (error) {
    console.error('LLM resume extraction error:', error)
    return basicResumeExtraction(resumeText)
  }
}

/**
 * Basic regex-based resume extraction fallback
 */
function basicResumeExtraction(text: string) {
  // Common skill patterns
  const skillPatterns = [
    'javascript', 'typescript', 'python', 'java', 'react', 'angular', 'vue',
    'node', 'nodejs', 'express', 'django', 'flask', 'spring', 'docker',
    'kubernetes', 'aws', 'gcp', 'azure', 'mongodb', 'postgresql', 'mysql',
    'redis', 'graphql', 'rest', 'api', 'git', 'agile', 'scrum', 'sql',
    'html', 'css', 'sass', 'tailwind', 'bootstrap', 'redux', 'nextjs',
    'machine learning', 'data science', 'tensorflow', 'pytorch',
  ]
  
  const textLower = text.toLowerCase()
  const foundSkills = skillPatterns.filter(skill => textLower.includes(skill))
  
  // Extract email
  const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)
  
  // Extract name (first line often)
  const lines = text.split('\n').filter(l => l.trim())
  const name = lines[0]?.trim().slice(0, 50) || ''
  
  return {
    name,
    email: emailMatch?.[0] || '',
    location: '',
    skills: foundSkills,
    experience: [],
  }
}
