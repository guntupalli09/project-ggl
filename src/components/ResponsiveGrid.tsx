import React from 'react'

interface ResponsiveGridProps {
  children: React.ReactNode
  cols?: {
    default?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
  gap?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function ResponsiveGrid({ 
  children, 
  cols = { default: 1, sm: 2, md: 3, lg: 4 },
  gap = 'md',
  className = ''
}: ResponsiveGridProps) {
  const gapClasses = {
    sm: 'gap-2 sm:gap-3',
    md: 'gap-4 sm:gap-6',
    lg: 'gap-6 sm:gap-8'
  }

  const gridCols = {
    default: `grid-cols-${cols.default || 1}`,
    sm: cols.sm ? `sm:grid-cols-${cols.sm}` : '',
    md: cols.md ? `md:grid-cols-${cols.md}` : '',
    lg: cols.lg ? `lg:grid-cols-${cols.lg}` : '',
    xl: cols.xl ? `xl:grid-cols-${cols.xl}` : ''
  }

  return (
    <div className={`
      grid 
      ${gridCols.default} 
      ${gridCols.sm} 
      ${gridCols.md} 
      ${gridCols.lg} 
      ${gridCols.xl}
      ${gapClasses[gap]}
      ${className}
    `}>
      {children}
    </div>
  )
}
