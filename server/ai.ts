import { getSetting, setSetting } from './settings'

export type AIProvider = 'openai' | 'gemini' | 'groq' | 'deepseek' | 'ollama' | 'custom'

export interface AIConfig {
  provider: AIProvider
  apiKey: string
  baseUrl: string
  model: string
  configured: boolean
}

export const AI_PROVIDERS: Record<
  AIProvider,
  { name: string; defaultBaseUrl: string; defaultModel: string; models: string[]; requiresApiKey: boolean }
> = {
  openai: {
    name: 'OpenAI',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'],
    requiresApiKey: true,
  },
  gemini: {
    name: 'Google Gemini',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-2.0-flash',
    models: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
    requiresApiKey: true,
  },
  groq: {
    name: 'Groq (Ultra-fast)',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
    requiresApiKey: true,
  },
  deepseek: {
    name: 'DeepSeek',
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    requiresApiKey: true,
  },
  ollama: {
    name: 'Ollama (Local / Self-hosted)',
    defaultBaseUrl: 'http://localhost:11434',
    defaultModel: 'llama3.1',
    models: ['llama3.1', 'qwen2.5', 'mistral', 'llava'],
    requiresApiKey: false,
  },
  custom: {
    name: 'Custom (OpenAI-compatible)',
    defaultBaseUrl: '',
    defaultModel: '',
    models: [],
    requiresApiKey: true,
  },
}

export async function getAIConfig(): Promise<AIConfig> {
  const provider = ((await getSetting('ai_provider')) || process.env.AI_PROVIDER || 'ollama') as AIProvider
  const apiKey = (await getSetting('ai_api_key')) || process.env.AI_API_KEY || ''
  
  // Legacy fallback to ollama_url / ollama_model if new keys aren't set
  let baseUrl = await getSetting('ai_base_url')
  if (!baseUrl && provider === 'ollama') {
    baseUrl = await getSetting('ollama_url')
  }
  if (!baseUrl) {
    baseUrl = AI_PROVIDERS[provider]?.defaultBaseUrl || ''
  }

  let model = await getSetting('ai_model')
  if (!model && provider === 'ollama') {
    model = await getSetting('ollama_model')
  }
  if (!model) {
    model = AI_PROVIDERS[provider]?.defaultModel || ''
  }

  const requiresKey = AI_PROVIDERS[provider]?.requiresApiKey ?? true
  const configured = Boolean(baseUrl && model && (!requiresKey || apiKey))

  return {
    provider,
    apiKey,
    baseUrl: baseUrl.replace(/\/+$/, ''),
    model,
    configured,
  }
}

export async function saveAIConfig(data: {
  provider?: string
  apiKey?: string
  baseUrl?: string
  model?: string
}) {
  if (data.provider !== undefined) await setSetting('ai_provider', data.provider)
  if (data.apiKey !== undefined) await setSetting('ai_api_key', data.apiKey)
  if (data.baseUrl !== undefined) {
    await setSetting('ai_base_url', data.baseUrl)
    if (data.provider === 'ollama') await setSetting('ollama_url', data.baseUrl)
  }
  if (data.model !== undefined) {
    await setSetting('ai_model', data.model)
    if (data.provider === 'ollama') await setSetting('ollama_model', data.model)
  }
}

export async function generateAIText(options: {
  prompt: string
  context?: string
  system?: string
}): Promise<string> {
  const config = await getAIConfig()
  if (!config.configured) {
    throw new Error('AI is not configured. Please select a provider and configure credentials in Settings → AI.')
  }

  const system = options.system || 'You are an intelligent assistant for an educational coaching institute.'
  const userContent = options.context ? `Context: ${options.context}\n\nTask: ${options.prompt}` : options.prompt

  // Ollama native API
  if (config.provider === 'ollama') {
    const res = await fetch(`${config.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        prompt: `${system}\n\n${userContent}\n\nResponse:`,
        stream: false,
      }),
      signal: AbortSignal.timeout(60_000),
    })

    if (!res.ok) {
      throw new Error(`Ollama returned status ${res.status}`)
    }
    const data = (await res.json()) as { response?: string }
    return (data.response ?? '').trim()
  }

  // Standard OpenAI-compatible Chat Completion API (works with OpenAI, Gemini, Groq, DeepSeek, vLLM, etc.)
  const endpoint = config.baseUrl.endsWith('/chat/completions')
    ? config.baseUrl
    : `${config.baseUrl}/chat/completions`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userContent },
      ],
      temperature: 0.7,
      max_tokens: 500,
    }),
    signal: AbortSignal.timeout(60_000),
  })

  if (!res.ok) {
    const errText = await res.text()
    try {
      const errJson = JSON.parse(errText)
      throw new Error(errJson.error?.message || `AI Provider returned HTTP ${res.status}`)
    } catch {
      throw new Error(`AI Provider returned HTTP ${res.status}: ${errText.slice(0, 100)}`)
    }
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  return (data.choices?.[0]?.message?.content ?? '').trim()
}

export async function analyzeAIImage(options: {
  imageBase64: string
  prompt: string
  system?: string
}): Promise<string> {
  const config = await getAIConfig()
  if (!config.configured) {
    throw new Error('AI is not configured. Add credentials in Settings → AI.')
  }

  // Ollama vision mode
  if (config.provider === 'ollama') {
    const cleanB64 = options.imageBase64.replace(/^data:image\/\w+;base64,/, '')
    const res = await fetch(`${config.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        prompt: options.prompt,
        images: [cleanB64],
        stream: false,
      }),
      signal: AbortSignal.timeout(60_000),
    })

    if (!res.ok) {
      throw new Error(`Ollama returned status ${res.status}`)
    }
    const data = (await res.json()) as { response?: string }
    return (data.response ?? '').trim()
  }

  // OpenAI-compatible Multimodal Chat Completion
  const endpoint = config.baseUrl.endsWith('/chat/completions')
    ? config.baseUrl
    : `${config.baseUrl}/chat/completions`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`
  }

  const imageUrl = options.imageBase64.startsWith('data:')
    ? options.imageBase64
    : `data:image/jpeg;base64,${options.imageBase64}`

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: config.model,
      messages: [
        ...(options.system ? [{ role: 'system', content: options.system }] : []),
        {
          role: 'user',
          content: [
            { type: 'text', text: options.prompt },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
      max_tokens: 150,
    }),
    signal: AbortSignal.timeout(60_000),
  })

  if (!res.ok) {
    const errText = await res.text()
    try {
      const errJson = JSON.parse(errText)
      throw new Error(errJson.error?.message || `AI Vision returned HTTP ${res.status}`)
    } catch {
      throw new Error(`AI Vision returned HTTP ${res.status}`)
    }
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  return (data.choices?.[0]?.message?.content ?? '').trim()
}
