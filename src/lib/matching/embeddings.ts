/**
 * Embedding-based skill matching using dimensional vectors
 * Lightweight ML approach: maps skills to feature vectors and uses cosine similarity
 * Includes in-memory caching for low latency
 */

// In-memory embedding cache — survives across requests in the same process
const embeddingCache = new Map<string, number[]>()

// Pre-computed embeddings for common skills (8 dimensions)
// [frontend, backend, data/ml, devops, mobile, design, management, domain]
const PRECOMPUTED_EMBEDDINGS: Record<string, number[]> = {
  // Languages
  'javascript':    [9, 7, 3, 2, 6, 2, 0, 0],
  'typescript':    [9, 8, 3, 2, 5, 2, 0, 0],
  'python':        [3, 8, 10, 5, 1, 0, 0, 3],
  'java':          [3, 9, 4, 4, 5, 0, 0, 3],
  'go':            [1, 9, 3, 7, 0, 0, 0, 2],
  'golang':        [1, 9, 3, 7, 0, 0, 0, 2],
  'rust':          [1, 8, 3, 5, 0, 0, 0, 2],
  'c++':           [1, 7, 4, 3, 2, 0, 0, 4],
  'c#':            [4, 8, 3, 3, 3, 0, 0, 3],
  'ruby':          [3, 8, 2, 3, 0, 0, 0, 1],
  'php':           [5, 7, 1, 2, 0, 0, 0, 1],
  'swift':         [1, 2, 1, 1, 10, 3, 0, 0],
  'kotlin':        [2, 5, 2, 2, 9, 1, 0, 0],
  'sql':           [1, 7, 7, 2, 0, 0, 0, 3],
  'r':             [0, 2, 10, 1, 0, 0, 0, 4],
  'scala':         [1, 8, 7, 3, 0, 0, 0, 2],
  'html':          [10, 1, 0, 0, 1, 5, 0, 0],
  'css':           [10, 0, 0, 0, 1, 8, 0, 0],

  // Frontend Frameworks
  'react':         [10, 3, 1, 1, 5, 3, 0, 0],
  'react.js':      [10, 3, 1, 1, 5, 3, 0, 0],
  'reactjs':       [10, 3, 1, 1, 5, 3, 0, 0],
  'next.js':       [9, 6, 1, 3, 1, 2, 0, 0],
  'nextjs':        [9, 6, 1, 3, 1, 2, 0, 0],
  'vue':           [10, 2, 1, 1, 2, 3, 0, 0],
  'vue.js':        [10, 2, 1, 1, 2, 3, 0, 0],
  'angular':       [10, 3, 1, 1, 2, 2, 0, 0],
  'svelte':        [10, 2, 1, 1, 1, 3, 0, 0],
  'tailwind':      [9, 0, 0, 0, 1, 7, 0, 0],
  'tailwindcss':   [9, 0, 0, 0, 1, 7, 0, 0],
  'bootstrap':     [8, 0, 0, 0, 1, 6, 0, 0],
  'sass':          [9, 0, 0, 0, 1, 7, 0, 0],
  'redux':         [9, 2, 1, 0, 3, 0, 0, 0],

  // Backend
  'node.js':       [4, 9, 2, 3, 1, 0, 0, 0],
  'nodejs':        [4, 9, 2, 3, 1, 0, 0, 0],
  'express':       [3, 9, 1, 2, 0, 0, 0, 0],
  'express.js':    [3, 9, 1, 2, 0, 0, 0, 0],
  'django':        [2, 9, 3, 2, 0, 0, 0, 1],
  'flask':         [1, 8, 4, 2, 0, 0, 0, 1],
  'fastapi':       [1, 9, 4, 2, 0, 0, 0, 1],
  'spring':        [1, 9, 2, 3, 0, 0, 0, 2],
  'spring boot':   [1, 9, 2, 3, 0, 0, 0, 2],
  'nestjs':        [3, 9, 1, 3, 0, 0, 0, 0],
  'laravel':       [3, 8, 1, 2, 0, 0, 0, 1],
  'rails':         [3, 9, 1, 2, 0, 0, 0, 1],
  'graphql':       [6, 7, 2, 1, 3, 0, 0, 0],
  'rest api':      [4, 8, 1, 2, 2, 0, 0, 0],
  'api':           [4, 8, 2, 2, 2, 0, 0, 0],
  'microservices': [2, 9, 2, 7, 0, 0, 2, 0],

  // Databases
  'mongodb':       [3, 8, 5, 3, 1, 0, 0, 0],
  'postgresql':    [2, 8, 6, 3, 0, 0, 0, 2],
  'postgres':      [2, 8, 6, 3, 0, 0, 0, 2],
  'mysql':         [2, 8, 5, 2, 0, 0, 0, 2],
  'redis':         [2, 7, 3, 5, 0, 0, 0, 0],
  'elasticsearch': [2, 6, 6, 4, 0, 0, 0, 1],
  'firebase':      [5, 5, 2, 3, 6, 0, 0, 0],
  'dynamodb':      [1, 7, 4, 5, 0, 0, 0, 0],

  // DevOps & Cloud
  'aws':           [2, 6, 4, 10, 1, 0, 1, 2],
  'gcp':           [2, 6, 5, 9, 1, 0, 1, 2],
  'azure':         [2, 6, 4, 9, 1, 0, 1, 2],
  'docker':        [1, 5, 2, 10, 0, 0, 0, 0],
  'kubernetes':    [1, 5, 2, 10, 0, 0, 1, 0],
  'k8s':           [1, 5, 2, 10, 0, 0, 1, 0],
  'terraform':     [0, 3, 1, 10, 0, 0, 1, 0],
  'ci/cd':         [2, 4, 1, 9, 1, 0, 1, 0],
  'jenkins':       [1, 3, 1, 9, 0, 0, 0, 0],
  'github actions': [2, 3, 1, 8, 1, 0, 0, 0],
  'linux':         [1, 5, 2, 8, 0, 0, 0, 1],
  'nginx':         [1, 5, 0, 8, 0, 0, 0, 0],

  // Data & ML
  'machine learning':  [0, 3, 10, 2, 0, 0, 0, 5],
  'deep learning':     [0, 2, 10, 2, 0, 0, 0, 4],
  'data science':      [0, 3, 10, 2, 0, 1, 0, 5],
  'data analysis':     [0, 2, 9, 1, 0, 1, 0, 6],
  'tensorflow':        [0, 2, 10, 2, 1, 0, 0, 3],
  'pytorch':           [0, 2, 10, 2, 0, 0, 0, 3],
  'pandas':            [0, 2, 9, 1, 0, 0, 0, 4],
  'numpy':             [0, 1, 9, 1, 0, 0, 0, 3],
  'nlp':               [0, 2, 10, 1, 0, 0, 0, 5],
  'computer vision':   [0, 2, 10, 1, 1, 0, 0, 4],
  'scikit-learn':      [0, 1, 9, 1, 0, 0, 0, 3],
  'spark':             [0, 5, 8, 5, 0, 0, 0, 3],
  'hadoop':            [0, 4, 7, 5, 0, 0, 0, 3],
  'power bi':          [1, 1, 5, 1, 0, 3, 1, 5],
  'tableau':           [1, 1, 6, 1, 0, 4, 1, 5],

  // Mobile
  'react native':  [6, 2, 1, 2, 10, 3, 0, 0],
  'flutter':       [4, 2, 1, 2, 10, 4, 0, 0],
  'ios':           [2, 2, 1, 2, 10, 3, 0, 0],
  'android':       [2, 3, 1, 2, 10, 2, 0, 0],

  // Design & UI
  'figma':         [5, 0, 0, 0, 2, 10, 0, 0],
  'ui/ux':         [5, 0, 0, 0, 2, 10, 1, 0],
  'ux design':     [3, 0, 1, 0, 2, 10, 1, 1],
  'responsive design': [8, 0, 0, 0, 3, 8, 0, 0],

  // Management & Soft Skills
  'agile':         [1, 1, 1, 1, 1, 0, 9, 2],
  'scrum':         [1, 1, 1, 1, 1, 0, 9, 2],
  'project management': [1, 1, 1, 1, 0, 0, 10, 3],
  'team leadership': [1, 1, 1, 1, 0, 0, 10, 2],
  'communication': [1, 1, 1, 1, 0, 1, 8, 3],
  'problem solving': [3, 3, 4, 2, 2, 1, 5, 3],

  // Other
  'git':           [4, 4, 2, 6, 2, 0, 0, 0],
  'github':        [4, 4, 2, 5, 2, 0, 0, 0],
  'testing':       [5, 5, 2, 4, 3, 0, 1, 0],
  'jest':          [7, 3, 1, 3, 2, 0, 0, 0],
  'tdd':           [5, 5, 2, 3, 2, 0, 1, 0],
  'system design': [3, 8, 3, 6, 1, 0, 3, 2],
  'security':      [3, 6, 2, 7, 2, 0, 1, 3],
  'blockchain':    [2, 6, 3, 4, 1, 0, 0, 8],
  'web3':          [4, 5, 2, 3, 1, 0, 0, 8],
}

