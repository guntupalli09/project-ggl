// Email API client for Vite frontend
// This will call your backend API endpoint

export interface EmailData {
  to: string
  subject: string
  body: string
  businessName?: string
  messageId?: string
}

export interface EmailResponse {
  success: boolean
  message?: string
  subject?: string
  error?: string
  details?: string
}

// For now, this simulates email sending
// In production, you'd call your backend API
export async function sendEmailAPI(emailData: EmailData): Promise<EmailResponse> {
  try {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Simulate success/failure
    const shouldSucceed = Math.random() > 0.1 // 90% success rate
    
    if (shouldSucceed) {
      console.log('📧 Email would be sent:', {
        to: emailData.to,
        subject: emailData.subject,
        businessName: emailData.businessName
      })
      
      return {
        success: true,
        message: 'Email sent successfully',
        subject: emailData.subject
      }
    } else {
      throw new Error('Simulated email failure')
    }
  } catch (error: any) {
    console.error('Email send error:', error)
    return {
      success: false,
      error: error.message || 'Failed to send email'
    }
  }
}

// Real implementation for production (uncomment when you have a backend)
/*
export async function sendEmailAPI(emailData: EmailData): Promise<EmailResponse> {
  try {
    const res = await fetch("/api/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(emailData),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.error || 'Failed to send email')
    }

    return data
  } catch (error: any) {
    console.error('Email send error:', error)
    return {
      success: false,
      error: error.message || 'Failed to send email'
    }
  }
}
*/

