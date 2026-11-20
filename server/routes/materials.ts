import { Hono } from 'hono'
import { prisma } from '../../src/lib/db'
import { currentUser, requireAuth } from '../auth'
import { audit } from '../audit'
import { logActivity } from '../settings'
import { actorName, body, scopeAllows, str, teacherScopes } from './shared'

const materials = new Hono()

materials.get('/materials', requireAuth, async (c) => {
  const me = currentUser(c)
  const scopes = await teacherScopes(me)
  const className = str(c.req.query('className'))
  const batch = str(c.req.query('batch'))
  const kind = str(c.req.query('kind'))

  const rows = await prisma.studyMaterial.findMany({
    where: {
      ...(className ? { className } : {}),
      ...(batch ? { batch } : {}),
      ...(kind ? { kind } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  return c.json({
    materials: rows.filter((m) => scopeAllows(scopes, m.className, m.batch || null)),
  })
})

materials.post('/materials', requireAuth, async (c) => {
  const me = currentUser(c)
  const input = await body<Record<string, unknown>>(c)

  const title = str(input.title)
  const className = str(input.className)
  const batch = str(input.batch)
  const kind = str(input.kind) === 'assignment' ? 'assignment' : 'material'

  if (!title) return c.json({ error: 'Title is required' }, 400)
  if (!className) return c.json({ error: 'Class is required' }, 400)

  const scopes = await teacherScopes(me)
  if (!scopeAllows(scopes, className, batch || null)) {
    return c.json({ error: 'You are not assigned to that class and batch' }, 403)
  }

  const fileData = str(input.fileData)
  if (fileData && !fileData.startsWith('data:')) {
    return c.json({ error: 'fileData must be a data: URL' }, 400)
  }
  if (fileData.length > 2_500_000) {
    return c.json({ error: 'Attachment is too large (max ~1.8 MB)' }, 413)
  }

  const material = await prisma.studyMaterial.create({
    data: {
      title,
      description: str(input.description) || null,
      kind,
      className,
      batch,
      subject: str(input.subject) || null,
      url: str(input.url) || null,
      fileName: str(input.fileName) || null,
      fileData: fileData || null,
      dueDate: str(input.dueDate) || null,
      uploadedBy: actorName(c),
    },
  })

  await logActivity(
    'material',
    `${kind === 'assignment' ? 'Assignment' : 'Study material'} “${title}” shared with ${className}${batch ? ` · ${batch}` : ''}`,
    actorName(c),
  )
  await audit({
    entity: 'study_material',
    entityId: material.id,
    action: 'created',
    detail: `${kind} · ${className} · ${batch || 'all'}`,
    actor: actorName(c),
  })

  return c.json({ material }, 201)
})

materials.delete('/materials/:id', requireAuth, async (c) => {
  const me = currentUser(c)
  const id = c.req.param('id') ?? ''
  const existing = await prisma.studyMaterial.findUnique({ where: { id } })
  if (!existing) return c.json({ error: 'Material not found' }, 404)

  const scopes = await teacherScopes(me)
  if (!scopeAllows(scopes, existing.className, existing.batch || null)) {
    return c.json({ error: 'You are not assigned to that class and batch' }, 403)
  }

  await prisma.studyMaterial.delete({ where: { id } })
  await audit({
    entity: 'study_material',
    entityId: id,
    action: 'deleted',
    detail: existing.title,
    actor: actorName(c),
  })
  return c.json({ ok: true })
})

export default materials
