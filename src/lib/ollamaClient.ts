export const DEFAULT_MODEL = "llama3";

export async function checkOllamaStatus() {
  try {
    const res = await fetch("http://localhost:11434/api/tags", {
      method: "GET",
    });
    return res.ok;
  } catch (err) {
    console.error("Ollama status check error", err);
    return false;
  }
}

export async function getAvailableModels() {
  try {
    const res = await fetch("http://localhost:11434/api/tags", {
      method: "GET",
    });
    
    if (!res.ok) {
      throw new Error("Failed to fetch models");
    }
    
    const data = await res.json();
    console.log("Raw models data:", data);
    
    // Extract model names from the response
    const modelNames = data.models ? data.models.map((model: any) => {
      console.log("Model object:", model);
      return typeof model === 'string' ? model : model.name;
    }) : [];
    
    console.log("Extracted model names:", modelNames);
    return modelNames;
  } catch (err) {
    console.error("Error fetching available models", err);
    return [];
  }
}

export async function generateText(prompt: string, model = DEFAULT_MODEL) {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    const res = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt, stream: true }),
      signal: controller.signal
    });

    clearTimeout(timeoutId)

    const reader = res.body?.getReader();
    if (!reader) {
      throw new Error('Response body is null');
    }
    const decoder = new TextDecoder();
    let result = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.trim()) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.response) {
              result += parsed.response;
            }
          } catch (e) {
            // Skip invalid JSON lines
          }
        }
      }
    }

    return result;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.error("Ollama request timeout", err);
      return "AI request timed out. Please try again.";
    }
    console.error("Ollama error", err);
    return "AI error occurred.";
  }
}

export async function generateAIResponse(prompt: string, model = DEFAULT_MODEL) {
  return generateText(prompt, model);
}