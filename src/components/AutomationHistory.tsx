import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { 
  ClockIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'

interface AutomationRun {
  id: string
  automation_id: string
  run_type: string
  status: 'success' | 'failed' | 'partial' | 'running'
  started_at: string
  completed_at?: string
  leads_processed: number
  messages_sent: number
  errors_count: number
  error_details?: string
  automation_name?: string
}

interface MessageDetail {
  id: string
  lead_name: string
  lead_email: string
  message_sent: string
  message_subject: string
  status: 'sent' | 'failed' | 'skipped'
  error_message?: string
  sent_at?: string
}

interface AutomationHistoryProps {
  userId: string
}

const AutomationHistory: React.FC<AutomationHistoryProps> = ({ userId }) => {
  const [runs, setRuns] = useState<AutomationRun[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedRun, setExpandedRun] = useState<string | null>(null)
  const [messageDetails, setMessageDetails] = useState<Record<string, MessageDetail[]>>({})
  const [loadingDetails, setLoadingDetails] = useState<string | null>(null)

  useEffect(() => {
    fetchAutomationRuns()
  }, [userId])

  const fetchAutomationRuns = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('automation_runs')
        .select(`
          *,
          automations!inner(name)
        `)
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .limit(20) // Show last 20 runs

      if (error) {
        console.error('Error fetching automation runs:', error)
        return
      }

      const runsWithNames = data?.map(run => ({
        ...run,
        automation_name: run.automations?.name || 'Unknown'
      })) || []

      setRuns(runsWithNames)
    } catch (error) {
      console.error('Error fetching automation runs:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMessageDetails = async (runId: string) => {
    if (messageDetails[runId]) return // Already loaded

    try {
      setLoadingDetails(runId)
      
      const { data, error } = await supabase
        .from('automation_run_details')
        .select('*')
        .eq('run_id', runId)
        .order('sent_at', { ascending: false })

      if (error) {
        console.error('Error fetching message details:', error)
        return
      }

      setMessageDetails(prev => ({
        ...prev,
        [runId]: data || []
      }))
    } catch (error) {
      console.error('Error fetching message details:', error)
    } finally {
      setLoadingDetails(null)
    }
  }

  const toggleRunDetails = (runId: string) => {
    if (expandedRun === runId) {
      setExpandedRun(null)
    } else {
      setExpandedRun(runId)
      fetchMessageDetails(runId)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />
      case 'partial':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
      case 'running':
        return <ClockIcon className="h-5 w-5 text-blue-500 animate-spin" />
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      case 'partial':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'running':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const formatDuration = (startedAt: string, completedAt?: string) => {
    const start = new Date(startedAt)
    const end = completedAt ? new Date(completedAt) : new Date()
    const diffMs = end.getTime() - start.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    
    if (diffSeconds < 60) return `${diffSeconds}s`
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m`
    return `${Math.floor(diffSeconds / 3600)}h`
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden">
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading automation history...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Automation History</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">Recent automation runs and message details</p>
      </div>
      
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {runs.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            No automation runs found. Automations will appear here once they start running.
          </div>
        ) : (
          runs.map((run) => (
            <div key={run.id} className="p-6">
              <div 
                className="flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg p-2 -m-2"
                onClick={() => toggleRunDetails(run.id)}
              >
                <div className="flex items-center space-x-4">
                  {getStatusIcon(run.status)}
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        {run.automation_name}
                      </h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(run.status)}`}>
                        {run.status}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                      <span>{formatDateTime(run.started_at)}</span>
                      <span>•</span>
                      <span>{run.leads_processed} leads processed</span>
                      <span>•</span>
                      <span>{run.messages_sent} messages sent</span>
                      {run.errors_count > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-red-500">{run.errors_count} errors</span>
                        </>
                      )}
                      <span>•</span>
                      <span>{formatDuration(run.started_at, run.completed_at)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {run.messages_sent > 0 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {run.messages_sent} messages
                    </span>
                  )}
                  {expandedRun === run.id ? (
                    <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                  )}
                </div>
              </div>

              {expandedRun === run.id && (
                <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                  {loadingDetails === run.id ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                      <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Loading details...</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messageDetails[run.id]?.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                          No message details available
                        </p>
                      ) : (
                        messageDetails[run.id]?.map((detail) => (
                          <div key={detail.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                                    {detail.lead_name}
                                  </h5>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {detail.lead_email}
                                  </span>
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    detail.status === 'sent' 
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                      : detail.status === 'failed'
                                      ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                      : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-300'
                                  }`}>
                                    {detail.status}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                  <strong>Subject:</strong> {detail.message_subject}
                                  {detail.sent_at && (
                                    <span className="ml-2">
                                      • Sent: {formatDateTime(detail.sent_at)}
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded border p-2 max-h-32 overflow-y-auto">
                                  {detail.message_sent}
                                </div>
                                {detail.error_message && (
                                  <div className="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded p-2">
                                    <strong>Error:</strong> {detail.error_message}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default AutomationHistory
