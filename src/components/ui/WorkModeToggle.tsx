'use client'

import { Home, Building2, GitMerge } from 'lucide-react'

type WorkMode = 'remote' | 'onsite' | 'hybrid'

interface WorkModeToggleProps {
  value: WorkMode
  onChange: (value: WorkMode) => void
}

const modes: { id: WorkMode; label: string; icon: typeof Home }[] = [
  { id: 'remote', label: 'Remote', icon: Home },
  { id: 'hybrid', label: 'Hybrid', icon: GitMerge },
  { id: 'onsite', label: 'On-site', icon: Building2 },
]

export default function WorkModeToggle({ value, onChange }: WorkModeToggleProps) {
  const selectedIndex = modes.findIndex(m => m.id === value)

  return (
    <div className="py-4">
      <label className="overline mb-4 block">Work Preference</label>
      
      <div className="relative bg-taupe p-1">
        {/* Sliding background */}
        <div 
          className="absolute top-1 bottom-1 bg-charcoal transition-all duration-500 ease-luxury"
          style={{
            left: `calc(${(selectedIndex / 3) * 100}% + 4px)`,
            width: `calc(${100 / 3}% - 8px)`
          }}
        />
        
        {/* Options */}
        <div className="relative flex">
          {modes.map((mode) => {
            const Icon = mode.icon
            const isSelected = value === mode.id
            
            return (
              <button
                key={mode.id}
                onClick={() => onChange(mode.id)}
                className={`
                  flex-1 flex items-center justify-center gap-2 py-3 px-4 
                  transition-colors duration-500
                  ${isSelected ? 'text-white' : 'text-warmgrey hover:text-charcoal'}
                `}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{mode.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Simple toggle switch variant
export function ToggleSwitch({ 
  checked, 
  onChange, 
  label 
}: { 
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
}) {
  return (
    <div className="flex items-center justify-between py-2">
      {label && <span className="text-sm text-warmgrey">{label}</span>}
      <button
        onClick={() => onChange(!checked)}
        className={`toggle-luxury ${checked ? 'active' : ''}`}
        role="switch"
        aria-checked={checked}
      />
    </div>
  )
}

// Location selector
interface LocationSelectorProps {
  value: string
  onChange: (value: string) => void
  options?: string[]
}

const DEFAULT_LOCATIONS = [
  'Bangalore', 'Mumbai', 'Delhi NCR', 'Hyderabad', 'Chennai', 'Pune', 
  'Kolkata', 'Ahmedabad', 'Jaipur', 'Remote - India', 'Remote - Global'
]

export function LocationSelector({ 
  value, 
  onChange, 
  options = DEFAULT_LOCATIONS 
}: LocationSelectorProps) {
  return (
    <div className="py-4">
      <label className="overline mb-4 block">Location</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-3 bg-transparent border border-charcoal/20 
                     text-charcoal appearance-none cursor-pointer
                     focus:border-gold focus:outline-none transition-colors duration-500"
        >
          <option value="">Select location...</option>
          {options.map(loc => (
            <option key={loc} value={loc}>{loc}</option>
          ))}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg className="w-4 h-4 text-warmgrey" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  )
}

// Experience level selector
interface ExperienceSelectorProps {
  value: string
  onChange: (value: string) => void
}

const EXPERIENCE_LEVELS = [
  { id: 'entry', label: 'Entry (0-2 yrs)', years: '0-2' },
  { id: 'mid', label: 'Mid (2-5 yrs)', years: '2-5' },
  { id: 'senior', label: 'Senior (5-10 yrs)', years: '5-10' },
  { id: 'lead', label: 'Lead (10+ yrs)', years: '10+' },
]

export function ExperienceSelector({ value, onChange }: ExperienceSelectorProps) {
  return (
    <div className="py-4">
      <label className="overline mb-4 block">Experience Level</label>
      <div className="grid grid-cols-2 gap-2">
        {EXPERIENCE_LEVELS.map(level => (
          <button
            key={level.id}
            onClick={() => onChange(level.id)}
            className={`
              py-3 px-4 border text-sm font-medium transition-all duration-300
              ${value === level.id 
                ? 'bg-charcoal text-white border-charcoal' 
                : 'bg-transparent text-charcoal border-charcoal/20 hover:border-charcoal/50'}
            `}
          >
            <div>{level.label}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
