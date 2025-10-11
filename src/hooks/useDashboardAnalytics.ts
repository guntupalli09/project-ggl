import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export interface LeadsBySourceData {
  source: string
  count: number
  percentage: number
}

export interface ChannelData {
  channel: string
  count: number
  percentage: number
}

export interface DashboardAnalytics {
  leadsBySource: LeadsBySourceData[]
  averageResponseTime: number
  previousAverageResponseTime?: number
  topChannels: ChannelData[]
  isLoading: boolean
  error: string | null
}

export const useDashboardAnalytics = () => {
  const [analytics, setAnalytics] = useState<DashboardAnalytics>({
    leadsBySource: [],
    averageResponseTime: 0,
    previousAverageResponseTime: undefined,
    topChannels: [],
    isLoading: true,
    error: null
  })

  const fetchAnalytics = async () => {
    try {
      setAnalytics(prev => ({ ...prev, isLoading: true, error: null }))

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('No authenticated user')
      }

      // Fetch leads by source
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('source, created_at')
        .eq('user_id', user.id)

      if (leadsError) throw leadsError

      // Calculate leads by source
      const sourceCounts = leadsData?.reduce((acc, lead) => {
        const source = lead.source || 'Unknown'
        acc[source] = (acc[source] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      const totalLeads = Object.values(sourceCounts).reduce((sum, count) => sum + count, 0)
      const leadsBySource: LeadsBySourceData[] = Object.entries(sourceCounts).map(([source, count]) => ({
        source,
        count,
        percentage: totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0
      })).sort((a, b) => b.count - a.count)

      // Fetch messages for response time and channel analysis
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('lead_id, channel, direction, sent_at')
        .eq('user_id', user.id)
        .eq('direction', 'out')
        .order('sent_at', { ascending: true })

      if (messagesError) throw messagesError

      // Calculate average response time
      const responseTimes: number[] = []
      const leadFirstMessages = new Map<string, string>() // lead_id -> first message sent_at

      messagesData?.forEach(message => {
        if (!leadFirstMessages.has(message.lead_id)) {
          leadFirstMessages.set(message.lead_id, message.sent_at)
        }
      })

      // Get lead creation times and calculate response times
      const leadIds = Array.from(leadFirstMessages.keys())
      let leadTimes: any[] = []
      
      if (leadIds.length > 0) {
        const { data: leadTimesData, error: leadTimesError } = await supabase
          .from('leads')
          .select('id, created_at')
          .eq('user_id', user.id)
          .in('id', leadIds)

        if (leadTimesError) throw leadTimesError
        leadTimes = leadTimesData || []

        leadTimes.forEach(lead => {
          const firstMessageTime = leadFirstMessages.get(lead.id)
          if (firstMessageTime) {
            const leadTime = new Date(lead.created_at).getTime()
            const messageTime = new Date(firstMessageTime).getTime()
            const responseTimeMinutes = (messageTime - leadTime) / (1000 * 60)
            if (responseTimeMinutes >= 0) { // Only include positive response times
              responseTimes.push(responseTimeMinutes)
            }
          }
        })
      }

      const averageResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
        : 0

      // Calculate previous period average response time (last 30 days vs previous 30 days)
      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

      const recentResponseTimes: number[] = []
      const previousResponseTimes: number[] = []

      leadTimes.forEach(lead => {
        const firstMessageTime = leadFirstMessages.get(lead.id)
        if (firstMessageTime) {
          const leadTime = new Date(lead.created_at).getTime()
          const messageTime = new Date(firstMessageTime).getTime()
          const responseTimeMinutes = (messageTime - leadTime) / (1000 * 60)
          
          if (responseTimeMinutes >= 0) {
            const leadDate = new Date(lead.created_at)
            if (leadDate >= thirtyDaysAgo) {
              recentResponseTimes.push(responseTimeMinutes)
            } else if (leadDate >= sixtyDaysAgo && leadDate < thirtyDaysAgo) {
              previousResponseTimes.push(responseTimeMinutes)
            }
          }
        }
      })

      const previousAverageResponseTime = previousResponseTimes.length > 0
        ? previousResponseTimes.reduce((sum, time) => sum + time, 0) / previousResponseTimes.length
        : undefined

      // Calculate top channels
      const channelCounts = messagesData?.reduce((acc, message) => {
        const channel = message.channel || 'Unknown'
        acc[channel] = (acc[channel] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      const totalMessages = Object.values(channelCounts).reduce((sum, count) => sum + count, 0)
      const topChannels: ChannelData[] = Object.entries(channelCounts).map(([channel, count]) => ({
        channel,
        count,
        percentage: totalMessages > 0 ? Math.round((count / totalMessages) * 100) : 0
      })).sort((a, b) => b.count - a.count)

      setAnalytics({
        leadsBySource,
        averageResponseTime,
        previousAverageResponseTime,
        topChannels,
        isLoading: false,
        error: null
      })

    } catch (error) {
      console.error('Error fetching dashboard analytics:', error)
      setAnalytics(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch analytics'
      }))
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  return {
    ...analytics,
    refetch: fetchAnalytics
  }
}
