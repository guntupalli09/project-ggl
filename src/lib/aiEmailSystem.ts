// AI-Powered Email System with Niche Integration
// Integrates with existing automation and extracts data from database

import { supabase } from './supabaseClient'
import { generateAIResponse } from './aiClient'

export interface EmailCampaign {
  id: string
  userId: string
  niche: string
  campaignType: 'review_request' | 're_engagement' | 'market_update' | 'open_house' | 'lead_nurturing' | 'educational' | 'treatment_plan'
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed'
  subject: string
  content: string
  personalization: PersonalizationData
  scheduledFor?: Date
  sentAt?: Date
  metrics: EmailMetrics
}

export interface PersonalizationData {
  customerName: string
  businessName: string
  businessUrl: string
  businessPhone: string
  businessAddress: string
  businessHours: string
  niche: string
  lastService?: string
  lastVisit?: string
  nextAppointment?: string
  customFields: Record<string, any>
}

export interface EmailMetrics {
  sent: number
  delivered: number
  opened: number
  clicked: number
  bounced: number
  unsubscribed: number
  replied: number
}

// Niche-specific email templates and sequences
const NICHE_EMAIL_TEMPLATES = {
  salon: {
    review_request: {
      trigger: 'service_completed',
      delay: 2, // days after service
      subject: "How did you love your {service}? We'd love to hear about it!",
      template: 'review_request_salon'
    },
    re_engagement: {
      trigger: 'inactive_client',
      delay: 30, // days of inactivity
      subject: "We miss you! Here's what's new at {business_name}",
      template: 're_engagement_salon'
    },
    market_update: {
      trigger: 'monthly',
      delay: 0,
      subject: "Latest beauty trends and special offers at {business_name}",
      template: 'market_update_salon'
    }
  },
  medspa: {
    review_request: {
      trigger: 'treatment_completed',
      delay: 3,
      subject: "How are you feeling after your {treatment}? Share your experience!",
      template: 'review_request_medspa'
    },
    educational: {
      trigger: 'consultation_scheduled',
      delay: 1,
      subject: "Preparing for your {treatment} consultation - What to expect",
      template: 'educational_medspa'
    },
    treatment_plan: {
      trigger: 'treatment_plan_created',
      delay: 0,
      subject: "Your personalized {treatment} treatment plan is ready",
      template: 'treatment_plan_medspa'
    }
  },
  realestate: {
    market_update: {
      trigger: 'weekly',
      delay: 0,
      subject: "Weekly market update: {area} real estate insights",
      template: 'market_update_realestate'
    },
    open_house: {
      trigger: 'open_house_scheduled',
      delay: 3,
      subject: "Open house this weekend: {property_address}",
      template: 'open_house_realestate'
    },
    lead_nurturing: {
      trigger: 'lead_created',
      delay: 1,
      subject: "Welcome to {area} real estate market insights",
      template: 'lead_nurturing_realestate'
    }
  },
  home_services: {
    review_request: {
      trigger: 'service_completed',
      delay: 2,
      subject: "How was your {service} experience? Your feedback matters!",
      template: 'review_request_home_services'
    },
    maintenance_reminder: {
      trigger: 'maintenance_due',
      delay: 0,
      subject: "Time for your {service} maintenance - Schedule today!",
      template: 'maintenance_reminder_home_services'
    },
    re_engagement: {
      trigger: 'inactive_client',
      delay: 60,
      subject: "Don't forget about your {service} maintenance schedule",
      template: 're_engagement_home_services'
    }
  }
}

export class AIEmailSystem {
  private userId: string
  private businessData: any
  private niche: string = 'salon'

  constructor(userId: string) {
    this.userId = userId
  }

  // Initialize the email system with business data
  async initialize(): Promise<void> {
    try {
      // Load business data from profile
      this.businessData = await this.loadBusinessData()
      this.niche = this.businessData.niche || 'general'
      
      console.log(`AI Email System initialized for ${this.businessData.business_name} (${this.niche})`)
    } catch (error) {
      console.error('Error initializing AI Email System:', error)
      throw error
    }
  }

  // Generate AI-powered email content based on niche and campaign type
  async generateEmailContent(
    campaignType: string,
    customerData: any,
    customContext?: any
  ): Promise<{subject: string, content: string}> {
    try {
      const personalization = await this.buildPersonalizationData(customerData)
      const template = (NICHE_EMAIL_TEMPLATES as any)[this.niche]?.[campaignType] || (NICHE_EMAIL_TEMPLATES as any).salon[campaignType]
      
      if (!template) {
        throw new Error(`No template found for niche: ${this.niche}, campaign: ${campaignType}`)
      }

      // Build AI prompt with all context
      const prompt = this.buildAIPrompt(template, personalization, customContext)
      
      // Generate AI response
      const aiResponse = await generateAIResponse(prompt)
      
      // Parse and return content
      return this.parseAIResponse(aiResponse)
    } catch (error) {
      console.error('Error generating email content:', error)
      throw error
    }
  }

