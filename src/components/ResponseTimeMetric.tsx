import React from 'react'
import { ClockIcon, ArrowTrendingUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline'

interface ResponseTimeMetricProps {
  averageMinutes: number
  previousAverage?: number
  isLoading?: boolean
}

const ResponseTimeMetric: React.FC<ResponseTimeMetricProps> = ({ 
  averageMinutes, 
  previousAverage,
  isLoading = false 
}) => {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <ClockIcon className="h-8 w-8 text-gray-400" />
          </div>
          <div className="ml-4 w-full">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    )
  }

  const formatTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${Math.round(minutes)}m`
    } else if (minutes < 1440) { // Less than 24 hours
      const hours = Math.round(minutes / 60)
      return `${hours}h`
    } else {
      const days = Math.round(minutes / 1440)
      return `${days}d`
    }
  }

  const getTrendIcon = () => {
    if (!previousAverage) return null
    
    if (averageMinutes < previousAverage) {
      return <ArrowDownIcon className="h-4 w-4 text-green-500" />
    } else if (averageMinutes > previousAverage) {
      return <ArrowTrendingUpIcon className="h-4 w-4 text-red-500" />
    }
    return null
  }

  const getTrendText = () => {
    if (!previousAverage) return null
    
    const difference = averageMinutes - previousAverage
    const percentage = Math.abs((difference / previousAverage) * 100)
    
    if (difference < 0) {
      return `-${percentage.toFixed(1)}% vs last period`
    } else if (difference > 0) {
      return `+${percentage.toFixed(1)}% vs last period`
    }
    return 'No change vs last period'
  }

  const getTrendColor = () => {
    if (!previousAverage) return 'text-gray-500'
    
    if (averageMinutes < previousAverage) {
      return 'text-green-600'
    } else if (averageMinutes > previousAverage) {
      return 'text-red-600'
    }
    return 'text-gray-500'
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <ClockIcon className="h-8 w-8 text-blue-500" />
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Avg. Response Time
          </p>
          <div className="flex items-baseline">
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">
              {formatTime(averageMinutes)}
            </p>
            {getTrendIcon() && (
              <div className="ml-2 flex items-center">
                {getTrendIcon()}
              </div>
            )}
          </div>
          {getTrendText() && (
            <p className={`text-xs ${getTrendColor()} dark:text-gray-400`}>
              {getTrendText()}
            </p>
          )}
        </div>
      </div>
      
      {/* Additional context */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Time from lead creation to first outbound message
        </p>
      </div>
    </div>
  )
}

export default ResponseTimeMetric
