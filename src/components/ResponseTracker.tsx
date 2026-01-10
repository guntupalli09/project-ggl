import { useState } from 'react'
import { markLeadResponded, markLeadNoResponse } from '../lib/manualResponseTracking'
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline'

interface ResponseTrackerProps {
  leadId: string
  currentStatus: string
  onStatusUpdate: () => void
}

export default function ResponseTracker({ leadId, currentStatus, onStatusUpdate }: ResponseTrackerProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [notes, setNotes] = useState('')

  const handleMarkResponded = async () => {
    setIsUpdating(true)
    try {
      const success = await markLeadResponded(leadId, notes || undefined)
      if (success) {
        onStatusUpdate()
        setShowNotes(false)
        setNotes('')
      }
    } catch (error) {
      console.error('Error marking as responded:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleMarkNoResponse = async () => {
    setIsUpdating(true)
    try {
      const success = await markLeadNoResponse(leadId, notes || undefined)
      if (success) {
        onStatusUpdate()
        setShowNotes(false)
        setNotes('')
      }
    } catch (error) {
      console.error('Error marking as no response:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'responded': return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400'
      case 'no_response': return 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400'
      case 'contacted': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400'
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'responded': return CheckCircleIcon
      case 'no_response': return XCircleIcon
      default: return ClockIcon
    }
  }

  const StatusIcon = getStatusIcon(currentStatus)

  return (
    <div className="space-y-2">
      {/* Current Status */}
      <div className="flex items-center space-x-2">
        <StatusIcon className="h-4 w-4" />
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(currentStatus)}`}>
          {currentStatus.replace('_', ' ').toUpperCase()}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-2">
        <button
          onClick={() => setShowNotes(!showNotes)}
          className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          {showNotes ? 'Cancel' : 'Add Notes'}
        </button>
      </div>

      {/* Notes Input */}
      {showNotes && (
        <div className="space-y-2">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes about the response or situation..."
            className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            rows={2}
          />
          <div className="flex space-x-2">
            <button
              onClick={handleMarkResponded}
              disabled={isUpdating}
              className="flex items-center px-2 py-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-xs rounded"
            >
              <CheckCircleIcon className="h-3 w-3 mr-1" />
              {isUpdating ? 'Updating...' : 'Got Response'}
            </button>
            <button
              onClick={handleMarkNoResponse}
              disabled={isUpdating}
              className="flex items-center px-2 py-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-xs rounded"
            >
              <XCircleIcon className="h-3 w-3 mr-1" />
              {isUpdating ? 'Updating...' : 'No Response'}
            </button>
          </div>
        </div>
      )}

      {/* Quick Actions (when no notes) */}
      {!showNotes && (
        <div className="flex space-x-1">
          <button
            onClick={handleMarkResponded}
            disabled={isUpdating}
            className="flex items-center px-2 py-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-xs rounded"
          >
            <CheckCircleIcon className="h-3 w-3 mr-1" />
            Response
          </button>
          <button
            onClick={handleMarkNoResponse}
            disabled={isUpdating}
            className="flex items-center px-2 py-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-xs rounded"
          >
            <XCircleIcon className="h-3 w-3 mr-1" />
            No Response
          </button>
        </div>
      )}
    </div>
  )
}
