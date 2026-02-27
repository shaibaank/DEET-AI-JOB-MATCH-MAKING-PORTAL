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

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMin = parseInt(e.target.value)
    if (newMin <= value[1]) {
      onChange([newMin, value[1]])
    }
  }

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMax = parseInt(e.target.value)
    if (newMax >= value[0]) {
      onChange([value[0], newMax])
    }
  }

  const minPos = ((value[0] - min) / (max - min)) * 100
  const maxPos = ((value[1] - min) / (max - min)) * 100

  return (
    <div className="py-4">
      {/* Label and values */}
      <div className="flex items-center justify-between mb-6">
        <label className="overline">{label}</label>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-serif font-medium transition-all duration-300" style={{ color: '#1A1A1A' }}>
            {formatValue(value[0])}
          </span>
          <span style={{ color: '#6C6863' }}>—</span>
          <span className="text-2xl font-serif font-medium transition-all duration-300" style={{ color: '#1A1A1A' }}>
            {formatValue(value[1])}
          </span>
        </div>
      </div>

      {/* Dual range slider */}
      <div className="relative h-12">
        {/* Track background */}
        <div className="absolute top-1/2 -translate-y-1/2 w-full h-0.5" style={{ background: '#EBE5DE' }} />
        
        {/* Active range */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 h-0.5 transition-all duration-75"
          style={{
            left: `${minPos}%`,
            width: `${maxPos - minPos}%`,
            background: '#1A1A1A'
          }}
        />

        {/* Native range inputs stacked */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value[0]}
          onChange={handleMinChange}
          className="salary-range-input absolute top-0 left-0 w-full h-full pointer-events-none"
          style={{ zIndex: value[0] > max - 5 ? 5 : 3 }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value[1]}
          onChange={handleMaxChange}
          className="salary-range-input absolute top-0 left-0 w-full h-full pointer-events-none"
          style={{ zIndex: 4 }}
        />

        {/* Scale markers */}
        <div className="absolute top-full mt-2 w-full flex justify-between text-xs" style={{ color: '#6C6863' }}>
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
