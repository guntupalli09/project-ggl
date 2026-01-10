import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { submitReview, getReviewRequestData } from '../lib/reviewRequestSystem'
import { createReferralOffer } from '../lib/referralSystem'
import { getBrandVoice } from '../lib/brandVoice'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Textarea } from '../components/ui/Textarea'
import { Input } from '../components/ui/Input'
import { Alert } from '../components/ui/Alert'
import { StarIcon, CheckCircleIcon, GiftIcon } from '@heroicons/react/24/outline'

interface ReviewFormData {
  reviewer_name: string
  reviewer_email: string
  review_text: string
  rating: number
}

export default function ReviewCollection() {
  const { bookingId } = useParams<{ bookingId: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [serviceType, setServiceType] = useState('')
  const [referralOffer, setReferralOffer] = useState<any>(null)
  const [brandVoice, setBrandVoice] = useState<any>(null)
  const [formData, setFormData] = useState<ReviewFormData>({
    reviewer_name: '',
    reviewer_email: '',
    review_text: '',
    rating: 0
  })

  useEffect(() => {
    if (bookingId) {
      loadReviewData()
    }
  }, [bookingId])

  const loadReviewData = async () => {
    try {
      setLoading(true)
      
      // Load brand voice for personalized messaging
      try {
        const brandVoiceData = await getBrandVoice()
        setBrandVoice(brandVoiceData)
        console.log('🎨 Brand Voice loaded for review form')
      } catch (brandVoiceError) {
        console.log('⚠️ Brand Voice not available for review form')
      }
      
      // Try to get review request data first
      const data = await getReviewRequestData(bookingId!)
      
      if (data) {
        setBusinessName(data.business_name)
        setServiceType(data.service_type)
        setFormData(prev => ({
          ...prev,
          reviewer_name: data.customer_name,
          reviewer_email: data.customer_email
        }))
        console.log('✅ Review data loaded successfully')
        return
      }

      // Fallback: Use default values for demo purposes
      console.log('⚠️  Using fallback data for review form')
      setBusinessName('Great Clips')
      setServiceType('Haircut Service')
      setFormData(prev => ({
        ...prev,
        reviewer_name: '',
        reviewer_email: ''
      }))
      
    } catch (err) {
      console.error('Error loading review data:', err)
      // Don't set error, just use fallback data
      setBusinessName('Great Clips')
      setServiceType('Haircut Service')
      setFormData(prev => ({
        ...prev,
        reviewer_name: '',
        reviewer_email: ''
      }))
    } finally {
      setLoading(false)
    }
  }

  const handleRatingClick = (rating: number) => {
    setFormData(prev => ({ ...prev, rating }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!bookingId) {
      setError('Invalid review request')
      return
    }

    if (formData.rating === 0) {
      setError('Please select a rating')
      return
    }

    try {
      setSubmitting(true)
      setError('')

      // Submit the review
      const review = await submitReview(bookingId, formData)
      
      if (!review) {
        throw new Error('Failed to submit review')
      }

      setSuccess('Thank you for your review!')

      // If it's a positive review (4+ stars), create referral offer
      if (review.rating >= 4) {
        try {
          const referralData = await createReferralOffer(review.id)
          if (referralData) {
            setReferralOffer(referralData)
          }
        } catch (referralError) {
          console.error('Error creating referral offer:', referralError)
          // Don't fail the review submission if referral creation fails
        }
      }

    } catch (err) {
      console.error('Error submitting review:', err)
      setError('Failed to submit review. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const renderStars = () => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => handleRatingClick(star)}
            className={`p-1 ${
              star <= formData.rating
                ? 'text-yellow-400'
                : 'text-gray-300 hover:text-yellow-300'
            } transition-colors`}
          >
            <StarIcon className="h-8 w-8 fill-current" />
          </button>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading review form...</p>
        </div>
      </div>
    )
  }

  if (error && !success) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
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

  if (success && !referralOffer) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Thank You!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Your review has been submitted successfully.
            </p>
            <Button 
              onClick={() => navigate('/')}
              className="w-full"
            >
              Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success && referralOffer) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <GiftIcon className="h-16 w-16 text-purple-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              🎉 You Earned a Reward!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Thanks for the great review! Share this link with friends and both get $10 off!
            </p>
            
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Your referral link:</p>
              <div className="bg-white dark:bg-gray-800 p-3 rounded border">
                <code className="text-sm break-all">{referralOffer.referral_link}</code>
              </div>
              <Button
                onClick={() => navigator.clipboard.writeText(referralOffer.referral_link)}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                Copy Link
              </Button>
            </div>

            <Button 
              onClick={() => navigate('/')}
              className="w-full"
            >
              Continue
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
          <CardTitle className="text-center text-2xl">
            How was your {serviceType}?
          </CardTitle>
          <p className="text-center text-gray-600 dark:text-gray-400">
            {brandVoice ? 
              `${businessName} would love to hear about your experience. Your feedback helps us continue providing the quality service you expect.` :
              `${businessName} would love to hear about your experience`
            }
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="error">
                {error}
              </Alert>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Your Rating *
              </label>
              <div className="flex justify-center">
                {renderStars()}
              </div>
              {formData.rating > 0 && (
                <p className="text-center text-sm text-gray-500 mt-2">
                  {formData.rating} star{formData.rating !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Your Name *
              </label>
              <Input
                value={formData.reviewer_name}
                onChange={(e) => setFormData(prev => ({ ...prev, reviewer_name: e.target.value }))}
                required
                placeholder="Enter your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address *
              </label>
              <Input
                type="email"
                value={formData.reviewer_email}
                onChange={(e) => setFormData(prev => ({ ...prev, reviewer_email: e.target.value }))}
                required
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tell us about your experience
              </label>
              <Textarea
                value={formData.review_text}
                onChange={(e) => setFormData(prev => ({ ...prev, review_text: e.target.value }))}
                placeholder="Share your thoughts about the service..."
                rows={4}
              />
            </div>

            <Button
              type="submit"
              disabled={submitting || formData.rating === 0}
              className="w-full"
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
