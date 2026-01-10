import React from 'react'
import { 
  ExclamationTriangleIcon, 
  BoltIcon 
} from '@heroicons/react/24/outline'

interface GuestModeWarningProps {
  feature: string
  description: string
  actionText?: string
}

const GuestModeWarning: React.FC<GuestModeWarningProps> = ({ 
  feature, 
  description, 
  actionText = "Sign in to access this feature" 
}) => {
  
  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-6">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            <BoltIcon className="h-4 w-4 text-pink-500" />
          </div>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            Guest Mode - {feature} Disabled
          </h3>
          <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
            {description}
          </p>
          <p className="mt-1 text-xs text-yellow-600 dark:text-yellow-400">
            {actionText}
          </p>
        </div>
      </div>
    </div>
  )
}

export default GuestModeWarning
