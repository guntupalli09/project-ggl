import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { isGuestUser, getCurrentUser } from '../lib/authUtils'
import AutomationHistory from '../components/AutomationHistory'
import {
  CogIcon,
  ClockIcon,
  CheckCircleIcon,
  PlayIcon,
  PauseIcon
} from '@heroicons/react/24/outline'

interface Automation {
  id: string
  name: string
  delay_minutes: number
  active: boolean
  created_at: string
}

interface AutomationStats {
  lastRunTime: string | null
  messagesSentToday: number
  totalMessagesSent: number
}

export default function Automations() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isGuest, setIsGuest] = useState(false)
  const [automations, setAutomations] = useState<Automation[]>([])
  const [stats, setStats] = useState<AutomationStats>({
    lastRunTime: null,
    messagesSentToday: 0,
    totalMessagesSent: 0
  })
  const [automationsLoading, setAutomationsLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  // Fetch automations and stats
  const fetchAutomations = async () => {
    try {
      setAutomationsLoading(true)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch user's automations
      const { data: automationsData, error: automationsError } = await supabase
        .from('automations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (automationsError) {
        console.error('Error fetching automations:', automationsError)
        return
      }

      setAutomations(automationsData || [])

      // If no automations exist, create the default one
      if (!automationsData || automationsData.length === 0) {
        await createDefaultAutomation(user.id)
        // Refetch after creating default
        const { data: newAutomations } = await supabase
          .from('automations')
          .select('*')
          .eq('user_id', user.id)
        setAutomations(newAutomations || [])
      }

      // Fetch automation stats
      await fetchAutomationStats()

    } catch (error) {
      console.error('Error fetching automations:', error)
    } finally {
      setAutomationsLoading(false)
    }
  }

  // Create default automation
  const createDefaultAutomation = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('automations')
        .insert({
          user_id: userId,
          name: 'No reply in 24h',
          delay_minutes: 1440, // 24 hours
          active: true
        })

      if (error) {
        console.error('Error creating default automation:', error)
      }
    } catch (error) {
      console.error('Error creating default automation:', error)
    }
  }

  // Fetch automation statistics
  const fetchAutomationStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get today's date range
      const today = new Date()
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

      // Count messages sent today
      const { count: messagesToday } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('direction', 'out')
        .gte('sent_at', startOfDay.toISOString())
        .lt('sent_at', endOfDay.toISOString())

      // Count total messages sent
      const { count: totalMessages } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('direction', 'out')

      // Get last run time (this would typically come from a cron log table)
      // For now, we'll use the most recent message sent time as a proxy
      const { data: lastMessage } = await supabase
        .from('messages')
        .select('sent_at')
        .eq('user_id', user.id)
        .eq('direction', 'out')
        .order('sent_at', { ascending: false })
        .limit(1)

      setStats({
        lastRunTime: lastMessage?.[0]?.sent_at || null,
        messagesSentToday: messagesToday || 0,
        totalMessagesSent: totalMessages || 0
      })

    } catch (error) {
      console.error('Error fetching automation stats:', error)
    }
  }

  // Toggle automation active status
  const toggleAutomation = async (automationId: string, currentStatus: boolean) => {
    try {
      setUpdating(automationId)
      
      const { error } = await supabase
        .from('automations')
        .update({ active: !currentStatus })
        .eq('id', automationId)

      if (error) {
        console.error('Error updating automation:', error)
        return
      }

      // Update local state
      setAutomations(prev => 
        prev.map(automation => 
          automation.id === automationId 
            ? { ...automation, active: !currentStatus }
            : automation
        )
      )

    } catch (error) {
      console.error('Error toggling automation:', error)
    } finally {
      setUpdating(null)
    }
  }

  // Format delay minutes to human readable
  const formatDelay = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} minutes`
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60)
      return `${hours} hour${hours > 1 ? 's' : ''}`
    } else {
      const days = Math.floor(minutes / 1440)
      return `${days} day${days > 1 ? 's' : ''}`
    }
  }

  // Format last run time
  const formatLastRunTime = (timestamp: string | null) => {
    if (!timestamp) return 'Never'
    
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    
    if (diffHours < 1) {
      return 'Just now'
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    } else {
      const diffDays = Math.floor(diffHours / 24)
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    }
  }


  useEffect(() => {
    const getUser = async () => {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
      setIsGuest(isGuestUser())
      setLoading(false)
      
      if (!currentUser) {
        return
      }

      // Fetch automations only if user is authenticated (not guest)
      if (!isGuestUser()) {
        fetchAutomations()
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          if (!isGuestUser()) {
            return
          }
        } else {
          setUser(session?.user ?? null)
          setIsGuest(false)
          if (session?.user) {
            fetchAutomations()
          }
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <CogIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Automations</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Welcome, {user?.email}
              </span>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Guest Mode Warning */}
          {isGuest && (
            <div className="mb-8 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.725-1.36 3.49 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                    🎯 Guest Mode - Automations Disabled
                  </h3>
                  <p className="text-yellow-700 dark:text-yellow-300">
                    Automations are not available in guest mode. Sign in to create and manage automated follow-ups.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-lg rounded-xl">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                      <ClockIcon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Run</dt>
                      <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatLastRunTime(stats.lastRunTime)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-lg rounded-xl">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                      <CheckCircleIcon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Today's Messages</dt>
                      <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                        {stats.messagesSentToday}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-lg rounded-xl">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                      <CogIcon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Sent</dt>
                      <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                        {stats.totalMessagesSent}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Automations List */}
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Active Automations</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Manage your automated follow-up sequences</p>
            </div>
            
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {automationsLoading ? (
                <div className="p-6 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  <p className="mt-2 text-gray-500 dark:text-gray-400">Loading automations...</p>
                </div>
              ) : automations.length === 0 ? (
                <div className="p-6 text-center">
                  <CogIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No automations found</p>
                </div>
              ) : (
                automations.map((automation) => (
                  <div key={automation.id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                            {automation.name}
                          </h3>
                          <span className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            automation.active 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {automation.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          Sends follow-up after {formatDelay(automation.delay_minutes)} of no response
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                          Created {new Date(automation.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => toggleAutomation(automation.id, automation.active)}
                          disabled={updating === automation.id || isGuest}
                          className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg transition-colors duration-200 ${
                            automation.active
                              ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40'
                              : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {updating === automation.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                          ) : automation.active ? (
                            <PauseIcon className="h-4 w-4 mr-2" />
                          ) : (
                            <PlayIcon className="h-4 w-4 mr-2" />
                          )}
                          {automation.active ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>


          {/* Automation History */}
          {user && !isGuest && (
            <div className="mt-8">
              <AutomationHistory userId={user.id} />
            </div>
          )}

          {/* Info Section */}
          <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Production Automation System
                </h3>
                <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>Vercel Cron Jobs:</strong> Runs every 30 minutes automatically</li>
                    <li><strong>Smart Detection:</strong> Only follows up with leads who haven't responded</li>
                    <li><strong>AI-Powered:</strong> Generates personalized messages using Ollama</li>
                    <li><strong>Email Integration:</strong> Sends real emails via SendGrid</li>
                    <li><strong>Status Tracking:</strong> Automatically updates lead status</li>
                    <li><strong>Manual Control:</strong> Use Response Tracker to mark responses</li>
                    <li><strong>Full History:</strong> See exactly what happened in each run</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
