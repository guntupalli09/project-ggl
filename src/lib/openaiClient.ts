import OpenAI from 'openai'

// Lazy initialization of OpenAI client
let openai: OpenAI | null = null

const getOpenAIClient = () => {
  if (!openai) {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY
    
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('Missing OpenAI API key. Please add VITE_OPENAI_API_KEY to your .env file.')
    }

    openai = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true // Note: This is required for browser usage
    })
  }
  
  return openai
}

// Helper function for common OpenAI API calls
export const generateText = async (prompt: string, model: string = 'gpt-3.5-turbo') => {
  try {
    const client = getOpenAIClient()
    const completion = await client.chat.completions.create({
      model: model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
    })
    
    return completion.choices[0]?.message?.content || ''
  } catch (error) {
    console.error('Error generating text:', error)
    throw error
  }
}

// Helper function for image generation
export const generateImage = async (prompt: string, size: '256x256' | '512x512' | '1024x1024' = '512x512') => {
  try {
    const client = getOpenAIClient()
    const response = await client.images.generate({
      model: 'dall-e-2',
      prompt: prompt,
      size: size,
      n: 1,
    })
    
    return response.data?.[0]?.url || ''
  } catch (error) {
    console.error('Error generating image:', error)
    throw error
  }
}
