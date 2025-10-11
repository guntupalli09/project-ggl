import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { processLeadAtomically, validateLeadData } from '../lib/atomicLeadProcessing'

interface BusinessInfo {
  user_id: string
  business_name: string
  logo_url?: string
  booking_link?: string
  niche?: string
}

interface LeadFormData {
  name: string
  email: string
  phone: string
  message: string
}

const PublicLeadCapture: React.FC = () => {
  const { businessSlug } = useParams<{ businessSlug: string }>()
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState<LeadFormData>({
    name: '',
    email: '',
    phone: '',
    message: ''
  })

  // Fetch business info by slug
  useEffect(() => {
    const fetchBusinessInfo = async () => {
      if (!businessSlug) {
        setError('Invalid business link')
        setLoading(false)
        return
      }

      try {
        // Handle demo case
        if (businessSlug === 'demo') {
          setBusinessInfo({
            user_id: 'demo-user',
            business_name: 'Demo Business',
            logo_url: '',
            booking_link: '',
            niche: 'Demo'
          })
          setLoading(false)
          return
        }

        const { data, error } = await supabase
          .from('user_settings')
          .select('user_id, business_name, logo_url, booking_link, niche')
          .eq('business_slug', businessSlug)
          .single()

        if (error) {
          console.error('Error fetching business info:', error)
          setError('Business not found')
          setLoading(false)
          return
        }

        setBusinessInfo(data)
      } catch (err) {
        console.error('Error:', err)
        setError('Failed to load business information')
      } finally {
        setLoading(false)
      }
    }

    fetchBusinessInfo()
  }, [businessSlug])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    if (!businessInfo?.user_id) {
      setError('Business owner information missing. Cannot submit lead.')
      setSubmitting(false)
      return
    }

    // Validate lead data
    const validation = validateLeadData({
      user_id: businessInfo.user_id,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      source: 'HostedForm',
      notes: formData.message
    })

    if (!validation.valid) {
      setError(validation.error || 'Invalid form data')
      setSubmitting(false)
      return
    }

    try {
      // Use atomic lead processing to prevent race conditions
      const result = await processLeadAtomically({
        user_id: businessInfo.user_id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        source: 'HostedForm',
        notes: formData.message
      })

      if (result.success) {
        setSubmitted(true)
        setFormData({ name: '', email: '', phone: '', message: '' }) // Clear form
      } else {
        setError(result.error || 'Failed to submit lead')
      }
    } catch (err: any) {
      console.error('Lead submission error:', err)
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !businessInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Business Not Found</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          {businessInfo.logo_url && (
            <img 
              src={businessInfo.logo_url} 
              alt={businessInfo.business_name}
              className="h-16 w-auto mx-auto mb-6"
            />
          )}
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Thank You!</h1>
          <p className="text-gray-600 mb-6">
            Thank you for your interest in {businessInfo.business_name}. 
            We'll get back to you within 24 hours.
          </p>
          {businessInfo.booking_link && (
            <a
              href={businessInfo.booking_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Book a Call Now
            </a>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Business Header */}
          <div className="text-center mb-8">
            {businessInfo.logo_url && (
              <img 
                src={businessInfo.logo_url} 
                alt={businessInfo.business_name}
                className="h-16 w-auto mx-auto mb-4"
              />
            )}
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Contact {businessInfo.business_name}
            </h1>
            <p className="text-gray-600">
              {businessInfo.niche || 'Get in touch with us today'}
            </p>
          </div>

          {/* Lead Capture Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Your full name"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="(555) 123-4567"
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                rows={4}
                value={formData.message}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Tell us about your project or how we can help..."
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Submitting...' : 'Send Message'}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>We'll respond within 24 hours</p>
            {businessInfo.booking_link && (
              <p className="mt-2">
                Or{' '}
                <a
                  href={businessInfo.booking_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  book a call directly
                </a>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PublicLeadCapture
