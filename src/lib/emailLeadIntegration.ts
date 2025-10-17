// Email Lead Integration for Small Businesses
// This module shows how to integrate email strategy with existing lead generation

import { supabase } from './supabaseClient'
import { generateAIResponse } from './aiClient'

export interface LeadEmailFlow {
  leadId: string
  businessType: string
  leadSource: string
  clientInfo: {
    name: string
    email: string
    phone?: string
    service?: string
    appointmentDate?: string
  }
  emailSequence: EmailStep[]
  currentStep: number
  status: 'active' | 'paused' | 'completed' | 'failed'
}

export interface EmailStep {
  stepNumber: number
  emailType: string
  subject: string
  content: string
  scheduledFor: Date
  sentAt?: Date
  openedAt?: Date
  clickedAt?: Date
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed'
}

// Business-specific email sequences
const EMAIL_SEQUENCES = {
  salon: {
    welcome_series: [
      {
        stepNumber: 1,
        emailType: 'welcome',
        delay: 0, // Immediate
        template: 'welcome_new_client'
      },
      {
        stepNumber: 2,
        emailType: 'service_intro',
        delay: 1, // 1 day
        template: 'service_introduction'
      },
      {
        stepNumber: 3,
        emailType: 'booking_reminder',
        delay: 3, // 3 days
        template: 'book_appointment'
      },
      {
        stepNumber: 4,
        emailType: 'stylist_intro',
        delay: 7, // 1 week
        template: 'meet_your_stylist'
      }
    ],
    appointment_flow: [
      {
        stepNumber: 1,
        emailType: 'confirmation',
        delay: 0,
        template: 'appointment_confirmation'
      },
      {
        stepNumber: 2,
        emailType: 'reminder_24h',
        delay: -1, // 24 hours before
        template: 'appointment_reminder_24h'
      },
      {
        stepNumber: 3,
        emailType: 'reminder_2h',
        delay: -0.083, // 2 hours before
        template: 'appointment_reminder_2h'
      },
      {
        stepNumber: 4,
        emailType: 'followup',
        delay: 1, // 1 day after
        template: 'service_followup'
      },
      {
        stepNumber: 5,
        emailType: 'review_request',
        delay: 2, // 2 days after
        template: 'review_request'
      }
    ]
  },
  medspa: {
    consultation_flow: [
      {
        stepNumber: 1,
        emailType: 'consultation_confirmation',
        delay: 0,
        template: 'consultation_confirmation'
      },
      {
        stepNumber: 2,
        emailType: 'pre_consultation',
        delay: 1,
        template: 'pre_consultation_instructions'
      },
      {
        stepNumber: 3,
        emailType: 'consultation_reminder',
        delay: -1,
        template: 'consultation_reminder'
      },
      {
        stepNumber: 4,
        emailType: 'post_consultation',
        delay: 1,
        template: 'post_consultation_followup'
      }
    ],
    treatment_flow: [
      {
        stepNumber: 1,
        emailType: 'treatment_confirmation',
        delay: 0,
        template: 'treatment_confirmation'
      },
      {
        stepNumber: 2,
        emailType: 'pre_treatment',
        delay: 3,
        template: 'pre_treatment_instructions'
      },
      {
        stepNumber: 3,
        emailType: 'treatment_reminder',
        delay: -1,
        template: 'treatment_reminder'
      },
      {
        stepNumber: 4,
        emailType: 'post_treatment',
        delay: 1,
        template: 'post_treatment_care'
      },
      {
        stepNumber: 5,
        emailType: 'follow_up',
        delay: 7,
        template: 'treatment_followup'
      }
    ]
  },
  realestate: {
    lead_nurture: [
      {
        stepNumber: 1,
        emailType: 'welcome',
        delay: 0,
        template: 'welcome_new_lead'
      },
      {
        stepNumber: 2,
        emailType: 'market_update',
        delay: 3,
        template: 'market_update'
      },
      {
        stepNumber: 3,
        emailType: 'buyer_guide',
        delay: 7,
        template: 'buyer_guide'
      },
      {
        stepNumber: 4,
        emailType: 'new_listings',
        delay: 14,
        template: 'new_listings_alert'
      },
      {
        stepNumber: 5,
        emailType: 'open_houses',
        delay: 21,
        template: 'open_house_invites'
      }
    ]
  }
}

export class EmailLeadIntegration {
  private businessType: string
  private userId: string

  constructor(businessType: string, userId: string) {
    this.businessType = businessType
    this.userId = userId
  }

