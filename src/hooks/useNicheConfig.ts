import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'

interface NicheTemplate {
  id: string
  name: string
  display_name: string
  description: string
  config: {
    branding: {
      primary_color: string
      secondary_color: string
      icon: string
    }
    automation_rules: {
      immediate_review: boolean
      instant_referral_link: boolean
      photo_upload_required: boolean
      hipaa_compliant?: boolean
    }
    workflow_stages: string[]
    review_delay_hours: number
    referral_delay_hours: number
    compliance: string
  }
}

interface UserNicheConfig {
  niche_template_id?: string
  subdomain?: string
  sending_domain?: string
  workflow_stage?: string
}

export const useNicheConfig = () => {
  const { user } = useAuth()
  const [templates, setTemplates] = useState<NicheTemplate[]>([])
  const [userConfig, setUserConfig] = useState<UserNicheConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchNicheTemplates()
      fetchUserConfig()
    }
  }, [user])

  const fetchNicheTemplates = async () => {
    try {
      const response = await fetch('/api/niche-templates')
      const data = await response.json()

      if (data.success) {
        setTemplates(data.templates)
      } else {
        setError('Failed to load niche templates')
      }
    } catch (err) {
      setError('Failed to load niche templates')
      console.error('Error fetching niche templates:', err)
    }
  }

  const fetchUserConfig = async () => {
    if (!user) return

    try {
      const response = await fetch('/api/user/settings', {
        headers: {
          'Authorization': `Bearer ${(user as any).access_token || ''}`
        }
      })
      const data = await response.json()

      if (data.success) {
        setUserConfig({
          niche_template_id: data.settings.niche_template_id,
          subdomain: data.settings.subdomain,
          sending_domain: data.settings.sending_domain,
          workflow_stage: data.settings.workflow_stage
        })
      }
    } catch (err) {
      console.error('Error fetching user config:', err)
    } finally {
      setLoading(false)
    }
  }

  const selectNiche = async (templateId: string, businessName: string) => {
    if (!user) return { success: false, error: 'User not authenticated' }

    try {
      const response = await fetch('/api/tenant/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(user as any).access_token || ''}`
        },
        body: JSON.stringify({
          user_id: user.id,
          niche_template_id: templateId,
          business_name: businessName
        })
      })

      const data = await response.json()

      if (data.success) {
        setUserConfig({
          niche_template_id: templateId,
          subdomain: data.config.subdomain,
          sending_domain: data.config.sending_domain,
          workflow_stage: 'new'
        })
        return { success: true, config: data.config }
      } else {
        return { success: false, error: data.error }
      }
    } catch (err) {
      console.error('Error selecting niche:', err)
      return { success: false, error: 'Failed to select niche' }
    }
  }

  const getCurrentTemplate = (): NicheTemplate | null => {
    if (!userConfig?.niche_template_id) return null
    return templates.find(t => t.id === userConfig.niche_template_id) || null
  }

  const getWorkflowStages = (): string[] => {
    const template = getCurrentTemplate()
    return template?.config.workflow_stages || ['new', 'booked', 'completed', 'review_sent', 'referral_sent']
  }

  const isHipaaCompliant = (): boolean => {
    const template = getCurrentTemplate()
    return template?.config.automation_rules.hipaa_compliant || false
  }

  const getBranding = () => {
    const template = getCurrentTemplate()
    return template?.config.branding || {
      primary_color: '#3B82F6',
      secondary_color: '#60A5FA',
      icon: 'check'
    }
  }

  const needsOnboarding = (): boolean => {
    return !userConfig?.niche_template_id
  }

  return {
    templates,
    userConfig,
    loading,
    error,
    selectNiche,
    getCurrentTemplate,
    getWorkflowStages,
    isHipaaCompliant,
    getBranding,
    needsOnboarding,
    refetch: () => {
      fetchNicheTemplates()
      fetchUserConfig()
    }
  }
}
