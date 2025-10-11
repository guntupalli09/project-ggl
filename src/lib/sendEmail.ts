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

import { sendEmailAPI } from './emailAPI'

export async function sendEmail(emailData: EmailData): Promise<EmailResponse> {
  return sendEmailAPI(emailData)
}

// Helper function for sending follow-up emails
export async function sendFollowUpEmail(
  to: string, 
  _leadName: string, 
  businessName: string, 
  emailBody: string,
  messageId?: string
): Promise<EmailResponse> {
  const subject = `Follow-up from ${businessName}`
  
  return sendEmail({
    to,
    subject,
    body: emailBody,
    businessName,
    messageId
  })
}

// Helper function for sending AI-generated emails
export async function sendAIGeneratedEmail(
  to: string,
  subject: string,
  body: string,
  businessName?: string,
  messageId?: string
): Promise<EmailResponse> {
  return sendEmail({
    to,
    subject,
    body,
    businessName: businessName || 'GGL',
    messageId
  })
}
