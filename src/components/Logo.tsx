import React, { useState } from 'react'
import { SparklesIcon } from '@heroicons/react/24/outline'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showSparkle?: boolean
  className?: string
}

const Logo: React.FC<LogoProps> = ({ 
  size = 'md', 
  showSparkle = true, 
  className = '' 
}) => {
  const [imageError, setImageError] = useState(false)

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12', 
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  }

  const containerSizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20', 
    xl: 'w-24 h-24'
  }

  const sparkleSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-6 h-6'
  }

  const handleImageError = () => {
    setImageError(true)
  }

  return (
    <div className={`relative ${containerSizeClasses[size]} ${className}`}>
      <div className={`flex items-center justify-center ${containerSizeClasses[size]} bg-gradient-to-br from-purple-400 to-purple-700 rounded-2xl shadow-xl transform hover:scale-105 transition-transform duration-200`}>
        {!imageError ? (
          <img 
            src="/logo.png" 
            alt="GetGetLeads Logo" 
            className={sizeClasses[size]}
            onError={handleImageError}
          />
        ) : (
          <svg 
            className={`${sizeClasses[size]} text-white`}
            fill="currentColor" 
            viewBox="0 0 24 24"
          >
            <path d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        )}
      </div>
      {showSparkle && (
        <div className={`absolute -top-1 -right-1 ${sparkleSizeClasses[size]} bg-yellow-400 rounded-full flex items-center justify-center animate-pulse`}>
          <SparklesIcon className={`${sparkleSizeClasses[size]} text-white`} />
        </div>
      )}
    </div>
  )
}

export default Logo
