// Production email sending API endpoint
// Integrates with SendGrid for real email delivery

export default async function handler(req: any, res: any) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Verify internal API key for cron jobs
  const authHeader = req.headers.authorization
  const expectedKey = process.env.INTERNAL_API_KEY || 'internal-key'
  
  if (authHeader !== `Bearer ${expectedKey}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const { to, subject, body } = req.body

    // Validate required fields
    if (!to || !subject || !body) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['to', 'subject', 'body']
      })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(to)) {
      return res.status(400).json({ error: 'Invalid email address' })
    }

    // Send real email via SendGrid
    const sendGridApiKey = process.env.SENDGRID_API_KEY
    const fromEmail = process.env.FROM_EMAIL || 'noreply@yourdomain.com'
    
    if (!sendGridApiKey) {
      console.warn('⚠️ SENDGRID_API_KEY not found, simulating email send')
      // Fallback to simulation if SendGrid not configured
      const messageId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      console.log('📧 Simulating email send:')
      console.log(`To: ${to}`)
      console.log(`Subject: ${subject}`)
      console.log(`Body: ${body.substring(0, 100)}...`)
      
      return res.status(200).json({
        success: true,
        message: 'Email simulated (SendGrid not configured)',
        messageId: messageId,
        to: to,
        subject: subject,
        simulated: true
      })
    }

    // Send real email via SendGrid
    const sgMail = require('@sendgrid/mail')
    sgMail.setApiKey(sendGridApiKey)
    
    const msg = {
      to: to,
      from: fromEmail,
      subject: subject,
      text: body,
      html: body.replace(/\n/g, '<br>')
    }
    
    console.log('📧 Sending real email via SendGrid:')
    console.log(`To: ${to}`)
    console.log(`Subject: ${subject}`)
    
    const response = await sgMail.send(msg)
    const messageId = response[0].headers['x-message-id'] || `msg_${Date.now()}`
    
    return res.status(200).json({
      success: true,
      message: 'Email sent successfully via SendGrid',
      messageId: messageId,
      to: to,
      subject: subject,
      simulated: false
    })

  } catch (error) {
    console.error('Email sending error:', error)
    return res.status(500).json({ 
      error: 'Failed to send email',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
