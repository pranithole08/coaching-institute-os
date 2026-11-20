import { prisma } from '../src/lib/db'
import { SETTING_KEYS, getSettings } from './settings'

export type WhatsAppConfig = {
  token: string | null
  phoneNumberId: string | null
  apiVersion: string
  verifyToken: string | null
  simulation: boolean
  source: 'settings' | 'env' | 'none'
}

export type SendResult = {
  status: 'sent' | 'failed' | 'not_configured' | 'simulated'
  providerId: string | null
  error: string | null
}

export async function getWhatsAppConfig(): Promise<WhatsAppConfig> {
  const s = await getSettings([
    SETTING_KEYS.whatsappToken,
    SETTING_KEYS.whatsappPhoneId,
    SETTING_KEYS.whatsappApiVersion,
    SETTING_KEYS.whatsappVerifyToken,
    SETTING_KEYS.whatsappSimulation,
  ])

  const envToken = process.env.WHATSAPP_ACCESS_TOKEN || null
  const envPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || null

  const token = s[SETTING_KEYS.whatsappToken] || envToken
  const phoneNumberId = s[SETTING_KEYS.whatsappPhoneId] || envPhoneId
  const apiVersion =
    s[SETTING_KEYS.whatsappApiVersion] || process.env.WHATSAPP_API_VERSION || 'v21.0'
  const verifyToken =
    s[SETTING_KEYS.whatsappVerifyToken] || process.env.WHATSAPP_VERIFY_TOKEN || null
  const simulation = s[SETTING_KEYS.whatsappSimulation] === '1'

  const source: WhatsAppConfig['source'] = s[SETTING_KEYS.whatsappToken]
    ? 'settings'
    : envToken
      ? 'env'
      : 'none'

  return { token, phoneNumberId, apiVersion, verifyToken, simulation, source }
}

/** Strip formatting and keep a leading +. Returns null when the number is unusable. */
export function normalizePhone(raw: string): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  const digits = trimmed.replace(/[^\d]/g, '')
  if (digits.length < 8 || digits.length > 15) return null
  return `+${digits}`
}

export function maskSecret(value: string | null): string | null {
  if (!value) return null
  if (value.length <= 8) return '••••'
  return `${value.slice(0, 4)}••••${value.slice(-4)}`
}

/**
 * Send a plain text WhatsApp message through the official Cloud API.
 * Never reports success unless Meta accepted the message.
 */
export async function sendWhatsAppText(to: string, body: string): Promise<SendResult> {
  const config = await getWhatsAppConfig()
  const phone = normalizePhone(to)

  if (!phone) {
    return { status: 'failed', providerId: null, error: 'Invalid phone number' }
  }

  if (config.simulation) {
    return { status: 'simulated', providerId: null, error: null }
  }

  if (!config.token || !config.phoneNumberId) {
    return {
      status: 'not_configured',
      providerId: null,
      error:
        'WhatsApp Cloud API is not connected. Add your Phone Number ID and access token in Settings.',
    }
  }

  const url = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone.replace('+', ''),
        type: 'text',
        text: { preview_url: false, body },
      }),
      signal: AbortSignal.timeout(20_000),
    })

    const payload = (await res.json().catch(() => null)) as
      | { messages?: { id?: string }[]; error?: { message?: string; code?: number } }
      | null

    if (!res.ok) {
      const message =
        payload?.error?.message ?? `WhatsApp API returned HTTP ${res.status}`
      return { status: 'failed', providerId: null, error: message }
    }

    const providerId = payload?.messages?.[0]?.id ?? null
    if (!providerId) {
      return {
        status: 'failed',
        providerId: null,
        error: 'WhatsApp API accepted the request but returned no message id',
      }
    }
    return { status: 'sent', providerId, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error calling WhatsApp API'
    return { status: 'failed', providerId: null, error: message }
  }
}

export type LogMessageInput = {
  to: string
  body: string
  template: string
  studentId?: string | null
  refId?: string | null
  sentBy?: string | null
}

/** Send and persist the outcome. The stored status is always the real one. */
export async function sendAndLog(input: LogMessageInput) {
  const result = await sendWhatsAppText(input.to, input.body)
  const log = await prisma.messageLog.create({
    data: {
      to: normalizePhone(input.to) ?? input.to,
      body: input.body,
      template: input.template,
      studentId: input.studentId ?? null,
      refId: input.refId ?? null,
      sentBy: input.sentBy ?? null,
      status: result.status,
      providerId: result.providerId,
      error: result.error,
    },
  })
  return { log, result }
}

export async function whatsappStatus() {
  const config = await getWhatsAppConfig()
  return {
    configured: Boolean(config.token && config.phoneNumberId),
    simulation: config.simulation,
    source: config.source,
    apiVersion: config.apiVersion,
    phoneNumberId: config.phoneNumberId,
    tokenPreview: maskSecret(config.token),
    verifyTokenSet: Boolean(config.verifyToken),
  }
}
