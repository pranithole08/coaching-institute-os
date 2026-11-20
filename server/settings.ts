import { prisma } from '../src/lib/db'

export const SETTING_KEYS = {
  instituteName: 'institute_name',
  whatsappToken: 'whatsapp_token',
  whatsappPhoneId: 'whatsapp_phone_id',
  whatsappApiVersion: 'whatsapp_api_version',
  whatsappVerifyToken: 'whatsapp_verify_token',
  whatsappSimulation: 'whatsapp_simulation',
  aiProvider: 'ai_provider',
  aiApiKey: 'ai_api_key',
  aiBaseUrl: 'ai_base_url',
  aiModel: 'ai_model',
  ollamaUrl: 'ollama_url',
  ollamaModel: 'ollama_model',
  feeReminderDaysBefore: 'fee_reminder_days_before',
  feeReminderRepeatDays: 'fee_reminder_repeat_days',
} as const

export const TEMPLATE_KEYS = {
  welcome: 'tpl_welcome',
  absence: 'tpl_absence',
  fee_reminder: 'tpl_fee_reminder',
  payment: 'tpl_payment',
  test_result: 'tpl_test_result',
  announcement: 'tpl_announcement',
} as const

export const DEFAULT_TEMPLATES: Record<string, string> = {
  welcome:
    'Hi {{parent}}, welcome to {{institute}}! {{student}} has been enrolled in {{class}} ({{batch}}). We will share attendance, fees and test updates here on WhatsApp. — {{institute}}',
  absence:
    'Hi {{parent}}, {{student}} was marked absent today ({{date}}) in {{class}}. If this is unexpected, please reply to this message. — {{institute}}',
  fee_reminder:
    'Hi {{parent}}, a gentle reminder that {{student}}\u2019s fee of \u20b9{{amount}} for {{period}} is due on {{dueDate}}. Kindly pay at your convenience. — {{institute}}',
  payment:
    'Hi {{parent}}, we have received \u20b9{{amount}} towards {{student}}\u2019s fee for {{period}}. Receipt no: {{receipt}}. Thank you! — {{institute}}',
  test_result:
    'Hi {{parent}}, {{student}} scored {{marks}}/{{max}} in {{test}} ({{subject}}). {{remarks}} — {{institute}}',
  announcement: '{{message}} — {{institute}}',
}

export async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.setting.findUnique({ where: { key } })
  return row?.value ?? null
}

export async function getSettings(keys: string[]): Promise<Record<string, string | null>> {
  const rows = await prisma.setting.findMany({ where: { key: { in: keys } } })
  const map: Record<string, string | null> = {}
  for (const key of keys) map[key] = null
  for (const row of rows) map[row.key] = row.value
  return map
}

export async function setSetting(key: string, value: string | null) {
  if (value === null || value === '') {
    await prisma.setting.deleteMany({ where: { key } })
    return
  }
  await prisma.setting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  })
}

export async function getInstituteName(): Promise<string> {
  return (await getSetting(SETTING_KEYS.instituteName)) || 'Our Institute'
}

export async function getTemplate(kind: string): Promise<string> {
  const key = TEMPLATE_KEYS[kind as keyof typeof TEMPLATE_KEYS]
  if (!key) return DEFAULT_TEMPLATES[kind] ?? ''
  const stored = await getSetting(key)
  return stored || DEFAULT_TEMPLATES[kind] || ''
}

export function renderTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, name: string) => {
    const value = vars[name]
    return value === undefined || value === null ? '' : String(value)
  })
}

export async function logActivity(type: string, message: string, actor?: string | null) {
  await prisma.activity.create({ data: { type, message, actor: actor ?? null } })
}
