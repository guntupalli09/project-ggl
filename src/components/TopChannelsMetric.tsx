import React from 'react'
import { 
  EnvelopeIcon, 
  ChatBubbleLeftRightIcon, 
  PhoneIcon,
  PencilIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'

interface ChannelData {
  channel: string
  count: number
  percentage: number
}

interface TopChannelsMetricProps {
  channels: ChannelData[]
  isLoading?: boolean
}

const TopChannelsMetric: React.FC<TopChannelsMetricProps> = ({ 
  channels, 
  isLoading = false 
}) => {
  const getChannelIcon = (channel: string) => {
    switch (channel.toLowerCase()) {
      case 'email':
        return <EnvelopeIcon className="h-5 w-5 text-blue-500" />
      case 'sms':
        return <ChatBubbleLeftRightIcon className="h-5 w-5 text-green-500" />
      case 'phone':
        return <PhoneIcon className="h-5 w-5 text-purple-500" />
      case 'manual':
        return <PencilIcon className="h-5 w-5 text-orange-500" />
      default:
        return <ChartBarIcon className="h-5 w-5 text-gray-500" />
    }
  }

  const getChannelColor = (channel: string) => {
    switch (channel.toLowerCase()) {
      case 'email':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400'
      case 'sms':
        return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400'
      case 'phone':
        return 'text-purple-600 bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400'
      case 'manual':
        return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400'
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-400'
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <ChartBarIcon className="h-6 w-6 text-gray-400 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Top Response Channels
          </h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mr-3"></div>
                <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
              <div className="h-4 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!channels || channels.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <ChartBarIcon className="h-6 w-6 text-gray-400 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Top Response Channels
          </h3>
        </div>
        <div className="flex items-center justify-center h-32">
          <p className="text-gray-500 dark:text-gray-400">No channel data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center mb-4">
        <ChartBarIcon className="h-6 w-6 text-gray-500 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Top Response Channels
        </h3>
      </div>
      
      <div className="space-y-3">
        {channels.slice(0, 3).map((channel, index) => (
          <div key={channel.channel} className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0 mr-3">
                {getChannelIcon(channel.channel)}
              </div>
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-900 dark:text-white mr-2">
                  #{index + 1}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                  {channel.channel}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {channel.count}
              </span>
              <span className={`text-xs px-2 py-1 rounded-full ${getChannelColor(channel.channel)}`}>
                {channel.percentage}%
              </span>
            </div>
          </div>
        ))}
      </div>
      
      {/* Additional context */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Based on outbound messages sent
        </p>
      </div>
    </div>
  )
}

export default TopChannelsMetric
