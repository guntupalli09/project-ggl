import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export default function TestCompleteFlow() {
  const [user, setUser] = useState<any>(null)
  const [step, setStep] = useState(0)
  const [results, setResults] = useState<any>({})

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  const steps = [
    {
      title: "1. Customer Searches Your Business",
      description: "Customer finds your business on Google Maps",
      action: () => simulateCustomerSearch(),
      status: results.customerSearch ? 'completed' : 'pending'
    },
    {
      title: "2. Customer Calls Your Business",
      description: "Customer clicks 'Call' button on Google Maps",
      action: () => simulateCustomerCall(),
      status: results.customerCall ? 'completed' : 'pending'
    },
    {
      title: "3. You Miss the Call",
      description: "You don't answer the phone",
      action: () => simulateMissedCall(),
      status: results.missedCall ? 'completed' : 'pending'
    },
    {
      title: "4. System Detects Missed Call",
      description: "Google Business Profile API detects the missed call",
      action: () => simulateSystemDetection(),
      status: results.systemDetection ? 'completed' : 'pending'
    },
    {
      title: "5. AI Generates Follow-up",
      description: "AI creates personalized follow-up message",
      action: () => simulateAIGeneration(),
      status: results.aiGeneration ? 'completed' : 'pending'
    },
    {
      title: "6. AI Sends Message",
      description: "AI sends message via Google Business Messages",
      action: () => simulateAISending(),
      status: results.aiSending ? 'completed' : 'pending'
    }
  ]

  const simulateCustomerSearch = async () => {
    setResults(prev => ({ ...prev, customerSearch: true }))
    setStep(1)
  }

  const simulateCustomerCall = async () => {
    setResults(prev => ({ ...prev, customerCall: true }))
    setStep(2)
  }

  const simulateMissedCall = async () => {
    setResults(prev => ({ ...prev, missedCall: true }))
    setStep(3)
  }

  const simulateSystemDetection = async () => {
    // This would normally call Google Business Profile API
    setResults(prev => ({ ...prev, systemDetection: true }))
    setStep(4)
  }

  const simulateAIGeneration = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/test/missed-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id,
          phone_number: '+12179535522',
          caller_name: 'Test Customer'
        })
      })
      
      const data = await response.json()
      setResults(prev => ({ 
        ...prev, 
        aiGeneration: true,
        aiMessage: data.ai_message,
        callLog: data.call_log,
        lead: data.lead
      }))
      setStep(5)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const simulateAISending = async () => {
    // This would normally send via Google Business Messages
    setResults(prev => ({ ...prev, aiSending: true }))
    setStep(6)
  }

  const resetTest = () => {
    setStep(0)
    setResults({})
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <p className="text-center text-gray-600">Please log in to test the complete flow</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Missed Call Flow Test</h1>
          <p className="text-gray-600">
            Test the complete sequence from customer search to AI follow-up message.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Steps */}
          <div className="space-y-4">
            {steps.map((stepItem, index) => (
              <Card key={index} className={`${
                stepItem.status === 'completed' ? 'bg-green-50 border-green-200' : 
                index === step ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
              }`}>
                <CardHeader className="pb-3">
                  <CardTitle className={`text-sm ${
                    stepItem.status === 'completed' ? 'text-green-800' : 
                    index === step ? 'text-blue-800' : 'text-gray-600'
                  }`}>
                    {stepItem.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-gray-600 mb-3">{stepItem.description}</p>
                  <Button
                    onClick={stepItem.action}
                    disabled={index > step}
                    size="sm"
                    className={`${
                      stepItem.status === 'completed' ? 'bg-green-600 hover:bg-green-700' : 
                      index === step ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400'
                    }`}
                  >
                    {stepItem.status === 'completed' ? '✅ Completed' : 
                     index === step ? '▶️ Execute' : '⏸️ Pending'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Results */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Test Results</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(results).length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    Click "Execute" on each step to see results
                  </p>
                ) : (
                  <div className="space-y-4">
                    {results.customerSearch && (
                      <Alert className="bg-green-50 border-green-200 text-green-800">
                        ✅ Customer found your business on Google Maps
                      </Alert>
                    )}
                    
                    {results.customerCall && (
                      <Alert className="bg-green-50 border-green-200 text-green-800">
                        ✅ Customer clicked "Call" button
                      </Alert>
                    )}
                    
                    {results.missedCall && (
                      <Alert className="bg-yellow-50 border-yellow-200 text-yellow-800">
                        ⚠️ You missed the call
                      </Alert>
                    )}
                    
                    {results.systemDetection && (
                      <Alert className="bg-blue-50 border-blue-200 text-blue-800">
                        🔍 System detected missed call via Google Business Profile API
                      </Alert>
                    )}
                    
                    {results.aiGeneration && (
                      <div className="space-y-2">
                        <Alert className="bg-purple-50 border-purple-200 text-purple-800">
                          🤖 AI generated follow-up message
                        </Alert>
                        {results.aiMessage && (
                          <div className="p-3 bg-gray-50 rounded border">
                            <p className="text-sm font-medium mb-1">Generated Message:</p>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">
                              {results.aiMessage}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {results.aiSending && (
                      <Alert className="bg-green-50 border-green-200 text-green-800">
                        📤 AI sent message via Google Business Messages
                      </Alert>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Real-World Setup Required</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-start space-x-2">
                    <span className="text-blue-600">1.</span>
                    <p>Create Google Business Profile for your business</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-blue-600">2.</span>
                    <p>Set up Google Cloud Console with Business Profile API</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-blue-600">3.</span>
                    <p>Configure webhook for real-time call detection</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-blue-600">4.</span>
                    <p>Enable Google Business Messages for your business</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button onClick={resetTest} variant="outline" className="w-full">
              Reset Test
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

