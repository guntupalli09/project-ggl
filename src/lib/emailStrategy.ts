// Small Business Email Strategy Engine
// This module implements email strategies specifically designed for small businesses

export interface EmailStrategy {
  businessType: 'salon' | 'home_services' | 'med_spa' | 'restaurant' | 'retail' | 'general'
  warmupDuration: number // days
  maxDailyVolume: number
  emailTypes: EmailType[]
  contentStrategy: ContentStrategy
  timingStrategy: TimingStrategy
}

export interface EmailType {
  name: string
  priority: number
  frequency: 'daily' | 'weekly' | 'monthly' | 'on_demand'
  warmupStage: number
  template: string
  personalization: string[]
}

export interface ContentStrategy {
  tone: 'professional' | 'friendly' | 'casual' | 'formal'
  length: 'short' | 'medium' | 'long'
  personalization: boolean
  branding: boolean
  callToAction: boolean
}

export interface TimingStrategy {
  bestDays: string[]
  bestHours: number[]
  timezone: string
  avoidWeekends: boolean
  avoidHolidays: boolean
}

// Predefined strategies for different small business types
export const SMALL_BUSINESS_STRATEGIES: Record<string, EmailStrategy> = {
  salon: {
    businessType: 'salon',
    warmupDuration: 42, // 6 weeks
    maxDailyVolume: 500,
    emailTypes: [
      {
        name: 'appointment_confirmation',
        priority: 1,
        frequency: 'on_demand',
        warmupStage: 1,
        template: 'appointment_confirmation',
        personalization: ['customer_name', 'service', 'date', 'time', 'stylist']
      },
      {
        name: 'appointment_reminder',
        priority: 2,
        frequency: 'daily',
        warmupStage: 2,
        template: 'appointment_reminder',
        personalization: ['customer_name', 'service', 'date', 'time', 'stylist']
      },
      {
        name: 'service_followup',
        priority: 3,
        frequency: 'daily',
        warmupStage: 3,
        template: 'service_followup',
        personalization: ['customer_name', 'service', 'stylist', 'next_appointment']
      },
      {
        name: 'review_request',
        priority: 4,
        frequency: 'daily',
        warmupStage: 4,
        template: 'review_request',
        personalization: ['customer_name', 'service', 'stylist', 'review_link']
      },
      {
        name: 'promotional_offer',
        priority: 5,
        frequency: 'weekly',
        warmupStage: 6,
        template: 'promotional_offer',
        personalization: ['customer_name', 'offer', 'expiry_date']
      }
    ],
    contentStrategy: {
      tone: 'friendly',
      length: 'short',
      personalization: true,
      branding: true,
      callToAction: true
    },
    timingStrategy: {
      bestDays: ['Tuesday', 'Wednesday', 'Thursday'],
      bestHours: [9, 10, 11, 14, 15, 16],
      timezone: 'local',
      avoidWeekends: false,
      avoidHolidays: true
    }
  },

  home_services: {
    businessType: 'home_services',
    warmupDuration: 35, // 5 weeks
    maxDailyVolume: 300,
    emailTypes: [
      {
        name: 'service_booking',
        priority: 1,
        frequency: 'on_demand',
        warmupStage: 1,
        template: 'service_booking',
        personalization: ['customer_name', 'service', 'date', 'time', 'address']
      },
      {
        name: 'technician_assigned',
        priority: 2,
        frequency: 'daily',
        warmupStage: 2,
        template: 'technician_assigned',
        personalization: ['customer_name', 'technician_name', 'service', 'date', 'time']
      },
      {
        name: 'service_completed',
        priority: 3,
        frequency: 'daily',
        warmupStage: 3,
        template: 'service_completed',
        personalization: ['customer_name', 'service', 'technician', 'next_service']
      },
      {
        name: 'maintenance_reminder',
        priority: 4,
        frequency: 'monthly',
        warmupStage: 5,
        template: 'maintenance_reminder',
        personalization: ['customer_name', 'service', 'last_service_date']
      }
    ],
    contentStrategy: {
      tone: 'professional',
      length: 'medium',
      personalization: true,
      branding: true,
      callToAction: true
    },
    timingStrategy: {
      bestDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      bestHours: [8, 9, 10, 13, 14, 15],
      timezone: 'local',
      avoidWeekends: true,
      avoidHolidays: true
    }
  },

  med_spa: {
    businessType: 'med_spa',
    warmupDuration: 49, // 7 weeks (more conservative due to medical nature)
    maxDailyVolume: 200,
    emailTypes: [
      {
        name: 'consultation_confirmation',
        priority: 1,
        frequency: 'on_demand',
        warmupStage: 1,
        template: 'consultation_confirmation',
        personalization: ['patient_name', 'procedure', 'date', 'time', 'provider']
      },
      {
        name: 'pre_treatment_instructions',
        priority: 2,
        frequency: 'daily',
        warmupStage: 2,
        template: 'pre_treatment_instructions',
        personalization: ['patient_name', 'procedure', 'date', 'instructions']
      },
      {
        name: 'post_treatment_care',
        priority: 3,
        frequency: 'daily',
        warmupStage: 3,
        template: 'post_treatment_care',
        personalization: ['patient_name', 'procedure', 'care_instructions']
      },
      {
        name: 'follow_up_appointment',
        priority: 4,
        frequency: 'daily',
        warmupStage: 4,
        template: 'follow_up_appointment',
        personalization: ['patient_name', 'procedure', 'next_appointment']
      }
    ],
    contentStrategy: {
      tone: 'professional',
      length: 'medium',
      personalization: true,
      branding: true,
      callToAction: true
    },
    timingStrategy: {
      bestDays: ['Tuesday', 'Wednesday', 'Thursday'],
      bestHours: [9, 10, 11, 14, 15],
      timezone: 'local',
      avoidWeekends: true,
      avoidHolidays: true
    }
  }
}

