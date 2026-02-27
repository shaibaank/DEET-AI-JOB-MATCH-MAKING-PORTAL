'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Plus, Check } from 'lucide-react'

const SKILL_SUGGESTIONS = [
  // Programming Languages
  'Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'C#', 'Go', 'Rust', 'Ruby', 'PHP', 'Swift', 'Kotlin',
  // Frontend
  'React', 'Vue.js', 'Angular', 'Next.js', 'Svelte', 'HTML5', 'CSS3', 'Tailwind CSS', 'SASS', 'Redux',
  // Backend
  'Node.js', 'Django', 'Flask', 'Spring Boot', 'Express.js', 'FastAPI', 'GraphQL', 'REST API',
  // Database
  'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Elasticsearch', 'Firebase', 'Supabase',
  // Cloud & DevOps
  'AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes', 'CI/CD', 'Jenkins', 'Terraform',
  // Data & ML
  'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Data Analysis', 'Pandas', 'NumPy', 'SQL',
  // Design
  'Figma', 'Adobe XD', 'UI/UX Design', 'Photoshop', 'Illustrator',
  // Other
  'Git', 'Agile', 'Scrum', 'Project Management', 'Technical Writing', 'Leadership', 'Communication',
  'Backend Development', 'Frontend Development', 'Full Stack', 'Mobile Development', 'System Design',
]

interface SkillAutocompleteProps {
  skills: string[]
  onChange: (skills: string[]) => void
  placeholder?: string
  maxSkills?: number
}

export default function SkillAutocomplete({ 
  skills, 
  onChange, 
  placeholder = 'Type a skill...',
  maxSkills = 15 
}: SkillAutocompleteProps) {
  const [inputValue, setInputValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const filteredSuggestions = SKILL_SUGGESTIONS
    .filter(skill => 
      skill.toLowerCase().includes(inputValue.toLowerCase()) &&
      !skills.includes(skill)
    )
    .slice(0, 6)

  const addSkill = useCallback((skill: string) => {
    const trimmedSkill = skill.trim()
    if (trimmedSkill && !skills.includes(trimmedSkill) && skills.length < maxSkills) {
      onChange([...skills, trimmedSkill])
      setInputValue('')
      setShowSuggestions(false)
      setHighlightedIndex(0)
      inputRef.current?.focus()
    }
  }, [skills, onChange, maxSkills])

  const removeSkill = (skillToRemove: string) => {
    onChange(skills.filter(skill => skill !== skillToRemove))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (showSuggestions && filteredSuggestions.length > 0) {
        addSkill(filteredSuggestions[highlightedIndex])
      } else if (inputValue.trim()) {
        addSkill(inputValue)
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex(prev => 
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0)
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    } else if (e.key === 'Backspace' && !inputValue && skills.length > 0) {
      removeSkill(skills[skills.length - 1])
    }
  }

  useEffect(() => {
    setHighlightedIndex(0)
  }, [inputValue])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      {/* Skills display */}
      <div className="flex flex-wrap gap-2 mb-4">
        {skills.map((skill, index) => (
          <div
            key={skill}
            className="skill-pill group animate-scaleIn"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <Check className="w-3 h-3 text-green-600" />
            <span>{skill}</span>
            <button
              onClick={() => removeSkill(skill)}
              className="ml-1 p-0.5 hover:bg-green-200 transition-colors duration-200"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            setShowSuggestions(true)
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={skills.length >= maxSkills ? `Maximum ${maxSkills} skills` : placeholder}
          disabled={skills.length >= maxSkills}
          className="input-luxury pr-10 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {inputValue && (
          <button
            onClick={() => addSkill(inputValue)}
            className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-warmgrey hover:text-charcoal transition-colors duration-300"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && inputValue && filteredSuggestions.length > 0 && (
        <div className="absolute z-20 top-full left-0 right-0 mt-2 bg-alabaster border border-charcoal/10 shadow-[0_8px_32px_rgba(0,0,0,0.08)] animate-fadeInUp">
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              onClick={() => addSkill(suggestion)}
              className={`w-full px-4 py-3 text-left flex items-center justify-between transition-all duration-300
                ${index === highlightedIndex ? 'bg-taupe/50' : 'hover:bg-taupe/30'}
              `}
            >
              <span className="text-charcoal">{suggestion}</span>
              <Plus className="w-4 h-4 text-warmgrey" />
            </button>
          ))}
        </div>
      )}

      {/* Helper text */}
      <div className="flex items-center justify-between mt-2 text-xs text-warmgrey">
        <span>Press Enter to add custom skill</span>
        <span>{skills.length}/{maxSkills}</span>
      </div>
    </div>
  )
}
