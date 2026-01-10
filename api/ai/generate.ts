import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { prompt, user_id } = req.body

    if (!prompt || !user_id) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Try to use Ollama first, fallback to template-based approach
    try {
      const ollamaResponse = await generateWithOllama(prompt)
      if (ollamaResponse) {
        return res.status(200).json(ollamaResponse)
      }
    } catch (error) {
      console.log('Ollama not available, using fallback:', error)
    }
    
    // Fallback to template-based approach
    const response = generateEmailContent(prompt)
    res.status(200).json(response)
  } catch (error) {
    console.error('AI generation error:', error)
    res.status(500).json({ error: 'Failed to generate content' })
  }
}

async function generateWithOllama(prompt: string) {
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3.2', // or whatever model you have available
        prompt: `${prompt}\n\nPlease respond with valid JSON in this format: {"subject": "Email Subject", "content": "HTML email content"}`,
        stream: false
      })
    })

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`)
    }

    const data = await response.json()
    
    // Try to parse the JSON response
    try {
      const parsedResponse = JSON.parse(data.response)
      return {
        subject: parsedResponse.subject || 'Email from Your Business',
        content: parsedResponse.content || '<h2>Hello!</h2><p>Thank you for your interest!</p>'
      }
    } catch (parseError) {
      // If JSON parsing fails, extract subject and content from the response
      const responseText = data.response
      const subjectMatch = responseText.match(/"subject":\s*"([^"]+)"/)
      const contentMatch = responseText.match(/"content":\s*"([^"]+)"/)
      
      return {
        subject: subjectMatch ? subjectMatch[1] : 'Email from Your Business',
        content: contentMatch ? contentMatch[1] : '<h2>Hello!</h2><p>Thank you for your interest!</p>'
      }
    }
  } catch (error) {
    console.error('Ollama generation error:', error)
    return null
  }
}

function generateEmailContent(prompt: string) {
  // Extract campaign type and business info from prompt
  const campaignType = extractCampaignType(prompt)
  const businessName = extractBusinessInfo(prompt, 'Business Name:')
  const website = extractBusinessInfo(prompt, 'Business URL:')
  
  // Generate content based on campaign type
  switch (campaignType) {
    case 'promotion':
      return {
        subject: `🎉 Special Promotion from ${businessName}!`,
        content: `<h2>Hello!</h2>
        <p>We're excited to share an exclusive promotion with you!</p>
        <p>Visit our website to learn more about this limited-time offer.</p>
        <p><a href="${website}" style="background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Promotion</a></p>
        <p>Don't miss out on this amazing opportunity!</p>
        <p>Best regards,<br>${businessName} Team</p>`
      }
    
    case 'offer':
      return {
        subject: `🎁 Exclusive Offer from ${businessName} - Limited Time Only!`,
        content: `<h2>Hello!</h2>
        <p>We have a special offer that we think you'll love!</p>
        <p>This exclusive deal is available for a limited time only.</p>
        <p><a href="${website}" style="background: #FF9800; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Claim Your Offer</a></p>
        <p>Thank you for being a valued customer!</p>
        <p>Best regards,<br>${businessName} Team</p>`
      }
    
    case 'update':
      return {
        subject: `📢 Important Update from ${businessName}`,
        content: `<h2>Hello!</h2>
        <p>We wanted to share some important updates with you.</p>
        <p>Stay informed about the latest news and developments from our business.</p>
        <p><a href="${website}" style="background: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Learn More</a></p>
        <p>Thank you for your continued support!</p>
        <p>Best regards,<br>${businessName} Team</p>`
      }
    
    case 'custom':
      return {
        subject: `Message from ${businessName}`,
        content: `<h2>Hello!</h2>
        <p>We hope this message finds you well.</p>
        <p>We wanted to reach out and share some information with you.</p>
        <p>Visit our website to learn more: <a href="${website}">${website}</a></p>
        <p>If you have any questions, please don't hesitate to contact us.</p>
        <p>Best regards,<br>${businessName} Team</p>`
      }
    
    default:
      return {
        subject: `Message from ${businessName}`,
        content: `<h2>Hello!</h2>
        <p>We hope this message finds you well.</p>
        <p>Visit us at <a href="${website}">${website}</a> to learn more about our services.</p>
        <p>Best regards,<br>${businessName} Team</p>`
      }
  }
}

function extractCampaignType(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase()
  
  if (lowerPrompt.includes('promotion')) return 'promotion'
  if (lowerPrompt.includes('offer')) return 'offer'
  if (lowerPrompt.includes('update')) return 'update'
  if (lowerPrompt.includes('custom')) return 'custom'
  
  return 'custom'
}

function extractBusinessInfo(prompt: string, field: string): string {
  const regex = new RegExp(`${field}\\s*([^\\n]+)`, 'i')
  const match = prompt.match(regex)
  return match ? match[1].trim() : 'Your Business'
}
