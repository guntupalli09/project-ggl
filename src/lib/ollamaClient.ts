// Ollama client for local AI generation
const OLLAMA_BASE_URL = 'http://localhost:11434'

interface OllamaResponse {
  response: string
  done: boolean
}

interface OllamaError {
  error: string
}

// Helper function to check if Ollama is running
export const checkOllamaStatus = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`)
    return response.ok
  } catch (error) {
    console.error('Ollama is not running:', error)
    return false
  }
}

// Helper function for text generation using Ollama
export const generateText = async (
  prompt: string, 
  model: string = 'llama3.2:3b' // Default to a lightweight model
): Promise<string> => {
  try {
    // Check if Ollama is running first
    const isRunning = await checkOllamaStatus()
    if (!isRunning) {
      throw new Error('Ollama is not running. Please start Ollama and ensure it\'s accessible at http://localhost:11434')
    }

    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          num_predict: 1000,
        }
      })
    })

    if (!response.ok) {
      const errorData: OllamaError = await response.json()
      throw new Error(`Ollama API error: ${errorData.error || response.statusText}`)
    }

    const data: OllamaResponse = await response.json()
    
    // Clean the response from ANSI escape sequences and control characters
    let cleanedResponse = data.response.trim()
    
    // Remove ANSI escape sequences
    cleanedResponse = cleanedResponse.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
    
    // Remove other control characters
    cleanedResponse = cleanedResponse.replace(/[\x00-\x1F\x7F]/g, '')
    
    // Remove common terminal artifacts
    cleanedResponse = cleanedResponse.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    cleanedResponse = cleanedResponse.replace(/\n+/g, '\n').trim()
    
    console.log('Cleaned Ollama response:', cleanedResponse)
    return cleanedResponse
  } catch (error) {
    console.error('Error generating text with Ollama:', error)
    throw error
  }
}

// Helper function to get available models
export const getAvailableModels = async (): Promise<string[]> => {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`)
    if (!response.ok) {
      throw new Error('Failed to fetch available models')
    }
    
    const data = await response.json()
    return data.models?.map((model: any) => model.name) || []
  } catch (error) {
    console.error('Error fetching available models:', error)
    return []
  }
}

// Helper function to pull a model if it doesn't exist
export const pullModel = async (model: string): Promise<boolean> => {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/pull`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: model,
        stream: false
      })
    })

    return response.ok
  } catch (error) {
    console.error('Error pulling model:', error)
    return false
  }
}

// Helper function to check if a specific model is available
export const isModelAvailable = async (model: string): Promise<boolean> => {
  try {
    const models = await getAvailableModels()
    return models.includes(model)
  } catch (error) {
    console.error('Error checking model availability:', error)
    return false
  }
}

// Recommended models for different use cases
export const RECOMMENDED_MODELS = {
  // Lightweight models (faster, less resource intensive)
  LIGHTWEIGHT: 'llama3:latest',
  LIGHTWEIGHT_ALT: 'llama2:latest',
  
  // Medium models (balanced performance)
  MEDIUM: 'llama3:latest',
  MEDIUM_ALT: 'llama2:latest',
  
  // Heavy models (best quality, more resource intensive)
  HEAVY: 'llama3:latest',
  HEAVY_ALT: 'llama2:latest',
}

// Default model configuration
export const DEFAULT_MODEL = RECOMMENDED_MODELS.LIGHTWEIGHT
