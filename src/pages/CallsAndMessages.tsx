import { useState, useEffect } from 'react'
import { useCleanup } from '../lib/apiUtils'
import { supabase } from '../lib/supabaseClient'
import { googleCalendarAuth } from '../lib/googleCalendarAuth'
import { isGuestUser } from '../lib/authUtils'
import GuestModeWarning from '../components/GuestModeWarning'
import { 
  ChatBubbleLeftRightIcon, 
  PaperAirplaneIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PhoneIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

interface Conversation {
  conversationId: string
  participantId: string
  lastMessageTime: string
  lastMessage?: string
  unreadCount?: number
}

interface Message {
  id: string
  text: string
  sender: 'customer' | 'business'
  timestamp: string
}

interface CallLog {
  id: string
  phone: string
  caller_name?: string
  call_type: 'missed' | 'answered' | 'ai_followup_sent'
  call_time: string
  duration_seconds?: number
  ai_followup_sent: boolean
  lead_id?: string
}

export default function CallsAndMessages() {
  const cleanup = useCleanup()
  const [isConnected, setIsConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [callLogs, setCallLogs] = useState<CallLog[]>([])
  const [callLogsLoading, setCallLogsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'calls' | 'messages'>('calls')

  useEffect(() => {
    if (!isGuestUser()) {
      checkConnectionStatus()
      
      // Check if we're coming from a Google Calendar OAuth callback
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      const state = urlParams.get('state')
      
      if (code && state) {
        // We're coming from Google Calendar OAuth callback
        handleGoogleCallback(code, state)
      }
    } else {
      setLoading(false)
    }
  }, [])

  const handleGoogleCallback = async (code: string, state: string) => {
    try {
      const result = await googleCalendarAuth.handleCallback(code, state)
      if (result.success) {
        setIsConnected(true)
        setSuccessMessage('Successfully connected to Google! You can now manage messages.')
        // Clear the URL parameters
        window.history.replaceState({}, document.title, window.location.pathname)
        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(''), 5000)
        // Fetch conversations after successful connection
        fetchConversations()
      } else {
        setError(`Connection failed: ${result.error}`)
        // Clear the URL parameters
        window.history.replaceState({}, document.title, window.location.pathname)
      }
    } catch (error) {
      console.error('Error handling Google callback:', error)
      setError('Failed to complete Google connection')
      // Clear the URL parameters
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }

  useEffect(() => {
    if (!isGuestUser() && isConnected) {
      fetchConversations()
      fetchCallLogs()
    }
  }, [isConnected])

  useEffect(() => {
    if (!isGuestUser() && selectedConversation) {
      fetchMessages(selectedConversation)
    }
  }, [selectedConversation])

  // Auto-refresh every 30 seconds for call logs, 10 seconds for messages
  useEffect(() => {
    if (!isGuestUser() && isConnected) {
      const callLogsInterval = cleanup.setInterval(() => {
        fetchCallLogs()
      }, 30000) // Check for new calls every 30 seconds

      const messagesInterval = cleanup.setInterval(() => {
        fetchConversations()
        if (selectedConversation) {
          fetchMessages(selectedConversation)
        }
      }, 10000) // Refresh messages every 10 seconds

      return () => {
        cleanup.clearInterval(callLogsInterval)
        cleanup.clearInterval(messagesInterval)
      }
    }
  }, [isConnected, selectedConversation, cleanup])

  const checkConnectionStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Check if Google Business Profile is connected
      const { data: settings, error: settingsError } = await supabase
        .from('user_settings')
        .select('google_access_token, google_token_expiry, google_calendar_email, google_business_location_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (settingsError) {
        console.error('Error fetching user settings:', settingsError)
        setIsConnected(false)
        setError('Failed to load user settings. Please try refreshing the page.')
        return
      }

      // If no settings exist, user needs to connect
      if (!settings) {
        console.log('No user settings found, user needs to connect Google Business Profile')
        setIsConnected(false)
        setError('No Google Business Profile connection found. Please connect your Google Business Profile to access calls and messages.')
        return
      }

      if (settings?.google_access_token && settings?.google_business_location_id) {
        // Check if token is still valid
        const now = new Date()
        const expiry = new Date(settings.google_token_expiry)
        const isValid = now < expiry
        
        if (isValid) {
          // Test if the token has the required scopes by trying to fetch conversations
          try {
            await fetchConversations()
            setIsConnected(true)
          } catch (error) {
            // If we get a scope error, the user needs to re-authenticate
            console.log('Token lacks required scopes, user needs to re-authenticate')
            setIsConnected(false)
            setError('Please reconnect to Google to access Messages. New permissions are required for Google My Business API.')
          }
        } else {
          setIsConnected(false)
          setError('Google Business Profile connection expired. Please reconnect.')
        }
      } else {
        console.log('No Google Business Profile connection found')
        setIsConnected(false)
        setError('No Google Business Profile connection found. Please connect your Google Business Profile to access calls and messages.')
      }
    } catch (error) {
      console.error('Error checking connection status:', error)
      setIsConnected(false)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async () => {
    try {
      await googleCalendarAuth.initiateAuth()
    } catch (error) {
      console.error('Error initiating Google OAuth:', error)
      setError('Failed to connect to Google. Please try again.')
    }
  }

  const fetchCallLogs = async () => {
    if (isGuestUser()) return
    
    try {
      setCallLogsLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // First try to fetch from Google Business Profile API
      try {
        const response = await fetch(`http://localhost:3001/api/consolidated?action=google-business-calls&user_id=${user.id}`)
        if (response.ok) {
          const data = await response.json()
          setCallLogs(data.callLogs || [])
          
          // Show warning if using mock data
          if (data.isMockData) {
            console.warn('Using mock data for call logs:', data.mockDataReason)
            // You could show a toast notification here
          }
          return
        }
      } catch (apiError) {
        console.log('Google API not available, falling back to database')
      }

      // Fallback to direct database query
      const { data, error } = await supabase
        .from('call_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('call_time', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Error fetching call logs:', error)
        setError('Failed to fetch call logs')
      } else {
        setCallLogs(data || [])
      }
    } catch (error) {
      console.error('Error fetching call logs:', error)
      setError('Network error while fetching call logs')
    } finally {
      setCallLogsLoading(false)
    }
  }

  const fetchConversations = async () => {
    if (isGuestUser()) return
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get Google Calendar access token
      const { data: settings } = await supabase
        .from('user_settings')
        .select('google_access_token')
        .eq('user_id', user.id)
        .single()

      if (!settings?.google_access_token) {
        setError('No Google access token found. Please reconnect.')
        return
      }

      const response = await fetch('http://localhost:3001/api/google/messages/list', {
        headers: {
          'Authorization': `Bearer ${settings.google_access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setConversations(data.conversations || [])
        
        // Check if no business account exists
        if (data.conversations && data.conversations.length === 0 && data.message && 
            data.message.includes('No Google Business account found')) {
          setError('No Google Business account found for this email address. Please ensure your Google account has a verified Business Profile.')
        } else if (data.message) {
          setError(data.message)
        }
      } else {
        const errorData = await response.json()
        
        // Check if it's a scope error
        if (response.status === 400 && errorData.details?.includes('insufficient authentication scopes')) {
          setError('Please reconnect to Google. New permissions are required for Messages.')
          setIsConnected(false)
        } else {
          setError(errorData.error || 'Failed to fetch conversations')
        }
        
        console.error('API Error:', errorData)
        throw new Error(errorData.error || 'Failed to fetch conversations')
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
      setError('Network error while fetching conversations')
    }
  }

  const fetchMessages = async (conversationId: string) => {
    if (isGuestUser()) return
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get Google Calendar access token
      const { data: settings } = await supabase
        .from('user_settings')
        .select('google_access_token')
        .eq('user_id', user.id)
        .single()

      if (!settings?.google_access_token) {
        setError('No Google access token found. Please reconnect.')
        return
      }

      // Fetch real messages from Google Business Messages API
      const response = await fetch(`http://localhost:3001/api/google/messages/thread/${conversationId}`, {
        headers: {
          'Authorization': `Bearer ${settings.google_access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
      } else {
        const errorData = await response.json()
        console.error('Failed to fetch messages:', errorData)
        setError('Failed to load conversation messages')
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
      setError('Network error while fetching messages')
    }
  }

  const sendMessage = async () => {
    if (isGuestUser()) return
    
    if (!newMessage.trim() || !selectedConversation || sending) return

    setSending(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get Google Calendar access token
      const { data: settings } = await supabase
        .from('user_settings')
        .select('google_access_token')
        .eq('user_id', user.id)
        .single()

      if (!settings?.google_access_token) {
        setError('No Google access token found. Please reconnect.')
        return
      }

      const response = await fetch('http://localhost:3001/api/google/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.google_access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conversationId: selectedConversation,
          messageText: newMessage
        })
      })

      if (response.ok) {
        // Add message to local state
        const newMsg: Message = {
          id: `msg_${Date.now()}`,
          text: newMessage,
          sender: 'business',
          timestamp: new Date().toISOString()
        }
        setMessages(prev => [...prev, newMsg])
        setNewMessage('')
      } else {
        setError('Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setError('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const sendAIFollowup = async (callId: string) => {
    if (isGuestUser()) return
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const response = await fetch('http://localhost:3001/api/consolidated?action=google-missed-call-followup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          call_id: callId,
          user_id: user.id
        })
      })

      if (response.ok) {
        await response.json()
        setSuccessMessage('AI follow-up sent successfully!')
        // Refresh call logs to show updated status
        fetchCallLogs()
        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(''), 5000)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to send AI follow-up')
      }
    } catch (error) {
      console.error('Error sending AI follow-up:', error)
      setError('Failed to send AI follow-up')
    }
  }

  const handleDisconnect = async () => {
    if (isGuestUser()) return
    
    if (!window.confirm('Are you sure you want to disconnect Google Business Profile? This will stop call and message tracking.')) {
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('User not authenticated')
        return
      }

      console.log('Disconnecting Google Business Profile for user:', user.id)

      // First, check if user_settings exists
      const { data: existingSettings, error: fetchError } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching user settings:', fetchError)
        setError('Failed to fetch user settings')
        return
      }

      let result
      if (existingSettings) {
        // Update existing settings
        result = await supabase
          .from('user_settings')
          .update({
            google_business_location_id: null,
            google_access_token: null,
            google_refresh_token: null,
            google_token_expiry: null,
            google_business_connected: false,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
      } else {
        // Create new settings with null Google fields
        result = await supabase
          .from('user_settings')
          .insert({
            user_id: user.id,
            google_business_location_id: null,
            google_access_token: null,
            google_refresh_token: null,
            google_token_expiry: null,
            google_business_connected: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
      }

      if (result.error) {
        console.error('Error disconnecting Google Business Profile:', result.error)
        setError(`Failed to disconnect Google Business Profile: ${result.error.message}`)
        return
      }

      console.log('Google Business Profile disconnected successfully')
      setSuccessMessage('Google Business Profile disconnected successfully!')
      setIsConnected(false)
      setCallLogs([])
      setConversations([])
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Error disconnecting Google Business Profile:', error)
      setError(`Failed to disconnect Google Business Profile: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Guest Mode Warning */}
          {isGuestUser() && (
            <div className="mb-6">
              <GuestModeWarning 
                feature="Google Business Profile Integration"
                description="Google Business Profile integration is not available in guest mode. Sign in to connect your Google Business Profile and manage calls and messages."
                actionText="Sign in to connect your Google Business Profile"
              />
            </div>
          )}

          {!isGuestUser() && (
            <div className="flex items-center justify-center p-4">
              <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ChatBubbleLeftRightIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Connect Google Business Profile
                </h2>
                
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Link your Google Business Profile to manage customer messages directly from here.
                </p>
                
                {error && (
                  <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      {error}
                    </p>
                  </div>
                )}
                
                <button
                  onClick={handleConnect}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Connect Google Business
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Guest Mode Warning */}
        {isGuestUser() && (
          <div className="mb-6">
            <GuestModeWarning 
              feature="Google Business Profile Integration"
              description="Google Business Profile integration is not available in guest mode. Sign in to connect your Google Business Profile and manage calls and messages."
              actionText="Sign in to connect your Google Business Profile"
            />
          </div>
        )}

        {!isGuestUser() && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Calls & Messages
              </h1>
              <div className="flex items-center space-x-2">
                <div className="flex items-center text-green-600 dark:text-green-400">
                  <CheckCircleIcon className="w-5 h-5 mr-1" />
                  <span className="text-sm font-medium">Connected</span>
                </div>
                <button
                  onClick={() => {
                    fetchConversations()
                    fetchCallLogs()
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  title="Refresh"
                >
                  <ArrowPathIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={handleDisconnect}
                  className="p-2 text-red-400 hover:text-red-600 dark:hover:text-red-300"
                  title="Disconnect Google Business Profile"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Success Message */}
            {successMessage && (
              <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
                  <span className="text-sm text-green-800 dark:text-green-200">{successMessage}</span>
                </div>
              </div>
            )}

            {/* Tab Navigation */}
            <div className="mt-4 flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('calls')}
                className={`flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'calls'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <PhoneIcon className="w-4 h-4 mr-2" />
                Call Log ({callLogs.length})
              </button>
              <button
                onClick={() => setActiveTab('messages')}
                className={`flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'messages'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <ChatBubbleLeftRightIcon className="w-4 h-4 mr-2" />
                Messages ({conversations.length})
              </button>
            </div>
          </div>

          {/* Call Log Section */}
          {activeTab === 'calls' && (
            <div className="p-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Recent Calls
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Track missed calls and AI follow-up messages
                </p>
              </div>

              {callLogsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <ArrowPathIcon className="w-6 h-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-500">Loading call logs...</span>
                </div>
              ) : callLogs.length === 0 ? (
                <div className="text-center py-8">
                  <PhoneIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No calls yet
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Call logs will appear here when customers call your business
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {callLogs.map((call) => (
                    <div
                      key={call.id}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        call.call_type === 'missed'
                          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                          : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-full ${
                          call.call_type === 'missed'
                            ? 'bg-red-100 dark:bg-red-900/40'
                            : 'bg-green-100 dark:bg-green-900/40'
                        }`}>
                          {call.call_type === 'missed' ? (
                            <XMarkIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                          ) : (
                            <PhoneIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className={`font-medium ${
                              call.call_type === 'missed'
                                ? 'text-red-900 dark:text-red-100'
                                : 'text-gray-900 dark:text-white'
                            }`}>
                              {call.caller_name || 'Unknown Caller'}
                            </p>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              call.call_type === 'missed'
                                ? 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200'
                                : 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200'
                            }`}>
                              {call.call_type === 'missed' ? 'Missed' : 'Answered'}
                            </span>
                            {call.ai_followup_sent && (
                              <span className="text-xs px-2 py-1 rounded-full bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200">
                                AI Follow-up Sent
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {call.phone}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end space-y-2">
                        <div>
                          <p className="text-sm text-gray-900 dark:text-white">
                            {formatTime(call.call_time)}
                          </p>
                          {call.duration_seconds && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {Math.floor(call.duration_seconds / 60)}m {call.duration_seconds % 60}s
                            </p>
                          )}
                        </div>
                        {call.call_type === 'missed' && !call.ai_followup_sent && (
                          <button
                            onClick={() => sendAIFollowup(call.id)}
                            className="px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                          >
                            Send AI Follow-up
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Messages Section */}
          {activeTab === 'messages' && (
            <div className="flex h-96">
              {/* Conversations List */}
              <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                <div className="p-4">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    Conversations ({conversations.length})
                  </h3>
                  <div className="space-y-2">
                    {conversations.length === 0 ? (
                      <div className="text-center py-8">
                        <ChatBubbleLeftRightIcon className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                          {error && error.includes('No Google Business account found') 
                            ? 'No Google Business Account Found' 
                            : 'No conversations found'
                          }
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                          {error || 'No customer messages found for your business locations.'}
                        </p>
                        
                        {error && error.includes('No Google Business account found') ? (
                          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                            <h5 className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-2">
                              How to set up Google Business Profile:
                            </h5>
                            <ol className="text-xs text-blue-700 dark:text-blue-300 list-decimal list-inside space-y-1 text-left">
                              <li>Go to <a href="https://business.google.com" target="_blank" rel="noopener noreferrer" className="underline">business.google.com</a></li>
                              <li>Sign in with your Google account</li>
                              <li>Create or claim your business listing</li>
                              <li>Complete the verification process</li>
                              <li>Return here to manage messages</li>
                            </ol>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      conversations.map((conversation) => (
                        <button
                          key={conversation.conversationId}
                          onClick={() => setSelectedConversation(conversation.conversationId)}
                          className={`w-full text-left p-3 rounded-lg transition-colors ${
                            selectedConversation === conversation.conversationId
                              ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-medium truncate">
                              Customer {conversation.participantId.slice(-4)}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {formatTime(conversation.lastMessageTime)}
                            </div>
                          </div>
                          {conversation.lastMessage && (
                            <div className="text-sm text-gray-600 dark:text-gray-300 truncate mt-1">
                              {conversation.lastMessage}
                            </div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Chat View */}
              <div className="flex-1 flex flex-col">
                {selectedConversation ? (
                  <>
                    {/* Messages */}
                    <div className="flex-1 p-4 overflow-y-auto space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.sender === 'business' ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              message.sender === 'business'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white'
                            }`}
                          >
                            <p className="text-sm">{message.text}</p>
                            <p className="text-xs opacity-75 mt-1">
                              {formatTime(message.timestamp)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Message Input */}
                    <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                      {error && (
                        <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                          <div className="flex items-center">
                            <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
                            <span className="text-sm text-red-800 dark:text-red-200">{error}</span>
                          </div>
                        </div>
                      )}
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                          placeholder="Type your message..."
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          disabled={sending}
                        />
                        <button
                          onClick={sendMessage}
                          disabled={!newMessage.trim() || sending}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {sending ? (
                            <ArrowPathIcon className="w-5 h-5 animate-spin" />
                          ) : (
                            <PaperAirplaneIcon className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                    <div className="text-center">
                      <ChatBubbleLeftRightIcon className="w-12 h-12 mx-auto mb-4" />
                      <p>Select a conversation to start messaging</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  )
}
