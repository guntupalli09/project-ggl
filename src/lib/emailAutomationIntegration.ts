// Email Automation Integration
// Connects AI email system with existing automation workflows

import { supabase } from './supabaseClient'
import AIEmailSystem from './aiEmailSystem'

export interface AutomationTrigger {
  id: string
  userId: string
  event: string
  conditions: any
  emailCampaign: string
  delay: number // minutes
  isActive: boolean
  lastTriggered?: Date
}

export interface EmailCampaign {
  id: string
  userId: string
  name: string
  type: string
  niche: string
  subject: string
  content: string
  isActive: boolean
  metrics: any
}

export class EmailAutomationIntegration {
  private userId: string
  private aiEmailSystem: AIEmailSystem

  constructor(userId: string) {
    this.userId = userId
    this.aiEmailSystem = new AIEmailSystem(userId)
  }

  // Initialize automation integration
  async initialize(): Promise<void> {
    await this.aiEmailSystem.initialize()
    await this.setupDefaultTriggers()
  }

  // Process automation triggers
  async processTriggers(): Promise<{processed: number, sent: number, failed: number}> {
    try {
      const triggers = await this.getActiveTriggers()
      let processed = 0
      let sent = 0
      let failed = 0

      for (const trigger of triggers) {
        try {
          const shouldTrigger = await this.evaluateTrigger(trigger)
          if (shouldTrigger) {
            const result = await this.executeTrigger(trigger)
            if (result.success) {
              sent++
            } else {
              failed++
            }
            processed++
          }
        } catch (error) {
          console.error(`Error processing trigger ${trigger.id}:`, error)
          failed++
        }
      }

      return { processed, sent, failed }
    } catch (error) {
      console.error('Error processing triggers:', error)
      throw error
    }
  }

  // Handle specific automation events
  async handleEvent(event: string, data: any): Promise<void> {
    try {
      console.log(`Handling automation event: ${event}`, data)

      switch (event) {
        case 'appointment_completed':
          await this.handleAppointmentCompleted(data)
          break
        case 'appointment_cancelled':
          await this.handleAppointmentCancelled(data)
          break
        case 'new_lead_created':
          await this.handleNewLeadCreated(data)
          break
        case 'lead_converted':
          await this.handleLeadConverted(data)
          break
        case 'payment_received':
          await this.handlePaymentReceived(data)
          break
        case 'review_received':
          await this.handleReviewReceived(data)
          break
        case 'client_inactive':
          await this.handleClientInactive(data)
          break
        case 'maintenance_due':
          await this.handleMaintenanceDue(data)
          break
        case 'open_house_scheduled':
          await this.handleOpenHouseScheduled(data)
          break
        case 'market_update':
          await this.handleMarketUpdate(data)
          break
        default:
          console.log(`No automation handler for event: ${event}`)
      }
    } catch (error) {
      console.error(`Error handling event ${event}:`, error)
    }
  }

  // Handle appointment completed
  private async handleAppointmentCompleted(data: any): Promise<void> {
    try {
      const customerData = await this.getCustomerData(data.customer_email)
      if (!customerData) return

      // Send review request
      await this.aiEmailSystem.triggerCampaign('service_completed', customerData, {
        service: data.service,
        appointment_date: data.appointment_date,
        stylist: data.stylist
      })

      // Schedule follow-up for next appointment
      if (data.next_appointment) {
        await this.scheduleFollowUp(customerData, data.next_appointment)
      }
    } catch (error) {
      console.error('Error handling appointment completed:', error)
    }
  }

  // Handle appointment cancelled
  private async handleAppointmentCancelled(data: any): Promise<void> {
    try {
      const customerData = await this.getCustomerData(data.customer_email)
      if (!customerData) return

      // Send rescheduling email
      await this.aiEmailSystem.triggerCampaign('appointment_cancelled', customerData, {
        original_date: data.original_date,
        service: data.service,
        reason: data.reason
      })
    } catch (error) {
      console.error('Error handling appointment cancelled:', error)
    }
  }

  // Handle new lead created
  private async handleNewLeadCreated(data: any): Promise<void> {
    try {
      const customerData = await this.getCustomerData(data.email)
      if (!customerData) return

      // Send welcome series
      await this.aiEmailSystem.triggerCampaign('lead_created', customerData, {
        lead_source: data.source,
        interest: data.interest
      })
    } catch (error) {
      console.error('Error handling new lead created:', error)
    }
  }

