import React from 'react'

interface ResponsiveCardProps {
  children: React.ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg'
  hover?: boolean
}

export default function ResponsiveCard({ 
  children, 
  className = '',
  padding = 'md',
  hover = false
}: ResponsiveCardProps) {
  const paddingClasses = {
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8'
  }

  return (
    <div className={`
      bg-white dark:bg-gray-800 
      rounded-lg 
      shadow-sm 
      border border-gray-200 dark:border-gray-700
      ${paddingClasses[padding]}
      ${hover ? 'hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200' : ''}
      ${className}
    `}>
      {children}
    </div>
  )
}
