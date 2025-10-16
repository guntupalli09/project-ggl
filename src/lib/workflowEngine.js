// Workflow Engine for Niche-Specific Automation (JavaScript version for server)
import { createClient } from '@supabase/supabase-js'

// Use hardcoded values for server-side only (process.env is not available in browser)
const supabaseUrl = 'https://rmrhvrptpqopaogrftgl.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtcmh2cnB0cHFvcGFvZ3JmdGdsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTk0MjQ2MiwiZXhwIjoyMDc1NTE4NDYyfQ.RqFSe9piAiMo0GTzt6Y2PNuxDF-am-oTZt8lXQq9__I'

const supabase = createClient(supabaseUrl, supabaseKey)

export class WorkflowEngine {
  constructor() {
    this.automations = new Map()
  }

  static getInstance() {
    if (!WorkflowEngine.instance) {
      WorkflowEngine.instance = new WorkflowEngine()
    }
    return WorkflowEngine.instance
  }

  /**
   * Initialize workflow engine and load automations
   */
  async initialize() {
    try {
      const { data: automations, error } = await supabase
        .from('workflow_automations')
        .select('*')
        .eq('is_active', true)

      if (error) {
        console.error('Error loading workflow automations:', error)
        return
      }

      // Group automations by trigger event
      this.automations.clear()
      automations?.forEach(automation => {
        const key = automation.trigger_event
        if (!this.automations.has(key)) {
          this.automations.set(key, [])
        }
        this.automations.get(key).push(automation)
      })

      console.log(`✅ Workflow Engine initialized with ${automations?.length || 0} automations`)
    } catch (error) {
      console.error('Error initializing workflow engine:', error)
    }
  }

  /**
   * Trigger workflow for a specific event
   */
  async triggerWorkflow(event, data) {
    try {
      console.log(`🔄 Triggering workflow for event: ${event}`, data)
      
      const automations = this.automations.get(event) || []
      
      for (const automation of automations) {
        // Check if this automation applies to the user's niche
        const { data: userSettings } = await supabase
          .from('user_settings')
          .select('niche_template_id')
          .eq('user_id', data.user_id)
          .single()

        console.log(`🔍 Checking automation ${automation.action_type} (niche: ${automation.niche_template_id}) against user niche: ${userSettings?.niche_template_id}`)

        if (userSettings?.niche_template_id !== automation.niche_template_id) {
          console.log(`⏭️ Skipping automation ${automation.action_type} - niche mismatch`)
          continue // Skip if not matching niche
        }

        console.log(`✅ Executing automation ${automation.action_type} for user ${data.user_id}`)

        // Execute automation with delay
        if (automation.delay_minutes > 0) {
          console.log(`⏰ Scheduling automation ${automation.action_type} with ${automation.delay_minutes} minute delay`)
          setTimeout(() => {
            this.executeAutomation(automation, data)
          }, automation.delay_minutes * 60 * 1000)
        } else {
          console.log(`⚡ Executing automation ${automation.action_type} immediately`)
          await this.executeAutomation(automation, data)
        }
      }
    } catch (error) {
      console.error(`Error triggering workflow for event ${event}:`, error)
    }
  }

  /**
   * Execute a specific automation
   */
  async executeAutomation(automation, data) {
    try {
      console.log(`⚡ Executing automation: ${automation.action_type}`, automation)

      switch (automation.action_type) {
        case 'send_review_request':
          await this.sendReviewRequest(data)
          break
        case 'send_referral_offer':
          await this.sendReferralOffer(data)
          break
        case 'update_lead_status':
          await this.updateLeadStatus(data)
          break
        case 'send_booking_confirmation':
          await this.sendBookingConfirmation(data)
          break
        default:
          console.warn(`Unknown action type: ${automation.action_type}`)
      }

      // Log the automation execution
      await this.logAutomationExecution(automation.action_type, data)
      
    } catch (error) {
      console.error(`Error executing automation ${automation.id}:`, error)
    }
  }

