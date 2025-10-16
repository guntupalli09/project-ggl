import React, { useState } from 'react'
import { 
  CheckCircleIcon, 
  ClockIcon, 
  UserGroupIcon, 
  StarIcon,
  ArrowRightIcon 
} from '@heroicons/react/24/outline'

interface Lead {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  status: string
  workflow_stage: string
  niche_metadata?: any
  created_at: string
  updated_at: string
}

interface WorkflowStageManagerProps {
  leads: Lead[]
  workflowStages: string[]
  onStageUpdate: (leadId: string, newStage: string) => void
  isLoading?: boolean
}

const WorkflowStageManager: React.FC<WorkflowStageManagerProps> = ({
  leads,
  workflowStages,
  onStageUpdate,
  isLoading = false
}) => {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'new':
        return <ClockIcon className="w-5 h-5" />
      case 'booked':
        return <UserGroupIcon className="w-5 h-5" />
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5" />
      case 'review_sent':
      case 'feedback_sent':
        return <StarIcon className="w-5 h-5" />
      case 'referral_sent':
        return <ArrowRightIcon className="w-5 h-5" />
      default:
        return <ClockIcon className="w-5 h-5" />
    }
  }

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'new':
        return 'bg-gray-100 text-gray-800'
      case 'booked':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'review_sent':
      case 'feedback_sent':
        return 'bg-yellow-100 text-yellow-800'
      case 'referral_sent':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStageDisplayName = (stage: string) => {
    switch (stage) {
      case 'new':
        return 'New Lead'
      case 'booked':
        return 'Booked'
      case 'completed':
        return 'Completed'
      case 'review_sent':
        return 'Review Sent'
      case 'feedback_sent':
        return 'Feedback Sent'
      case 'referral_sent':
        return 'Referral Sent'
      default:
        return stage
    }
  }

  const handleStageUpdate = async (leadId: string, newStage: string) => {
    setUpdating(leadId)
    try {
      await onStageUpdate(leadId, newStage)
    } finally {
      setUpdating(null)
    }
  }

  const getNextStage = (currentStage: string) => {
    const currentIndex = workflowStages.indexOf(currentStage)
    if (currentIndex < workflowStages.length - 1) {
      return workflowStages[currentIndex + 1]
    }
    return null
  }

  const getPreviousStage = (currentStage: string) => {
    const currentIndex = workflowStages.indexOf(currentStage)
    if (currentIndex > 0) {
      return workflowStages[currentIndex - 1]
    }
    return null
  }

  const leadsByStage = workflowStages.reduce((acc, stage) => {
    acc[stage] = leads.filter(lead => lead.workflow_stage === stage)
    return acc
  }, {} as Record<string, Lead[]>)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          Lead Workflow Management
        </h2>
        <div className="text-sm text-gray-500">
          {leads.length} total leads
        </div>
      </div>

      {/* Workflow Pipeline */}
      <div className="overflow-x-auto">
        <div className="flex space-x-4 min-w-max pb-4">
          {workflowStages.map((stage, index) => {
            const stageLeads = leadsByStage[stage] || []
            const isLast = index === workflowStages.length - 1
            
            return (
              <div key={stage} className="flex items-center">
                <div className="flex flex-col items-center space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className={`p-2 rounded-lg ${getStageColor(stage)}`}>
                      {getStageIcon(stage)}
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-sm text-gray-900">
                        {getStageDisplayName(stage)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {stageLeads.length} leads
                      </div>
                    </div>
                  </div>
                  
                  {/* Leads in this stage */}
                  <div className="w-64 space-y-2">
                    {stageLeads.map((lead) => (
                      <div
                        key={lead.id}
                        className={`p-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:shadow-md transition-shadow ${
                          selectedLead?.id === lead.id ? 'ring-2 ring-blue-500' : ''
                        }`}
                        onClick={() => setSelectedLead(lead)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-gray-900 truncate">
                              {lead.name}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {lead.email}
                            </div>
                            {lead.company && (
                              <div className="text-xs text-gray-400 truncate">
                                {lead.company}
                              </div>
                            )}
                          </div>
                          
                          {/* Stage controls */}
                          <div className="flex space-x-1">
                            {getPreviousStage(lead.workflow_stage) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleStageUpdate(lead.id, getPreviousStage(lead.workflow_stage)!)
                                }}
                                disabled={updating === lead.id || isLoading}
                                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                                title="Move to previous stage"
                              >
                                ←
                              </button>
                            )}
                            
                            {getNextStage(lead.workflow_stage) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleStageUpdate(lead.id, getNextStage(lead.workflow_stage)!)
                                }}
                                disabled={updating === lead.id || isLoading}
                                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                                title="Move to next stage"
                              >
                                →
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {updating === lead.id && (
                          <div className="mt-2 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Arrow to next stage */}
                {!isLast && (
                  <div className="mx-4 text-gray-400">
                    <ArrowRightIcon className="w-5 h-5" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Lead Details Panel */}
      {selectedLead && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Lead Details
            </h3>
            <button
              onClick={() => setSelectedLead(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <div className="text-sm text-gray-900">{selectedLead.name}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="text-sm text-gray-900">{selectedLead.email}</div>
            </div>
            
            {selectedLead.phone && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <div className="text-sm text-gray-900">{selectedLead.phone}</div>
              </div>
            )}
            
            {selectedLead.company && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company
                </label>
                <div className="text-sm text-gray-900">{selectedLead.company}</div>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Stage
              </label>
              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStageColor(selectedLead.workflow_stage)}`}>
                {getStageIcon(selectedLead.workflow_stage)}
                <span className="ml-1">{getStageDisplayName(selectedLead.workflow_stage)}</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Created
              </label>
              <div className="text-sm text-gray-900">
                {new Date(selectedLead.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
          
          {selectedLead.niche_metadata && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Information
              </label>
              <div className="bg-gray-50 p-3 rounded-lg">
                <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                  {JSON.stringify(selectedLead.niche_metadata, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default WorkflowStageManager
