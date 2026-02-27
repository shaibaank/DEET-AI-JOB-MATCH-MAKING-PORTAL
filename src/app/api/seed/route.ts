import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import { Jobseeker, Job, Screening, Match } from '@/lib/models'
import { matchJobseekerToJobs } from '@/lib/matching/engine'

// Mock data for seeding
const mockJobseekers = [
  {
    name: 'Sarah Chen',
    email: 'sarah.chen@email.com',
    phone: '+1 (555) 123-4567',
    location: 'San Francisco, CA',
    skills: ['React', 'TypeScript', 'Node.js', 'Python', 'AWS', 'GraphQL', 'PostgreSQL', 'Docker'],
    experience: [
      {
        title: 'Senior Frontend Developer',
        company: 'TechCorp Inc',
        duration: '3 years',
        achievements: [
          'Led migration from JavaScript to TypeScript, reducing bugs by 40%',
          'Built component library used by 5 product teams',
          'Mentored 3 junior developers',
        ],
      },
      {
        title: 'Frontend Developer',
        company: 'StartupXYZ',
        duration: '2 years',
        achievements: [
          'Implemented real-time dashboard serving 10k+ users',
          'Reduced page load time by 60%',
        ],
      },
    ],
    education: [
      {
        degree: 'B.S. Computer Science',
        institution: 'UC Berkeley',
        year: '2018',
      },
    ],
    salaryExpectation: { min: 150000, max: 180000, currency: 'USD' },
    availability: '2 weeks notice',
    profileComplete: 92,
  },
  {
    name: 'Marcus Johnson',
    email: 'marcus.j@email.com',
    phone: '+1 (555) 234-5678',
    location: 'Austin, TX',
    skills: ['Python', 'Machine Learning', 'TensorFlow', 'PyTorch', 'SQL', 'Spark', 'AWS', 'Kubernetes'],
    experience: [
      {
        title: 'Machine Learning Engineer',
        company: 'AI Solutions Ltd',
        duration: '4 years',
        achievements: [
          'Developed recommendation engine increasing user engagement by 35%',
          'Built real-time fraud detection system processing 1M+ transactions/day',
          'Published 2 papers on NLP techniques',
        ],
      },
    ],
    education: [
      {
        degree: 'M.S. Machine Learning',
        institution: 'Stanford University',
        year: '2019',
      },
    ],
    salaryExpectation: { min: 180000, max: 220000, currency: 'USD' },
    availability: 'Immediate',
    profileComplete: 88,
  },
  {
    name: 'Emily Rodriguez',
    email: 'emily.r@email.com',
    phone: '+1 (555) 345-6789',
    location: 'New York, NY',
    skills: ['Java', 'Spring Boot', 'Microservices', 'Kafka', 'MongoDB', 'React', 'AWS', 'CI/CD'],
    experience: [
      {
        title: 'Full Stack Developer',
        company: 'FinTech Global',
        duration: '3 years',
        achievements: [
          'Architected payment processing system handling $50M+ daily',
          'Reduced API response time by 70%',
          'Led team of 4 for mobile banking feature launch',
        ],
      },
      {
        title: 'Software Developer',
        company: 'Enterprise Corp',
        duration: '2 years',
        achievements: [
          'Built internal tools saving 200+ hours/month',
        ],
      },
    ],
    education: [
      {
        degree: 'B.S. Software Engineering',
        institution: 'NYU',
        year: '2017',
      },
    ],
    salaryExpectation: { min: 140000, max: 170000, currency: 'USD' },
    availability: '1 month notice',
    profileComplete: 85,
  },
  {
    name: 'David Kim',
    email: 'david.kim@email.com',
    phone: '+1 (555) 456-7890',
    location: 'Seattle, WA',
    skills: ['Go', 'Rust', 'Kubernetes', 'Docker', 'AWS', 'Terraform', 'Linux', 'Python'],
    experience: [
      {
        title: 'DevOps Engineer',
        company: 'CloudNative Co',
        duration: '4 years',
        achievements: [
          'Reduced deployment time from 2 hours to 15 minutes',
          'Built infrastructure supporting 10M+ requests/day',
          'Achieved 99.99% uptime SLA',
        ],
      },
    ],
    education: [
      {
        degree: 'B.S. Computer Engineering',
        institution: 'University of Washington',
        year: '2018',
      },
    ],
    salaryExpectation: { min: 160000, max: 200000, currency: 'USD' },
    availability: 'Immediate',
    profileComplete: 90,
  },
  {
    name: 'Jessica Thompson',
    email: 'jessica.t@email.com',
    phone: '+1 (555) 567-8901',
    location: 'Remote',
    skills: ['Product Management', 'Agile', 'SQL', 'Figma', 'Analytics', 'A/B Testing', 'Roadmap Planning'],
    experience: [
      {
        title: 'Product Manager',
        company: 'SaaS Platform Inc',
        duration: '5 years',
        achievements: [
          'Launched 3 products generating $5M+ ARR',
          'Increased user retention by 25%',
          'Managed team of 8 engineers and 2 designers',
        ],
      },
    ],
    education: [
      {
        degree: 'MBA',
        institution: 'Harvard Business School',
        year: '2018',
      },
    ],
    salaryExpectation: { min: 170000, max: 210000, currency: 'USD' },
    availability: '2 weeks notice',
    profileComplete: 95,
  },
]

