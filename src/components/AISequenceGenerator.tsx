import { useState, useEffect } from 'react'
import { generateText, checkOllamaStatus, getAvailableModels, DEFAULT_MODEL } from '../lib/ollamaClient'
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

// Helper function to repair common JSON issues
const repairJSON = (jsonString: string): string => {
  try {
    // Try to parse as-is first
    JSON.parse(jsonString)
    return jsonString
  } catch (error) {
    console.log('Attempting to repair JSON...')
    
    let repaired = jsonString.trim()
    
    // Ensure it starts and ends with braces
    if (!repaired.startsWith('{')) {
      const startIndex = repaired.indexOf('{')
      if (startIndex > 0) {
        repaired = repaired.substring(startIndex)
      }
    }
    
    if (!repaired.endsWith('}')) {
      const lastIndex = repaired.lastIndexOf('}')
      if (lastIndex > 0) {
        repaired = repaired.substring(0, lastIndex + 1)
      } else {
        // Count braces and add missing closing braces
        const openBraces = (repaired.match(/\{/g) || []).length
        const closeBraces = (repaired.match(/\}/g) || []).length
        const missingBraces = openBraces - closeBraces
        repaired += '}'.repeat(missingBraces)
      }
    }
    
    // Try to fix common issues
    repaired = repaired.replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
    repaired = repaired.replace(/([^\\])\\([^\\"])/g, '$1\\\\$2') // Fix escaped quotes
    
    console.log('Repaired JSON:', repaired)
    return repaired
  }
}

// Helper function to extract messages from text when JSON parsing fails
const extractMessagesFromText = (text: string): GeneratedSequence | null => {
  try {
    // Look for patterns like "1. Initial message:" or "Initial message:" or "Message 1:"
    const patterns = [
      /(?:1\.?\s*)?(?:initial\s+message|message\s+1)[:\-]?\s*(.+?)(?=\n\s*(?:2\.?\s*)?(?:follow.?up|message\s+2)|$)/is,
      /(?:2\.?\s*)?(?:follow.?up\s+message|message\s+2)[:\-]?\s*(.+?)(?=\n\s*(?:3\.?\s*)?(?:reminder|message\s+3)|$)/is,
      /(?:3\.?\s*)?(?:reminder\s+message|message\s+3)[:\-]?\s*(.+?)(?=\n|$)/is
    ]
    
    const matches = patterns.map(pattern => {
      const match = text.match(pattern)
      return match ? match[1].trim() : null
    })
    
    // If we found all three messages
    if (matches[0] && matches[1] && matches[2]) {
      return {
        initial_message: matches[0],
        follow_up_message: matches[1],
        reminder_message: matches[2]
      }
    }
    
    // Try alternative patterns - look for numbered lists
    const numberedPattern = /(\d+\.?\s*.+?)(?=\n\s*\d+\.|$)/gs
    const numberedMatches = text.match(numberedPattern)
    
    if (numberedMatches && numberedMatches.length >= 3) {
      return {
        initial_message: numberedMatches[0].replace(/^\d+\.?\s*/, '').trim(),
        follow_up_message: numberedMatches[1].replace(/^\d+\.?\s*/, '').trim(),
        reminder_message: numberedMatches[2].replace(/^\d+\.?\s*/, '').trim()
      }
    }
    
    // Try to split by common separators
    const separators = ['\n\n', '\n---\n', '\n***\n', '\n---', '\n***']
    for (const separator of separators) {
      const parts = text.split(separator)
      if (parts.length >= 3) {
        return {
          initial_message: parts[0].trim(),
          follow_up_message: parts[1].trim(),
          reminder_message: parts[2].trim()
        }
      }
    }
    
    return null
  } catch (error) {
    console.error('Error in manual extraction:', error)
    return null
  }
}

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
  const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking')
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL)

  // Check Ollama status and load available models
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const isRunning = await checkOllamaStatus()
        if (isRunning) {
          setOllamaStatus('connected')
          const models = await getAvailableModels()
          setAvailableModels(models)
          if (models.length > 0 && !models.includes(selectedModel)) {
            setSelectedModel(models[0])
          }
        } else {
          setOllamaStatus('disconnected')
        }
      } catch (error) {
        console.error('Error checking Ollama status:', error)
        setOllamaStatus('disconnected')
      }
    }

    checkStatus()
  }, [selectedModel])

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
      // Check if Ollama is running
      if (ollamaStatus !== 'connected') {
        setError('Ollama is not running. Please start Ollama and ensure it\'s accessible at http://localhost:11434')
        setLoading(false)
        return
      }

      // Get brand voice
      const brandVoice = await getBrandVoice()
      const brandVoicePrompt = formatBrandVoiceForPrompt(brandVoice)

      const contactInfo = contact ? `\nContact Details:\n- Name: ${contact.name}\n- Company: ${contact.company}\n- Email: ${contact.email}` : ''
      
      const prompt = `You are a professional sales outreach expert. Generate a 3-step outreach sequence.

Product/Service: ${formData.productDescription}
Target Audience: ${formData.targetAudience}
Tone: ${formData.tone}${contactInfo}

Create three messages:
1. Initial message - Introduction and value proposition
2. Follow-up message - Builds on initial contact, adds more value  
3. Reminder message - Final attempt, creates urgency

Requirements:
- Each message should be 2-3 sentences
- Professional but engaging tone: ${formData.tone}
- Include clear call-to-action
- Build relationship progressively
- Personalize using contact details when available${brandVoicePrompt}

IMPORTANT: Respond ONLY with valid JSON in this exact format:
{
  "initial_message": "Your first message here",
  "follow_up_message": "Your follow-up message here",
  "reminder_message": "Your reminder message here"
}

Do not include any other text, explanations, or formatting outside the JSON.`

      console.log('Generating sequence with Ollama model:', selectedModel)
      console.log('Prompt:', prompt)
      const response = await generateText(prompt, selectedModel)
      console.log('Generated response:', response)

      try {
        // Clean and extract JSON from the response
        let cleanedResponse = response.trim()
        
        // Remove any markdown code blocks
        cleanedResponse = cleanedResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '')
        
        // Try to find JSON in the response if it's wrapped in other text
        const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          cleanedResponse = jsonMatch[0]
        }
        
        // If the JSON seems incomplete (missing closing brace), try to complete it
        if (cleanedResponse.startsWith('{') && !cleanedResponse.endsWith('}')) {
          // Count opening and closing braces to see if we need to add closing braces
          const openBraces = (cleanedResponse.match(/\{/g) || []).length
          const closeBraces = (cleanedResponse.match(/\}/g) || []).length
          const missingBraces = openBraces - closeBraces
          
          if (missingBraces > 0) {
            cleanedResponse += '}'.repeat(missingBraces)
            console.log('Added missing closing braces:', missingBraces)
          }
        }
        
        // Additional cleaning for common issues
        cleanedResponse = cleanedResponse.replace(/\n\s*\n/g, '\n') // Remove extra newlines
        
        // Don't normalize whitespace in JSON strings - this can break the JSON
        // cleanedResponse = cleanedResponse.replace(/\s+/g, ' ') // This was breaking JSON strings
        
        console.log('Cleaned response for parsing:', cleanedResponse)
        console.log('Response length:', cleanedResponse.length)
        console.log('First 100 chars:', cleanedResponse.substring(0, 100))
        console.log('Last 100 chars:', cleanedResponse.substring(Math.max(0, cleanedResponse.length - 100)))
        
        // Try to repair the JSON before parsing
        const repairedJSON = repairJSON(cleanedResponse)
        const parsedSequence = JSON.parse(repairedJSON)
        
        // Validate the parsed response
        if (parsedSequence.initial_message && parsedSequence.follow_up_message && parsedSequence.reminder_message) {
          setGeneratedSequence(parsedSequence)
        } else {
          // If JSON parsing worked but structure is wrong, try to extract messages manually
          console.log('Invalid JSON structure, attempting manual extraction...')
          const manualSequence = extractMessagesFromText(response)
          if (manualSequence) {
            setGeneratedSequence(manualSequence)
          } else {
            setError('Invalid response format from AI. Please try again.')
          }
        }
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError)
        console.log('Raw response:', response)
        
        // Try manual extraction as fallback
        console.log('Attempting manual extraction...')
        const manualSequence = extractMessagesFromText(response)
        if (manualSequence) {
          setGeneratedSequence(manualSequence)
        } else {
          // Try one more time with a more aggressive JSON extraction
          console.log('Attempting aggressive JSON extraction...')
          const aggressiveMatch = response.match(/\{[^{}]*"initial_message"[^{}]*"follow_up_message"[^{}]*"reminder_message"[^{}]*\}/)
          if (aggressiveMatch) {
            try {
              const aggressiveJSON = repairJSON(aggressiveMatch[0])
              const aggressiveSequence = JSON.parse(aggressiveJSON)
              if (aggressiveSequence.initial_message && aggressiveSequence.follow_up_message && aggressiveSequence.reminder_message) {
                setGeneratedSequence(aggressiveSequence)
              } else {
                setError(`Failed to parse AI response. The AI might not have generated a proper sequence format. Response preview: ${response.substring(0, 200)}...`)
              }
            } catch (aggressiveError) {
              setError(`Failed to parse AI response. The AI might not have generated a proper sequence format. Response preview: ${response.substring(0, 200)}...`)
            }
          } else {
            setError(`Failed to parse AI response. The AI might not have generated a proper sequence format. Response preview: ${response.substring(0, 200)}...`)
          }
        }
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
                {availableModels.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={generateSequence} className="space-y-4">
        <div>
          <label htmlFor="productDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
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
