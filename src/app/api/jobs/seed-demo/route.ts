import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import { Job } from '@/lib/models'

const demoJobs = [
  {
    title: 'Senior Frontend Engineer',
    company: 'InnovateTech',
    description: 'Build next-generation web applications using React and TypeScript. Lead frontend architecture decisions and mentor junior developers.',
    requiredSkills: ['React', 'TypeScript', 'JavaScript', 'CSS', 'HTML'],
    preferredSkills: ['GraphQL', 'Node.js', 'Testing', 'CI/CD', 'Next.js'],
    experienceLevel: 'Senior',
    experienceYears: { min: 4, max: 8 },
    location: 'Bangalore',
    remote: true,
    salaryRange: { min: 15, max: 30, currency: 'INR' },
    employerId: 'emp_001',
    status: 'active' as const,
  },
  {
    title: 'Machine Learning Engineer',
    company: 'DataDriven AI',
    description: 'Design and implement ML models for our recommendation system. Work with large-scale data pipelines and production ML systems.',
    requiredSkills: ['Python', 'Machine Learning', 'TensorFlow', 'SQL'],
    preferredSkills: ['PyTorch', 'Spark', 'Kubernetes', 'MLOps', 'Deep Learning'],
    experienceLevel: 'Mid-Senior',
    experienceYears: { min: 3, max: 7 },
    location: 'Hyderabad',
    remote: true,
    salaryRange: { min: 18, max: 35, currency: 'INR' },
    employerId: 'emp_002',
    status: 'active' as const,
  },
  {
    title: 'Full Stack Developer',
    company: 'FinanceFlow',
    description: 'Build scalable financial applications. Work across the entire stack from React frontend to Node.js/Java microservices.',
    requiredSkills: ['Java', 'React', 'Spring Boot', 'PostgreSQL'],
    preferredSkills: ['Kafka', 'Microservices', 'AWS', 'Docker', 'MongoDB'],
    experienceLevel: 'Mid',
    experienceYears: { min: 2, max: 5 },
    location: 'Mumbai',
    remote: false,
    salaryRange: { min: 10, max: 22, currency: 'INR' },
    employerId: 'emp_003',
    status: 'active' as const,
  },
  {
    title: 'DevOps Platform Engineer',
    company: 'CloudScale Systems',
    description: 'Build and maintain cloud infrastructure. Lead Kubernetes deployment strategies and CI/CD pipeline optimization.',
    requiredSkills: ['Kubernetes', 'Docker', 'AWS', 'Terraform'],
    preferredSkills: ['Go', 'Python', 'Prometheus', 'GitOps', 'Linux'],
    experienceLevel: 'Senior',
    experienceYears: { min: 4, max: 8 },
    location: 'Pune',
    remote: true,
    salaryRange: { min: 16, max: 28, currency: 'INR' },
    employerId: 'emp_004',
    status: 'active' as const,
  },
  {
    title: 'Backend Engineer - Node.js',
    company: 'ScaleUp Inc',
    description: 'Design and build high-performance APIs and microservices. Scale our backend to handle millions of requests.',
    requiredSkills: ['Node.js', 'TypeScript', 'MongoDB', 'REST APIs'],
    preferredSkills: ['GraphQL', 'Redis', 'Docker', 'AWS', 'PostgreSQL'],
    experienceLevel: 'Mid',
    experienceYears: { min: 2, max: 5 },
    location: 'Bangalore',
    remote: true,
    salaryRange: { min: 12, max: 25, currency: 'INR' },
    employerId: 'emp_005',
    status: 'active' as const,
  },
  {
    title: 'React Native Developer',
    company: 'MobileFirst Labs',
    description: 'Build cross-platform mobile apps with React Native. Collaborate with design team to create delightful user experiences.',
    requiredSkills: ['React Native', 'JavaScript', 'TypeScript', 'Mobile Development'],
    preferredSkills: ['iOS', 'Android', 'Redux', 'GraphQL', 'Firebase'],
    experienceLevel: 'Mid',
    experienceYears: { min: 2, max: 5 },
    location: 'Chennai',
    remote: true,
    salaryRange: { min: 10, max: 20, currency: 'INR' },
    employerId: 'emp_006',
    status: 'active' as const,
  },
  {
    title: 'Data Scientist',
    company: 'InsightAI Corp',
    description: 'Analyze large datasets, build predictive models, and generate actionable business insights using advanced analytics.',
    requiredSkills: ['Python', 'SQL', 'Machine Learning', 'Statistics'],
    preferredSkills: ['R', 'Tableau', 'Deep Learning', 'NLP', 'Spark'],
    experienceLevel: 'Mid-Senior',
    experienceYears: { min: 3, max: 6 },
    location: 'Delhi NCR',
    remote: false,
    salaryRange: { min: 14, max: 26, currency: 'INR' },
    employerId: 'emp_007',
    status: 'active' as const,
  },
  {
    title: 'Cloud Solutions Architect',
    company: 'TechNova Solutions',
    description: 'Design cloud-native architectures, lead migration projects, and ensure best practices across AWS/Azure infrastructure.',
    requiredSkills: ['AWS', 'Cloud Architecture', 'Terraform', 'Networking'],
    preferredSkills: ['Azure', 'GCP', 'Security', 'Kubernetes', 'Serverless'],
    experienceLevel: 'Senior',
    experienceYears: { min: 6, max: 12 },
    location: 'Remote - India',
    remote: true,
    salaryRange: { min: 25, max: 45, currency: 'INR' },
    employerId: 'emp_008',
    status: 'active' as const,
  },
  {
    title: 'UI/UX Engineer',
    company: 'DesignLab Studios',
    description: 'Bridge design and engineering. Implement pixel-perfect UI components and design system with accessibility focus.',
    requiredSkills: ['React', 'CSS', 'Figma', 'Design Systems'],
    preferredSkills: ['Tailwind CSS', 'Storybook', 'Accessibility', 'Animation', 'TypeScript'],
    experienceLevel: 'Mid',
    experienceYears: { min: 2, max: 5 },
    location: 'Bangalore',
    remote: true,
    salaryRange: { min: 12, max: 22, currency: 'INR' },
    employerId: 'emp_009',
    status: 'active' as const,
  },
  {
    title: 'Software Engineer - Python',
    company: 'AutomateTech',
    description: 'Build automation tools and internal platforms. Work with Python to solve complex engineering challenges.',
    requiredSkills: ['Python', 'Django', 'REST APIs', 'SQL'],
    preferredSkills: ['FastAPI', 'Docker', 'Redis', 'Celery', 'AWS'],
    experienceLevel: 'Mid',
    experienceYears: { min: 2, max: 5 },
    location: 'Hyderabad',
    remote: false,
    salaryRange: { min: 10, max: 20, currency: 'INR' },
    employerId: 'emp_010',
    status: 'active' as const,
  },
]

export async function POST() {
  try {
    await connectDB()
    
    // Only seed if no jobs exist
    const existingJobs = await Job.countDocuments()
    if (existingJobs > 0) {
      return NextResponse.json({ success: true, message: 'Jobs already exist', count: existingJobs })
    }

    const created = await Job.insertMany(demoJobs)
    return NextResponse.json({ success: true, count: created.length })
  } catch (error) {
    console.error('Seed demo jobs error:', error)
    return NextResponse.json({ error: 'Failed to seed jobs' }, { status: 500 })
  }
}
