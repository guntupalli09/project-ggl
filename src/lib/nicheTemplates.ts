// Niche-Specific Templates and Configurations
export interface NicheTemplate {
  id: string
  name: string
  display_name: string
  config: {
    workflow: {
      [key: string]: {
        automation_enabled: boolean
        delay_minutes: number
        channel: 'email' | 'sms' | 'both'
      }
    }
    branding: {
      primary_color: string
      secondary_color: string
      logo_url: string
      font_family: string
    }
    content_templates: {
      [key: string]: string
    }
    features: {
      before_after_photos: boolean
      hipaa_compliant_feedback: boolean
      technician_metadata: boolean
    }
  }
}

export const NICHE_TEMPLATES: Record<string, NicheTemplate> = {
  'salon_barber_spa': {
    id: 'salon-barber-spa',
    name: 'salon_barber_spa',
    display_name: 'Salon/Barber/Spa',
    config: {
      workflow: {
        lead_to_booking: { 
          automation_enabled: true, 
          delay_minutes: 0, 
          channel: 'email' 
        },
        booking_to_review: { 
          automation_enabled: true, 
          delay_minutes: 120, // 2 hours after service
          channel: 'sms' 
        },
        review_to_referral: { 
          automation_enabled: true, 
          delay_minutes: 0, 
          channel: 'sms' 
        }
      },
      branding: {
        primary_color: '#6366F1',
        secondary_color: '#8B5CF6',
        logo_url: '/niche_logos/salon.png',
        font_family: 'Inter'
      },
      content_templates: {
        review_request: "Hi {{customer_name}}! ✂️ How was your {{service_type}} at {{business_name}}? We'd love your feedback - it helps us improve! Leave a quick review: {{review_link}}",
        referral_offer: "💖 Love your new look? Share this link with friends - they get $10 off their first visit, and you get $10 credit too! {{referral_link}}",
        booking_confirmation: "✅ Your {{service_type}} appointment at {{business_name}} is confirmed for {{booking_time}}. We can't wait to see you!",
        follow_up: "Hi {{customer_name}}! Hope you're loving your new {{service_type}}! Any questions or need to book again? We're here for you! 💅"
      },
      features: {
        before_after_photos: false,
        hipaa_compliant_feedback: false,
        technician_metadata: false
      }
    }
  },

  'home_services': {
    id: 'home-services',
    name: 'home_services',
    display_name: 'Home Services',
    config: {
      workflow: {
        lead_to_booking: { 
          automation_enabled: true, 
          delay_minutes: 0, 
          channel: 'email' 
        },
        booking_to_review: { 
          automation_enabled: true, 
          delay_minutes: 360, // 6 hours after service completion
          channel: 'sms' 
        },
        review_to_referral: { 
          automation_enabled: true, 
          delay_minutes: 0, 
          channel: 'sms' 
        }
      },
      branding: {
        primary_color: '#22C55E',
        secondary_color: '#10B981',
        logo_url: '/niche_logos/home_services.png',
        font_family: 'Roboto'
      },
      content_templates: {
        review_request: "Hi {{customer_name}}! 🔧 How was our {{service_type}} service at {{business_name}}? Your feedback helps us serve you better. Leave a review: {{review_link}}",
        referral_offer: "🏠 Happy with our work? Refer a friend and both get $25 off your next service! Share this link: {{referral_link}}",
        booking_confirmation: "✅ Your {{service_type}} appointment with {{business_name}} is scheduled for {{booking_time}}. We'll call 30 minutes before arrival.",
        follow_up: "Hi {{customer_name}}! Everything working well with your {{service_type}}? We're here if you need any follow-up service! 🔧"
      },
      features: {
        before_after_photos: true,
        hipaa_compliant_feedback: false,
        technician_metadata: true
      }
    }
  },

  'med_spa': {
    id: 'med-spa',
    name: 'med_spa',
    display_name: 'Med Spa/Aesthetic Clinic',
    config: {
      workflow: {
        lead_to_booking: { 
          automation_enabled: true, 
          delay_minutes: 0, 
          channel: 'email' 
        },
        booking_to_feedback: { 
          automation_enabled: true, 
          delay_minutes: 1440, // 24 hours after treatment
          channel: 'email' 
        },
        feedback_to_referral: { 
          automation_enabled: true, 
          delay_minutes: 0, 
          channel: 'email' 
        }
      },
      branding: {
        primary_color: '#EC4899',
        secondary_color: '#E879F9',
        logo_url: '/niche_logos/med_spa.png',
        font_family: 'Montserrat'
      },
      content_templates: {
        feedback_request: "Dear {{customer_name}}, we value your feedback on your recent {{service_type}} treatment at {{business_name}}. Please share your experience confidentially: {{feedback_link}}",
        referral_offer: "✨ We appreciate your trust in {{business_name}}. Refer a friend and both receive a special treatment discount. Share: {{referral_link}}",
        booking_confirmation: "Your {{service_type}} appointment at {{business_name}} is confirmed for {{booking_time}}. Please arrive 15 minutes early for consultation.",
        follow_up: "Hi {{customer_name}}! How are you feeling after your {{service_type}} treatment? We're here to support your wellness journey! ✨"
      },
      features: {
        before_after_photos: false,
        hipaa_compliant_feedback: true,
        technician_metadata: false
      }
    }
  }
}

/**
 * Get template for specific niche
 */
export function getNicheTemplate(nicheName: string): NicheTemplate | null {
  return NICHE_TEMPLATES[nicheName] || null
}

/**
 * Get all available niche templates
 */
export function getAllNicheTemplates(): NicheTemplate[] {
  return Object.values(NICHE_TEMPLATES)
}

/**
 * Get workflow configuration for niche
 */
export function getWorkflowConfig(nicheName: string) {
  const template = getNicheTemplate(nicheName)
  return template?.config.workflow || null
}

/**
 * Get content template for niche and type
 */
export function getContentTemplate(nicheName: string, templateType: string): string | null {
  const template = getNicheTemplate(nicheName)
  return template?.config.content_templates[templateType] || null
}

/**
 * Get branding configuration for niche
 */
export function getBrandingConfig(nicheName: string) {
  const template = getNicheTemplate(nicheName)
  return template?.config.branding || null
}

/**
 * Get features configuration for niche
 */
export function getFeaturesConfig(nicheName: string) {
  const template = getNicheTemplate(nicheName)
  return template?.config.features || null
}

/**
 * Check if niche supports specific feature
 */
export function hasFeature(nicheName: string, feature: keyof NicheTemplate['config']['features']): boolean {
  const features = getFeaturesConfig(nicheName)
  return features?.[feature] || false
}

/**
 * Get delay minutes for specific workflow step
 */
export function getWorkflowDelay(nicheName: string, step: string): number {
  const workflow = getWorkflowConfig(nicheName)
  return workflow?.[step]?.delay_minutes || 0
}

/**
 * Get channel preference for specific workflow step
 */
export function getWorkflowChannel(nicheName: string, step: string): 'email' | 'sms' | 'both' {
  const workflow = getWorkflowConfig(nicheName)
  return workflow?.[step]?.channel || 'email'
}

/**
 * Check if workflow step is enabled for niche
 */
export function isWorkflowEnabled(nicheName: string, step: string): boolean {
  const workflow = getWorkflowConfig(nicheName)
  return workflow?.[step]?.automation_enabled || false
}
