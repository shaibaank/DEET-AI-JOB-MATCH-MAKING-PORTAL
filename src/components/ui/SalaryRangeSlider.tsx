'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

interface SalaryRangeSliderProps {
  min?: number
  max?: number
  step?: number
  value: [number, number]
  onChange: (value: [number, number]) => void
  formatValue?: (value: number) => string
  label?: string
}

export default function SalaryRangeSlider({
  min = 0,
  max = 50,
  step = 1,
  value,
  onChange,
  formatValue = (v) => `₹${v}L`,
  label = 'Salary Range'
}: SalaryRangeSliderProps) {
  const [isDragging, setIsDragging] = useState<'min' | 'max' | null>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  const getPositionFromValue = (val: number) => {
    return ((val - min) / (max - min)) * 100
  }

  const getValueFromPosition = (clientX: number) => {
    if (!trackRef.current) return min
    const rect = trackRef.current.getBoundingClientRect()
    const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const rawValue = min + percentage * (max - min)
    return Math.round(rawValue / step) * step
  }

  const handleMouseDown = (type: 'min' | 'max') => (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(type)
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return
    
    const newValue = getValueFromPosition(e.clientX)
    
    if (isDragging === 'min') {
      if (newValue < value[1]) {
        onChange([newValue, value[1]])
      }
    } else {
      if (newValue > value[0]) {
        onChange([value[0], newValue])
      }
    }
  }, [isDragging, value, onChange])

  const handleMouseUp = useCallback(() => {
    setIsDragging(null)
  }, [])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const minPos = getPositionFromValue(value[0])
  const maxPos = getPositionFromValue(value[1])

  return (
    <div className="py-4">
      {/* Label and values */}
      <div className="flex items-center justify-between mb-6">
        <label className="overline">{label}</label>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-serif text-charcoal font-medium transition-all duration-300">
            {formatValue(value[0])}
          </span>
          <span className="text-warmgrey">—</span>
          <span className="text-2xl font-serif text-charcoal font-medium transition-all duration-300">
            {formatValue(value[1])}
          </span>
        </div>
      </div>

      {/* Slider track */}
      <div 
        ref={trackRef}
        className="relative h-12 cursor-pointer"
        onClick={(e) => {
          const newValue = getValueFromPosition(e.clientX)
          // Click closer to which handle
          const distToMin = Math.abs(newValue - value[0])
          const distToMax = Math.abs(newValue - value[1])
          
          if (distToMin < distToMax && newValue < value[1]) {
            onChange([newValue, value[1]])
          } else if (newValue > value[0]) {
            onChange([value[0], newValue])
          }
        }}
      >
        {/* Track background */}
        <div className="absolute top-1/2 -translate-y-1/2 w-full h-0.5 bg-taupe" />
        
        {/* Active range */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 h-0.5 bg-charcoal transition-all duration-75"
          style={{
            left: `${minPos}%`,
            width: `${maxPos - minPos}%`
          }}
        />

        {/* Min handle */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-charcoal cursor-grab transition-all duration-300
            ${isDragging === 'min' ? 'scale-125 bg-gold cursor-grabbing' : 'hover:scale-110 hover:bg-gold'}
          `}
          style={{ left: `${minPos}%` }}
          onMouseDown={handleMouseDown('min')}
        >
          {/* Tooltip */}
          {isDragging === 'min' && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-charcoal text-white text-xs whitespace-nowrap animate-fadeInUp">
              {formatValue(value[0])}
            </div>
          )}
        </div>

        {/* Max handle */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-charcoal cursor-grab transition-all duration-300
            ${isDragging === 'max' ? 'scale-125 bg-gold cursor-grabbing' : 'hover:scale-110 hover:bg-gold'}
          `}
          style={{ left: `${maxPos}%` }}
          onMouseDown={handleMouseDown('max')}
        >
          {/* Tooltip */}
          {isDragging === 'max' && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-charcoal text-white text-xs whitespace-nowrap animate-fadeInUp">
              {formatValue(value[1])}
            </div>
          )}
        </div>

        {/* Scale markers */}
        <div className="absolute top-full mt-2 w-full flex justify-between text-xs text-warmgrey">
          <span>{formatValue(min)}</span>
          <span>{formatValue(Math.round((min + max) / 2))}</span>
          <span>{formatValue(max)}</span>
        </div>
      </div>
    </div>
  )
}

// Simple single slider variant
export function SingleSlider({
  min = 0,
  max = 100,
  value,
  onChange,
  label,
  formatValue = (v) => `${v}`,
}: {
  min?: number
  max?: number
  value: number
  onChange: (value: number) => void
  label?: string
  formatValue?: (value: number) => string
}) {
  return (
    <div className="py-2">
      {label && (
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm text-warmgrey">{label}</label>
          <span className="text-lg font-serif text-charcoal">{formatValue(value)}</span>
        </div>
      )}
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-full"
        />
        {/* Custom track fill */}
        <div 
          className="absolute top-1/2 left-0 -translate-y-1/2 h-0.5 bg-charcoal pointer-events-none"
          style={{ width: `${((value - min) / (max - min)) * 100}%` }}
        />
      </div>
    </div>
  )
}