/**
 * Get or compute embedding for a skill
 * Falls back to nearest match in precomputed set
 */
export function getSkillEmbedding(skill: string): number[] {
  const key = skill.toLowerCase().trim()
  
  if (embeddingCache.has(key)) return embeddingCache.get(key)!
  if (PRECOMPUTED_EMBEDDINGS[key]) {
    embeddingCache.set(key, PRECOMPUTED_EMBEDDINGS[key])
    return PRECOMPUTED_EMBEDDINGS[key]
  }

  // Try partial match
  for (const [preKey, vec] of Object.entries(PRECOMPUTED_EMBEDDINGS)) {
    if (key.includes(preKey) || preKey.includes(key)) {
      embeddingCache.set(key, vec)
      return vec
    }
  }

  // Default: balanced mid vector
  const defaultVec = [4, 4, 4, 4, 4, 2, 2, 2]
  embeddingCache.set(key, defaultVec)
  return defaultVec
}

/**
 * Cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, val, i) => sum + val * (b[i] || 0), 0)
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))
  return magA && magB ? dot / (magA * magB) : 0
}

/**
 * Compute embedding-based skill match between candidate and job
 * Returns similarity score and matched pairs
 */
export function embeddingSkillMatch(
  candidateSkills: string[],
  jobSkills: string[]
): { 
  score: number
  matched: { candidate: string; job: string; similarity: number }[]
  missing: string[]
  embeddingInsights: string[]
} {
  const matched: { candidate: string; job: string; similarity: number }[] = []
  const missing: string[] = []
  const insights: string[] = []

  const candEmbeddings = candidateSkills.map(s => ({ skill: s, vec: getSkillEmbedding(s) }))
  const jobEmbeddings = jobSkills.map(s => ({ skill: s, vec: getSkillEmbedding(s) }))

  for (const jobEmb of jobEmbeddings) {
    let bestSim = 0
    let bestCandidate = ''

    for (const candEmb of candEmbeddings) {
      const sim = cosineSimilarity(candEmb.vec, jobEmb.vec)
      if (sim > bestSim) {
        bestSim = sim
        bestCandidate = candEmb.skill
      }
    }

    if (bestSim >= 0.75) {
      matched.push({ candidate: bestCandidate, job: jobEmb.skill, similarity: bestSim })
      if (bestCandidate.toLowerCase() !== jobEmb.skill.toLowerCase() && bestSim < 0.95) {
        insights.push(`${bestCandidate} → ${jobEmb.skill} (${Math.round(bestSim * 100)}% vector similarity)`)
      }
    } else {
      missing.push(jobEmb.skill)
    }
  }

  const score = jobSkills.length > 0
    ? Math.round((matched.reduce((sum, m) => sum + m.similarity, 0) / jobSkills.length) * 100)
    : 100

  return { score, matched, missing, embeddingInsights: insights }
}

