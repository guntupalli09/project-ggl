import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card'
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
  ClockIcon
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
}

interface BusinessWorkflowsIntegrationProps {
  userId: string
  businessType: string
}

export default function BusinessWorkflowsIntegration({ userId, businessType }: BusinessWorkflowsIntegrationProps) {
  const [workflows, setWorkflows] = useState<EmailWorkflow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadWorkflows()
  }, [userId])

  const loadWorkflows = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/email/workflows', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${'internal-key' || 'internal-key'}`
        }
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
          'Authorization': `Bearer ${'internal-key' || 'internal-key'}`
        },
        body: JSON.stringify({
          action: 'toggleWorkflow',
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
          'Authorization': `Bearer ${'internal-key' || 'internal-key'}`
        },
        body: JSON.stringify({
          action: 'enhanceWorkflow',
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

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
      error: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
    }
    return colors[status] || colors.inactive
  }

  const getStatusIcon = (status: string) => {
    const icons = {
      active: <CheckCircleIcon className="w-4 h-4" />,
      inactive: <PauseIcon className="w-4 h-4" />,
      error: <ExclamationTriangleIcon className="w-4 h-4" />,
      pending: <ClockIcon className="w-4 h-4" />
    }
    return icons[status] || icons.inactive
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleString()
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
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
            Manage your automated email campaigns and triggers
          </p>
        </div>
        <Button onClick={loadWorkflows} variant="outline">
          Refresh
        </Button>
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
                      {workflow.campaignType.replace('_', ' ')}
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
              Set up your first email automation workflow to get started.
            </p>
            <Button>
              Create Workflow
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Integration Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CogIcon className="w-5 h-5 mr-2 text-blue-600" />
            How Email Workflows Integrate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                  Automatic Triggers
                </h4>
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  Email workflows automatically trigger based on customer actions like booking appointments, leaving reviews, or missing calls.
                </p>
              </div>
              
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <h4 className="font-semibold text-green-900 dark:text-green-200 mb-2">
                  AI-Powered Content
                </h4>
                <p className="text-sm text-green-800 dark:text-green-300">
                  Enhanced workflows use AI to generate personalized email content based on your business type and customer data.
                </p>
              </div>
              
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <h4 className="font-semibold text-purple-900 dark:text-purple-200 mb-2">
                  Performance Tracking
                </h4>
                <p className="text-sm text-purple-800 dark:text-purple-300">
                  Monitor email performance, delivery rates, and customer engagement to optimize your campaigns.
                </p>
              </div>
              
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <h4 className="font-semibold text-orange-900 dark:text-orange-200 mb-2">
                  Seamless Integration
                </h4>
                <p className="text-sm text-orange-800 dark:text-orange-300">
                  Email workflows work alongside your existing automations, calls, and messages for a unified experience.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}