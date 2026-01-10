// Email Warm-up API Endpoint
// Handles domain warm-up initialization and management

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization
  const expectedKey = process.env.INTERNAL_API_KEY || 'internal-key'
  
  if (authHeader !== `Bearer ${expectedKey}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const { action, user_id, domain, business_type } = req.body

    switch (action) {
      case 'initialize':
        return await initializeWarmup(user_id, domain, business_type, res)
      
      case 'get_progress':
        return await getWarmupProgress(user_id, res)
      
      case 'process_queue':
        return await processWarmupQueue(user_id, res)
      
      case 'pause':
        return await pauseWarmup(user_id, res)
      
      case 'resume':
        return await resumeWarmup(user_id, res)
      
      default:
        return res.status(400).json({ error: 'Invalid action' })
    }
  } catch (error) {
    console.error('Email warm-up API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function initializeWarmup(userId: string, domain: string, businessType: string, res: any) {
  try {
    // Check if domain already exists
    const { data: existingDomain } = await supabase
      .from('email_domains')
      .select('id')
      .eq('user_id', userId)
      .eq('domain', domain)
      .single()

    if (existingDomain) {
      return res.status(400).json({ 
        error: 'Domain already exists',
        domain_id: existingDomain.id
      })
    }

    // Get business strategy
    const strategies = {
      salon: { warmupDuration: 42, maxDailyVolume: 500 },
      home_services: { warmupDuration: 35, maxDailyVolume: 300 },
      med_spa: { warmupDuration: 49, maxDailyVolume: 200 },
      general: { warmupDuration: 35, maxDailyVolume: 200 }
    }

    const strategy = strategies[businessType] || strategies.general

    // Create domain record
    const { data: domainData, error: domainError } = await supabase
      .from('email_domains')
      .insert({
        user_id: userId,
        domain: domain,
        status: 'warming',
        warmup_stage: 1,
        daily_limit: 10 // Start with very low limit
      })
      .select()
      .single()

    if (domainError) throw domainError

    // Create warm-up schedule
    const schedule = [
      { stage: 1, daily_limit: 10, duration_days: 7 },
      { stage: 2, daily_limit: 25, duration_days: 7 },
      { stage: 3, daily_limit: 50, duration_days: 7 },
      { stage: 4, daily_limit: 100, duration_days: 7 },
      { stage: 5, daily_limit: 200, duration_days: 14 },
      { stage: 6, daily_limit: strategy.maxDailyVolume, duration_days: 999 }
    ]

    const scheduleRecords = schedule.map(s => ({
      domain_id: domainData.id,
      stage: s.stage,
      daily_limit: s.dailyLimit,
      duration_days: s.duration_days,
      email_types: ['warmup_intro', 'transactional', 'followup'],
      content_templates: {}
    }))

    const { error: scheduleError } = await supabase
      .from('warmup_schedules')
      .insert(scheduleRecords)

    if (scheduleError) throw scheduleError

    // Generate initial warm-up emails
    await generateInitialWarmupEmails(domainData.id)

    return res.status(200).json({
      success: true,
      domain_id: domainData.id,
      message: 'Domain warm-up initialized successfully',
      strategy: strategy
    })
  } catch (error) {
    console.error('Error initializing warm-up:', error)
    return res.status(500).json({ error: 'Failed to initialize warm-up' })
  }
}

async function getWarmupProgress(userId: string, res: any) {
  try {
    const { data: domains } = await supabase
      .from('email_domains')
      .select('*')
      .eq('user_id', userId)

    if (!domains || domains.length === 0) {
      return res.status(404).json({ error: 'No domains found' })
    }

    const progressData = []

    for (const domain of domains) {
      // Get emails sent today
      const today = new Date().toISOString().split('T')[0]
      const { data: todayEmails } = await supabase
        .from('warmup_email_queue')
        .select('id')
        .eq('domain_id', domain.id)
        .eq('status', 'sent')
        .gte('sent_at', today)

      // Get recent metrics
      const { data: metrics } = await supabase
        .from('email_metrics')
        .select('*')
        .eq('domain_id', domain.id)
        .order('date', { ascending: false })
        .limit(30)

      const totalSent = metrics?.reduce((sum, m) => sum + m.emails_sent, 0) || 0
      const totalDelivered = metrics?.reduce((sum, m) => sum + m.emails_delivered, 0) || 0
      const totalBounced = metrics?.reduce((sum, m) => sum + m.emails_bounced, 0) || 0
      const totalComplained = metrics?.reduce((sum, m) => sum + m.emails_complained, 0) || 0

      const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0
      const bounceRate = totalSent > 0 ? (totalBounced / totalSent) * 100 : 0
      const complaintRate = totalSent > 0 ? (totalComplained / totalSent) * 100 : 0

      progressData.push({
        domain_id: domain.id,
        domain: domain.domain,
        status: domain.status,
        current_stage: domain.warmup_stage,
        daily_limit: domain.daily_limit,
        emails_sent_today: todayEmails?.length || 0,
        reputation_score: domain.reputation_score,
        total_sent: totalSent,
        delivery_rate: deliveryRate,
        bounce_rate: bounceRate,
        complaint_rate: complaintRate,
        created_at: domain.created_at
      })
    }

    return res.status(200).json({
      success: true,
      domains: progressData
    })
  } catch (error) {
    console.error('Error getting warm-up progress:', error)
    return res.status(500).json({ error: 'Failed to get progress' })
  }
}

async function processWarmupQueue(userId: string, res: any) {
  try {
    const { data: domains } = await supabase
      .from('email_domains')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'warming')

    if (!domains || domains.length === 0) {
      return res.status(404).json({ error: 'No warming domains found' })
    }

    let totalSent = 0
    let totalFailed = 0

    for (const domain of domains) {
      // Get pending emails for today
      const { data: pendingEmails } = await supabase
        .from('warmup_email_queue')
        .select('*')
        .eq('domain_id', domain.id)
        .eq('status', 'pending')
        .lte('scheduled_for', new Date().toISOString())
        .order('priority', { ascending: true })
        .limit(domain.daily_limit)

      if (!pendingEmails || pendingEmails.length === 0) continue

      for (const email of pendingEmails) {
        try {
          // Send email via your email service
          const emailResult = await sendWarmupEmail(email)
          
          if (emailResult.success) {
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
              .eq('id', domain.id)

            totalSent++
          } else {
            throw new Error(emailResult.error || 'Failed to send email')
          }
        } catch (error) {
          console.error(`Failed to send email ${email.id}:`, error)
          
          // Update attempt count
          await supabase
            .from('warmup_email_queue')
            .update({ 
              attempts: email.attempts + 1,
              error_message: error.message
            })
            .eq('id', email.id)

          // Mark as failed if max attempts reached
          if (email.attempts + 1 >= email.max_attempts) {
            await supabase
              .from('warmup_email_queue')
              .update({ status: 'failed' })
              .eq('id', email.id)
          }

          totalFailed++
        }
      }

      // Check if ready to advance to next stage
      await checkStageAdvancement(domain.id)
    }

    return res.status(200).json({
      success: true,
      sent: totalSent,
      failed: totalFailed,
      message: `Processed ${totalSent} emails successfully, ${totalFailed} failed`
    })
  } catch (error) {
    console.error('Error processing warm-up queue:', error)
    return res.status(500).json({ error: 'Failed to process queue' })
  }
}

async function pauseWarmup(userId: string, res: any) {
  try {
    const { error } = await supabase
      .from('email_domains')
      .update({ status: 'paused' })
      .eq('user_id', userId)

    if (error) throw error

    return res.status(200).json({
      success: true,
      message: 'Warm-up paused successfully'
    })
  } catch (error) {
    console.error('Error pausing warm-up:', error)
    return res.status(500).json({ error: 'Failed to pause warm-up' })
  }
}

async function resumeWarmup(userId: string, res: any) {
  try {
    const { error } = await supabase
      .from('email_domains')
      .update({ status: 'warming' })
      .eq('user_id', userId)
      .eq('status', 'paused')

    if (error) throw error

    return res.status(200).json({
      success: true,
      message: 'Warm-up resumed successfully'
    })
  } catch (error) {
    console.error('Error resuming warm-up:', error)
    return res.status(500).json({ error: 'Failed to resume warm-up' })
  }
}

// Helper functions
async function generateInitialWarmupEmails(domainId: string) {
  const emailTypes = ['warmup_intro', 'transactional', 'followup']
  const testEmails = [
    'test1@example.com',
    'test2@example.com',
    'test3@example.com',
    'warmup@example.com',
    'demo@example.com'
  ]

  const warmupEmails = []

  for (let i = 0; i < 10; i++) { // Generate 10 initial emails
    const emailType = emailTypes[Math.floor(Math.random() * emailTypes.length)]
    const recipientEmail = testEmails[Math.floor(Math.random() * testEmails.length)]
    
    const content = generateWarmupContent(emailType)
    const subject = generateWarmupSubject(emailType)

    warmupEmails.push({
      domain_id: domainId,
      recipient_email: recipientEmail,
      subject: subject,
      content: content,
      email_type: emailType,
      priority: 1,
      scheduled_for: new Date(Date.now() + Math.random() * 24 * 60 * 60 * 1000).toISOString(), // Random time in next 24 hours
      status: 'pending'
    })
  }

  await supabase
    .from('warmup_email_queue')
    .insert(warmupEmails)
}

async function checkStageAdvancement(domainId: string) {
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
    
    await supabase
      .from('email_domains')
      .update({ 
        warmup_stage: nextStage,
        updated_at: new Date().toISOString()
      })
      .eq('id', domainId)

    // Generate more emails for new stage
    await generateInitialWarmupEmails(domainId)
  }
}

async function sendWarmupEmail(email: any) {
  try {
    const response = await fetch(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/api/email/send`, {
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
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

function generateWarmupContent(emailType: string): string {
  const templates = {
    warmup_intro: `Hi there!

Welcome to our business! We're excited to have you as a potential customer.

We provide high-quality services and are committed to your satisfaction.

Best regards,
Our Team`,

    transactional: `Hello!

This is a confirmation email for your recent interaction with us.

Thank you for choosing our services!

Best regards,
Our Team`,

    followup: `Hi there!

Thank you for your recent inquiry. We hope you had a great experience!

If you have any questions or would like to book another service, please don't hesitate to reach out.

Best regards,
Our Team`
  }

  return templates[emailType] || 'Thank you for your business!'
}

function generateWarmupSubject(emailType: string): string {
  const subjects = {
    warmup_intro: 'Welcome to our business!',
    transactional: 'Confirmation email',
    followup: 'Thank you for your inquiry'
  }

  return subjects[emailType] || 'Thank you for your business!'
}
