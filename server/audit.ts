import { prisma } from '../src/lib/db'

export type AuditInput = {
  entity: string
  action: string
  entityId?: string | null
  detail?: string | null
  actor?: string | null
}

/**
 * Append-only trail for changes that matter: attendance corrections, result
 * publication, financial transactions and permission changes.
 */
export async function audit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        entity: input.entity,
        action: input.action,
        entityId: input.entityId ?? null,
        detail: input.detail ?? null,
        actor: input.actor ?? null,
      },
    })
  } catch (err) {
    console.error('[audit] could not record entry', err)
  }
}
