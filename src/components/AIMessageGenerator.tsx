import { useState, useEffect } from 'react'
import { generateText, checkOllamaStatus, getAvailableModels, DEFAULT_MODEL } from '../lib/ollamaClient'
import { getBrandVoice, formatBrandVoiceForPrompt } from '../lib/brandVoice'
import { sendAIGeneratedEmail } from '../lib/sendEmail'
import { supabase } from '../lib/supabaseClient'

interface AIMessageGeneratorProps {
  leadName?: string
  leadCompany?: string
  leadEmail?: string
  leadId?: string
  onMessageGenerated?: (message: string) => void
}

export default function AIMessageGenerator({ 
  leadName = '', 
  leadCompany = '', 
  leadEmail = '',
  leadId = '',
  onMessageGenerated 
}: AIMessageGeneratorProps) {
  const [formData, setFormData] = useState({
    leadName: leadName,
    leadCompany: leadCompany,
    productDescription: ''
  })
  const [generatedMessage, setGeneratedMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking')
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [bookingLink, setBookingLink] = useState('')

  // Fetch booking link from user_settings
  useEffect(() => {
    const fetchBookingLink = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: settings, error } = await supabase
            .from('user_settings')
            .select('booking_link')
            .eq('user_id', user.id)
            .single()

          if (error && error.code !== 'PGRST116') {
            console.error('Error fetching booking link:', error)
          } else if (settings?.booking_link) {
            setBookingLink(settings.booking_link)
          }
        }
      } catch (error) {
        console.error('Error fetching booking link:', error)
      }
    }

    fetchBookingLink()
  }, [])

  // Check Ollama status and load available models
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const isRunning = await checkOllamaStatus()
        if (isRunning) {
          setOllamaStatus('connected')
          const models = await getAvailableModels()
          console.log("Models received:", models);
          
          // Ensure we only have strings
          const stringModels = models.filter((model: any) => typeof model === 'string');
          console.log("String models:", stringModels);
          
          setAvailableModels(stringModels.length > 0 ? stringModels : [DEFAULT_MODEL])
          if (stringModels.length > 0 && !stringModels.includes(selectedModel)) {
            setSelectedModel(stringModels[0])
          }
        } else {
          setOllamaStatus('disconnected')
          // Set fallback models when Ollama is not running
          setAvailableModels([DEFAULT_MODEL])
        }
      } catch (error) {
        console.error('Error checking Ollama status:', error)
        setOllamaStatus('disconnected')
        // Set fallback models when there's an error
        setAvailableModels([DEFAULT_MODEL])
        setSelectedModel(DEFAULT_MODEL)
      }
    }

    checkStatus()
  }, [selectedModel])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setGeneratedMessage('')
    setLoading(true)

    if (!formData.leadName || !formData.leadCompany || !formData.productDescription) {
      setError('Please fill in all required fields')
      setLoading(false)
      return
    }

    try {
      // Check if Ollama is running
      if (ollamaStatus !== 'connected') {
        setError('Ollama is not running. Please start Ollama and ensure it\'s accessible at http://localhost:11434')
        setLoading(false)
        return
      }

      // Get brand voice
      const brandVoice = await getBrandVoice()
      const brandVoicePrompt = formatBrandVoiceForPrompt(brandVoice)

      const prompt = `Generate a professional, personalized outreach email for a lead.

Lead Details:
- Name: ${formData.leadName}
- Company: ${formData.leadCompany}

Product/Service Description: ${formData.productDescription}

Requirements:
- Keep it concise (2-3 paragraphs max)
- Professional but friendly tone
- Personalized to the lead and their company
- Include a clear call-to-action
- Focus on value proposition
- Avoid being too salesy${brandVoicePrompt}${bookingLink ? `

IMPORTANT: Include this booking link in your call-to-action: ${bookingLink}` : ''}

Generate the email content only (no subject line needed):`

      console.log('Generating message with Ollama model:', selectedModel)
      console.log('Prompt:', prompt)
      const response = await generateText(prompt, selectedModel)
      console.log('Generated response:', response)
      
      if (response && response.trim() !== '') {
        setGeneratedMessage(response)
        
        if (onMessageGenerated) {
          onMessageGenerated(response)
        }
      } else {
        setError('No response generated. Please try again.')
      }
    } catch (err) {
      console.error('Error generating message:', err)
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(`Failed to generate message: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedMessage)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text:', err)
    }
  }

  const handleClear = () => {
    setGeneratedMessage('')
    setError('')
    setEmailSent(false)
    setEmailError('')
  }

  const handleSendEmail = async () => {
    if (!leadEmail) {
      setEmailError('No email address provided for this lead')
      return
    }

    if (!generatedMessage) {
      setEmailError('No message generated to send')
      return
    }

    setSendingEmail(true)
    setEmailError('')
    setEmailSent(false)

    try {
      // First, create a message record in Supabase
      let messageId = ''
      if (leadId) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: messageData, error: messageError } = await supabase
            .from('messages')
            .insert([{
              user_id: user.id,
              lead_id: leadId,
              channel: 'email',
              direction: 'out',
              body: generatedMessage
            }])
            .select()
            .single()

          if (messageError) {
            console.error('Error creating message record:', messageError)
          } else {
            messageId = messageData.id
          }
        }
      }

      // Send the email
      const result = await sendAIGeneratedEmail(
        leadEmail,
        `Follow-up from GGL`,
        generatedMessage,
        'GGL',
        messageId
      )

      if (result.success) {
        setEmailSent(true)
        setEmailError('')
      } else {
        setEmailError(result.error || 'Failed to send email')
      }
    } catch (err) {
      console.error('Error sending email:', err)
      setEmailError('Failed to send email. Please try again.')
    } finally {
      setSendingEmail(false)
    }
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">AI Message Generator</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Generate personalized outreach emails using AI for your leads
        </p>
        
        {/* Ollama Status Indicator */}
        <div className="mt-4 flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              ollamaStatus === 'connected' ? 'bg-green-500' : 
              ollamaStatus === 'checking' ? 'bg-yellow-500' : 'bg-red-500'
            }`}></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {ollamaStatus === 'connected' ? 'Ollama Connected' : 
               ollamaStatus === 'checking' ? 'Checking Ollama...' : 'Ollama Disconnected'}
            </span>
          </div>
          
          {/* Model Selection */}
          {ollamaStatus === 'connected' && availableModels.length > 0 && (
            <div className="flex items-center space-x-2">
              <label htmlFor="modelSelect" className="text-sm text-gray-600 dark:text-gray-400">
                Model:
              </label>
                <select
                  id="modelSelect"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {availableModels
                    .filter(model => typeof model === 'string' && model.length > 0)
                    .map((model, index) => (
                      <option key={`${model}-${index}`} value={model}>
                        {model}
                      </option>
                    ))}
                </select>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleGenerate} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="leadName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Lead Name *
            </label>
            <input
              type="text"
              id="leadName"
              name="leadName"
              required
              className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              value={formData.leadName}
              onChange={handleInputChange}
              placeholder="e.g., John Smith"
            />
          </div>
          <div>
            <label htmlFor="leadCompany" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Lead Company *
            </label>
            <input
              type="text"
              id="leadCompany"
              name="leadCompany"
              required
              className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              value={formData.leadCompany}
              onChange={handleInputChange}
              placeholder="e.g., Acme Corp"
            />
          </div>
        </div>

        <div>
          <label htmlFor="productDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Product/Service Description *
          </label>
          <textarea
            id="productDescription"
            name="productDescription"
            required
            rows={3}
            className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            value={formData.productDescription}
            onChange={handleInputChange}
            placeholder="Describe your product or service that you want to pitch to this lead..."
          />
        </div>

        {error && (
          <div className="text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="flex space-x-3">
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </>
            ) : (
              'Generate Message'
            )}
          </button>

          {generatedMessage && (
            <button
              type="button"
              onClick={handleClear}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {generatedMessage && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-md font-medium text-gray-900 dark:text-white">Generated Message</h4>
            <div className="flex space-x-2">
              {leadEmail && (
                <button
                  onClick={handleSendEmail}
                  disabled={sendingEmail || emailSent}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-3 py-1 rounded text-sm font-medium flex items-center"
                >
                  {sendingEmail ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-1 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </>
                  ) : emailSent ? (
                    <>
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Sent!
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Send Email
                    </>
                  )}
                </button>
              )}
              <button
                onClick={handleCopy}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium flex items-center"
              >
                {copied ? (
                  <>
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md p-4">
            <div className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200">
              {generatedMessage}
            </div>
          </div>
          
          {/* Email Status Messages */}
          {emailSent && (
            <div className="mt-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-green-800 dark:text-green-200 text-sm font-medium">
                  Email sent successfully to {leadEmail}
                </p>
              </div>
            </div>
          )}
          
          {emailError && (
            <div className="mt-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-800 dark:text-red-200 text-sm font-medium">
                  {emailError}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
