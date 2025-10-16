// Workflow Engine for Niche-Specific Automation
import { supabase } from './supabaseClient'
import { generateText } from './ollamaClient'
import { sendEmail } from './sendEmail'

export interface WorkflowAutomation {
  id: string
  niche_template_id: string
  trigger_event: string
  delay_minutes: number
  action_type: string
  template_id?: string
  is_active: boolean
  created_at: string
}

export interface WorkflowData {
  lead_id?: string
  booking_id?: string
  user_id: string
  business_name: string
  customer_name: string
  customer_email?: string
  customer_phone?: string
  service_type?: string
  booking_time?: string
  review_link?: string
  referral_link?: string
  [key: string]: any
}

export class WorkflowEngine {
  private static instance: WorkflowEngine
  private automations: Map<string, WorkflowAutomation[]> = new Map()

  static getInstance(): WorkflowEngine {
    if (!WorkflowEngine.instance) {
      WorkflowEngine.instance = new WorkflowEngine()
    }
    return WorkflowEngine.instance
  }

  /**
   * Initialize workflow engine and load automations
   */
  async initialize(): Promise<void> {
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
        this.automations.get(key)!.push(automation)
      })

      console.log(`✅ Workflow Engine initialized with ${automations?.length || 0} automations`)
    } catch (error) {
      console.error('Error initializing workflow engine:', error)
    }
  }

  /**
   * Trigger workflow for a specific event
   */
  async triggerWorkflow(event: string, data: WorkflowData): Promise<void> {
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

        if (userSettings?.niche_template_id !== automation.niche_template_id) {
          continue // Skip if not matching niche
        }

        // Execute automation with delay
        if (automation.delay_minutes > 0) {
          setTimeout(() => {
            this.executeAutomation(automation, data)
          }, automation.delay_minutes * 60 * 1000)
        } else {
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
  private async executeAutomation(automation: WorkflowAutomation, data: WorkflowData): Promise<void> {
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
    } catch (error) {
      console.error(`Error executing automation ${automation.id}:`, error)
    }
  }

  /**
   * Send review request based on niche
   */
  private async sendReviewRequest(data: WorkflowData): Promise<void> {
    try {
      // Get niche-specific template
      const template = await this.getNicheTemplate(data.user_id, 'review_request')
      
      // Generate personalized message using AI
      const prompt = this.buildReviewRequestPrompt(data, template)
      const message = await generateText(prompt)
      
      // Send via email or SMS based on niche preference
      if (data.customer_email) {
        await sendEmail({
          to: data.customer_email,
          subject: `How was your visit to ${data.business_name}?`,
          body: message
        })
      }

      // Log the automation
      await this.logAutomationExecution('send_review_request', data)
      
      console.log(`✅ Review request sent to ${data.customer_name}`)
    } catch (error) {
      console.error('Error sending review request:', error)
    }
  }

  /**
   * Send referral offer based on niche
   */
  private async sendReferralOffer(data: WorkflowData): Promise<void> {
    try {
      // Generate referral link
      const referralCode = this.generateReferralCode(data.lead_id!)
      const referralLink = `https://${data.business_name.toLowerCase().replace(/\s+/g, '')}.getgetleads.com/r/${referralCode}`
      
      // Get niche-specific template
      const template = await this.getNicheTemplate(data.user_id, 'referral_offer')
      
      // Generate personalized message
      const prompt = this.buildReferralOfferPrompt(data, template, referralLink)
      const message = await generateText(prompt)
      
      // Send via email or SMS
      if (data.customer_email) {
        await sendEmail({
          to: data.customer_email,
          subject: `Share the love - Get $10 off for you and your friends!`,
          body: message
        })
      }

      // Store referral link in database
      await this.storeReferralLink(data.lead_id!, referralCode, referralLink)
      
      console.log(`✅ Referral offer sent to ${data.customer_name}`)
    } catch (error) {
      console.error('Error sending referral offer:', error)
    }
  }

  /**
   * Update lead status
   */
  private async updateLeadStatus(data: WorkflowData): Promise<void> {
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
  private async sendBookingConfirmation(data: WorkflowData): Promise<void> {
    try {
      const template = await this.getNicheTemplate(data.user_id, 'booking_confirmation')
      const message = this.buildBookingConfirmationMessage(data, template)
      
      if (data.customer_email) {
        await sendEmail({
          to: data.customer_email,
          subject: `Your appointment at ${data.business_name} is confirmed!`,
          body: message
        })
      }
      
      console.log(`✅ Booking confirmation sent to ${data.customer_name}`)
    } catch (error) {
      console.error('Error sending booking confirmation:', error)
    }
  }

  /**
   * Get niche-specific template
   */
  private async getNicheTemplate(userId: string, templateType: string): Promise<any> {
    try {
      const { data: userSettings } = await supabase
        .from('user_settings')
        .select('niche_template_id')
        .eq('user_id', userId)
        .single()

      if (!userSettings?.niche_template_id) {
        throw new Error('User niche template not found')
      }

      const { data: nicheTemplate } = await supabase
        .from('niche_templates')
        .select('config')
        .eq('id', userSettings.niche_template_id)
        .single()

      return nicheTemplate?.config?.content_templates?.[templateType] || null
    } catch (error) {
      console.error('Error getting niche template:', error)
      return null
    }
  }

  /**
   * Build review request prompt for AI
   */
  private buildReviewRequestPrompt(data: WorkflowData, template: any): string {
    const baseTemplate = template || "Hi {{customer_name}}, how was your visit to {{business_name}}? We'd love your feedback!"
    
    return `Generate a personalized review request message for a ${data.service_type || 'service'} business.

Customer: ${data.customer_name}
Business: ${data.business_name}
Service: ${data.service_type || 'recent service'}

Base template: ${baseTemplate}

Requirements:
- Keep it friendly and personal
- Mention the specific service if provided
- Include a clear call-to-action
- Keep it under 100 words
- Professional but warm tone

Generate the message:`
  }

  /**
   * Build referral offer prompt for AI
   */
  private buildReferralOfferPrompt(data: WorkflowData, template: any, referralLink: string): string {
    const baseTemplate = template || "Love your experience? Share with friends and both get $10 off!"
    
    return `Generate a personalized referral offer message for a ${data.service_type || 'service'} business.

Customer: ${data.customer_name}
Business: ${data.business_name}
Referral Link: ${referralLink}
Base template: ${baseTemplate}

Requirements:
- Make it exciting and shareable
- Clear value proposition ($10 off for both)
- Include the referral link
- Keep it under 80 words
- Encourage sharing

Generate the message:`
  }

  /**
   * Build booking confirmation message
   */
  private buildBookingConfirmationMessage(data: WorkflowData, template: any): string {
    const baseTemplate = template || "Your appointment at {{business_name}} is confirmed for {{booking_time}}."
    
    return baseTemplate
      .replace('{{customer_name}}', data.customer_name)
      .replace('{{business_name}}', data.business_name)
      .replace('{{booking_time}}', data.booking_time || 'your scheduled time')
      .replace('{{service_type}}', data.service_type || 'service')
  }

  /**
   * Generate referral code
   */
  private generateReferralCode(leadId: string): string {
    const prefix = leadId.substring(0, 4).toUpperCase()
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    return `${prefix}${random}`
  }

  /**
   * Store referral link in database
   */
  private async storeReferralLink(leadId: string, code: string, link: string): Promise<void> {
    try {
      await supabase
        .from('referrals')
        .insert({
          referrer_lead_id: leadId,
          referral_code: code,
          link_url: link,
          status: 'active'
        })
    } catch (error) {
      console.error('Error storing referral link:', error)
    }
  }

  /**
   * Log automation execution
   */
  private async logAutomationExecution(action: string, data: WorkflowData): Promise<void> {
    try {
      await supabase
        .from('automation_logs')
        .insert({
          user_id: data.user_id,
          lead_id: data.lead_id,
          booking_id: data.booking_id,
          action_type: action,
          executed_at: new Date().toISOString(),
          data: data
        })
    } catch (error) {
      console.error('Error logging automation execution:', error)
    }
  }
}

// Export singleton instance
export const workflowEngine = WorkflowEngine.getInstance()
