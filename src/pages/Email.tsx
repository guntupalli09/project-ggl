import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import ResponsivePageWrapper from '../components/ResponsivePageWrapper'
import { 
  EnvelopeIcon,
  ChartBarIcon,
  EyeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  PauseIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

interface EmailMetrics {
  totalSent: number
  delivered: number
  opened: number
  clicked: number
  deliveryRate: number
  openRate: number
  clickRate: number
  activeWorkflows: number
}

interface EmailLog {
  id: string
  recipient_email: string
  recipient_name: string
  subject: string
  campaign_type: string
  status: string
  sent_at: string
  delivered_at: string | null
  opened_at: string | null
  clicked_at: string | null
}

interface EmailWorkflow {
  id: string
  name: string
  campaign_type: string
  is_active: boolean
  delay_hours: number
  created_at: string
}

interface EmailCampaign {
  id: string
  name: string
  campaign_type: string
  subject: string
  content: string
  lead_count: number
  sent_count: number
  status: string
  created_at: string
  sent_at: string | null
}

interface Lead {
  id: string
  name: string
  email: string
  phone?: string
  status: string
  source?: string
  notes?: string
  created_at: string
}

interface BusinessInfo {
  business_name: string
  website: string
  business_hours: string
  booking_link: string
  business_slug: string
}

export default function Email() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'metrics' | 'management' | 'workflow'>('metrics')
  const [metrics, setMetrics] = useState<EmailMetrics | null>(null)
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([])
  const [workflows, setWorkflows] = useState<EmailWorkflow[]>([])
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // New campaign form state
  const [showNewCampaign, setShowNewCampaign] = useState(false)
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customInput, setCustomInput] = useState('')
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    campaign_type: 'promotion',
    subject: '',
    content: '',
    selectedLeads: [] as string[]
  })

  useEffect(() => {
    if (user) {
      loadEmailData()
    }
  }, [user])

  const loadEmailData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        loadMetrics(),
        loadEmailLogs(),
        loadWorkflows(),
        loadCampaigns(),
        loadLeads()
      ])
    } catch (error) {
      console.error('Error loading email data:', error)
      setError('Failed to load email data')
    } finally {
      setLoading(false)
    }
  }

  const loadMetrics = async () => {
    try {
      const { data: emailLogs, error } = await supabase
        .from('email_logs')
        .select('status, sent_at, campaign_type')
        .eq('user_id', user?.id)
        .gte('sent_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

      if (error) throw error

      const totalSent = emailLogs?.length || 0
      const delivered = emailLogs?.filter(log => 
        ['delivered', 'opened', 'clicked'].includes(log.status)
      ).length || 0
      const opened = emailLogs?.filter(log => 
        ['opened', 'clicked'].includes(log.status)
      ).length || 0
      const clicked = emailLogs?.filter(log => 
        log.status === 'clicked'
      ).length || 0

      const deliveryRate = totalSent > 0 ? Math.round((delivered / totalSent) * 100) : 0
      const openRate = delivered > 0 ? Math.round((opened / delivered) * 100) : 0
      const clickRate = delivered > 0 ? Math.round((clicked / delivered) * 100) : 0

      // Get active workflows count
      const { data: activeWorkflows } = await supabase
        .from('email_workflows')
        .select('id')
        .eq('user_id', user?.id)
        .eq('is_active', true)

      setMetrics({
        totalSent,
        delivered,
        opened,
        clicked,
        deliveryRate,
        openRate,
        clickRate,
        activeWorkflows: activeWorkflows?.length || 0
      })
    } catch (error) {
      console.error('Error loading metrics:', error)
    }
  }

  const loadEmailLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .eq('user_id', user?.id)
        .order('sent_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setEmailLogs(data || [])
    } catch (error) {
      console.error('Error loading email logs:', error)
    }
  }

  const loadWorkflows = async () => {
    try {
      const { data, error } = await supabase
        .from('email_workflows')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setWorkflows(data || [])
    } catch (error) {
      console.error('Error loading workflows:', error)
    }
  }

  const loadCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('email_campaigns')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setCampaigns(data || [])
    } catch (error) {
      console.error('Error loading campaigns:', error)
    }
  }

  const loadLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('id, name, email, phone, status, source, notes, created_at')
        .eq('user_id', user?.id)
        .not('email', 'is', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      setLeads(data || [])
    } catch (error) {
      console.error('Error loading leads:', error)
    }
  }

  const generateAIContent = async (campaignType: string, businessInfo: BusinessInfo, customInput?: string): Promise<{subject: string, content: string}> => {
    try {
      const businessName = businessInfo?.business_name || 'Our Business'
      const website = businessInfo?.website || 'our website'
      
      let prompt = `Generate an email for a business based on the specific campaign type.
      Business Name: ${businessName}
      Business URL: ${website}
      
      Campaign Type: ${campaignType}`
      
      if (campaignType === 'custom' && customInput) {
        prompt += `
      
      CUSTOM REQUEST: ${customInput}
      
      Please generate an email based on this custom request while maintaining professionalism.`
      } else {
        prompt += `
      
      IMPORTANT: Generate content that matches the campaign type:
      - PROMOTION: Special deals, discounts, limited-time offers, sales, anniversary celebrations
      - OFFER: Exclusive deals, special packages, new services, free gifts, limited-time specials
      - UPDATE: Business news, announcements, changes, information sharing, general updates
      - CUSTOM: General communication, newsletters, updates, any other content`
      }
      
      prompt += `
      
      Please generate:
      1. A compelling subject line appropriate for ${campaignType}
      2. Professional email content that matches the ${campaignType} theme and includes the business name and website
      
      Format the response as JSON with "subject" and "content" fields.`

      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, user_id: user?.id })
      })

      if (response.ok) {
        const data = await response.json()
        return data
      }
    } catch (error) {
      console.error('Error generating AI content:', error)
    }
    
    // Fallback content
    const businessName = businessInfo?.business_name || 'Our Business'
    const website = businessInfo?.website || 'our website'
    
    return {
      subject: `${campaignType.charAt(0).toUpperCase() + campaignType.slice(1)} from ${businessName}`,
      content: `Hello!

We hope this message finds you well.

Visit us at ${website} to learn more about our services.

Best regards,
${businessName} Team`
    }
  }

  const handleCreateCampaign = async () => {
    try {
      // Check if custom campaign type needs input
      if (newCampaign.campaign_type === 'custom' && !customInput.trim()) {
        setShowCustomInput(true)
        return
      }

      // Get business info from Profile page data (user_settings table)
      let businessInfo: BusinessInfo = {
        business_name: 'Your Business',
        website: 'your-website.com',
        business_hours: '',
        booking_link: '',
        business_slug: ''
      }
      try {
        const { data } = await supabase
          .from('user_settings')
          .select('business_name, business_website, business_hours, booking_link, business_slug')
          .eq('user_id', user?.id)
          .single()
        
        if (data) {
          businessInfo = {
            business_name: data.business_name || 'Your Business',
            website: data.business_website || data.booking_link || 'your-website.com',
            business_hours: data.business_hours || '',
            booking_link: data.booking_link || '',
            business_slug: data.business_slug || ''
          }
        } else {
          // Fallback to defaults if no profile data
          businessInfo = { 
            business_name: 'Your Business', 
            website: 'your-website.com',
            business_hours: '',
            booking_link: '',
            business_slug: ''
          }
        }
      } catch (error) {
        console.log('Business info not found, using defaults')
        businessInfo = { 
          business_name: 'Your Business', 
          website: 'your-website.com',
          business_hours: '',
          booking_link: '',
          business_slug: ''
        }
      }

      // Generate AI content with business info from Profile page
      const aiContent = await generateAIContent(
        newCampaign.campaign_type, 
        businessInfo, 
        newCampaign.campaign_type === 'custom' ? customInput : undefined
      )

      // Update the newCampaign state with generated content
      setNewCampaign(prev => ({
        ...prev,
        subject: aiContent.subject,
        content: aiContent.content
      }))

      setSuccess('AI content generated from your Profile page! Review and edit before sending.')
    } catch (error) {
      console.error('Error generating AI content:', error)
      setError('Failed to generate AI content')
    }
  }

  const handleCustomInputSubmit = async () => {
    if (!customInput.trim()) {
      setError('Please enter your custom request')
      return
    }
    
    setShowCustomInput(false)
    await handleCreateCampaign()
  }

  const handleSendCampaign = async () => {
    try {
      if (!newCampaign.name || !newCampaign.subject || !newCampaign.content || newCampaign.selectedLeads.length === 0) {
        setError('Please fill in all fields and select leads')
        return
      }

      // Create campaign
      const { data: campaign, error } = await supabase
        .from('email_campaigns')
        .insert({
          user_id: user?.id,
          name: newCampaign.name,
          campaign_type: newCampaign.campaign_type,
          subject: newCampaign.subject,
          content: newCampaign.content,
          lead_count: newCampaign.selectedLeads.length,
          status: 'draft'
        })
        .select()
        .single()

      if (error) throw error

      // Send the campaign
      const response = await fetch('/api/email/send-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          campaign_id: campaign.id, 
          user_id: user?.id 
        })
      })

      if (response.ok) {
        const data = await response.json()
        setSuccess(data.message)
        setShowNewCampaign(false)
        setNewCampaign({
          name: '',
          campaign_type: 'promotion',
          subject: '',
          content: '',
          selectedLeads: []
        })
        loadCampaigns()
        loadEmailLogs()
        loadMetrics()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send campaign')
      }
    } catch (error) {
      console.error('Error sending campaign:', error)
      setError('Failed to send campaign')
    }
  }

  const handleSendExistingCampaign = async (campaignId: string) => {
    try {
      const response = await fetch('/api/email/send-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          campaign_id: campaignId, 
          user_id: user?.id 
        })
      })

      if (response.ok) {
        const data = await response.json()
        setSuccess(data.message)
        loadCampaigns()
        loadEmailLogs()
        loadMetrics()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send campaign')
      }
    } catch (error) {
      console.error('Error sending campaign:', error)
      setError('Failed to send campaign')
    }
  }

  const toggleWorkflow = async (workflowId: string) => {
    try {
      const workflow = workflows.find(w => w.id === workflowId)
      if (!workflow) return

      await supabase
        .from('email_workflows')
        .update({ is_active: !workflow.is_active })
        .eq('id', workflowId)

      setSuccess('Workflow updated successfully!')
      loadWorkflows()
    } catch (error) {
      console.error('Error toggling workflow:', error)
      setError('Failed to update workflow')
    }
  }

  const triggerWorkflowAutomation = async () => {
    try {
      const response = await fetch('/api/email/workflow-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.id })
      })

      if (response.ok) {
        const data = await response.json()
        setSuccess(data.message)
        loadEmailLogs()
        loadMetrics()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to trigger workflow automation')
      }
    } catch (error) {
      console.error('Error triggering workflow automation:', error)
      setError('Failed to trigger workflow automation')
    }
  }

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      delivered: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      opened: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      clicked: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
      bounced: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    }
    return colors[status] || colors.sent
  }

  const getCampaignTypeDisplay = (type: string) => {
    const types: { [key: string]: string } = {
      review_request: 'Review Request',
      promotion: 'Promotion',
      offer: 'Special Offer',
      update: 'Update',
      custom: 'Custom'
    }
    return types[type] || type
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <ResponsivePageWrapper title="Email Marketing">
      <div className="space-y-6">
        {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'metrics', name: 'Metrics', icon: ChartBarIcon },
            { id: 'management', name: 'Management', icon: EnvelopeIcon },
            { id: 'workflow', name: 'Workflow', icon: PlayIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4">
          <div className="flex">
            <CheckCircleIcon className="w-5 h-5 text-green-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">{success}</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Custom Input Modal */}
      {showCustomInput && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              What's on your mind?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Tell us what you want to communicate to your customers, and AI will generate the perfect email content for you.
            </p>
            <textarea
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="e.g., We're launching a new service, announcing holiday hours, thanking customers for their support..."
            />
            <div className="flex justify-end space-x-2 mt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowCustomInput(false)
                  setCustomInput('')
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleCustomInputSubmit}>
                Generate Email
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Tab */}
      {activeTab === 'metrics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg mr-4">
                    <EnvelopeIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Sent</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {metrics?.totalSent?.toLocaleString() || '0'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg mr-4">
                    <CheckCircleIcon className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Delivery Rate</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {metrics?.deliveryRate || 0}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg mr-4">
                    <EyeIcon className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Open Rate</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {metrics?.openRate || 0}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg mr-4">
                    <PlayIcon className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Workflows</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {metrics?.activeWorkflows || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Email Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Email Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {emailLogs.slice(0, 10).map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <Badge className={getStatusColor(log.status)}>
                          {log.status}
                        </Badge>
                        <Badge variant="outline">
                          {getCampaignTypeDisplay(log.campaign_type)}
                        </Badge>
                      </div>
                      <p className="font-medium text-gray-900 dark:text-white mt-1">
                        {log.recipient_name} ({log.recipient_email})
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {log.subject}
                      </p>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(log.sent_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
                {emailLogs.length === 0 && (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                    No email activity yet. Create your first campaign to get started!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Management Tab */}
      {activeTab === 'management' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Email Campaigns</h2>
            <Button onClick={() => setShowNewCampaign(true)}>
              <PlusIcon className="w-5 h-5 mr-2" />
              New Campaign
            </Button>
          </div>

          {/* New Campaign Form */}
          {showNewCampaign && (
            <Card>
              <CardHeader>
                <CardTitle>Create New Campaign</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Campaign Name
                  </label>
                  <input
                    type="text"
                    value={newCampaign.name}
                    onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter campaign name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Campaign Type
                  </label>
                  <select
                    value={newCampaign.campaign_type}
                    onChange={(e) => {
                      setNewCampaign({ ...newCampaign, campaign_type: e.target.value })
                      // Reset custom input when changing campaign type
                      if (e.target.value !== 'custom') {
                        setCustomInput('')
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="promotion">Promotion</option>
                    <option value="offer">Special Offer</option>
                    <option value="update">Update</option>
                    <option value="custom">Custom</option>
                  </select>
                  {newCampaign.campaign_type === 'custom' && (
                    <p className="mt-2 text-sm text-blue-600 dark:text-blue-400">
                      💡 Select "Generate AI Content" to enter your custom message
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Leads ({newCampaign.selectedLeads.length} selected)
                  </label>
                  <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-2">
                    <div className="flex items-center space-x-2 mb-2">
                      <input
                        type="checkbox"
                        id="select-all"
                        checked={newCampaign.selectedLeads.length === leads.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewCampaign({ ...newCampaign, selectedLeads: leads.map(lead => lead.id) })
                          } else {
                            setNewCampaign({ ...newCampaign, selectedLeads: [] })
                          }
                        }}
                        className="rounded"
                      />
                      <label htmlFor="select-all" className="text-sm font-medium">
                        Select All ({leads.length} leads)
                      </label>
                    </div>
                    {leads.map((lead) => (
                      <div key={lead.id} className="flex items-center space-x-2 py-1">
                        <input
                          type="checkbox"
                          id={lead.id}
                          checked={newCampaign.selectedLeads.includes(lead.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewCampaign({ 
                                ...newCampaign, 
                                selectedLeads: [...newCampaign.selectedLeads, lead.id] 
                              })
                            } else {
                              setNewCampaign({ 
                                ...newCampaign, 
                                selectedLeads: newCampaign.selectedLeads.filter(id => id !== lead.id) 
                              })
                            }
                          }}
                          className="rounded"
                        />
                        <label htmlFor={lead.id} className="text-sm">
                          {lead.name} ({lead.email})
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Subject Line
                  </label>
                  <input
                    type="text"
                    value={newCampaign.subject}
                    onChange={(e) => setNewCampaign({ ...newCampaign, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter email subject"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Content
                  </label>
                  <div className="space-y-2">
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        className={`px-3 py-1 text-sm rounded-md ${
                          newCampaign.content.includes('<') 
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' 
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                        }`}
                        onClick={() => {
                          // Convert HTML to plain text for editing
                          const tempDiv = document.createElement('div')
                          tempDiv.innerHTML = newCampaign.content
                          setNewCampaign({ ...newCampaign, content: tempDiv.textContent || tempDiv.innerText || '' })
                        }}
                      >
                        Edit as Text
                      </button>
                      <button
                        type="button"
                        className={`px-3 py-1 text-sm rounded-md ${
                          !newCampaign.content.includes('<') 
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' 
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                        }`}
                        onClick={() => {
                          // Convert plain text to HTML
                          const htmlContent = newCampaign.content
                            .split('\n')
                            .map(line => line.trim() ? `<p>${line}</p>` : '<p>&nbsp;</p>')
                            .join('')
                          setNewCampaign({ ...newCampaign, content: htmlContent })
                        }}
                      >
                        Convert to HTML
                      </button>
                    </div>
                    
                    {newCampaign.content.includes('<') ? (
                      <div className="space-y-2">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Preview:
                        </div>
                        <div 
                          className="p-4 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                          dangerouslySetInnerHTML={{ __html: newCampaign.content }}
                        />
                        <textarea
                          value={newCampaign.content}
                          onChange={(e) => setNewCampaign({ ...newCampaign, content: e.target.value })}
                          rows={6}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                          placeholder="HTML content (edit above to see changes)"
                        />
                      </div>
                    ) : (
                      <textarea
                        value={newCampaign.content}
                        onChange={(e) => setNewCampaign({ ...newCampaign, content: e.target.value })}
                        rows={8}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Enter email content (plain text - will be converted to HTML)"
                      />
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowNewCampaign(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateCampaign} disabled={!newCampaign.name || newCampaign.selectedLeads.length === 0}>
                    Generate AI Content
                  </Button>
                  <Button onClick={handleSendCampaign} disabled={!newCampaign.name || !newCampaign.subject || !newCampaign.content || newCampaign.selectedLeads.length === 0}>
                    Send Campaign
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Campaigns List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((campaign) => (
              <Card key={campaign.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {campaign.name}
                      </h3>
                      <Badge variant="outline">
                        {getCampaignTypeDisplay(campaign.campaign_type)}
                      </Badge>
                    </div>
                    <Badge className={getStatusColor(campaign.status)}>
                      {campaign.status}
                    </Badge>
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {campaign.subject}
                  </p>

                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                    <span>{campaign.sent_count}/{campaign.lead_count} sent</span>
                    <span>{new Date(campaign.created_at).toLocaleDateString()}</span>
                  </div>

                  <div className="flex space-x-2">
                    {campaign.status === 'draft' && (
                      <Button 
                        size="sm" 
                        onClick={() => handleSendExistingCampaign(campaign.id)}
                        className="flex-1"
                      >
                        Send Campaign
                      </Button>
                    )}
                    <Button size="sm" variant="outline">
                      <PencilIcon className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <TrashIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {campaigns.length === 0 && (
              <div className="col-span-full text-center py-12">
                <EnvelopeIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No campaigns yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Create your first email campaign to start reaching your leads.
                </p>
                <Button onClick={() => setShowNewCampaign(true)}>
                  <PlusIcon className="w-5 h-5 mr-2" />
                  Create Campaign
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Workflow Tab */}
      {activeTab === 'workflow' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Email Workflows</h2>
            <Button onClick={triggerWorkflowAutomation} variant="outline">
              <PlayIcon className="w-5 h-5 mr-2" />
              Run Automation Now
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {workflows.map((workflow) => (
              <Card key={workflow.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {workflow.name}
                      </h3>
                      <Badge variant="outline">
                        {getCampaignTypeDisplay(workflow.campaign_type)}
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant={workflow.is_active ? "primary" : "outline"}
                      onClick={() => toggleWorkflow(workflow.id)}
                    >
                      {workflow.is_active ? (
                        <>
                          <PlayIcon className="w-4 h-4 mr-1" />
                          Active
                        </>
                      ) : (
                        <>
                          <PauseIcon className="w-4 h-4 mr-1" />
                          Inactive
                        </>
                      )}
                    </Button>
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Automatically sends {workflow.campaign_type.replace('_', ' ')} emails to completed leads after {workflow.delay_hours} hours.
                  </p>

                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <ClockIcon className="w-4 h-4 mr-1" />
                    <span>Delay: {workflow.delay_hours} hours</span>
                  </div>
                </CardContent>
              </Card>
            ))}

            {workflows.length === 0 && (
              <div className="col-span-full text-center py-12">
                <PlayIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No workflows yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Workflows will be automatically created for your business type.
                </p>
              </div>
            )}
          </div>

          {/* Workflow Info */}
          <Card>
            <CardHeader>
              <CardTitle>How Workflows Work</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                    <CheckCircleIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Review Request Automation</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Automatically sends review request emails to leads marked as "completed" after a specified delay.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                    <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Manual Campaigns Only</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Promotions, offers, and updates must be sent manually through the Management tab.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      </div>
    </ResponsivePageWrapper>
  )
}