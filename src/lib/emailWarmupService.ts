// Email Warm-up Service for Small Businesses
// Handles the automated warm-up process with smart scheduling and monitoring

import { supabase } from './supabaseClient'
import { EmailWarmupCalculator, SMALL_BUSINESS_STRATEGIES } from './emailStrategy'

export interface WarmupProgress {
  domainId: string
  currentStage: number
  dailyLimit: number
  emailsSentToday: number
  reputationScore: number
  daysInCurrentStage: number
  nextStageIn: number
  status: 'warming' | 'warmed' | 'paused' | 'suspended'
}

export interface WarmupEmail {
  id: string
  recipientEmail: string
  subject: string
  content: string
  emailType: string
  scheduledFor: Date
  priority: number
}

export class EmailWarmupService {
  private calculator: EmailWarmupCalculator

  constructor(businessType: string) {
    this.calculator = new EmailWarmupCalculator(businessType)
  }

  // Initialize warm-up for a new domain
  async initializeWarmup(userId: string, domain: string, businessType: string): Promise<string> {
    try {
      const strategy = SMALL_BUSINESS_STRATEGIES[businessType] || SMALL_BUSINESS_STRATEGIES.general
      const schedule = this.calculator.calculateWarmupSchedule()

      // Create domain record
      const { data: domainData, error: domainError } = await supabase
        .from('email_domains')
        .insert({
          user_id: userId,
          domain: domain,
          status: 'warming',
          warmup_stage: 1,
          daily_limit: schedule[0].dailyLimit
        })
        .select()
        .single()

      if (domainError) throw domainError

      // Create warm-up schedule records
      const scheduleRecords = schedule.map(s => ({
        domain_id: domainData.id,
        stage: s.stage,
        daily_limit: s.dailyLimit,
        duration_days: s.duration,
        email_types: strategy.emailTypes
          .filter(et => et.warmupStage <= s.stage)
          .map(et => et.name),
        content_templates: {}
      }))

      const { error: scheduleError } = await supabase
        .from('warmup_schedules')
        .insert(scheduleRecords)

      if (scheduleError) throw scheduleError

      // Generate initial warm-up emails
      await this.generateWarmupEmails(domainData.id, 1)

      return domainData.id
    } catch (error) {
      console.error('Error initializing warm-up:', error)
      throw error
    }
  }

  // Generate warm-up emails for a specific stage
  async generateWarmupEmails(domainId: string, stage: number): Promise<void> {
    try {
      const { data: domain } = await supabase
        .from('email_domains')
        .select('*')
        .eq('id', domainId)
        .single()

      if (!domain) throw new Error('Domain not found')

      const emailTypes = this.calculator.getEmailTypesForStage(stage)
      const emailsToGenerate = Math.min(domain.daily_limit, 50) // Generate up to daily limit

      const warmupEmails: any[] = []

      for (let i = 0; i < emailsToGenerate; i++) {
        const emailType = emailTypes[Math.floor(Math.random() * emailTypes.length)]
        const recipientEmail = this.generateTestEmail(domain.domain)
        
        const personalization = {
          customer_name: this.generateRandomName(),
          business_name: domain.domain.split('.')[0],
          service: this.getRandomService(),
          date: this.getRandomDate(),
          time: this.getRandomTime()
        }

        const content = this.calculator.generateWarmupContent(emailType.name, personalization)
        const subject = this.generateSubject(emailType.name, personalization)

        warmupEmails.push({
          domain_id: domainId,
          recipient_email: recipientEmail,
          subject: subject,
          content: content,
          email_type: emailType.name,
          priority: emailType.priority,
          scheduled_for: this.getNextSendingTime(),
          status: 'pending'
        })
      }

      const { error } = await supabase
        .from('warmup_email_queue')
        .insert(warmupEmails)

      if (error) throw error

      console.log(`Generated ${warmupEmails.length} warm-up emails for stage ${stage}`)
    } catch (error) {
      console.error('Error generating warm-up emails:', error)
      throw error
    }
  }

  // Process warm-up email queue
  async processWarmupQueue(domainId: string): Promise<{sent: number, failed: number}> {
    try {
      const { data: domain } = await supabase
        .from('email_domains')
        .select('*')
        .eq('id', domainId)
        .single()

      if (!domain) throw new Error('Domain not found')

      // Check if we should send emails today
      if (!this.calculator.shouldSendToday()) {
        return { sent: 0, failed: 0 }
      }

      // Get pending emails for today
      const { data: pendingEmails } = await supabase
        .from('warmup_email_queue')
        .select('*')
        .eq('domain_id', domainId)
        .eq('status', 'pending')
        .lte('scheduled_for', new Date().toISOString())
        .order('priority', { ascending: true })
        .limit(domain.daily_limit)

      if (!pendingEmails || pendingEmails.length === 0) {
        return { sent: 0, failed: 0 }
      }

      let sent = 0
      let failed = 0

      for (const email of pendingEmails) {
        try {
          // Send email via your email service
          const result = await this.sendEmail(email)
          
          if (result.success) {
            // Update email status
            await supabase
              .from('warmup_email_queue')
              .update({ 
                status: 'sent', 
                sent_at: new Date().toISOString() 
              })
              .eq('id', email.id)

            // Update domain stats
            await supabase
              .from('email_domains')
              .update({ 
                total_sent: domain.total_sent + 1,
                updated_at: new Date().toISOString()
              })
              .eq('id', domainId)

            sent++
          } else {
            throw new Error(result.error || 'Failed to send email')
          }
        } catch (error) {
          console.error(`Failed to send email ${email.id}:`, error)
          
          // Update attempt count
          await supabase
            .from('warmup_email_queue')
            .update({ 
              attempts: email.attempts + 1,
              error_message: (error as Error).message
            })
            .eq('id', email.id)

          // Mark as failed if max attempts reached
          if (email.attempts + 1 >= email.max_attempts) {
            await supabase
              .from('warmup_email_queue')
              .update({ status: 'failed' })
              .eq('id', email.id)
          }

          failed++
        }
      }

      // Check if ready to advance to next stage
      await this.checkStageAdvancement(domainId)

      return { sent, failed }
    } catch (error) {
      console.error('Error processing warm-up queue:', error)
      throw error
    }
  }

