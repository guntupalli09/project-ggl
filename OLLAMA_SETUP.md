# Ollama Setup Guide

This project now uses Ollama instead of OpenAI for AI text generation. Ollama runs locally on your machine, providing privacy and no API costs.

## Prerequisites

- Ollama installed on your system
- At least 4GB RAM available for the AI models
- Internet connection for initial model downloads

## Installation

### 1. Install Ollama

**Windows:**
1. Download Ollama from [https://ollama.ai/download](https://ollama.ai/download)
2. Run the installer
3. Ollama will start automatically

**macOS:**
```bash
brew install ollama
```

**Linux:**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

### 2. Start Ollama Service

**Windows/macOS:**
- Ollama should start automatically after installation
- If not, run: `ollama serve`

**Linux:**
```bash
ollama serve
```

### 3. Download Recommended Models

The application works with various models. Here are the recommended ones:

**Lightweight (Fast, Low Resource):**
```bash
ollama pull llama3.2:3b
ollama pull phi3:mini
```

**Medium (Balanced):**
```bash
ollama pull llama3.2:7b
ollama pull mistral:7b
```

**Heavy (Best Quality):**
```bash
ollama pull llama3.1:8b
ollama pull codellama:7b
```

### 4. Verify Installation

Check if Ollama is running:
```bash
ollama list
```

You should see your downloaded models listed.

## Usage in the Application

### 1. Start the Application

```bash
npm run dev
```

### 2. Check Ollama Status

- The application will automatically detect if Ollama is running
- Look for the status indicator in the AI components:
  - 🟢 Green: Ollama connected
  - 🟡 Yellow: Checking connection
  - 🔴 Red: Ollama disconnected

### 3. Model Selection

- Once connected, you can select different models from the dropdown
- The application will use the selected model for all AI generation

## Troubleshooting

### Ollama Not Detected

1. **Check if Ollama is running:**
   ```bash
   ollama list
   ```

2. **Start Ollama service:**
   ```bash
   ollama serve
   ```

3. **Check the port:**
   - Ollama runs on `http://localhost:11434` by default
   - Make sure no other service is using this port

### Model Not Available

1. **Download the model:**
   ```bash
   ollama pull <model-name>
   ```

2. **Check available models:**
   ```bash
   ollama list
   ```

### Performance Issues

1. **Use lighter models:**
   - `llama3.2:3b` or `phi3:mini` for faster generation
   - `llama3.2:7b` for balanced performance

2. **Close other applications** to free up RAM

3. **Check system resources:**
   - Ensure at least 4GB RAM is available
   - Monitor CPU usage during generation

### Generation Errors

1. **Check model availability:**
   ```bash
   ollama list
   ```

2. **Test model manually:**
   ```bash
   ollama run llama3.2:3b "Hello, how are you?"
   ```

3. **Restart Ollama service:**
   ```bash
   # Stop Ollama (Ctrl+C)
   ollama serve
   ```

## Model Recommendations

### For Development/Testing
- `llama3.2:3b` - Fast, lightweight, good for testing
- `phi3:mini` - Very fast, minimal resources

### For Production Use
- `llama3.2:7b` - Good balance of speed and quality
- `mistral:7b` - Excellent quality, slightly slower

### For Best Quality
- `llama3.1:8b` - High quality, requires more resources
- `codellama:7b` - Specialized for code generation

## Features

### AI Message Generator
- Generates personalized outreach emails
- Uses selected Ollama model
- Integrates with brand voice settings

### AI Sequence Generator
- Creates 3-step outreach sequences
- Supports different tones and styles
- Saves sequences to database

### Daily Growth Plan
- Generates personalized action items
- Based on user's CRM data
- Provides actionable growth strategies

## Security & Privacy

- All AI processing happens locally
- No data sent to external services
- Complete privacy for your business data
- No API keys or external dependencies required

## Performance Tips

1. **Start with lightweight models** for testing
2. **Upgrade to heavier models** for better quality
3. **Monitor system resources** during generation
4. **Close unnecessary applications** when using AI features
5. **Use SSD storage** for faster model loading

## Support

If you encounter issues:

1. Check this guide first
2. Verify Ollama installation: `ollama --version`
3. Test Ollama manually: `ollama run llama3.2:3b "Test"`
4. Check application console for error messages
5. Ensure sufficient system resources are available