  // Send email with proper branding
  async sendEmail(
    to: string,
    campaignType: string,
    customerData: any,
    customContext?: any
  ): Promise<{success: boolean, messageId?: string, error?: string}> {
    try {
      // Generate personalized content
      const { subject, content } = await this.generateEmailContent(campaignType, customerData, customContext)
      
      // Send via your email service with proper branding
      const result = await this.sendViaEmailService({
        to: to,
        from: `${this.businessData.business_name} via GetGetLeads <noreply@getgetleads.com>`,
        replyTo: this.businessData.business_email || 'support@getgetleads.com',
        subject: subject,
        html: content,
        text: this.stripHtml(content),
        userId: this.userId,
        campaignType: campaignType
      })

      // Log email to database
      await this.logEmailToDatabase({
        to: to,
        subject: subject,
        content: content,
        campaignType: campaignType,
        customerData: customerData,
        result: result
      })

      return result
    } catch (error) {
      console.error('Error sending email:', error)
      return { success: false, error: (error as Error).message }
    }
  }

  // Trigger email campaigns based on automation events
  async triggerCampaign(
    event: string,
    customerData: any,
    customContext?: any
  ): Promise<void> {
    try {
      const campaignType = this.getCampaignTypeForEvent(event)
      if (!campaignType) return

      // Check if customer should receive this email
      const shouldSend = await this.shouldSendEmail(customerData, campaignType)
      if (!shouldSend) return

      // Send the email
      await this.sendEmail(customerData.email, campaignType, customerData, customContext)
      
      console.log(`Triggered ${campaignType} campaign for ${customerData.name}`)
    } catch (error) {
      console.error('Error triggering campaign:', error)
    }
  }

  // Build personalization data from database
  private async buildPersonalizationData(customerData: any): Promise<PersonalizationData> {
    try {
      // Get customer's service history
      const { data: serviceHistory } = await supabase
        .from('appointments')
        .select('service, created_at, status')
        .eq('customer_email', customerData.email)
        .eq('user_id', this.userId)
        .order('created_at', { ascending: false })
        .limit(5)

      // Get customer's last visit
      const lastVisit = serviceHistory?.[0]
      
      // Get next appointment
      const { data: nextAppointment } = await supabase
        .from('appointments')
        .select('service, appointment_date')
        .eq('customer_email', customerData.email)
        .eq('user_id', this.userId)
        .eq('status', 'confirmed')
        .gte('appointment_date', new Date().toISOString())
        .order('appointment_date', { ascending: true })
        .limit(1)
        .single()

      return {
        customerName: customerData.name || customerData.first_name + ' ' + customerData.last_name,
        businessName: this.businessData.business_name,
        businessUrl: this.businessData.business_website,
        businessPhone: this.businessData.business_phone,
        businessAddress: this.businessData.business_address,
        businessHours: this.businessData.business_hours,
        niche: this.niche,
        lastService: lastVisit?.service,
        lastVisit: lastVisit?.created_at,
        nextAppointment: nextAppointment?.appointment_date,
        customFields: {
          serviceHistory: serviceHistory,
          totalVisits: serviceHistory?.length || 0,
          customerSince: customerData.created_at,
          preferredServices: this.extractPreferredServices(serviceHistory || [])
        }
      }
    } catch (error) {
      console.error('Error building personalization data:', error)
      return {
        customerName: customerData.name || 'Valued Customer',
        businessName: this.businessData.business_name,
        businessUrl: this.businessData.business_website,
        businessPhone: this.businessData.business_phone,
        businessAddress: this.businessData.business_address,
        businessHours: this.businessData.business_hours,
        niche: this.niche,
        customFields: {}
      }
    }
  }

