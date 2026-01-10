import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { getReviewStats } from '../lib/reviewRequestSystem'
import { getReferralStats } from '../lib/referralSystem'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Alert } from '../components/ui/Alert'
import { PageHeader } from '../components/ui/PageHeader'
import GuestModeWarning from '../components/GuestModeWarning'
import { isGuestUser } from '../lib/authUtils'
import { 
  StarIcon, 
  UserGroupIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  GiftIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'

interface Review {
  id: string
  reviewer_name: string
  reviewer_email: string
  review_text: string
  rating: number
  platform: string
  status: 'pending' | 'responded' | 'escalated' | 'resolved'
  response_text?: string
  response_date?: string
  is_positive: boolean
  created_at: string
}

interface ReferralRequest {
  id: string
  customer_name: string
  customer_email: string
  service_type: string
  service_completed_date: string
  satisfaction_rating?: number
  referral_request_sent: boolean
  referral_response_received: boolean
  referral_count: number
  created_at: string
}

export default function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [referralRequests, setReferralRequests] = useState<ReferralRequest[]>([])
  const [reviewStats, setReviewStats] = useState({
    total_reviews: 0,
    average_rating: 0,
    positive_reviews: 0,
    recent_reviews: [] as any[]
  })
  const [referralStats, setReferralStats] = useState({
    total_referrals_sent: 0,
    total_conversions: 0,
    conversion_rate: 0,
    total_rewards_given: 0,
    recent_referrals: [] as any[]
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch review and referral statistics
      try {
        const [reviewStatsData, referralStatsData] = await Promise.all([
          getReviewStats(user.id),
          getReferralStats(user.id)
        ])
        setReviewStats(reviewStatsData)
        setReferralStats(referralStatsData)
      } catch (statsError) {
        console.error('Error fetching stats:', statsError)
      }

      // First, try to fetch real Google reviews
      try {
        const response = await fetch('http://localhost:3001/api/google/places/reviews', {
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          console.log('Google Places API response:', data)
          if (data.success) {
            setReviews(data.reviews || [])
            setSuccess(`Fetched ${data.reviews?.length || 0} real Google reviews!`)
            setTimeout(() => setSuccess(''), 5000)
          } else {
            throw new Error(data.error || 'Failed to fetch reviews')
          }
        } else {
          const errorText = await response.text()
          console.error('Google Places API error response:', errorText)
          throw new Error(`Failed to fetch real reviews: ${errorText}`)
        }
      } catch (realDataError) {
        console.log('Real data fetch failed, using database data:', realDataError)
        
        // Fallback to database reviews
        const { data: reviewsData, error: reviewsError } = await supabase
          .from('reviews')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (reviewsError) throw reviewsError
        setReviews(reviewsData || [])
      }

      // Fetch referral requests
      const { data: referralData, error: referralError } = await supabase
        .from('referral_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (referralError) throw referralError

      setReferralRequests(referralData || [])
    } catch (err: any) {
      setError('Failed to load reviews and referrals')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  // const handleReviewResponse = async (reviewId: string, responseText: string) => {
  //   try {
  //     const { error } = await supabase
  //       .from('reviews')
  //       .update({
  //         response_text: responseText,
  //         response_date: new Date().toISOString(),
  //         status: 'responded'
  //       })
  //       .eq('id', reviewId)

  //     if (error) throw error

  //     setSuccess('Review response saved!')
  //     setTimeout(() => setSuccess(''), 3000)
  //     fetchData()
  //   } catch (err: any) {
  //     setError('Failed to save review response')
  //   }
  // }

  const handleStatusUpdate = async (reviewId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('reviews')
        .update({ status: newStatus })
        .eq('id', reviewId)

      if (error) throw error

      setSuccess('Review status updated!')
      setTimeout(() => setSuccess(''), 3000)
      fetchData()
    } catch (err: any) {
      setError('Failed to update review status')
    }
  }

  const filteredReviews = reviews.filter(review => {
    const matchesFilter = filter === 'all' || 
      (filter === 'positive' && review.is_positive) ||
      (filter === 'negative' && !review.is_positive) ||
      (filter === 'pending' && review.status === 'pending') ||
      (filter === 'responded' && review.status === 'responded')
    
    const matchesSearch = searchTerm === '' || 
      review.reviewer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.review_text.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesFilter && matchesSearch
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'responded':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'escalated':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
      case 'resolved':
        return <CheckCircleIcon className="h-5 w-5 text-blue-500" />
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'responded':
        return 'bg-green-100 text-green-800'
      case 'escalated':
        return 'bg-yellow-100 text-yellow-800'
      case 'resolved':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="h-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading reviews and referrals...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Guest Mode Warning */}
        {isGuestUser() && (
          <GuestModeWarning 
            feature="Google Reviews Integration"
            description="Google Reviews integration is not available in guest mode. Sign in to connect your Google Business Profile and manage reviews."
            actionText="Sign in to connect your Google Business Profile"
          />
        )}

        <PageHeader
          title="Reviews & Referrals"
          subtitle="Manage customer reviews and track referral requests"
          actions={
            !isGuestUser() && (
              <Button onClick={fetchData}>
                Refresh Data
              </Button>
            )
          }
        />

        {error && (
          <Alert variant="error" className="mb-6">
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success" className="mb-6">
            {success}
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <StarIcon className="h-8 w-8 text-yellow-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Reviews</p>
                  <p className="text-2xl font-bold text-gray-900">{reviewStats.total_reviews}</p>
                  <p className="text-sm text-gray-500">Avg: {reviewStats.average_rating}⭐</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircleIcon className="h-8 w-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Positive Reviews</p>
                  <p className="text-2xl font-bold text-gray-900">{reviewStats.positive_reviews}</p>
                  <p className="text-sm text-gray-500">
                    {reviewStats.total_reviews > 0 
                      ? Math.round((reviewStats.positive_reviews / reviewStats.total_reviews) * 100)
                      : 0}% of total
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <GiftIcon className="h-8 w-8 text-purple-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Referrals Sent</p>
                  <p className="text-2xl font-bold text-gray-900">{referralStats.total_referrals_sent}</p>
                  <p className="text-sm text-gray-500">{referralStats.total_conversions} conversions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <ChartBarIcon className="h-8 w-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{referralStats.conversion_rate}%</p>
                  <p className="text-sm text-gray-500">${referralStats.total_rewards_given} rewards given</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Search reviews..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Reviews' },
              { value: 'positive', label: 'Positive Only' },
              { value: 'negative', label: 'Negative Only' },
              { value: 'pending', label: 'Pending Response' },
              { value: 'responded', label: 'Responded' }
            ]}
          />
        </div>

        {/* Reviews List */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <StarIcon className="h-6 w-6 mr-2" />
                Customer Reviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredReviews.length === 0 ? (
                <div className="text-center py-8">
                  <StarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No reviews found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredReviews.map((review) => (
                    <div key={review.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-semibold text-gray-900">
                              {review.reviewer_name}
                            </h4>
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <StarIcon
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < review.rating ? 'text-yellow-400' : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(review.status)}`}>
                              {review.status}
                            </span>
                          </div>
                          <p className="text-gray-700 mb-2">{review.review_text}</p>
                          <p className="text-sm text-gray-500">
                            {review.platform} • {new Date(review.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(review.status)}
                        </div>
                      </div>

                      {review.status === 'pending' && (
                        <div className="mt-4 pt-4 border-t">
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => handleStatusUpdate(review.id, 'responded')}
                            >
                              Mark as Responded
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusUpdate(review.id, 'escalated')}
                            >
                              Escalate
                            </Button>
                          </div>
                        </div>
                      )}

                      {review.response_text && (
                        <div className="mt-4 pt-4 border-t">
                          <h5 className="font-medium text-gray-900 mb-2">Your Response:</h5>
                          <p className="text-gray-700">{review.response_text}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            Responded on {new Date(review.response_date!).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Referral Requests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserGroupIcon className="h-6 w-6 mr-2" />
                Referral Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              {referralRequests.length === 0 ? (
                <div className="text-center py-8">
                  <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No referral requests yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {referralRequests.map((request) => (
                    <div key={request.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {request.customer_name}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {request.service_type} • {new Date(request.service_completed_date).toLocaleDateString()}
                          </p>
                          <div className="flex items-center space-x-4 mt-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              request.referral_request_sent ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {request.referral_request_sent ? 'Request Sent' : 'Not Sent'}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              request.referral_response_received ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {request.referral_response_received ? 'Response Received' : 'No Response'}
                            </span>
                            {request.referral_count > 0 && (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                {request.referral_count} Referrals
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
