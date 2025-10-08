import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

interface BrandVoice {
  id: string
  user_id: string
  brand_tone: string
  sample_copy: string
  created_at: string
  updated_at: string
}

export default function BrandVoice() {
  const [brandTone, setBrandTone] = useState('')
  const [sampleCopy, setSampleCopy] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [user, setUser] = useState<any>(null)

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  // Load existing brand voice
  const loadBrandVoice = async () => {
    if (!user) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('brand_voice')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error loading brand voice:', error)
        setError('Failed to load brand voice settings')
      } else if (data) {
        setBrandTone(data.brand_tone || '')
        setSampleCopy(data.sample_copy || '')
      }
    } catch (err) {
      console.error('Error:', err)
      setError('Failed to load brand voice settings')
    } finally {
      setLoading(false)
    }
  }

  // Load brand voice when user is available
  useEffect(() => {
    if (user) {
      loadBrandVoice()
    }
  }, [user])

  // Save brand voice
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    if (!user) {
      setError('User not authenticated')
      setSaving(false)
      return
    }

    if (!brandTone.trim()) {
      setError('Brand tone is required')
      setSaving(false)
      return
    }

    try {
      const { error } = await supabase
        .from('brand_voice')
        .upsert([{
          user_id: user.id,
          brand_tone: brandTone.trim(),
          sample_copy: sampleCopy.trim() || null
        }], {
          onConflict: 'user_id'
        })

      if (error) {
        console.error('Error saving brand voice:', error)
        setError('Failed to save brand voice settings')
      } else {
        setSuccess('Brand voice saved successfully!')
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (err) {
      console.error('Error:', err)
      setError('Failed to save brand voice settings')
    } finally {
      setSaving(false)
    }
  }

  // Clear form
  const handleClear = () => {
    setBrandTone('')
    setSampleCopy('')
    setError('')
    setSuccess('')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading brand voice settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Brand Voice</h1>
            <p className="mt-2 text-gray-600">
              Define your brand's tone and voice to ensure consistent messaging across all AI-generated content
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Brand Voice Form */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Brand Tone & Voice</h2>
              <p className="text-sm text-gray-500">
                Describe your brand's personality and tone. This will be used to customize all AI-generated content.
              </p>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-6">
              {/* Brand Tone */}
              <div>
                <label htmlFor="brandTone" className="block text-sm font-medium text-gray-700 mb-2">
                  Brand Tone & Personality *
                </label>
                <textarea
                  id="brandTone"
                  rows={4}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Describe your brand's tone and personality. For example: 'Professional yet approachable, confident but not arrogant, helpful and solution-focused. We speak directly to our audience without jargon, using a conversational tone that builds trust.'"
                  value={brandTone}
                  onChange={(e) => setBrandTone(e.target.value)}
                  required
                />
                <p className="mt-2 text-sm text-gray-500">
                  Be specific about how your brand should sound in written communication.
                </p>
              </div>

              {/* Sample Copy */}
              <div>
                <label htmlFor="sampleCopy" className="block text-sm font-medium text-gray-700 mb-2">
                  Sample Copy (Optional)
                </label>
                <textarea
                  id="sampleCopy"
                  rows={6}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Paste examples of your brand's writing style here. This could be from your website, marketing materials, or any content that represents your brand voice well."
                  value={sampleCopy}
                  onChange={(e) => setSampleCopy(e.target.value)}
                />
                <p className="mt-2 text-sm text-gray-500">
                  Include examples of your best writing to help AI understand your style.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={handleClear}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Clear Form
                </button>
                <button
                  type="submit"
                  disabled={saving || !brandTone.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    'Save Brand Voice'
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* How It Works */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-blue-900 mb-4">How Brand Voice Works</h3>
            <div className="space-y-3 text-sm text-blue-800">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-blue-800 font-medium text-xs">1</span>
                </div>
                <p>Define your brand's tone and personality in the form above</p>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-blue-800 font-medium text-xs">2</span>
                </div>
                <p>Include sample copy to help AI understand your writing style</p>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-blue-800 font-medium text-xs">3</span>
                </div>
                <p>All AI-generated content will automatically use your brand voice</p>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-blue-800 font-medium text-xs">4</span>
                </div>
                <p>Update your brand voice anytime to refine your messaging</p>
              </div>
            </div>
          </div>

          {/* Current Brand Voice Preview */}
          {brandTone && (
            <div className="mt-8 bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Current Brand Voice</h3>
                <p className="text-sm text-gray-500">Preview of how your brand voice will be applied</p>
              </div>
              <div className="p-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Brand Tone:</h4>
                  <p className="text-gray-900 mb-4">{brandTone}</p>
                  
                  {sampleCopy && (
                    <>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Sample Copy:</h4>
                      <p className="text-gray-900 whitespace-pre-wrap">{sampleCopy}</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
