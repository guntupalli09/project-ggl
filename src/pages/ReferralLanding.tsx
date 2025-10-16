import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { validateReferralCode } from '../lib/referralSystem'
import { getBrandVoice } from '../lib/brandVoice'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Alert } from '../components/ui/Alert'
import { GiftIcon, XCircleIcon } from '@heroicons/react/24/outline'

interface ReferralValidation {
  valid: boolean
  business_name?: string
  reward_amount?: number
  expires_at?: string
}

export default function ReferralLanding() {
  const { referralCode } = useParams<{ referralCode: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [validation, setValidation] = useState<ReferralValidation>({ valid: false })
  const [error, setError] = useState('')
  const [brandVoice, setBrandVoice] = useState<any>(null)
  const [leadData, setLeadData] = useState({
    name: '',
    email: '',
    phone: ''
  })

  useEffect(() => {
    if (referralCode) {
      validateReferral()
    }
  }, [referralCode])

  const validateReferral = async () => {
    try {
      setLoading(true)
      
      // Load brand voice for personalized messaging
      try {
        const brandVoiceData = await getBrandVoice()
        setBrandVoice(brandVoiceData)
        console.log('🎨 Brand Voice loaded for referral landing')
      } catch (brandVoiceError) {
        console.log('⚠️ Brand Voice not available for referral landing')
      }
      
      const result = await validateReferralCode(referralCode!)
      setValidation(result)
      
      if (!result.valid) {
        setError('This referral link is invalid or has expired')
      } else {
        console.log('✅ Referral code validated successfully')
      }
    } catch (err) {
      console.error('Error validating referral:', err)
      setError('Failed to validate referral link')
    } finally {
      setLoading(false)
    }
  }

  const handleLeadCapture = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!referralCode) {
      setError('Invalid referral code')
      return
    }

    try {
      // Here you would typically:
      // 1. Create a new lead with the referral code
      // 2. Track the referral conversion
      // 3. Redirect to booking or show success message
      
      // For now, we'll just show a success message
      setError('')
      alert(`Thank you! You've been referred by a friend. You'll get $${validation.reward_amount} off your first visit!`)
      
      // In a real implementation, you'd redirect to booking or lead capture
      navigate('/')
    } catch (err) {
      console.error('Error processing referral:', err)
      setError('Failed to process referral. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Validating referral...</p>
        </div>
      </div>
    )
  }

  if (!validation.valid) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <XCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Invalid Referral Link
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {error || 'This referral link is invalid or has expired.'}
            </p>
            <Button 
              onClick={() => navigate('/')}
              className="w-full"
            >
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="text-center">
            <GiftIcon className="h-16 w-16 text-purple-500 mx-auto mb-4" />
            <CardTitle className="text-2xl">
              You're Invited!
            </CardTitle>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {brandVoice ? 
                `A friend referred you to ${validation.business_name} - we're excited to welcome you to our community!` :
                `A friend referred you to ${validation.business_name}`
              }
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg mb-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-2">
                🎉 Special Offer
              </h3>
              <p className="text-purple-700 dark:text-purple-300">
                {brandVoice ? 
                  `Get ${validation.reward_amount} off your first visit - we can't wait to provide you with an exceptional experience!` :
                  `Get ${validation.reward_amount} off your first visit!`
                }
              </p>
              <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">
                Your friend gets ${validation.reward_amount} credit too!
              </p>
            </div>
          </div>

          <form onSubmit={handleLeadCapture} className="space-y-4">
            {error && (
              <Alert variant="error">
                {error}
              </Alert>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Your Name *
              </label>
              <Input
                value={leadData.name}
                onChange={(e) => setLeadData(prev => ({ ...prev, name: e.target.value }))}
                required
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address *
              </label>
              <Input
                type="email"
                value={leadData.email}
                onChange={(e) => setLeadData(prev => ({ ...prev, email: e.target.value }))}
                required
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone Number
              </label>
              <Input
                type="tel"
                value={leadData.phone}
                onChange={(e) => setLeadData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Enter your phone number"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              Claim Your ${validation.reward_amount} Discount
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              By submitting this form, you agree to receive communications from {validation.business_name}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
