import { useState, useEffect } from 'react'
import { Card, CardContent } from './ui/Card'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
import { 
  EnvelopeIcon,
  PlayIcon,
  PauseIcon,
  CogIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline'

interface EmailWorkflow {
  id: string
  name: string
  description: string
  isActive: boolean
  isAiEnhanced: boolean
  executionCount: number
  lastExecuted: string | null
  trigger: string
  campaignType: string
  status: 'active' | 'inactive' | 'error' | 'pending'
  created_at: string
  updated_at: string
}

interface EmailWorkflowManagerProps {
  userId: string
  businessType: string
}

export default function EmailWorkflowManager({ userId, businessType: _businessType }: EmailWorkflowManagerProps) {
  const [workflows, setWorkflows] = useState<EmailWorkflow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingWorkflow, setEditingWorkflow] = useState<EmailWorkflow | null>(null)

  useEffect(() => {
    loadWorkflows()
  }, [userId])

  const loadWorkflows = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/email/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'get_workflows',
          user_id: userId
        })
      })

      if (response.ok) {
        const data = await response.json()
        setWorkflows(data.workflows || [])
      } else {
        throw new Error('Failed to load workflows')
      }
    } catch (error) {
      console.error('Error loading workflows:', error)
      setError('Failed to load workflows')
    } finally {
      setLoading(false)
    }
  }

  const toggleWorkflow = async (workflowId: string) => {
    try {
      const response = await fetch('/api/email/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'toggle_workflow',
          user_id: userId,
          workflow_id: workflowId
        })
      })

      if (response.ok) {
        setSuccess('Workflow status updated successfully')
        loadWorkflows()
      } else {
        throw new Error('Failed to toggle workflow')
      }
    } catch (error) {
      setError('Failed to toggle workflow')
    }
  }

  const enhanceWorkflow = async (workflowId: string) => {
    try {
      const response = await fetch('/api/email/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'enhance_workflow',
          user_id: userId,
          workflow_id: workflowId
        })
      })

      if (response.ok) {
        setSuccess('Workflow enhanced with AI successfully')
        loadWorkflows()
      } else {
        throw new Error('Failed to enhance workflow')
      }
    } catch (error) {
      setError('Failed to enhance workflow')
    }
  }

  const deleteWorkflow = async (workflowId: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return

    try {
      const response = await fetch('/api/email/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete_workflow',
          user_id: userId,
          workflow_id: workflowId
        })
      })

      if (response.ok) {
        setSuccess('Workflow deleted successfully')
        loadWorkflows()
      } else {
        throw new Error('Failed to delete workflow')
      }
    } catch (error) {
      setError('Failed to delete workflow')
    }
  }

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
      error: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
    }
    return colors[status as keyof typeof colors] || colors.inactive
  }

  const getStatusIcon = (status: string) => {
    const icons: { [key: string]: JSX.Element } = {
      active: <CheckCircleIcon className="w-4 h-4" />,
      inactive: <PauseIcon className="w-4 h-4" />,
      error: <ExclamationTriangleIcon className="w-4 h-4" />,
      pending: <ClockIcon className="w-4 h-4" />
    }
    return icons[status as keyof typeof icons] || icons.inactive
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleString()
  }

  const getCampaignTypeDisplay = (campaignType: string) => {
    const types: { [key: string]: string } = {
      review_request: 'Review Request',
      re_engagement: 'Re-engagement',
      welcome: 'Welcome Series',
      appointment_reminder: 'Appointment Reminder',
      educational: 'Educational Content',
      market_update: 'Market Update',
      open_house: 'Open House Invite',
      lead_nurturing: 'Lead Nurturing',
      maintenance_reminder: 'Maintenance Reminder',
      follow_up: 'Follow-up'
    }
    return types[campaignType as keyof typeof types] || campaignType
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Email Workflows</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Create and manage automated email campaigns
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button onClick={loadWorkflows} variant="outline">
            Refresh
          </Button>
          <Button onClick={() => setShowCreateForm(true)}>
            <PlusIcon className="w-4 h-4 mr-2" />
            Create Workflow
          </Button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center">
            <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2" />
            <span className="text-green-800 dark:text-green-200">{success}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-800 dark:text-red-200">{error}</span>
          </div>
        </div>
      )}

      {/* Workflows List */}
      <div className="space-y-4">
        {workflows.map((workflow) => (
          <Card key={workflow.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <Badge className={getStatusColor(workflow.status)}>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(workflow.status)}
                        <span className="capitalize">{workflow.status}</span>
                      </div>
                    </Badge>
                    
                    {workflow.isAiEnhanced && (
                      <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400">
                        <div className="flex items-center space-x-1">
                          <CogIcon className="w-4 h-4" />
                          <span>AI Enhanced</span>
                        </div>
                      </Badge>
                    )}
                    
                    <Badge variant="outline">
                      {getCampaignTypeDisplay(workflow.campaignType)}
                    </Badge>
                  </div>

                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {workflow.name}
                  </h3>

                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {workflow.description}
                  </p>

                  <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center space-x-1">
                      <ChartBarIcon className="w-4 h-4" />
                      <span>{workflow.executionCount} executions</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <ClockIcon className="w-4 h-4" />
                      <span>Last: {formatDate(workflow.lastExecuted)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <EnvelopeIcon className="w-4 h-4" />
                      <span>Trigger: {workflow.trigger}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingWorkflow(workflow)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleWorkflow(workflow.id)}
                    className={`
                      ${workflow.isActive 
                        ? 'text-red-600 hover:text-red-700' 
                        : 'text-green-600 hover:text-green-700'
                      }
                    `}
                  >
                    {workflow.isActive ? (
                      <>
                        <PauseIcon className="w-4 h-4 mr-1" />
                        Disable
                      </>
                    ) : (
                      <>
                        <PlayIcon className="w-4 h-4 mr-1" />
                        Enable
                      </>
                    )}
                  </Button>
                  
                  {!workflow.isAiEnhanced && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => enhanceWorkflow(workflow.id)}
                      className="text-purple-600 hover:text-purple-700"
                    >
                      <CogIcon className="w-4 h-4 mr-1" />
                      Enhance
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteWorkflow(workflow.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {workflows.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <EnvelopeIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No Email Workflows
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Create your first email automation workflow to get started.
            </p>
            <Button onClick={() => setShowCreateForm(true)}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Create Workflow
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Form Modal */}
      {(showCreateForm || editingWorkflow) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingWorkflow ? 'Edit Workflow' : 'Create New Workflow'}
                </h3>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowCreateForm(false)
                    setEditingWorkflow(null)
                  }}
                  className="p-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Workflow Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter workflow name"
                    defaultValue={editingWorkflow?.name || ''}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Describe what this workflow does"
                    defaultValue={editingWorkflow?.description || ''}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Campaign Type
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="review_request">Review Request</option>
                    <option value="re_engagement">Re-engagement</option>
                    <option value="welcome">Welcome Series</option>
                    <option value="appointment_reminder">Appointment Reminder</option>
                    <option value="educational">Educational Content</option>
                    <option value="market_update">Market Update</option>
                    <option value="open_house">Open House Invite</option>
                    <option value="lead_nurturing">Lead Nurturing</option>
                    <option value="maintenance_reminder">Maintenance Reminder</option>
                    <option value="follow_up">Follow-up</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Trigger Event
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="booking_completed">Booking Completed</option>
                    <option value="review_received">Review Received</option>
                    <option value="lead_created">Lead Created</option>
                    <option value="appointment_reminder">Appointment Reminder</option>
                    <option value="missed_call">Missed Call</option>
                    <option value="no_show">No Show</option>
                    <option value="cancellation">Cancellation</option>
                    <option value="follow_up">Follow Up</option>
                  </select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="aiEnhanced"
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    defaultChecked={editingWorkflow?.isAiEnhanced || false}
                  />
                  <label htmlFor="aiEnhanced" className="text-sm text-gray-700 dark:text-gray-300">
                    Enable AI enhancement for personalized content
                  </label>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateForm(false)
                  setEditingWorkflow(null)
                }}
              >
                Cancel
              </Button>
              <Button>
                {editingWorkflow ? 'Update Workflow' : 'Create Workflow'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}