/**
 * Get the role profile vector for a candidate (average of all skill embeddings)
 * Useful for clustering and recommendation
 */
export function getCandidateProfileVector(skills: string[]): number[] {
  if (skills.length === 0) return [0, 0, 0, 0, 0, 0, 0, 0]
  
  const embeddings = skills.map(s => getSkillEmbedding(s))
  const dims = embeddings[0].length
  
  return Array.from({ length: dims }, (_, i) => {
    const sum = embeddings.reduce((acc, emb) => acc + (emb[i] || 0), 0)
    return Math.round((sum / embeddings.length) * 10) / 10
  })
}

/**
 * Recommend skills a candidate should learn based on job requirements gap
 */
export function recommendSkillGaps(
  candidateSkills: string[],
  jobSkills: string[],
  allKnownSkills: string[] = Object.keys(PRECOMPUTED_EMBEDDINGS)
): { skill: string; relevance: number; reason: string }[] {
  const { missing } = embeddingSkillMatch(candidateSkills, jobSkills)
  const candidateVec = getCandidateProfileVector(candidateSkills)

  return missing.map(skill => {
    const skillVec = getSkillEmbedding(skill)
    const relevance = cosineSimilarity(candidateVec, skillVec)
    return {
      skill,
      relevance: Math.round(relevance * 100),
      reason: relevance > 0.7 
        ? 'Close to your existing skillset — easy to pick up'
        : relevance > 0.5
        ? 'Related to your background — moderate learning curve'
        : 'New domain — significant upskilling needed'
    }
  }).sort((a, b) => b.relevance - a.relevance)
}