  // Build AI prompt with all context
  private buildAIPrompt(template: any, personalization: PersonalizationData, customContext?: any): string {
    return `
You are an AI email marketing expert specializing in ${this.niche} businesses. Generate a personalized email for ${personalization.customerName}.

BUSINESS CONTEXT:
- Business Name: ${personalization.businessName}
- Business Type: ${this.niche}
- Website: ${personalization.businessUrl}
- Phone: ${personalization.businessPhone}
- Address: ${personalization.businessAddress}
- Hours: ${personalization.businessHours}

CUSTOMER CONTEXT:
- Name: ${personalization.customerName}
- Last Service: ${personalization.lastService || 'Not specified'}
- Last Visit: ${personalization.lastVisit || 'Not specified'}
- Next Appointment: ${personalization.nextAppointment || 'Not scheduled'}
- Total Visits: ${personalization.customFields.totalVisits || 0}
- Preferred Services: ${personalization.customFields.preferredServices?.join(', ') || 'Not specified'}

EMAIL TYPE: ${template.template}
TRIGGER: ${template.trigger}

CUSTOM CONTEXT: ${customContext ? JSON.stringify(customContext) : 'None'}

REQUIREMENTS:
1. Use a warm, professional tone appropriate for ${this.niche}
2. Personalize with customer's name and service history
3. Include relevant business information
4. Add a clear call-to-action
5. Keep subject line under 50 characters
6. Keep content under 300 words
7. Make it mobile-friendly
8. Include business contact information
9. Use proper sender branding: "${personalization.businessName} via GetGetLeads"

SPECIAL INSTRUCTIONS:
- For review requests: Make it easy and rewarding to leave a review
- For re-engagement: Offer something special to bring them back
- For market updates: Provide valuable, relevant information
- For educational content: Be informative and helpful
- For treatment plans: Be detailed and reassuring

Return in this format:
SUBJECT: [Email subject line]
CONTENT: [Email content in HTML format]
    `.trim()
  }

  // Parse AI response
  private parseAIResponse(aiResponse: string): {subject: string, content: string} {
    const subjectMatch = aiResponse.match(/SUBJECT:\s*(.+)/i)
    const contentMatch = aiResponse.match(/CONTENT:\s*([\s\S]+)/i)
    
    return {
      subject: subjectMatch ? subjectMatch[1].trim() : 'Thank you for your business!',
      content: contentMatch ? contentMatch[1].trim() : 'Thank you for your business!'
    }
  }

  // Load business data from profile
  private async loadBusinessData(): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select(`
          business_name,
          business_website,
          business_phone,
          business_address,
          business_hours,
          business_email,
          niche_template_id,
          niche
        `)
        .eq('user_id', this.userId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error loading business data:', error)
      return {
        business_name: 'Your Business',
        business_website: '',
        business_phone: '',
        business_address: '',
        business_hours: '',
        business_email: '',
        niche: 'general'
      }
    }
  }

  // Get campaign type for automation event
  private getCampaignTypeForEvent(event: string): string | null {
    const eventMap = {
      'service_completed': 'review_request',
      'treatment_completed': 'review_request',
      'inactive_client': 're_engagement',
      'monthly_update': 'market_update',
      'weekly_update': 'market_update',
      'open_house_scheduled': 'open_house',
      'lead_created': 'lead_nurturing',
      'consultation_scheduled': 'educational',
      'treatment_plan_created': 'treatment_plan',
      'maintenance_due': 'maintenance_reminder'
    }
    
    return (eventMap as any)[event] || null
  }

  // Check if customer should receive email
  private async shouldSendEmail(customerData: any, campaignType: string): Promise<boolean> {
    try {
      // Check if customer has unsubscribed
      const { data: unsubscribe } = await supabase
        .from('email_unsubscribes')
        .select('id')
        .eq('email', customerData.email)
        .eq('user_id', this.userId)
        .single()

      if (unsubscribe) return false

      // Check email frequency limits
      const { data: recentEmails } = await supabase
        .from('email_logs')
        .select('sent_at')
        .eq('customer_email', customerData.email)
        .eq('user_id', this.userId)
        .gte('sent_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days

      if (recentEmails && recentEmails.length >= 3) return false // Max 3 emails per week

      return true
    } catch (error) {
      console.error('Error checking email eligibility:', error)
      return true // Default to sending if check fails
    }
  }

  // Send via email service
  private async sendViaEmailService(emailData: any): Promise<{success: boolean, messageId?: string, error?: string}> {
    try {
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.INTERNAL_API_KEY || 'internal-key'}`
        },
        body: JSON.stringify(emailData)
      })

      if (!response.ok) {
        const error = await response.json()
        return { success: false, error: (error as Error).message }
      }

      const result = await response.json()
      return { success: true, messageId: result.messageId }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  // Log email to database
  private async logEmailToDatabase(logData: any): Promise<void> {
    try {
      await supabase
        .from('email_logs')
        .insert({
          user_id: this.userId,
          customer_email: logData.to,
          subject: logData.subject,
          content: logData.content,
          campaign_type: logData.campaignType,
          customer_data: logData.customerData,
          sent_at: new Date().toISOString(),
          status: logData.result.success ? 'sent' : 'failed',
          message_id: logData.result.messageId
        })
    } catch (error) {
      console.error('Error logging email:', error)
    }
  }

  // Extract preferred services from history
  private extractPreferredServices(serviceHistory: any[]): string[] {
    if (!serviceHistory) return []
    
    const serviceCounts = serviceHistory.reduce((acc, service) => {
      acc[service.service] = (acc[service.service] || 0) + 1
      return acc
    }, {})

    return Object.entries(serviceCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([service]) => service)
  }

  // Strip HTML for text version
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
  }
}

export default AIEmailSystem
