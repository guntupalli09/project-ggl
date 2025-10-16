import React, { useState, useEffect } from 'react'
import { PlayIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline'

interface WorkflowStep {
  id: string
  name: string
  description: string
  delay: number
  channel: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  timestamp?: string
}

interface WorkflowAutomationDemoProps {
  nicheTemplateId?: string
}

const WorkflowAutomationDemo: React.FC<WorkflowAutomationDemoProps> = ({ nicheTemplateId }) => {
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [currentStep, setCurrentStep] = useState<number>(-1)

  useEffect(() => {
    if (nicheTemplateId) {
      initializeWorkflow()
    }
  }, [nicheTemplateId])

  const initializeWorkflow = () => {
    // This would normally fetch from the API based on niche template
    const steps: WorkflowStep[] = [
      {
        id: 'lead-capture',
        name: 'Lead Captured',
        description: 'New lead submitted through form',
        delay: 0,
        channel: 'immediate',
        status: 'completed',
        timestamp: new Date().toISOString()
      },
      {
        id: 'booking-created',
        name: 'Booking Created',
        description: 'Appointment scheduled with customer',
        delay: 0,
        channel: 'immediate',
        status: 'completed',
        timestamp: new Date(Date.now() + 1000).toISOString()
      },
      {
        id: 'review-request',
        name: 'Review Request',
        description: 'Send review request to customer',
        delay: 120, // 2 hours for salon/barber/spa
        channel: 'email',
        status: 'pending'
      },
      {
        id: 'referral-offer',
        name: 'Referral Offer',
        description: 'Send referral offer to customer',
        delay: 0,
        channel: 'email',
        status: 'pending'
      }
    ]

    setWorkflowSteps(steps)
  }

  const runWorkflow = async () => {
    setIsRunning(true)
    setCurrentStep(0)

    for (let i = 0; i < workflowSteps.length; i++) {
      const step = workflowSteps[i]
      
      if (step.status === 'pending') {
        // Update step to running
        setWorkflowSteps(prev => prev.map((s, index) => 
          index === i ? { ...s, status: 'running' } : s
        ))

        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Update step to completed
        setWorkflowSteps(prev => prev.map((s, index) => 
          index === i ? { 
            ...s, 
            status: 'completed',
            timestamp: new Date().toISOString()
          } : s
        ))
      }

      setCurrentStep(i + 1)
    }

    setIsRunning(false)
  }

  const resetWorkflow = () => {
    setWorkflowSteps(prev => prev.map(step => ({
      ...step,
      status: step.id === 'lead-capture' || step.id === 'booking-created' ? 'completed' : 'pending',
      timestamp: step.id === 'lead-capture' || step.id === 'booking-created' ? step.timestamp : undefined
    })))
    setCurrentStep(-1)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'running':
        return <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-gray-400" />
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200'
      case 'running':
        return 'bg-blue-50 border-blue-200'
      case 'pending':
        return 'bg-gray-50 border-gray-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-900">Workflow Automation Demo</h3>
        <div className="flex space-x-3">
          <button
            onClick={runWorkflow}
            disabled={isRunning}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PlayIcon className="h-4 w-4 mr-2" />
            {isRunning ? 'Running...' : 'Run Workflow'}
          </button>
          <button
            onClick={resetWorkflow}
            disabled={isRunning}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {workflowSteps.map((step, index) => (
          <div
            key={step.id}
            className={`p-4 border-2 rounded-lg transition-all ${getStatusColor(step.status)} ${
              currentStep === index ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getStatusIcon(step.status)}
                <div>
                  <h4 className="font-medium text-gray-900">{step.name}</h4>
                  <p className="text-sm text-gray-600">{step.description}</p>
                  {step.delay > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Delay: {step.delay} minutes via {step.channel}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                {step.timestamp && (
                  <p className="text-xs text-gray-500">
                    {new Date(step.timestamp).toLocaleTimeString()}
                  </p>
                )}
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  step.status === 'completed' ? 'bg-green-100 text-green-800' :
                  step.status === 'running' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {step.status}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Each niche has different delay times and communication channels</li>
          <li>• Salon/Barber/Spa: 2-hour review delay via email</li>
          <li>• Home Services: 8-hour review delay via SMS</li>
          <li>• Med Spa: 24-hour review delay via email (HIPAA compliant)</li>
          <li>• All steps are automated based on your selected niche configuration</li>
        </ul>
      </div>
    </div>
  )
}

export default WorkflowAutomationDemo
