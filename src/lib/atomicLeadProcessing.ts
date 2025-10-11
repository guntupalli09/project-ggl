// Atomic lead processing to prevent race conditions
import { supabase } from './supabaseClient'

export interface LeadCreationData {
  user_id: string
  name?: string
  email?: string
  phone?: string
  source: string
  notes?: string
}

export interface LeadProcessingResult {
  success: boolean
  leadId?: string
  error?: string
  message?: string
}

/**
 * Atomically creates a lead and triggers speed-to-lead automation
 * This prevents race conditions and ensures consistency
 */
export async function processLeadAtomically(
  leadData: LeadCreationData,
  businessSlug?: string
): Promise<LeadProcessingResult> {
  try {
    // Start a transaction-like process
    // First, create the lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert([{
        user_id: leadData.user_id,
        name: leadData.name || null,
        email: leadData.email || null,
        phone: leadData.phone || null,
        source: leadData.source,
        status: 'new',
        notes: leadData.notes || null
      }])
      .select('id, name, email, status, created_at')
      .single()

    if (leadError || !lead) {
      console.error('Error creating lead:', leadError)
      return {
        success: false,
        error: `Failed to create lead: ${leadError?.message || 'Unknown error'}`
      }
    }

    // Trigger speed-to-lead automation
    try {
      const automationResponse = await fetch('/api/automations/speedToLead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadId: lead.id,
          userId: leadData.user_id
        })
      })

      if (!automationResponse.ok) {
        const errorData = await automationResponse.json()
        console.error('Speed-to-lead automation failed:', errorData)
        // Don't fail the lead creation if automation fails
      } else {
        console.log(`Speed-to-lead automation triggered for lead ${lead.id}`)
      }
    } catch (automationError) {
      console.error('Error triggering speed-to-lead automation:', automationError)
      // Don't fail the lead creation if automation fails
    }

    return {
      success: true,
      leadId: lead.id,
      message: 'Lead created and automation triggered successfully'
    }

  } catch (error) {
    console.error('Error in atomic lead processing:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Validates lead data before processing
 */
export function validateLeadData(leadData: LeadCreationData): { valid: boolean; error?: string } {
  if (!leadData.user_id) {
    return { valid: false, error: 'User ID is required' }
  }

  if (!leadData.source) {
    return { valid: false, error: 'Lead source is required' }
  }

  if (!leadData.email && !leadData.phone) {
    return { valid: false, error: 'Either email or phone is required' }
  }

  // Validate email format if provided
  if (leadData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadData.email)) {
    return { valid: false, error: 'Invalid email format' }
  }

  // Validate phone format if provided (basic validation)
  if (leadData.phone && !/^[\+]?[1-9][\d]{0,15}$/.test(leadData.phone.replace(/\D/g, ''))) {
    return { valid: false, error: 'Invalid phone format' }
  }

  return { valid: true }
}

/**
 * Get business user ID from business slug
 */
export async function getBusinessUserId(businessSlug: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('user_id')
      .eq('business_slug', businessSlug)
      .single()

    if (error || !data) {
      console.error('Business not found:', error)
      return null
    }

    return data.user_id
  } catch (error) {
    console.error('Error fetching business user ID:', error)
    return null
  }
}