  // Initialize email flow for a new lead
  async initializeLeadEmailFlow(leadData: any): Promise<LeadEmailFlow> {
    try {
      const sequence = this.getEmailSequence(leadData.leadSource)
      
      const emailFlow: LeadEmailFlow = {
        leadId: leadData.id,
        businessType: this.businessType,
        leadSource: leadData.leadSource,
        clientInfo: {
          name: leadData.name,
          email: leadData.email,
          phone: leadData.phone,
          service: leadData.service,
          appointmentDate: leadData.appointmentDate
        },
        emailSequence: [],
        currentStep: 0,
        status: 'active'
      }

      // Generate email steps
      for (const step of sequence) {
        const emailStep = await this.generateEmailStep(step, leadData)
        emailFlow.emailSequence.push(emailStep)
      }

      // Save to database
      await this.saveEmailFlow(emailFlow)

      // Schedule first email
      await this.scheduleNextEmail(emailFlow)

      return emailFlow
    } catch (error) {
      console.error('Error initializing lead email flow:', error)
      throw error
    }
  }

  // Generate AI-powered email content
  async generateEmailStep(stepConfig: any, leadData: any): Promise<EmailStep> {
    try {
      // Get business context
      const businessContext = await this.getBusinessContext()
      
      // Generate personalized content using AI
      const prompt = this.buildEmailPrompt(stepConfig, leadData, businessContext)
      const aiResponse = await generateAIResponse(prompt)
      
      // Parse AI response
      const { subject, content } = this.parseAIResponse(aiResponse)
      
      // Calculate send time
      const scheduledFor = this.calculateSendTime(stepConfig.delay, leadData.appointmentDate)
      
      return {
        stepNumber: stepConfig.stepNumber,
        emailType: stepConfig.emailType,
        subject: subject,
        content: content,
        scheduledFor: scheduledFor,
        status: 'pending'
      }
    } catch (error) {
      console.error('Error generating email step:', error)
      throw error
    }
  }

  // Process email queue and send emails
  async processEmailQueue(): Promise<{sent: number, failed: number}> {
    try {
      const { data: pendingEmails } = await supabase
        .from('email_flows')
        .select(`
          *,
          email_sequence:email_steps(*)
        `)
        .eq('user_id', this.userId)
        .eq('status', 'active')
        .lte('next_send_time', new Date().toISOString())

      if (!pendingEmails || pendingEmails.length === 0) {
        return { sent: 0, failed: 0 }
      }

      let sent = 0
      let failed = 0

      for (const flow of pendingEmails) {
        try {
          const nextStep = flow.email_sequence.find((step: any) => step.status === 'pending')
          if (!nextStep) continue

          // Send email
          const result = await this.sendEmail(nextStep, flow.client_info)
          
          if (result.success) {
            // Update step status
            await supabase
              .from('email_steps')
              .update({ 
                status: 'sent',
                sent_at: new Date().toISOString()
              })
              .eq('id', nextStep.id)

            // Update flow
            await this.updateEmailFlow(flow.id, nextStep.step_number + 1)
            
            sent++
          } else {
            throw new Error(result.error)
          }
        } catch (error) {
          console.error(`Failed to send email for flow ${flow.id}:`, error)
          failed++
        }
      }

      return { sent, failed }
    } catch (error) {
      console.error('Error processing email queue:', error)
      throw error
    }
  }

  // Get email sequence based on lead source
  private getEmailSequence(leadSource: string): any[] {
    const sequences = EMAIL_SEQUENCES[this.businessType] || {}
    
    // Determine which sequence to use based on lead source
    if (leadSource === 'appointment_booking') {
      return sequences.appointment_flow || sequences.welcome_series || []
    } else if (leadSource === 'consultation_request') {
      return sequences.consultation_flow || sequences.welcome_series || []
    } else if (leadSource === 'website_form') {
      return sequences.lead_nurture || sequences.welcome_series || []
    }
    
    return sequences.welcome_series || []
  }

