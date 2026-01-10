// Simple AI client for email generation
export async function generateAIResponse(prompt: string): Promise<string> {
  try {
    // For now, return a simple response
    // In production, this would call Ollama or another AI service
    return `AI Generated Response for: ${prompt.substring(0, 50)}...`
  } catch (error) {
    console.error('AI generation error:', error)
    return 'AI generation failed'
  }
}