// Email warm-up calculator for small businesses
export class EmailWarmupCalculator {
  private strategy: EmailStrategy

  constructor(businessType: string) {
    this.strategy = SMALL_BUSINESS_STRATEGIES[businessType] || SMALL_BUSINESS_STRATEGIES.general
  }

  // Calculate daily sending limits for each warm-up stage
  calculateWarmupSchedule(): Array<{stage: number, dailyLimit: number, duration: number}> {
    const schedule: Array<{stage: number, dailyLimit: number, duration: number}> = []
    const totalStages = 6
    const baseLimit = Math.floor(this.strategy.maxDailyVolume / totalStages)

    for (let stage = 1; stage <= totalStages; stage++) {
      let dailyLimit: number
      let duration: number

      switch (stage) {
        case 1:
          dailyLimit = Math.max(10, Math.floor(baseLimit * 0.1))
          duration = 7
          break
        case 2:
          dailyLimit = Math.max(25, Math.floor(baseLimit * 0.2))
          duration = 7
          break
        case 3:
          dailyLimit = Math.max(50, Math.floor(baseLimit * 0.4))
          duration = 7
          break
        case 4:
          dailyLimit = Math.max(100, Math.floor(baseLimit * 0.6))
          duration = 7
          break
        case 5:
          dailyLimit = Math.max(200, Math.floor(baseLimit * 0.8))
          duration = 14
          break
        case 6:
          dailyLimit = this.strategy.maxDailyVolume
          duration = 999 // Ongoing
          break
        default:
          dailyLimit = 10
          duration = 7
      }

      schedule.push({ stage, dailyLimit, duration })
    }

    return schedule
  }

  // Get recommended email types for current warm-up stage
  getEmailTypesForStage(stage: number): EmailType[] {
    return this.strategy.emailTypes.filter(emailType => emailType.warmupStage <= stage)
  }

  // Calculate optimal sending times
  getOptimalSendingTimes(): {day: string, hour: number}[] {
    const times: {day: string, hour: number}[] = []
    
    for (const day of this.strategy.timingStrategy.bestDays) {
      for (const hour of this.strategy.timingStrategy.bestHours) {
        times.push({ day, hour })
      }
    }

    return times
  }