  // Handle lead converted
  private async handleLeadConverted(data: any): Promise<void> {
    try {
      const customerData = await this.getCustomerData(data.email)
      if (!customerData) return

      // Send conversion confirmation
      await this.aiEmailSystem.triggerCampaign('lead_converted', customerData, {
        conversion_type: data.conversion_type,
        appointment_date: data.appointment_date
      })
    } catch (error) {
      console.error('Error handling lead converted:', error)
    }
  }

  // Handle payment received
  private async handlePaymentReceived(data: any): Promise<void> {
    try {
      const customerData = await this.getCustomerData(data.customer_email)
      if (!customerData) return

      // Send payment confirmation
      await this.aiEmailSystem.triggerCampaign('payment_received', customerData, {
        amount: data.amount,
        service: data.service,
        payment_method: data.payment_method
      })
    } catch (error) {
      console.error('Error handling payment received:', error)
    }
  }

  // Handle review received
  private async handleReviewReceived(data: any): Promise<void> {
    try {
      const customerData = await this.getCustomerData(data.customer_email)
      if (!customerData) return

      // Send thank you for review
      await this.aiEmailSystem.triggerCampaign('review_received', customerData, {
        review_rating: data.rating,
        review_text: data.text
      })
    } catch (error) {
      console.error('Error handling review received:', error)
    }
  }

  // Handle client inactive
  private async handleClientInactive(data: any): Promise<void> {
    try {
      const customerData = await this.getCustomerData(data.email)
      if (!customerData) return

      // Send re-engagement email
      await this.aiEmailSystem.triggerCampaign('inactive_client', customerData, {
        days_inactive: data.days_inactive,
        last_service: data.last_service
      })
    } catch (error) {
      console.error('Error handling client inactive:', error)
    }
  }

  // Handle maintenance due
  private async handleMaintenanceDue(data: any): Promise<void> {
    try {
      const customerData = await this.getCustomerData(data.customer_email)
      if (!customerData) return

      // Send maintenance reminder
      await this.aiEmailSystem.triggerCampaign('maintenance_due', customerData, {
        service: data.service,
        last_service_date: data.last_service_date
      })
    } catch (error) {
      console.error('Error handling maintenance due:', error)
    }
  }

  // Handle open house scheduled
  private async handleOpenHouseScheduled(data: any): Promise<void> {
    try {
      const customerData = await this.getCustomerData(data.email)
      if (!customerData) return

      // Send open house invitation
      await this.aiEmailSystem.triggerCampaign('open_house_scheduled', customerData, {
        property_address: data.property_address,
        open_house_date: data.open_house_date,
        property_type: data.property_type
      })
    } catch (error) {
      console.error('Error handling open house scheduled:', error)
    }
  }

  // Handle market update
  private async handleMarketUpdate(data: any): Promise<void> {
    try {
      // Get all active customers for market update
      const customers = await this.getActiveCustomers()
      
      for (const customer of customers) {
        await this.aiEmailSystem.triggerCampaign('market_update', customer, {
          market_data: data.market_data,
          area: data.area,
          update_type: data.update_type
        })
      }
    } catch (error) {
      console.error('Error handling market update:', error)
    }
  }

  // Get customer data from database
  private async getCustomerData(email: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('email', email)
        .eq('user_id', this.userId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error getting customer data:', error)
      return null
    }
  }