  // Build AI prompt for email generation
  private buildEmailPrompt(stepConfig: any, leadData: any, businessContext: any): string {
    return `
Generate a ${stepConfig.emailType} email for a ${this.businessType} business.

Client Information:
- Name: ${leadData.name}
- Email: ${leadData.email}
- Phone: ${leadData.phone || 'Not provided'}
- Service: ${leadData.service || 'Not specified'}
- Appointment Date: ${leadData.appointmentDate || 'Not scheduled'}

Business Context:
- Business Name: ${businessContext.business_name}
- Business Type: ${this.businessType}
- Business Hours: ${businessContext.business_hours}
- Website: ${businessContext.business_website}
- Booking Link: ${businessContext.booking_link}

Email Type: ${stepConfig.emailType}
Template: ${stepConfig.template}

Requirements:
1. Make it personal and professional
2. Include relevant business information
3. Add a clear call-to-action
4. Keep it under 200 words
5. Use a friendly, welcoming tone
6. Include the client's name
7. Make it mobile-friendly

Return the response in this format:
SUBJECT: [Email subject line]
CONTENT: [Email content in HTML format]
    `.trim()
  }

  // Parse AI response to extract subject and content
  private parseAIResponse(aiResponse: string): {subject: string, content: string} {
    const subjectMatch = aiResponse.match(/SUBJECT:\s*(.+)/i)
    const contentMatch = aiResponse.match(/CONTENT:\s*([\s\S]+)/i)
    
    return {
      subject: subjectMatch ? subjectMatch[1].trim() : 'Thank you for your interest!',
      content: contentMatch ? contentMatch[1].trim() : 'Thank you for your interest in our services!'
    }
  }

  // Calculate send time based on delay and appointment date
  private calculateSendTime(delay: number, appointmentDate?: string): Date {
    const now = new Date()
    
    if (delay < 0) {
      // Before appointment
      const appointment = appointmentDate ? new Date(appointmentDate) : now
      return new Date(appointment.getTime() + (delay * 24 * 60 * 60 * 1000))
    } else {
      // After lead creation
      return new Date(now.getTime() + (delay * 24 * 60 * 60 * 1000))
    }
  }

  // Get business context for personalization
  private async getBusinessContext(): Promise<any> {
    try {
      const { data } = await supabase
        .from('user_settings')
        .select('business_name, business_hours, business_website, booking_link')
        .eq('user_id', this.userId)
        .single()

      return data || {}
    } catch (error) {
      console.error('Error getting business context:', error)
      return {}
    }
  }

  // Send individual email
  private async sendEmail(emailStep: any, clientInfo: any): Promise<{success: boolean, error?: string}> {
    try {
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.INTERNAL_API_KEY || 'internal-key'}`
        },
        body: JSON.stringify({
          to: clientInfo.email,
          subject: emailStep.subject,
          body: emailStep.content,
          user_id: this.userId
        })
      })

      if (!response.ok) {
        const error = await response.json()
        return { success: false, error: (error as Error).message }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  // Save email flow to database
  private async saveEmailFlow(emailFlow: LeadEmailFlow): Promise<void> {
    try {
      const { error } = await supabase
        .from('email_flows')
        .insert({
          lead_id: emailFlow.leadId,
          user_id: this.userId,
          business_type: emailFlow.businessType,
          lead_source: emailFlow.leadSource,
          client_info: emailFlow.clientInfo,
          current_step: emailFlow.currentStep,
          status: emailFlow.status,
          next_send_time: emailFlow.emailSequence[0]?.scheduledFor
        })

      if (error) throw error

      // Save email steps
      const emailSteps = emailFlow.emailSequence.map(step => ({
        email_flow_id: emailFlow.leadId, // This would be the actual flow ID
        step_number: step.stepNumber,
        email_type: step.emailType,
        subject: step.subject,
        content: step.content,
        scheduled_for: step.scheduledFor,
        status: step.status
      }))

      await supabase
        .from('email_steps')
        .insert(emailSteps)
    } catch (error) {
      console.error('Error saving email flow:', error)
      throw error
    }
  }

  // Update email flow progress
  private async updateEmailFlow(flowId: string, nextStep: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('email_flows')
        .update({ 
          current_step: nextStep,
          updated_at: new Date().toISOString()
        })
        .eq('id', flowId)

      if (error) throw error
    } catch (error) {
      console.error('Error updating email flow:', error)
      throw error
    }
  }

  // Schedule next email in sequence
  private async scheduleNextEmail(emailFlow: LeadEmailFlow): Promise<void> {
    try {
      const nextStep = emailFlow.emailSequence.find(step => step.status === 'pending')
      if (!nextStep) return

      // This would integrate with your job scheduler (cron, queue, etc.)
      console.log(`Scheduling email for ${emailFlow.clientInfo.name} at ${nextStep.scheduledFor}`)
    } catch (error) {
      console.error('Error scheduling next email:', error)
      throw error
    }
  }
}

export default EmailLeadIntegration
