import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Alert } from '../components/ui/Alert'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export default function TestMissedCall() {
  const [user, setUser] = useState<any>(null)
  const [phoneNumber, setPhoneNumber] = useState('+1234567890')
  const [callerName, setCallerName] = useState('John Doe')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  const simulateMissedCall = async () => {
    if (!user) {
      setError('Please log in first')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('http://localhost:3001/api/test/missed-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: user.id,
          phone_number: phoneNumber,
          caller_name: callerName
        })
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
      } else {
        setError(data.error || 'Failed to simulate missed call')
      }
    } catch (err) {
      console.error('Error simulating missed call:', err)
      setError('Failed to simulate missed call')
    } finally {
      setLoading(false)
    }
  }

  const testAIFollowup = async (callId: string) => {
    if (!user) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch('http://localhost:3001/api/consolidated?action=google-missed-call-followup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          call_id: callId,
          user_id: user.id
        })
      })

      const data = await response.json()

      if (response.ok) {
        setResult(prev => ({
          ...prev,
          ai_followup_sent: true,
          ai_message: data.aiMessage
        }))
      } else {
        setError(data.error || 'Failed to send AI follow-up')
      }
    } catch (err) {
      console.error('Error sending AI follow-up:', err)
      setError('Failed to send AI follow-up')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <p className="text-center text-gray-600">Please log in to test the missed call feature</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Test Missed Call & AI Follow-up</h1>
          <p className="text-gray-600">
            Simulate a missed call and test the AI follow-up message generation without needing a Google Business Profile.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Test Form */}
          <Card>
            <CardHeader>
              <CardTitle>Simulate Missed Call</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <Input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1234567890"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Caller Name
                </label>
                <Input
                  type="text"
                  value={callerName}
                  onChange={(e) => setCallerName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>

              <Button
                onClick={simulateMissedCall}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Simulating...' : 'Simulate Missed Call'}
              </Button>

              {error && (
                <Alert className="bg-red-50 border-red-200 text-red-800">
                  {error}
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Results */}
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              {result ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h3 className="font-medium text-green-800 mb-2">✅ Test Call Created</h3>
                    <p className="text-sm text-green-700">
                      Call ID: {result.call_log?.id}<br/>
                      Lead ID: {result.lead?.id}<br/>
                      Phone: {result.call_log?.phone}
                    </p>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="font-medium text-blue-800 mb-2">🤖 AI Generated Message</h3>
                    <p className="text-sm text-blue-700 whitespace-pre-wrap">
                      {result.ai_message}
                    </p>
                  </div>

                  {!result.ai_followup_sent && (
                    <Button
                      onClick={() => testAIFollowup(result.call_log.id)}
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? 'Sending...' : 'Send AI Follow-up'}
                    </Button>
                  )}

                  {result.ai_followup_sent && (
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <h3 className="font-medium text-purple-800 mb-2">📤 AI Follow-up Sent</h3>
                      <p className="text-sm text-purple-700">
                        The AI follow-up message has been sent and logged in the system.
                      </p>
                    </div>
                  )}

                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <h3 className="font-medium text-gray-800 mb-2">ℹ️ Note</h3>
                    <p className="text-sm text-gray-600">
                      {result.note}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  Click "Simulate Missed Call" to test the feature
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* How it Works */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>How This Test Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm text-gray-600">
              <div className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">1</span>
                <p>Creates a simulated missed call log in your database</p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">2</span>
                <p>Creates a lead from the missed call with "callback_asap" workflow stage</p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">3</span>
                <p>Generates an AI follow-up message using your business settings from the Profile page</p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">4</span>
                <p>In production, this would automatically send via Google Business Messages API</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

