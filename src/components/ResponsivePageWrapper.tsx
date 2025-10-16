import React from 'react'

interface ResponsivePageWrapperProps {
  children: React.ReactNode
  title: string
  description?: string
  className?: string
}

export default function ResponsivePageWrapper({ 
  children, 
  title, 
  description, 
  className = '' 
}: ResponsivePageWrapperProps) {
  return (
    <div className={`h-full bg-gray-50 dark:bg-gray-900 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            {title}
          </h1>
          {description && (
            <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>

        {/* Content */}
        <div className="space-y-4 sm:space-y-6">
          {children}
        </div>
      </div>
    </div>
  )
}