  // Generate warm-up email content
  generateWarmupContent(emailType: string, personalization: Record<string, string>): string {
    const templates = {
      appointment_confirmation: `Hi ${personalization.customer_name || 'there'}!

Your appointment for ${personalization.service || 'our service'} is confirmed for ${personalization.date || 'the scheduled date'} at ${personalization.time || 'the scheduled time'}.

We're looking forward to seeing you!

Best regards,
${personalization.business_name || 'Our Team'}`,

      service_followup: `Hi ${personalization.customer_name || 'there'}!

Thank you for choosing us for your ${personalization.service || 'recent service'}! We hope you had a great experience.

If you have any questions or would like to book another appointment, please don't hesitate to reach out.

Best regards,
${personalization.business_name || 'Our Team'}`,

      review_request: `Hi ${personalization.customer_name || 'there'}!

We hope you enjoyed your recent ${personalization.service || 'service'} with us! 

Your feedback means the world to us and helps other customers discover our services. Would you mind taking a moment to leave us a review?

${personalization.review_link || 'Click here to leave a review'}

Thank you so much!

Best regards,
${personalization.business_name || 'Our Team'}`
    }

    return templates[emailType] || 'Thank you for your business!'
  }

  // Check if business should send emails today
  shouldSendToday(): boolean {
    const today = new Date()
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long' })
    const hour = today.getHours()

    // Check if today is a good day
    const isGoodDay = this.strategy.timingStrategy.bestDays.includes(dayName)
    
    // Check if current hour is good
    const isGoodHour = this.strategy.timingStrategy.bestHours.includes(hour)

    // Check if it's a weekend and we should avoid it
    const isWeekend = today.getDay() === 0 || today.getDay() === 6
    const shouldAvoidWeekend = this.strategy.timingStrategy.avoidWeekends && isWeekend

    return isGoodDay && isGoodHour && !shouldAvoidWeekend
  }

  // Get reputation score interpretation
  getReputationInterpretation(score: number): {level: string, advice: string, canSend: boolean} {
    if (score >= 0.9) {
      return {
        level: 'Excellent',
        advice: 'Your email reputation is excellent! You can send at full capacity.',
        canSend: true
      }
    } else if (score >= 0.7) {
      return {
        level: 'Good',
        advice: 'Your email reputation is good. Continue with current sending volume.',
        canSend: true
      }
    } else if (score >= 0.5) {
      return {
        level: 'Fair',
        advice: 'Your email reputation needs improvement. Reduce sending volume and focus on quality.',
        canSend: true
      }
    } else if (score >= 0.3) {
      return {
        level: 'Poor',
        advice: 'Your email reputation is poor. Significantly reduce sending volume and review your email practices.',
        canSend: false
      }
    } else {
      return {
        level: 'Critical',
        advice: 'Your email reputation is critical. Stop sending emails and focus on improving deliverability.',
        canSend: false
      }
    }
  }
}

// Small business email best practices
export const EMAIL_BEST_PRACTICES = {
  subjectLines: {
    appointment: [
      'Your appointment is confirmed!',
      'Appointment reminder for tomorrow',
      'We\'re looking forward to seeing you!'
    ],
    followup: [
      'How was your experience?',
      'Thank you for choosing us!',
      'We hope you enjoyed your service'
    ],
    review: [
      'Your feedback means everything to us',
      'Help others discover our services',
      'Share your experience with us'
    ]
  },

  contentTips: [
    'Keep subject lines under 50 characters',
    'Use the recipient\'s name in the email',
    'Include a clear call-to-action',
    'Keep emails mobile-friendly',
    'Test different send times',
    'Monitor bounce rates closely',
    'Respond to unsubscribes promptly',
    'Use double opt-in for newsletters'
  ],

  warningSigns: [
    'Bounce rate above 5%',
    'Complaint rate above 0.1%',
    'Low open rates (below 20%)',
    'High unsubscribe rates (above 2%)',
    'Emails going to spam folder'
  ]
}

export default EmailWarmupCalculator
