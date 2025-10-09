import { useState, useEffect } from 'react'
import { generateText, checkOllamaStatus, DEFAULT_MODEL } from '../lib/ollamaClient'
import { supabase } from '../lib/supabaseClient'

export interface GrowthAction {
  id: string
  title: string
  description: string
  completed: boolean
}

interface UserData {
  totalLeads: number
  totalContacts: number
  totalSequences: number
  weeklyRevenue: number
  conversionRate: number
  recentActivity: number
}

interface DailyGrowthPlanProps {
  onActionsGenerated?: (actions: GrowthAction[]) => void
}

export default function DailyGrowthPlan({ onActionsGenerated }: DailyGrowthPlanProps) {
  const [userData, setUserData] = useState<UserData>({
    totalLeads: 0,
    totalContacts: 0,
    totalSequences: 0,
    weeklyRevenue: 0,
    conversionRate: 0,
    recentActivity: 0
  })
  const [actions, setActions] = useState<GrowthAction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dataLoading, setDataLoading] = useState(true)
  const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking')
  const [selectedModel] = useState(DEFAULT_MODEL)

  // Helper function to repair common JSON issues
  const repairJSON = (jsonString: string): string => {
    try {
      JSON.parse(jsonString)
      return jsonString
    } catch (error) {
      console.log('Attempting to repair JSON...')
      
      let repaired = jsonString.trim()
      
      // Remove markdown code blocks
      repaired = repaired.replace(/```json\s*/g, '').replace(/```\s*/g, '')
      
      // Find JSON object in the response
      const jsonMatch = repaired.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        repaired = jsonMatch[0]
      }
      
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
          const openBraces = (repaired.match(/\{/g) || []).length
          const closeBraces = (repaired.match(/\}/g) || []).length
          const missingBraces = openBraces - closeBraces
          repaired += '}'.repeat(missingBraces)
        }
      }
      
      // Remove trailing commas
      repaired = repaired.replace(/,(\s*[}\]])/g, '$1')
      
      console.log('Repaired JSON:', repaired)
      return repaired
    }
  }

  // Helper function to extract actions from text when JSON parsing fails
  const extractActionsFromText = (text: string): GrowthAction[] => {
    try {
      const actions: GrowthAction[] = []
      
      // Try to find numbered list patterns
      const numberedPattern = /(\d+\.?\s*.+?)(?=\n\s*\d+\.|$)/gs
      const numberedMatches = text.match(numberedPattern)
      
      if (numberedMatches && numberedMatches.length >= 3) {
        numberedMatches.forEach((match, index) => {
          const cleanMatch = match.replace(/^\d+\.?\s*/, '').trim()
          const lines = cleanMatch.split('\n')
          const title = lines[0] || `Action ${index + 1}`
          const description = lines.slice(1).join(' ').trim() || 'No description provided'
          
          actions.push({
            id: `action-${Date.now()}-${index}`,
            title: title,
            description: description,
            completed: false
          })
        })
        
        if (actions.length >= 3) {
          return actions
        }
      }
      
      // Try to find bullet point patterns
      const bulletPattern = /[-*•]\s*(.+?)(?=\n\s*[-*•]|$)/gs
      const bulletMatches = text.match(bulletPattern)
      
      if (bulletMatches && bulletMatches.length >= 3) {
        bulletMatches.forEach((match, index) => {
          const cleanMatch = match.replace(/^[-*•]\s*/, '').trim()
          const lines = cleanMatch.split('\n')
          const title = lines[0] || `Action ${index + 1}`
          const description = lines.slice(1).join(' ').trim() || 'No description provided'
          
          actions.push({
            id: `action-${Date.now()}-${index}`,
            title: title,
            description: description,
            completed: false
          })
        })
        
        if (actions.length >= 3) {
          return actions
        }
      }
      
      return []
    } catch (error) {
      console.error('Error in manual extraction:', error)
      return []
    }
  }

  // Check Ollama status and load available models
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const isRunning = await checkOllamaStatus()
        if (isRunning) {
          setOllamaStatus('connected')
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

  // Fetch user data for AI analysis
  const fetchUserData = async () => {
    try {
      setDataLoading(true)
      
      // Fetch leads count
      const { count: leadsCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })

      // Fetch contacts count
      const { count: contactsCount } = await supabase
        .from('crm_contacts')
        .select('*', { count: 'exact', head: true })

      // Fetch sequences count
      const { count: sequencesCount } = await supabase
        .from('outreach_sequences')
        .select('*', { count: 'exact', head: true })

      // Fetch weekly revenue
      const weekStart = getWeekStartDate()
      const { data: roiData } = await supabase
        .from('roi_metrics')
        .select('revenue')
        .eq('week_start_date', weekStart)
        .single()

      // Fetch recent activity (last 7 days)
      const { count: recentActivity } = await supabase
        .from('outreach_sequences')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

      const weeklyRevenue = roiData?.revenue || 0
      const conversionRate = leadsCount && leadsCount > 0 ? (weeklyRevenue / leadsCount) * 100 : 0

      setUserData({
        totalLeads: leadsCount || 0,
        totalContacts: contactsCount || 0,
        totalSequences: sequencesCount || 0,
        weeklyRevenue: weeklyRevenue,
        conversionRate: conversionRate,
        recentActivity: recentActivity || 0
      })
    } catch (error) {
      console.error('Error fetching user data:', error)
    } finally {
      setDataLoading(false)
    }
  }

  // Get the start of the current week (Monday)
  const getWeekStartDate = () => {
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(today.setDate(diff))
    return monday.toISOString().split('T')[0]
  }

  // Generate AI-powered growth actions
  const generateGrowthActions = async () => {
    setLoading(true)
    setError('')

    try {
      // Check if Ollama is running
      if (ollamaStatus !== 'connected') {
        setError('Ollama is not running. Please start Ollama and ensure it\'s accessible at http://localhost:11434')
        setLoading(false)
        return
      }

      const prompt = `Based on this user's CRM and sales data, generate 3 simple, actionable growth actions for today.

User Data:
- Total Leads: ${userData.totalLeads}
- Total Contacts: ${userData.totalContacts}
- Outreach Sequences Created: ${userData.totalSequences}
- Weekly Revenue: $${userData.weeklyRevenue.toFixed(2)}
- Conversion Rate: ${userData.conversionRate.toFixed(1)}%
- Recent Activity (last 7 days): ${userData.recentActivity} actions

Please generate 3 specific, actionable tasks that will help this user grow their business today. Focus on:
1. Lead generation and prospecting
2. Outreach and follow-up activities
3. Revenue optimization

Each action should be:
- Specific and actionable
- Realistic for one day
- Based on their current data patterns
- Focused on immediate impact

IMPORTANT: Respond ONLY with valid JSON in this exact format:
{
  "actions": [
    {
      "title": "Action title here",
      "description": "Detailed description of what to do"
    },
    {
      "title": "Action title here", 
      "description": "Detailed description of what to do"
    },
    {
      "title": "Action title here",
      "description": "Detailed description of what to do"
    }
  ]
}

Do not include any other text, explanations, or formatting outside the JSON.`

      console.log('Generating growth actions with Ollama model:', selectedModel)
      console.log('Prompt:', prompt)
      const response = await generateText(prompt, selectedModel)
      console.log('Generated response:', response)

      try {
        let cleanedResponse = response.trim()
        
        // Remove markdown code blocks
        cleanedResponse = cleanedResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '')
        
        // Find JSON object in the response
        const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          cleanedResponse = jsonMatch[0]
        }
        
        console.log('Cleaned response for parsing:', cleanedResponse)
        
        try {
          const repairedJSON = repairJSON(cleanedResponse)
          const parsedResponse = JSON.parse(repairedJSON)
          
          if (parsedResponse.actions && Array.isArray(parsedResponse.actions)) {
            const newActions = parsedResponse.actions.map((action: any, index: number) => ({
              id: `action-${Date.now()}-${index}`,
              title: action.title || `Action ${index + 1}`,
              description: action.description || 'No description provided',
              completed: false
            }))
            
            setActions(newActions)
            
            if (onActionsGenerated) {
              onActionsGenerated(newActions)
            }
          } else {
            console.log('Invalid JSON structure, attempting manual extraction...')
            const manualActions = extractActionsFromText(response)
            if (manualActions.length >= 3) {
              setActions(manualActions)
              if (onActionsGenerated) {
                onActionsGenerated(manualActions)
              }
            } else {
              setError('Invalid response format from AI. Please try again.')
            }
          }
        } catch (repairError) {
          console.error('Error repairing JSON:', repairError)
          console.log('Attempting manual extraction...')
          const manualActions = extractActionsFromText(response)
          if (manualActions.length >= 3) {
            setActions(manualActions)
            if (onActionsGenerated) {
              onActionsGenerated(manualActions)
            }
          } else {
            setError(`Failed to parse AI response. The AI might not have generated a proper format. Response preview: ${response.substring(0, 200)}...`)
          }
        }
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError)
        console.log('Attempting manual extraction as fallback...')
        const manualActions = extractActionsFromText(response)
        if (manualActions.length >= 3) {
          setActions(manualActions)
          if (onActionsGenerated) {
            onActionsGenerated(manualActions)
          }
        } else {
          setError(`Failed to parse AI response. The AI might not have generated a proper format. Response preview: ${response.substring(0, 200)}...`)
        }
      }
    } catch (err) {
      console.error('Error generating growth actions:', err)
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(`Failed to generate actions: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  // Toggle action completion
  const toggleAction = (id: string) => {
    setActions(prev => prev.map(action => 
      action.id === id ? { ...action, completed: !action.completed } : action
    ))
  }

  // Clear all actions
  const clearActions = () => {
    setActions([])
    setError('')
  }

  // Load user data on component mount
  useEffect(() => {
    fetchUserData()
  }, [])

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">AI Daily Growth Plan</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Get personalized action items based on your current data and performance
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
        </div>
      </div>

      {/* User Data Summary */}
      {!dataLoading && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Your Current Stats</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Leads:</span>
              <span className="font-medium text-gray-900 dark:text-white">{userData.totalLeads}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Contacts:</span>
              <span className="font-medium text-gray-900 dark:text-white">{userData.totalContacts}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Sequences:</span>
              <span className="font-medium text-gray-900 dark:text-white">{userData.totalSequences}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Revenue:</span>
              <span className="font-medium text-green-600 dark:text-green-400">${userData.weeklyRevenue.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Conversion:</span>
              <span className="font-medium text-blue-600 dark:text-blue-400">{userData.conversionRate.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Recent Activity:</span>
              <span className="font-medium text-gray-900 dark:text-white">{userData.recentActivity}</span>
            </div>
          </div>
        </div>
      )}

      {/* Generate Actions Button */}
      <div className="mb-6">
        <button
          onClick={generateGrowthActions}
          disabled={loading || dataLoading || ollamaStatus !== 'connected'}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center dark:bg-indigo-500 dark:hover:bg-indigo-600"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating Actions...
            </>
          ) : (
            'Generate Today\'s Growth Actions'
          )}
        </button>
        
        {ollamaStatus !== 'connected' && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400 text-center">
            Ollama is not running. Please start Ollama to generate growth actions.
          </p>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Actions List */}
      {actions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-md font-medium text-gray-900 dark:text-white">Today's Action Items</h4>
            <button
              onClick={clearActions}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Clear All
            </button>
          </div>
          
          <div className="space-y-3">
            {actions.map((action) => (
              <div
                key={action.id}
                className={`p-4 border rounded-lg transition-all duration-200 ${
                  action.completed
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <div className="flex items-start">
                  <button
                    onClick={() => toggleAction(action.id)}
                    className={`mt-1 mr-3 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      action.completed
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                  >
                    {action.completed && (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <h5 className={`text-sm font-medium ${
                      action.completed ? 'text-green-800 dark:text-green-300 line-through' : 'text-gray-900 dark:text-white'
                    }`}>
                      {action.title}
                    </h5>
                    <p className={`mt-1 text-sm ${
                      action.completed ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {action.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Progress Summary */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                Progress: {actions.filter(a => a.completed).length} of {actions.length} completed
              </span>
              <div className="w-24 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${(actions.filter(a => a.completed).length / actions.length) * 100}%`
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {actions.length === 0 && !loading && !error && (
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No actions yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Generate personalized growth actions based on your data
          </p>
        </div>
      )}
    </div>
  )
}
