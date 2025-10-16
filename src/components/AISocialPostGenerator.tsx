import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { getCurrentUser } from '../lib/authUtils'
import { generateText, checkOllamaStatus, DEFAULT_MODEL } from '../lib/ollamaClient'
import { postToPlatform, isTokenExpired, refreshAccessToken } from '../lib/socialOAuth'
import { isLinkedInConnected, getLinkedInSession } from '../lib/linkedinOAuth'
import { getBrandVoice, formatBrandVoiceForPrompt } from '../lib/brandVoice'

interface PostData {
  platform: 'linkedin' | 'facebook' | 'instagram'
  topic: string
  tone: 'friendly' | 'professional' | 'witty'
  scheduledTime?: string
  postNow?: boolean
  recurringType?: 'none' | 'daily' | 'weekly' | 'custom'
  recurringTime?: string
  recurringDays?: string[]
  endDate?: string
}

const PLATFORM_OPTIONS = [
  { value: 'linkedin', label: 'LinkedIn', icon: '💼' },
  { value: 'facebook', label: 'Facebook', icon: '📘' },
  { value: 'instagram', label: 'Instagram', icon: '📷' }
]

const TONE_OPTIONS = [
  { value: 'friendly', label: 'Friendly', description: 'Casual and approachable' },
  { value: 'professional', label: 'Professional', description: 'Formal and business-focused' },
  { value: 'witty', label: 'Witty', description: 'Clever and humorous' }
]

