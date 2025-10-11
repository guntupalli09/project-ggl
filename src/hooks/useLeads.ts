import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export interface Lead {
  id: string
  user_id: string
  name: string
  email: string
  phone?: string
  source?: string
  status: 'new' | 'contacted' | 'booked' | 'completed'
  notes?: string
  created_at: string
}

export interface Message {
  id: string
  user_id: string
  lead_id: string
  channel: 'email' | 'sms'
  direction: 'out' | 'in'
  body: string
  sent_at: string
}

export interface UserSettings {
  user_id: string
  booking_link?: string
  niche?: string
  created_at: string
}

export const useLeads = () => {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch all leads for the current user
  const fetchLeads = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('No authenticated user')
      }

      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setLeads(data || [])
    } catch (err: any) {
      setError(err.message)
      console.error('Error fetching leads:', err)
    } finally {
      setLoading(false)
    }
  }

  // Add a new lead
  const addLead = async (leadData: Omit<Lead, 'id' | 'user_id' | 'created_at'>) => {
    try {
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('No authenticated user')
      }

      const { data, error } = await supabase
        .from('leads')
        .insert([{
          ...leadData,
          user_id: user.id
        }])
        .select()
        .single()

      if (error) throw error

      setLeads(prev => [data, ...prev])
      return data
    } catch (err: any) {
      setError(err.message)
      console.error('Error adding lead:', err)
      throw err
    }
  }

  // Update a lead
  const updateLead = async (id: string, updates: Partial<Omit<Lead, 'id' | 'user_id' | 'created_at'>>) => {
    try {
      setError(null)

      const { data, error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      setLeads(prev => prev.map(lead => lead.id === id ? data : lead))
      return data
    } catch (err: any) {
      setError(err.message)
      console.error('Error updating lead:', err)
      throw err
    }
  }

  // Delete a lead
  const deleteLead = async (id: string) => {
    try {
      setError(null)

      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id)

      if (error) throw error

      setLeads(prev => prev.filter(lead => lead.id !== id))
    } catch (err: any) {
      setError(err.message)
      console.error('Error deleting lead:', err)
      throw err
    }
  }

  // Get messages for a lead
  const getLeadMessages = async (leadId: string): Promise<Message[]> => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (err: any) {
      console.error('Error fetching lead messages:', err)
      return []
    }
  }

  // Add a message to a lead
  const addMessage = async (messageData: Omit<Message, 'id' | 'user_id' | 'sent_at'>) => {
    try {
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('No authenticated user')
      }

      const { data, error } = await supabase
        .from('messages')
        .insert([{
          ...messageData,
          user_id: user.id,
          sent_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) throw error
      return data
    } catch (err: any) {
      setError(err.message)
      console.error('Error adding message:', err)
      throw err
    }
  }

  // Get user settings
  const getUserSettings = async (): Promise<UserSettings | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows returned
      return data
    } catch (err: any) {
      console.error('Error fetching user settings:', err)
      return null
    }
  }

  // Update user settings
  const updateUserSettings = async (settings: Partial<Omit<UserSettings, 'user_id' | 'created_at'>>) => {
    try {
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('No authenticated user')
      }

      const { data, error } = await supabase
        .from('user_settings')
        .upsert([{
          ...settings,
          user_id: user.id
        }])
        .select()
        .single()

      if (error) throw error
      return data
    } catch (err: any) {
      setError(err.message)
      console.error('Error updating user settings:', err)
      throw err
    }
  }

  // Load leads on mount
  useEffect(() => {
    fetchLeads()
  }, [])

  return {
    leads,
    loading,
    error,
    fetchLeads,
    addLead,
    updateLead,
    deleteLead,
    getLeadMessages,
    addMessage,
    getUserSettings,
    updateUserSettings
  }
}
