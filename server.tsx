// SPDX-License-Identifier: MIT
// Copyright (C) 2026
/**
 * Hono Server
 *
 */

import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import customRoutes from './custom-routes'

const app = new Hono()

// CORS — manual middleware so the wildcard always propagates
app.use('*', async (c, next) => {
  c.res.headers.set('Access-Control-Allow-Origin', '*')
  c.res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  if (c.req.method === 'OPTIONS') return new Response(null, { status: 204 })
  await next()
})

// Health check endpoint
app.get('/health', (c) => c.json({ ok: true, timestamp: new Date().toISOString() }))

// Custom API routes (always mounted) — registered before the generic CRUD layer
// so /api/app/* and /api/tools/* are never intercepted by the CRUD guard below.
app.route('/api', customRoutes)


// CRUD routes (available after schema.prisma has models)
// Crud admin guard
// The generated CRUD layer is generic and therefore unauthenticated by design.
// Nothing in the SPA uses it (the app talks to /api/app/*), so it is mounted
// behind an admin session check instead of being served to the public internet.
try {
  const { createAllRoutes } = await import('./src/generated')
  const { prisma } = await import('./src/lib/db')
  const { resolveUser } = await import('./server/auth')

  const crud = new Hono()
  crud.use('*', async (c, next) => {
    const path = c.req.path
    // Never let the guard shadow the real API surface or the tools proxy.
    if (path.startsWith('/api/app') || path.startsWith('/api/tools')) return next()
    const user = await resolveUser(c)
    if (!user || user.role !== 'admin') {
      // 404 rather than 403 so the surface stays indistinguishable from absent.
      return c.json({ error: 'Not found' }, 404)
    }
    await next()
  })
  crud.route('/', createAllRoutes(prisma))
  app.route('/api', crud)
} catch {
  // No generated routes yet — CRUD routes will appear after schema.prisma is written
}




// Serve static files in production
app.use('/*', serveStatic({ root: './dist' }))
app.get('*', serveStatic({ path: './dist/index.html' }))

const port = Number(process.env.PORT) || 3001
console.log(`🚀 Server running on http://localhost:${port}`)

Bun.serve({ port, fetch: app.fetch })