const mockJobs: Array<{
  title: string
  company: string
  description: string
  requiredSkills: string[]
  preferredSkills: string[]
  experienceLevel: string
  experienceYears: { min: number; max: number }
  location: string
  remote: boolean
  salaryRange: { min: number; max: number; currency: string }
  employerId: string
  status: 'active' | 'closed' | 'draft'
}> = [
  {
    title: 'Senior Frontend Engineer',
    company: 'InnovateTech',
    description: 'Build next-generation web applications using React and TypeScript. Lead frontend architecture decisions and mentor junior developers.',
    requiredSkills: ['React', 'TypeScript', 'JavaScript', 'CSS'],
    preferredSkills: ['GraphQL', 'Node.js', 'Testing', 'CI/CD'],
    experienceLevel: 'Senior',
    experienceYears: { min: 4, max: 8 },
    location: 'San Francisco, CA',
    remote: true,
    salaryRange: { min: 150000, max: 200000, currency: 'USD' },
    employerId: 'emp_001',
    status: 'active',
  },
  {
    title: 'Machine Learning Engineer',
    company: 'DataDriven AI',
    description: 'Design and implement ML models for our recommendation system. Work with large-scale data pipelines and production ML systems.',
    requiredSkills: ['Python', 'Machine Learning', 'TensorFlow', 'SQL'],
    preferredSkills: ['PyTorch', 'Spark', 'Kubernetes', 'MLOps'],
    experienceLevel: 'Mid-Senior',
    experienceYears: { min: 3, max: 7 },
    location: 'Austin, TX',
    remote: true,
    salaryRange: { min: 160000, max: 220000, currency: 'USD' },
    employerId: 'emp_002',
    status: 'active',
  },
  {
    title: 'Full Stack Developer',
    company: 'FinanceFlow',
    description: 'Build scalable financial applications. Work across the entire stack from React frontend to Java microservices.',
    requiredSkills: ['Java', 'React', 'Spring Boot', 'PostgreSQL'],
    preferredSkills: ['Kafka', 'Microservices', 'AWS', 'Docker'],
    experienceLevel: 'Mid',
    experienceYears: { min: 2, max: 5 },
    location: 'New York, NY',
    remote: false,
    salaryRange: { min: 120000, max: 160000, currency: 'USD' },
    employerId: 'emp_003',
    status: 'active',
  },
  {
    title: 'DevOps Platform Engineer',
    company: 'CloudScale Systems',
    description: 'Build and maintain our cloud infrastructure. Lead Kubernetes deployment strategies and CI/CD pipeline optimization.',
    requiredSkills: ['Kubernetes', 'Docker', 'AWS', 'Terraform'],
    preferredSkills: ['Go', 'Python', 'Prometheus', 'GitOps'],
    experienceLevel: 'Senior',
    experienceYears: { min: 4, max: 8 },
    location: 'Seattle, WA',
    remote: true,
    salaryRange: { min: 160000, max: 210000, currency: 'USD' },
    employerId: 'emp_004',
    status: 'active',
  },
  {
    title: 'Technical Product Manager',
    company: 'ProductLabs',
    description: 'Lead product strategy for our developer tools platform. Work closely with engineering to define roadmap and deliver features.',
    requiredSkills: ['Product Management', 'Agile', 'Analytics', 'Technical Background'],
    preferredSkills: ['SQL', 'API Design', 'User Research', 'Roadmap Planning'],
    experienceLevel: 'Senior',
    experienceYears: { min: 5, max: 10 },
    location: 'Remote',
    remote: true,
    salaryRange: { min: 170000, max: 220000, currency: 'USD' },
    employerId: 'emp_005',
    status: 'active',
  },
]