  // Get active customers
  private async getActiveCustomers(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('user_id', this.userId)
        .eq('status', 'active')
        .not('email', 'is', null)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting active customers:', error)
      return []
    }
  }

  // Get active triggers
  private async getActiveTriggers(): Promise<AutomationTrigger[]> {
    try {
      const { data, error } = await supabase
        .from('automation_triggers')
        .select('*')
        .eq('user_id', this.userId)
        .eq('is_active', true)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting active triggers:', error)
      return []
    }
  }

  // Evaluate trigger conditions
  private async evaluateTrigger(trigger: AutomationTrigger): Promise<boolean> {
    try {
      // Check if trigger was recently executed
      if (trigger.lastTriggered) {
        const timeSinceLastTrigger = Date.now() - new Date(trigger.lastTriggered).getTime()
        if (timeSinceLastTrigger < trigger.delay * 60 * 1000) {
          return false // Too soon to trigger again
        }
      }

      // Evaluate conditions based on trigger type
      switch (trigger.event) {
        case 'appointment_completed':
          return await this.evaluateAppointmentCompleted(trigger.conditions)
        case 'new_lead_created':
          return await this.evaluateNewLeadCreated(trigger.conditions)
        case 'client_inactive':
          return await this.evaluateClientInactive(trigger.conditions)
        default:
          return false
      }
    } catch (error) {
      console.error('Error evaluating trigger:', error)
      return false
    }
  }

  // Execute trigger
  private async executeTrigger(trigger: AutomationTrigger): Promise<{success: boolean, error?: string}> {
    try {
      // Get campaign data
      const campaign = await this.getCampaign(trigger.emailCampaign)
      if (!campaign) {
        throw new Error('Campaign not found')
      }

      // Get target customers
      const customers = await this.getTargetCustomers(trigger.conditions)
      
      let successCount = 0
      for (const customer of customers) {
        try {
          await this.aiEmailSystem.triggerCampaign(campaign.type, customer)
          successCount++
        } catch (error) {
          console.error(`Error sending email to ${customer.email}:`, error)
        }
      }

      // Update trigger last executed time
      await this.updateTriggerLastExecuted(trigger.id)

      return { success: successCount > 0 }
    } catch (error) {
      console.error('Error executing trigger:', error)
      return { success: false, error: (error as Error).message }
    }
  }

  // Setup default triggers based on niche
  private async setupDefaultTriggers(): Promise<void> {
    try {
      const businessData = await this.getBusinessData()
      const niche = businessData.niche || 'general'

      const defaultTriggers = this.getDefaultTriggersForNiche(niche)
      
      for (const trigger of defaultTriggers) {
        await this.createTrigger(trigger)
      }
    } catch (error) {
      console.error('Error setting up default triggers:', error)
    }
  }

  // Get default triggers for niche
  private getDefaultTriggersForNiche(niche: string): any[] {
    const triggers = {
      salon: [
        {
          event: 'appointment_completed',
          emailCampaign: 'review_request',
          delay: 1440, // 24 hours
          conditions: { service_types: ['haircut', 'color', 'treatment'] }
        },
        {
          event: 'client_inactive',
          emailCampaign: 're_engagement',
          delay: 10080, // 7 days
          conditions: { days_inactive: 30 }
        }
      ],
      medspa: [
        {
          event: 'treatment_completed',
          emailCampaign: 'review_request',
          delay: 4320, // 3 days
          conditions: { treatment_types: ['botox', 'filler', 'laser'] }
        },
        {
          event: 'consultation_scheduled',
          emailCampaign: 'educational',
          delay: 1440, // 24 hours
          conditions: {}
        }
      ],
      realestate: [
        {
          event: 'open_house_scheduled',
          emailCampaign: 'open_house',
          delay: 4320, // 3 days
          conditions: {}
        },
        {
          event: 'market_update',
          emailCampaign: 'market_update',
          delay: 10080, // 7 days
          conditions: { frequency: 'weekly' }
        }
      ]
    }

    return triggers[niche] || []
  }

  // Helper methods
  private async getBusinessData(): Promise<any> {
    const { data } = await supabase
      .from('user_settings')
      .select('niche, business_name')
      .eq('user_id', this.userId)
      .single()
    
    return data || {}
  }

  private async getCampaign(campaignId: string): Promise<any> {
    const { data } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('id', campaignId)
      .eq('user_id', this.userId)
      .single()
    
    return data
  }

  private async getTargetCustomers(conditions: any): Promise<any[]> {
    // This would implement logic to get customers based on conditions
    // For now, return all active customers
    return await this.getActiveCustomers()
  }

  private async createTrigger(triggerData: any): Promise<void> {
    await supabase
      .from('automation_triggers')
      .insert({
        user_id: this.userId,
        ...triggerData,
        is_active: true
      })
  }

  private async updateTriggerLastExecuted(triggerId: string): Promise<void> {
    await supabase
      .from('automation_triggers')
      .update({ last_triggered: new Date().toISOString() })
      .eq('id', triggerId)
  }

  private async evaluateAppointmentCompleted(conditions: any): Promise<boolean> {
    // Implement logic to check if appointment was completed
    return true
  }

  private async evaluateNewLeadCreated(conditions: any): Promise<boolean> {
    // Implement logic to check if new lead was created
    return true
  }

  private async evaluateClientInactive(conditions: any): Promise<boolean> {
    // Implement logic to check if client is inactive
    return true
  }

  private async scheduleFollowUp(customerData: any, nextAppointment: any): Promise<void> {
    // Schedule follow-up email for next appointment
    console.log(`Scheduling follow-up for ${customerData.name} - ${nextAppointment}`)
  }
}

export default EmailAutomationIntegration