const RECURRING_OPTIONS = [
  { value: 'none', label: 'One-time', description: 'Post once only' },
  { value: 'daily', label: 'Daily', description: 'Every day at same time' },
  { value: 'weekly', label: 'Weekly', description: 'Same day each week' },
  { value: 'custom', label: 'Custom', description: 'Select specific days' }
]

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Monday', short: 'Mon' },
  { value: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { value: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { value: 'thursday', label: 'Thursday', short: 'Thu' },
  { value: 'friday', label: 'Friday', short: 'Fri' },
  { value: 'saturday', label: 'Saturday', short: 'Sat' },
  { value: 'sunday', label: 'Sunday', short: 'Sun' }
]

export default function AISocialPostGenerator() {
  const [formData, setFormData] = useState<PostData>({
    platform: 'linkedin',
    topic: '',
    tone: 'professional',
    scheduledTime: '',
    postNow: false,
    recurringType: 'none',
    recurringTime: '',
    recurringDays: [],
    endDate: ''
  })
  const [generatedContent, setGeneratedContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking')
  const [user, setUser] = useState<any>(null)
  const [connectedAccounts, setConnectedAccounts] = useState<any[]>([])

  // Check Ollama status and load user
  useEffect(() => {
    const initialize = async () => {
      try {
        // Check Ollama status
        const isRunning = await checkOllamaStatus()
        setOllamaStatus(isRunning ? 'connected' : 'disconnected')
        
        // Load user
        const currentUser = await getCurrentUser()
        setUser(currentUser)
        
        // Load connected accounts
        if (currentUser) {
          await loadConnectedAccounts(currentUser.id)
        }
      } catch (error) {
        console.error('Error initializing:', error)
        setOllamaStatus('disconnected')
      }
    }
    initialize()
  }, [])

  // Load connected accounts
  const loadConnectedAccounts = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('user_id', userId)

      if (error) {
        console.error('Error loading accounts:', error)
        return
      }

      setConnectedAccounts(data || [])
    } catch (error) {
      console.error('Error loading accounts:', error)
    }
  }

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear errors when user starts typing
    if (error) setError('')
    if (success) setSuccess('')
  }

  // Generate AI post content
  const handleGeneratePost = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.topic.trim()) {
      setError('Please enter a topic or promotion description')
      return
    }

    if (ollamaStatus !== 'connected') {
      setError('AI service is not running. Please ensure Ollama is running locally.')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // Get brand voice
      const brandVoice = await getBrandVoice()
      const brandVoicePrompt = formatBrandVoiceForPrompt(brandVoice)

      const prompt = `Write a ${formData.tone} ${formData.platform} post promoting ${formData.topic}. Make it engaging and concise. The post should be appropriate for ${formData.platform} and match the ${formData.tone} tone. Keep it under 280 characters for optimal social media engagement.${brandVoicePrompt}`

      console.log('Generating social media post with Ollama model:', DEFAULT_MODEL)
      console.log('Prompt:', prompt)
      
      const response = await generateText(prompt, DEFAULT_MODEL)
      console.log('Generated response:', response)
      
      if (response && response.trim() !== '') {
        setGeneratedContent(response.trim())
      } else {
        setError('No content generated. Please try again.')
      }
    } catch (err: any) {
      console.error('Error generating post:', err)
      setError(`Failed to generate post: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Check if platform is connected
  const isPlatformConnected = (platform: string) => {
    // Check Supabase connected accounts
    const supabaseConnected = connectedAccounts.some(account => account.platform === platform)
    
    // Check LinkedIn connection using centralized function
    if (platform === 'linkedin') {
      return isLinkedInConnected()
    }
    
    return supabaseConnected
  }

  // Generate recurring schedule dates
  const generateRecurringDates = (startDate: Date, recurringType: string, recurringTime: string, recurringDays: string[], endDate?: Date) => {
    const dates: Date[] = []
    const end = endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Default 30 days if no end date
    
    if (recurringType === 'daily') {
      let current = new Date(startDate)
      while (current <= end) {
        const [hours, minutes] = recurringTime.split(':').map(Number)
        current.setHours(hours, minutes, 0, 0)
        if (current >= startDate) {
          dates.push(new Date(current))
        }
        current.setDate(current.getDate() + 1)
      }
    } else if (recurringType === 'weekly') {
      let current = new Date(startDate)
      while (current <= end) {
        const [hours, minutes] = recurringTime.split(':').map(Number)
        current.setHours(hours, minutes, 0, 0)
        if (current >= startDate) {
          dates.push(new Date(current))
        }
        current.setDate(current.getDate() + 7)
      }
    } else if (recurringType === 'custom' && recurringDays.length > 0) {
      const dayMap: { [key: string]: number } = {
        'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
        'thursday': 4, 'friday': 5, 'saturday': 6
      }
      
      let current = new Date(startDate)
      while (current <= end) {
        const dayOfWeek = current.getDay()
        const dayName = Object.keys(dayMap).find(key => dayMap[key] === dayOfWeek)
        
        if (dayName && recurringDays.includes(dayName)) {
          const [hours, minutes] = recurringTime.split(':').map(Number)
          current.setHours(hours, minutes, 0, 0)
          if (current >= startDate) {
            dates.push(new Date(current))
          }
        }
        current.setDate(current.getDate() + 1)
      }
    }
    
    return dates
  }

  // Handle recurring day selection
  const handleDayToggle = (day: string) => {
    setFormData(prev => ({
      ...prev,
      recurringDays: prev.recurringDays?.includes(day)
        ? prev.recurringDays.filter(d => d !== day)
        : [...(prev.recurringDays || []), day]
    }))
  }

  // Post immediately to platform
  const handlePostNow = async () => {
    if (!generatedContent.trim()) {
      setError('No content to post. Please generate a post first.')
      return
    }

    if (!isPlatformConnected(formData.platform)) {
      setError(`Please connect your ${formData.platform} account first.`)
      return
    }

    setPosting(true)
    setError('')
    setSuccess('')

    try {
      // Get access token for the platform
      let accessToken = ''
      
      if (formData.platform === 'linkedin') {
        // Get LinkedIn token using centralized function
        if (!isLinkedInConnected()) {
          throw new Error('LinkedIn account not connected')
        }
        
        const linkedinSession = getLinkedInSession()
        if (!linkedinSession || !linkedinSession.tokens) {
          throw new Error('LinkedIn session not found. Please reconnect your account.')
        }
        
        const { tokens } = linkedinSession
        if (tokens.expires_at) {
          const expiresAt = new Date(tokens.expires_at)
          const now = new Date()
          if (expiresAt <= now) {
            throw new Error('LinkedIn token has expired. Please reconnect your account.')
          }
        }
        
        accessToken = tokens.access_token
      } else {
        // Get token from Supabase for other platforms
        const account = connectedAccounts.find(acc => acc.platform === formData.platform)
        if (!account) {
          throw new Error(`${formData.platform} account not found`)
        }
        accessToken = account.access_token
      }

      // Check if token is expired and refresh if needed (for non-LinkedIn platforms)
      if (formData.platform !== 'linkedin') {
        const account = connectedAccounts.find(acc => acc.platform === formData.platform)
        if (account?.expires_at && isTokenExpired(account.expires_at)) {
          console.log(`Refreshing expired token for ${formData.platform}`)
          const newTokens = await refreshAccessToken(formData.platform, account.refresh_token || '')
          
          // Update token in database
          const { error: updateError } = await supabase
          .from('social_accounts')
          .update({
            access_token: newTokens.access_token,
            refresh_token: newTokens.refresh_token,
            expires_at: newTokens.expires_at
          })
          .eq('id', account.id)

          if (updateError) {
            console.error('Error updating refreshed token:', updateError)
          } else {
            accessToken = newTokens.access_token
          }
        }
      }

      // Post to platform using OAuth
      const result = await postToPlatform(formData.platform, accessToken, generatedContent)

      if (!result.success) {
        throw new Error(result.error || 'Failed to post to platform')
      }

      // Save to database as published
      const { error } = await supabase
        .from('social_posts')
        .insert({
          user_id: user.id,
          platform: formData.platform,
          content: generatedContent,
          status: 'published',
          scheduled_time: new Date().toISOString(),
          post_id: result.postId
        })

      if (error) {
        throw error
      }

      setSuccess(`Post published to ${formData.platform} successfully! Post ID: ${result.postId}`)
      setGeneratedContent('')
      setFormData(prev => ({ ...prev, topic: '' }))
    } catch (err: any) {
      console.error('Error posting:', err)
      setError(`Failed to post to ${formData.platform}: ${err.message}`)
    } finally {
      setPosting(false)
    }
  }

  // Schedule post
  const handleSchedulePost = async () => {
    if (!generatedContent.trim()) {
      setError('No content to schedule. Please generate a post first.')
      return
    }

    if (!formData.scheduledTime) {
      setError('Please select a scheduled time.')
      return
    }

    if (!isPlatformConnected(formData.platform)) {
      setError(`Please connect your ${formData.platform} account first.`)
      return
    }

    const scheduledDate = new Date(formData.scheduledTime)
    if (scheduledDate <= new Date()) {
      setError('Scheduled time must be in the future.')
      return
    }

    // Validate recurring settings
    if (formData.recurringType !== 'none') {
      if (!formData.recurringTime) {
        setError('Please select a recurring time.')
        return
      }
      if (formData.recurringType === 'custom' && (!formData.recurringDays || formData.recurringDays.length === 0)) {
        setError('Please select at least one day for custom recurring.')
        return
      }
    }

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      if (formData.recurringType === 'none') {
        // Single post
        const { error } = await supabase
          .from('social_posts')
          .insert({
            user_id: user.id,
            platform: formData.platform,
            content: generatedContent,
            status: 'scheduled',
            scheduled_time: scheduledDate.toISOString()
          })

        if (error) {
          throw error
        }

        setSuccess(`Post scheduled for ${scheduledDate.toLocaleString()} on ${formData.platform}!`)
      } else {
        // Recurring posts
        const endDate = formData.endDate ? new Date(formData.endDate) : undefined
        const recurringDates = generateRecurringDates(
          scheduledDate,
          formData.recurringType!,
          formData.recurringTime!,
          formData.recurringDays || [],
          endDate
        )

        if (recurringDates.length === 0) {
          setError('No valid recurring dates found. Please check your settings.')
          return
        }

        // Insert all recurring posts
        const posts = recurringDates.map(date => ({
          user_id: user.id,
          platform: formData.platform,
          content: generatedContent,
          status: 'scheduled',
          scheduled_time: date.toISOString(),
          recurring_type: formData.recurringType,
          recurring_data: JSON.stringify({
            time: formData.recurringTime,
            days: formData.recurringDays,
            endDate: formData.endDate
          })
        }))

        const { error } = await supabase
          .from('social_posts')
          .insert(posts)

        if (error) {
          throw error
        }

        const recurringTypeText = formData.recurringType === 'daily' ? 'daily' :
                                 formData.recurringType === 'weekly' ? 'weekly' :
                                 `custom (${formData.recurringDays?.length} days)`
        
        setSuccess(`${recurringDates.length} posts scheduled ${recurringTypeText} starting ${scheduledDate.toLocaleString()} on ${formData.platform}!`)
      }

      setGeneratedContent('')
      setFormData(prev => ({ 
        ...prev, 
        topic: '', 
        scheduledTime: '',
        recurringType: 'none',
        recurringTime: '',
        recurringDays: [],
        endDate: ''
      }))
    } catch (err: any) {
      console.error('Error scheduling post:', err)
      setError(`Failed to schedule post: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  // Save post as draft
  const handleSavePost = async () => {
    if (!generatedContent.trim()) {
      setError('No content to save. Please generate a post first.')
      return
    }

    if (!user) {
      setError('User not found. Please log in again.')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const { error } = await supabase
        .from('social_posts')
        .insert({
          user_id: user.id,
          platform: formData.platform,
          content: generatedContent,
          status: 'draft'
        })

      if (error) {
        throw error
      }

      setSuccess('Post saved as draft successfully!')
      setGeneratedContent('')
      setFormData(prev => ({ ...prev, topic: '' }))
    } catch (err: any) {
      console.error('Error saving post:', err)
      setError(`Failed to save post: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  // Clear form and generated content
  const handleClear = () => {
    setFormData({
      platform: 'linkedin',
      topic: '',
      tone: 'professional',
      scheduledTime: '',
      postNow: false,
      recurringType: 'none',
      recurringTime: '',
      recurringDays: [],
      endDate: ''
    })
    setGeneratedContent('')
    setError('')
    setSuccess('')
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">AI Post Generator</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Generate engaging social media posts using AI
        </p>
        
        {/* AI Status Indicator */}
        <div className="mt-4 flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              ollamaStatus === 'connected' ? 'bg-green-500' : 
              ollamaStatus === 'checking' ? 'bg-yellow-500' : 'bg-red-500'
            }`}></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {ollamaStatus === 'connected' ? 'Ollama Connected' : 
               ollamaStatus === 'checking' ? 'Checking AI...' : 'AI Disconnected'}
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleGeneratePost} className="space-y-6">
        {/* Platform Selection */}
        <div>
          <label htmlFor="platform" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Platform
          </label>
          <div className="grid grid-cols-3 gap-3">
            {PLATFORM_OPTIONS.map((platform) => (
              <button
                key={platform.value}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, platform: platform.value as any }))}
                className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                  formData.platform === platform.value
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                <div className="text-center">
                  <div className="text-xl mb-1">{platform.icon}</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{platform.label}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Topic Input */}
        <div>
          <label htmlFor="topic" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Topic or Promotion Description *
          </label>
          <textarea
            id="topic"
            name="topic"
            required
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Describe what you want to promote or the topic for your post..."
            value={formData.topic}
            onChange={handleInputChange}
          />
        </div>

        {/* Tone Selection */}
        <div>
          <label htmlFor="tone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tone
          </label>
          <div className="grid grid-cols-3 gap-3">
            {TONE_OPTIONS.map((tone) => (
              <button
                key={tone.value}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, tone: tone.value as any }))}
                className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                  formData.tone === tone.value
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">{tone.label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{tone.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Scheduling Options */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            When to Post
          </label>
          <div className="space-y-4">
            {/* Post Now Option */}
            <div className="flex items-center">
              <input
                id="postNow"
                name="postNow"
                type="radio"
                checked={formData.postNow}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  postNow: e.target.checked,
                  scheduledTime: e.target.checked ? '' : prev.scheduledTime
                }))}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600"
              />
              <label htmlFor="postNow" className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                Post immediately
                {!isPlatformConnected(formData.platform) && (
                  <span className="text-red-500 ml-2">(Connect {formData.platform} account first)</span>
                )}
              </label>
            </div>

            {/* Schedule Option */}
            <div className="flex items-center">
              <input
                id="schedule"
                name="postNow"
                type="radio"
                checked={!formData.postNow}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  postNow: !e.target.checked,
                  scheduledTime: e.target.checked ? prev.scheduledTime : ''
                }))}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600"
              />
              <label htmlFor="schedule" className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                Schedule for later
                {!isPlatformConnected(formData.platform) && (
                  <span className="text-red-500 ml-2">(Connect {formData.platform} account first)</span>
                )}
              </label>
            </div>

            {/* Date/Time Picker */}
            {!formData.postNow && (
              <div className="ml-7 space-y-4">
                <div>
                  <input
                    type="datetime-local"
                    name="scheduledTime"
                    value={formData.scheduledTime}
                    onChange={handleInputChange}
                    min={new Date().toISOString().slice(0, 16)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Select when you want to start posting this content
                  </p>
                </div>

                {/* Recurring Options */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Recurring Schedule
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {RECURRING_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ 
                          ...prev, 
                          recurringType: option.value as any,
                          recurringTime: option.value === 'none' ? '' : prev.recurringTime,
                          recurringDays: option.value === 'none' ? [] : prev.recurringDays
                        }))}
                        className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                          formData.recurringType === option.value
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">{option.label}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{option.description}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recurring Time Selection */}
                {formData.recurringType !== 'none' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Recurring Time
                    </label>
                    <input
                      type="time"
                      name="recurringTime"
                      value={formData.recurringTime}
                      onChange={handleInputChange}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Time to post each occurrence
                    </p>
                  </div>
                )}

                {/* Custom Days Selection */}
                {formData.recurringType === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Select Days
                    </label>
                    <div className="grid grid-cols-7 gap-2">
                      {DAYS_OF_WEEK.map((day) => (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => handleDayToggle(day.value)}
                          className={`p-2 rounded-lg border-2 transition-all duration-200 ${
                            formData.recurringDays?.includes(day.value)
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          <div className="text-center">
                            <div className="text-xs font-medium">{day.short}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Select which days to post
                    </p>
                  </div>
                )}

                {/* End Date Selection */}
                {formData.recurringType !== 'none' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      End Date (Optional)
                    </label>
                    <input
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleInputChange}
                      min={new Date().toISOString().split('T')[0]}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Leave empty to continue indefinitely
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Generate Button */}
        <div className="flex space-x-3">
          <button
            type="submit"
            disabled={loading || ollamaStatus !== 'connected'}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </>
            ) : (
              'Generate Post'
            )}
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-md text-sm font-medium"
          >
            Clear
          </button>
        </div>
      </form>

      {/* Error Message */}
      {error && (
        <div className="mt-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mt-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Generated Content */}
      {generatedContent && (
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Generated Post Content
          </label>
          <textarea
            value={generatedContent}
            onChange={(e) => setGeneratedContent(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Generated content will appear here..."
          />
          <div className="mt-3 flex justify-between items-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Character count: {generatedContent.length}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => navigator.clipboard.writeText(generatedContent)}
                className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 px-3 py-1 border border-indigo-300 dark:border-indigo-600 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
              >
                Copy
              </button>
              
              <button
                onClick={handleSavePost}
                disabled={saving}
                className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                {saving ? 'Saving...' : 'Save Draft'}
              </button>

              {isPlatformConnected(formData.platform) ? (
                formData.postNow ? (
                  <button
                    onClick={handlePostNow}
                    disabled={posting}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    {posting ? 'Posting...' : `Post to ${formData.platform}`}
                  </button>
                ) : (
                  <button
                    onClick={handleSchedulePost}
                    disabled={saving || !formData.scheduledTime}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    {saving ? 'Scheduling...' : `Schedule for ${formData.platform}`}
                  </button>
                )
              ) : (
                <div className="text-sm text-red-600 dark:text-red-400 px-3 py-1">
                  Connect {formData.platform} account first
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Disconnected Message */}
      {ollamaStatus !== 'connected' && (
        <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400 px-4 py-3 rounded">
          <p className="text-sm">
            AI service is not running. Please start Ollama to generate posts.
          </p>
        </div>
      )}
    </div>
  )
}


