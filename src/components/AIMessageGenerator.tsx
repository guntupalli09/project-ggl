import { useState } from 'react'
import { generateText } from '../lib/openaiClient'
import { getBrandVoice, formatBrandVoiceForPrompt } from '../lib/brandVoice'

interface AIMessageGeneratorProps {
  leadName?: string
  leadCompany?: string
  onMessageGenerated?: (message: string) => void
}

export default function AIMessageGenerator({ 
  leadName = '', 
  leadCompany = '', 
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
- Avoid being too salesy${brandVoicePrompt}

Generate the email content only (no subject line needed):`

      console.log('Generating message with prompt:', prompt)
      const response = await generateText(prompt, 'gpt-4o-mini')
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
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">AI Message Generator</h3>
        <p className="text-sm text-gray-600">
          Generate personalized outreach emails using AI for your leads
        </p>
      </div>

      <form onSubmit={handleGenerate} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="leadName" className="block text-sm font-medium text-gray-700">
              Lead Name *
            </label>
            <input
              type="text"
              id="leadName"
              name="leadName"
              required
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={formData.leadName}
              onChange={handleInputChange}
              placeholder="e.g., John Smith"
            />
          </div>
          <div>
            <label htmlFor="leadCompany" className="block text-sm font-medium text-gray-700">
              Lead Company *
            </label>
            <input
              type="text"
              id="leadCompany"
              name="leadCompany"
              required
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={formData.leadCompany}
              onChange={handleInputChange}
              placeholder="e.g., Acme Corp"
            />
          </div>
        </div>

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
            <h4 className="text-md font-medium text-gray-900">Generated Message</h4>
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
          <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
            <div className="whitespace-pre-wrap text-sm text-gray-800">
              {generatedMessage}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
