import { useState } from 'react'
import { CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline'

interface ServiceCompletionButtonProps {
  bookingId: string
  status: string
  onComplete: (bookingId: string, notes: string) => Promise<void>
  disabled?: boolean
}

export default function ServiceCompletionButton({ 
  bookingId, 
  status, 
  onComplete, 
  disabled = false 
}: ServiceCompletionButtonProps) {
  const [isCompleting, setIsCompleting] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const isCompleted = status === 'completed'

  const handleComplete = async () => {
    if (isCompleted) return

    setIsCompleting(true)
    setError(null)

    try {
      await onComplete(bookingId, notes)
      setShowNotes(false)
      setNotes('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete service')
    } finally {
      setIsCompleting(false)
    }
  }

  if (isCompleted) {
    return (
      <div className="flex items-center text-green-600">
        <CheckCircleIcon className="h-5 w-5 mr-2" />
        <span className="text-sm font-medium">Service Completed</span>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {!showNotes ? (
        <button
          onClick={() => setShowNotes(true)}
          disabled={disabled || isCompleting}
          className="flex items-center px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <CheckCircleIcon className="h-4 w-4 mr-2" />
          {isCompleting ? 'Completing...' : 'Mark as Completed'}
        </button>
      ) : (
        <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Service Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about the service provided..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
              rows={3}
            />
          </div>
          
          {error && (
            <div className="text-red-600 text-sm">
              {error}
            </div>
          )}
          
          <div className="flex space-x-2">
            <button
              onClick={handleComplete}
              disabled={isCompleting}
              className="flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isCompleting ? (
                <>
                  <ClockIcon className="h-4 w-4 mr-2 animate-spin" />
                  Completing...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  Complete Service
                </>
              )}
            </button>
            
            <button
              onClick={() => {
                setShowNotes(false)
                setNotes('')
                setError(null)
              }}
              disabled={isCompleting}
              className="px-4 py-2 bg-gray-200 text-gray-800 text-sm font-medium rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