  // Check if domain is ready to advance to next warm-up stage
  async checkStageAdvancement(domainId: string): Promise<void> {
    try {
      const { data: domain } = await supabase
        .from('email_domains')
        .select('*')
        .eq('id', domainId)
        .single()

      if (!domain) return

      const daysInStage = Math.floor(
        (new Date().getTime() - new Date(domain.created_at).getTime()) / (1000 * 60 * 60 * 24)
      )

      const { data: schedule } = await supabase
        .from('warmup_schedules')
        .select('duration_days')
        .eq('domain_id', domainId)
        .eq('stage', domain.warmup_stage)
        .single()

      if (schedule && daysInStage >= schedule.duration_days) {
        const nextStage = Math.min(domain.warmup_stage + 1, 6)
        
        // Update domain to next stage
        await supabase
          .from('email_domains')
          .update({ 
            warmup_stage: nextStage,
            updated_at: new Date().toISOString()
          })
          .eq('id', domainId)

        // Generate emails for new stage
        await this.generateWarmupEmails(domainId, nextStage)

        console.log(`Domain ${domainId} advanced to stage ${nextStage}`)
      }
    } catch (error) {
      console.error('Error checking stage advancement:', error)
    }
  }

  // Get warm-up progress for a domain
  async getWarmupProgress(domainId: string): Promise<WarmupProgress | null> {
    try {
      const { data: domain } = await supabase
        .from('email_domains')
        .select('*')
        .eq('id', domainId)
        .single()

      if (!domain) return null

      const daysInStage = Math.floor(
        (new Date().getTime() - new Date(domain.created_at).getTime()) / (1000 * 60 * 60 * 24)
      )

      // Get emails sent today
      const today = new Date().toISOString().split('T')[0]
      const { data: todayEmails } = await supabase
        .from('warmup_email_queue')
        .select('id')
        .eq('domain_id', domainId)
        .eq('status', 'sent')
        .gte('sent_at', today)

      const emailsSentToday = todayEmails?.length || 0

      return {
        domainId: domain.id,
        currentStage: domain.warmup_stage,
        dailyLimit: domain.daily_limit,
        emailsSentToday,
        reputationScore: domain.reputation_score,
        daysInCurrentStage: daysInStage,
        nextStageIn: Math.max(0, 7 - daysInStage), // Assuming 7 days per stage
        status: domain.status as any
      }
    } catch (error) {
      console.error('Error getting warm-up progress:', error)
      return null
    }
  }

  // Send individual email (integrate with your email service)
  private async sendEmail(email: any): Promise<{success: boolean, error?: string}> {
    try {
      // This would integrate with your actual email service (SendGrid, etc.)
      // For now, we'll simulate the email send
      
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.INTERNAL_API_KEY || 'internal-key'}`
        },
        body: JSON.stringify({
          to: email.recipient_email,
          subject: email.subject,
          body: email.content
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

  // Helper methods for generating test data
  private generateTestEmail(domain: string): string {
    const testEmails = [
      'test1@example.com',
      'test2@example.com', 
      'test3@example.com',
      'warmup@example.com',
      'demo@example.com'
    ]
    return testEmails[Math.floor(Math.random() * testEmails.length)]
  }

  private generateRandomName(): string {
    const names = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Lisa', 'Chris', 'Amy']
    return names[Math.floor(Math.random() * names.length)]
  }

  private getRandomService(): string {
    const services = ['haircut', 'massage', 'facial', 'consultation', 'treatment', 'service']
    return services[Math.floor(Math.random() * services.length)]
  }

  private getRandomDate(): string {
    const date = new Date()
    date.setDate(date.getDate() + Math.floor(Math.random() * 30))
    return date.toLocaleDateString()
  }

  private getRandomTime(): string {
    const hours = [9, 10, 11, 14, 15, 16]
    const hour = hours[Math.floor(Math.random() * hours.length)]
    return `${hour}:00`
  }

  private generateSubject(emailType: string, personalization: any): string {
    const subjects = {
      appointment_confirmation: `Your appointment is confirmed!`,
      service_followup: `How was your experience?`,
      review_request: `Your feedback means everything to us`,
      appointment_reminder: `Appointment reminder for tomorrow`
    }
    return subjects[emailType] || 'Thank you for your business!'
  }

  private getNextSendingTime(): string {
    const now = new Date()
    const nextHour = now.getHours() + 1
    now.setHours(nextHour, 0, 0, 0)
    return now.toISOString()
  }
}

export default EmailWarmupService