const mockScreenings = [
  {
    transcript: `Interviewer: Tell me about your role as Senior Frontend Developer at TechCorp Inc.
    
Candidate: At TechCorp, I was responsible for leading our frontend architecture migration from JavaScript to TypeScript. This was a major initiative that spanned 6 months and involved coordinating with 5 different product teams. We saw a 40% reduction in production bugs after the migration, which was really satisfying. I also built a shared component library that's now used across all our products.

Interviewer: You mentioned reducing bugs by 40%. How did you measure this?

Candidate: We tracked bug tickets in Jira before and after the migration. I set up dashboards to monitor TypeScript-related catches versus runtime errors. The type system caught many issues during development that would have previously made it to production.

Interviewer: What's your availability and salary expectation?

Candidate: I can start in 2 weeks after giving notice to my current employer. For salary, I'm looking for something in the range of $150,000 to $180,000, depending on the overall compensation package and benefits.`,
    scores: {
      content: 85,
      communication: 88,
      professional: 90,
      overall: 87,
    },
    feedback: [
      'Good: Mentioned specific metrics and results (40% bug reduction)',
      'Good: Demonstrated leadership and coordination skills',
      'Good: Clear communication of timeline and expectations',
      'Improve: Could elaborate more on technical implementation details',
    ],
    status: 'completed',
    duration: 245,
  },
  {
    transcript: `Interviewer: Tell me about your experience with machine learning at AI Solutions.

Candidate: Um, so at AI Solutions I worked on, like, recommendation systems. I built a model that, you know, improved engagement. It was using collaborative filtering and some deep learning stuff.

Interviewer: Can you tell me more about the technical approach?

Candidate: Yeah so we used TensorFlow and had a lot of data. The model was trained on user behavior data and we deployed it on AWS.

Interviewer: What results did you achieve?

Candidate: We saw improvements in the metrics. Users were more engaged with the recommendations.`,
    scores: {
      content: 55,
      communication: 45,
      professional: 60,
      overall: 53,
    },
    feedback: [
      'Improve: Reduce filler words (found 5 instances)',
      'Improve: Provide more specific metrics and numbers',
      'Improve: Structure answers with clear situation-task-action-result format',
      'Good: Mentioned relevant technologies',
    ],
    status: 'completed',
    duration: 180,
  },
]

export async function POST(request: NextRequest) {
  try {
    await connectDB()

    // Clear existing data (optional - for clean demos)
    await Promise.all([
      Jobseeker.deleteMany({}),
      Job.deleteMany({}),
      Screening.deleteMany({}),
      Match.deleteMany({}),
    ])

    // Create jobseekers
    const createdJobseekers = await Jobseeker.insertMany(mockJobseekers)
    
    // Create jobs
    const createdJobs = await Job.insertMany(mockJobs)

    // Generate matches using the matching engine
    let totalMatches = 0
    for (const jobseeker of createdJobseekers) {
      const matches = matchJobseekerToJobs(jobseeker as any, createdJobs as any)
      
      for (const match of matches) {
        await Match.create({
          jobseekerId: jobseeker._id,
          jobId: match.jobId,
          matchScore: match.matchScore,
          skillMatch: match.skillMatch,
          experienceMatch: match.experienceMatch,
          locationMatch: match.locationMatch,
          salaryMatch: match.salaryMatch,
          reasons: match.reasons,
          status: 'pending',
        })
        totalMatches++
      }
    }

    // Create sample screenings
    if (createdJobseekers.length >= 2) {
      await Screening.create({
        jobseekerId: createdJobseekers[0]._id,
        jobId: createdJobs[0]._id,
        ...mockScreenings[0],
        questions: [
          'Tell me about your role as Senior Frontend Developer at TechCorp Inc.',
          'You mentioned reducing bugs by 40%. How did you measure this?',
          'What is your availability and salary expectation?',
        ],
      })

      await Screening.create({
        jobseekerId: createdJobseekers[1]._id,
        jobId: createdJobs[1]._id,
        ...mockScreenings[1],
        questions: [
          'Tell me about your experience with machine learning at AI Solutions.',
          'Can you tell me more about the technical approach?',
          'What results did you achieve?',
        ],
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        jobseekers: createdJobseekers.length,
        jobs: createdJobs.length,
        matches: totalMatches,
        screenings: 2,
      },
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: 'Seeding failed' }, { status: 500 })
  }
}

// GET - Check seed status
export async function GET() {
  try {
    await connectDB()
    
    const [jobseekers, jobs, matches, screenings] = await Promise.all([
      Jobseeker.countDocuments(),
      Job.countDocuments(),
      Match.countDocuments(),
      Screening.countDocuments(),
    ])

    return NextResponse.json({
      hasData: jobseekers > 0 || jobs > 0,
      counts: {
        jobseekers,
        jobs,
        matches,
        screenings,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Status check failed' }, { status: 500 })
  }
}
