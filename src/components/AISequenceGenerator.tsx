import { useState } from 'react'
import { generateText } from '../lib/openaiClient'
import { supabase } from '../lib/supabaseClient'
import { getBrandVoice, formatBrandVoiceForPrompt } from '../lib/brandVoice'

interface Contact {
  id: string
  name: string
  company: string
  email: string
}

interface AISequenceGeneratorProps {
  contact?: Contact
  onSequenceGenerated?: (sequence: any) => void
  onClose?: () => void
}

interface GeneratedSequence {
  initial_message: string
  follow_up_message: string
  reminder_message: string
}

const TONE_OPTIONS = [
  'Professional',
  'Friendly',
  'Casual',
  'Persuasive',
  'Direct',
  'Consultative'
] as const

export default function AISequenceGenerator({ contact, onSequenceGenerated, onClose }: AISequenceGeneratorProps) {
  const [formData, setFormData] = useState({
    productDescription: '',
    targetAudience: contact ? `${contact.name} at ${contact.company}` : '',
    tone: 'Professional' as typeof TONE_OPTIONS[number]
  })
  const [generatedSequence, setGeneratedSequence] = useState<GeneratedSequence | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState<{ [key: string]: boolean }>({})

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const generateSequence = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setGeneratedSequence(null)

    if (!formData.productDescription || !formData.targetAudience) {
      setError('Please fill in all required fields')
      return
    }

    setLoading(true)

    try {
      // Check if OpenAI API key is available
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY
      if (!apiKey || apiKey.trim() === '') {
        setError('OpenAI API key is not configured. Please add VITE_OPENAI_API_KEY to your .env file.')
        setLoading(false)
        return
      }

      // Get brand voice
      const brandVoice = await getBrandVoice()
      const brandVoicePrompt = formatBrandVoiceForPrompt(brandVoice)

      const contactInfo = contact ? `\nContact Details:\n- Name: ${contact.name}\n- Company: ${contact.company}\n- Email: ${contact.email}` : ''
      
      const prompt = `Generate a 3-step outreach sequence for the following:

Product/Service: ${formData.productDescription}
Target Audience: ${formData.targetAudience}
Tone: ${formData.tone}${contactInfo}

Please generate:
1. Initial message (introduction and value proposition)
2. Follow-up message (builds on initial contact, adds more value)
3. Reminder message (final attempt, creates urgency)

Requirements:
- Each message should be 2-3 sentences
- Professional but engaging
- Include clear call-to-action
- Build relationship progressively
- Match the specified tone: ${formData.tone}
- Personalize messages using the contact's name and company when available${brandVoicePrompt}

Format your response as JSON with these exact keys:
{
  "initial_message": "message text here",
  "follow_up_message": "message text here", 
  "reminder_message": "message text here"
}`

      console.log('Generating sequence with prompt:', prompt)
      const response = await generateText(prompt, 'gpt-4o-mini')
      console.log('Generated response:', response)

      try {
        const parsedSequence = JSON.parse(response)
        if (parsedSequence.initial_message && parsedSequence.follow_up_message && parsedSequence.reminder_message) {
          setGeneratedSequence(parsedSequence)
        } else {
          setError('Invalid response format from AI. Please try again.')
        }
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError)
        setError('Failed to parse AI response. Please try again.')
      }
    } catch (err) {
      console.error('Error generating sequence:', err)
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(`Failed to generate sequence: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const saveSequence = async () => {
    if (!generatedSequence) return

    setSaving(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('User not authenticated')
        setSaving(false)
        return
      }

      const { error } = await supabase
        .from('outreach_sequences')
        .insert([{
          user_id: user.id,
          contact_id: contact?.id || null,
          product_description: formData.productDescription,
          target_audience: formData.targetAudience,
          tone: formData.tone,
          initial_message: generatedSequence.initial_message,
          follow_up_message: generatedSequence.follow_up_message,
          reminder_message: generatedSequence.reminder_message
        }])

      if (error) {
        console.error('Error saving sequence:', error)
        setError('Failed to save sequence')
      } else {
        if (onSequenceGenerated) {
          onSequenceGenerated({
            product_description: formData.productDescription,
            target_audience: formData.targetAudience,
            tone: formData.tone,
            ...generatedSequence
          })
        }
        setError('')
      }
    } catch (err) {
      console.error('Error:', err)
      setError('Failed to save sequence')
    } finally {
      setSaving(false)
    }
  }

  const handleCopy = async (text: string, messageType: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(prev => ({ ...prev, [messageType]: true }))
      setTimeout(() => {
        setCopied(prev => ({ ...prev, [messageType]: false }))
      }, 2000)
    } catch (err) {
      console.error('Failed to copy text:', err)
    }
  }

  const resetForm = () => {
    setFormData({
      productDescription: '',
      targetAudience: contact ? `${contact.name} at ${contact.company}` : '',
      tone: 'Professional'
    })
    setGeneratedSequence(null)
    setError('')
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              AI Outreach Sequence Generator
              {contact && (
                <span className="text-sm text-gray-500 ml-2">
                  for {contact.name} at {contact.company}
                </span>
              )}
            </h3>
            <p className="text-sm text-gray-600">
              Generate personalized 3-step outreach sequences for your products
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <form onSubmit={generateSequence} className="space-y-4">
        <div>
          <label htmlFor="productDescription" className="block text-sm font-medium text-gray-700">
            Product/Service Description *
          </label>
          <textarea
            id="productDescription"
            name="productDescription"
            required
            rows={3}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            value={formData.productDescription}
            onChange={handleInputChange}
            placeholder="Describe your product or service..."
          />
        </div>

        <div>
          <label htmlFor="targetAudience" className="block text-sm font-medium text-gray-700">
            Target Audience *
          </label>
          <input
            type="text"
            id="targetAudience"
            name="targetAudience"
            required
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            value={formData.targetAudience}
            onChange={handleInputChange}
            placeholder="e.g., Small business owners, Marketing managers, etc."
          />
        </div>

        <div>
          <label htmlFor="tone" className="block text-sm font-medium text-gray-700">
            Tone
          </label>
          <select
            id="tone"
            name="tone"
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            value={formData.tone}
            onChange={handleInputChange}
          >
            {TONE_OPTIONS.map(tone => (
              <option key={tone} value={tone}>{tone}</option>
            ))}
          </select>
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
              'Generate Sequence'
            )}
          </button>

          {generatedSequence && (
            <button
              type="button"
              onClick={resetForm}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {generatedSequence && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-md font-medium text-gray-900">Generated Outreach Sequence</h4>
            <button
              onClick={saveSequence}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 flex items-center"
            >
              {saving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Sequence'
              )}
            </button>
          </div>

          <div className="space-y-6">
            {/* Initial Message */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-sm font-medium text-gray-900">1. Initial Message</h5>
                <button
                  onClick={() => handleCopy(generatedSequence.initial_message, 'initial')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium flex items-center"
                >
                  {copied.initial ? (
                    <>
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                  {generatedSequence.initial_message}
                </p>
              </div>
            </div>

            {/* Follow-up Message */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-sm font-medium text-gray-900">2. Follow-up Message</h5>
                <button
                  onClick={() => handleCopy(generatedSequence.follow_up_message, 'followup')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium flex items-center"
                >
                  {copied.followup ? (
                    <>
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                  {generatedSequence.follow_up_message}
                </p>
              </div>
            </div>

            {/* Reminder Message */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-sm font-medium text-gray-900">3. Reminder Message</h5>
                <button
                  onClick={() => handleCopy(generatedSequence.reminder_message, 'reminder')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium flex items-center"
                >
                  {copied.reminder ? (
                    <>
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                  {generatedSequence.reminder_message}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