  /**
   * Send review request based on niche
   */
  async sendReviewRequest(data) {
    try {
      console.log(`📧 Sending review request to ${data.customer_name} (${data.customer_email})`)
      
      // Import the review request system
      const { createReviewRequest, getReviewRequestData } = await import('./reviewRequestSystem.js')
      
      // Get review request data
      const reviewData = await getReviewRequestData(data.booking_id)
      if (!reviewData) {
        console.error('Could not get review request data for booking:', data.booking_id)
        return
      }
      
      // Get brand voice for personalized messaging
      try {
        const { getBrandVoice, formatBrandVoiceForPrompt } = await import('./brandVoice.js')
        const brandVoice = await getBrandVoice()
        const brandVoicePrompt = formatBrandVoiceForPrompt(brandVoice)
        
        if (brandVoicePrompt) {
          console.log('🎨 Using Brand Voice for review request personalization')
          // Store brand voice context for later use in message generation
          reviewData.brand_voice = brandVoicePrompt
        }
      } catch (brandVoiceError) {
        console.log('⚠️ Brand Voice not available, using default templates')
      }
      
      // Create review request entry
      await createReviewRequest(reviewData)
      
      console.log(`✅ Review request created for ${data.customer_name}`)
      
    } catch (error) {
      console.error('Error sending review request:', error)
    }
  }

  /**
   * Send referral offer based on niche
   */
  async sendReferralOffer(data) {
    try {
      console.log(`🎁 Sending referral offer to ${data.customer_name}`)
      
      // Import the referral system
      const { createReferralOffer } = await import('./referralSystem.js')
      
      // Get brand voice for personalized messaging
      try {
        const { getBrandVoice, formatBrandVoiceForPrompt } = await import('./brandVoice.js')
        const brandVoice = await getBrandVoice()
        const brandVoicePrompt = formatBrandVoiceForPrompt(brandVoice)
        
        if (brandVoicePrompt) {
          console.log('🎨 Using Brand Voice for referral offer personalization')
          // Store brand voice context for later use in message generation
          data.brand_voice = brandVoicePrompt
        }
      } catch (brandVoiceError) {
        console.log('⚠️ Brand Voice not available, using default templates')
      }
      
      // Create referral offer (this will be triggered after a positive review)
      const referralData = await createReferralOffer(data.review_id)
      if (referralData) {
        console.log(`✅ Referral offer created: ${referralData.referral_code}`)
      } else {
        console.log('No referral offer created (review not positive enough)')
      }
      
    } catch (error) {
      console.error('Error sending referral offer:', error)
    }
  }

  /**
   * Update lead status
   */
  async updateLeadStatus(data) {
    try {
      if (data.lead_id) {
        await supabase
          .from('leads')
          .update({ status: 'contacted' })
          .eq('id', data.lead_id)
        
        console.log(`✅ Lead status updated to 'contacted'`)
      }
    } catch (error) {
      console.error('Error updating lead status:', error)
    }
  }

  /**
   * Send booking confirmation
   */
  async sendBookingConfirmation(data) {
    try {
      console.log(`📅 Sending booking confirmation to ${data.customer_name}`)
      
      // For now, just log the action - in production this would send actual emails
      console.log(`✅ Booking confirmation would be sent to ${data.customer_name}`)
      
    } catch (error) {
      console.error('Error sending booking confirmation:', error)
    }
  }

  /**
   * Log automation execution
   */
  async logAutomationExecution(action, data) {
    try {
      const { error } = await supabase
        .from('automation_logs')
        .insert({
          user_id: data.user_id,
          lead_id: data.lead_id || null,
          booking_id: data.booking_id || null,
          action_type: action,
          executed_at: new Date().toISOString(),
          data: data,
          status: 'success'
        })

      if (error) {
        console.error('Error logging automation execution:', error)
      } else {
        console.log(`📝 Automation execution logged: ${action}`)
      }
    } catch (error) {
      console.error('Error logging automation execution:', error)
    }
  }
}

// Export singleton instance
export const workflowEngine = WorkflowEngine.getInstance()
