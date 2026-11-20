// SPDX-License-Identifier: MIT
/**
 * Auto-generated StudyMaterial Routes
 *
 */

import { Hono } from "hono"
import { PrismaClient } from "./prisma/client"
import type { Prisma } from "./prisma/client"
import type { StudyMaterialHooks } from "./study-material.hooks"

// JSON replacer that coerces native BigInt values to strings so they can
// be serialized by JSON.stringify (and therefore by Hono's default json
// helper, which throws on bare BigInt values). Strings preserve full
// precision for very large counts (e.g. byte totals). Consumers that need
// a numeric should coerce explicitly.
const bigIntReplacer = (_key: string, value: unknown) =>
  typeof value === "bigint" ? value.toString() : value

// Drop-in replacement for c.json that uses bigIntReplacer. Keeps the same
// (body, status?) ergonomics as c.json so call sites are mechanical.
function sendJson(c: any, body: unknown, status: number = 200) {
  return c.body(JSON.stringify(body, bigIntReplacer), status, {
    "content-type": "application/json; charset=UTF-8",
  })
}

// Prisma client instance (injected)
let prisma: PrismaClient | null = null

/**
 * Optional route hooks that hooks files written before they existed may
 * not declare on their interface.
 */
interface ResponseHooks {
  /** Transform listed records before they are returned. */
  afterList?: (items: any[], ctx: any) => Promise<any[] | void>
  /** Transform a fetched record before it is returned. */
  afterGet?: (item: any, ctx: any) => Promise<any | void>
  /** Replace the default delete (e.g. to remove dependent rows in one transaction). */
  performDelete?: (id: string, ctx: any) => Promise<void>
}

type RouteHooks = StudyMaterialHooks & ResponseHooks

let hooks: RouteHooks = {}

/**
 * Set the Prisma client instance
 */
export function setPrisma(client: PrismaClient) {
  prisma = client
}

/**
 * Set hooks for StudyMaterial routes
 */
export function setStudyMaterialHooks(h: RouteHooks) {
  hooks = h
}

/**
 * Get Prisma client (throws if not set)
 */
function getPrisma(): PrismaClient {
  if (!prisma) {
    throw new Error("Prisma client not set. Call setPrisma() first.")
  }
  return prisma
}

/**
 * Build route context from Hono context
 */
function buildContext(c: any, body?: any) {
  const auth = c.get("auth")
  return {
    body: body || {},
    params: c.req.param() || {},
    query: Object.fromEntries(new URL(c.req.url).searchParams),
    userId: auth?.userId,
    tunnelAuthenticated: !!auth?.tunnelAuthenticated,
    auth,
    prisma: getPrisma(),
  }
}

/**
 * HTTP status for a hook rejection. Hooks signal authorization failures
 * with `unauthorized` / `forbidden` / `not_found` codes, and state
 * conflicts with `already_member` / `last_owner`.
 */
function hookErrorStatus(error: { code?: string } | undefined): number {
  switch (error?.code) {
    case "unauthorized": return 401
    case "forbidden": return 403
    case "not_found": return 404
    case "already_member":
    case "last_owner": return 409
    default: return 400
  }
}

// Field allowlists derived from the Prisma schema at code-gen time. Used
// by `pickWritableFields` to keep the create/update payload Prisma-safe.
const WRITABLE_SCALAR_FIELDS = ["title", "description", "kind", "className", "batch", "subject", "url", "fileName", "fileData", "dueDate", "uploadedBy", "createdAt"] as const
const RELATION_FIELDS = [] as const

type WriteBodyResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } }

/**
 * Build a Prisma-safe `data` payload from the request body:
 * - Scalar/enum fields are passed through (only fields the schema declares).
 * - Relation fields must use Prisma's nested-write shape (an object like
 *   `{ connect: { id: ... } }` or `{ create: { ... } }`), not a raw scalar
 *   or array. The common bug `{ scorecards: 1 }` would otherwise crash with
 *   "Argument `scorecards`: Invalid value provided. Expected
 *    XCreateNestedManyWithoutYInput, provided Int." We surface it as a 400.
 * - Unknown keys are silently dropped to prevent injection of fields the
 *   schema does not expose.
 */
function pickWritableFields<T>(body: any): WriteBodyResult<T> {
  if (body == null || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: { code: "invalid_body", message: "Request body must be a JSON object." } }
  }
  const data: Record<string, unknown> = {}
  for (const key of WRITABLE_SCALAR_FIELDS) {
    if (body[key] !== undefined) data[key] = body[key]
  }
  for (const key of RELATION_FIELDS) {
    const value = body[key]
    if (value === undefined || value === null) continue
    if (typeof value !== "object" || Array.isArray(value)) {
      return {
        ok: false,
        error: {
          code: "invalid_relation_shape",
          message: `Field "${key}" is a relation. Provide it as { connect: { id: ... } } or { create: { ... } }, not a scalar/array.`,
        },
      }
    }
    data[key] = value
  }
  return { ok: true, data: data as T }
}

/**
 * Create StudyMaterial CRUD routes
 */
export function createStudyMaterialRoutes(): Hono {
  const router = new Hono()

  // GET / - List all
  router.get("/", async (c) => {
    try {
      const ctx = buildContext(c)
      const prisma = getPrisma()
      const query = ctx.query
      
      // Build initial where from query params (exclude pagination/meta params)
      const reservedParams = ["limit", "offset", "userId", "include", "orderBy"]
      let where: any = {}
      
      for (const [key, value] of Object.entries(query)) {
        if (!reservedParams.includes(key) && value !== undefined && value !== null && value !== "") {
          // Try to parse as number or boolean
          let parsedValue: any = value
          if (value === "true") parsedValue = true
          else if (value === "false") parsedValue = false
          else if (!isNaN(Number(value)) && value !== "") parsedValue = Number(value)
          
          where[key] = parsedValue
        }
      }
      
      let orderBy: any = undefined

      // Honor an `orderBy` query param of the form "field:direction"
      // (e.g. "createdAt:desc"). Without this, a `limit` returns an
      // arbitrary DB-ordered slice rather than the newest/oldest rows.
      if (typeof query.orderBy === "string" && query.orderBy) {
        const [field, dir] = query.orderBy.split(":")
        if (field) orderBy = { [field]: dir === "asc" ? "asc" : "desc" }
      }

      // Apply beforeList hook (can override where/include/orderBy)
      if (hooks.beforeList) {
        const result = await hooks.beforeList(ctx)
        if (result && !result.ok) {
          return sendJson(c, { error: result.error }, hookErrorStatus(result.error))
        }
        if (result?.data) {
          where = result.data.where || where
          orderBy = result.data.orderBy || orderBy
        }
      }

      const [items, total] = await Promise.all([
        prisma.studyMaterial.findMany({
          where,
          orderBy,
          take: query.limit ? parseInt(query.limit) : undefined,
          skip: query.offset ? parseInt(query.offset) : undefined,
        }),
        prisma.studyMaterial.count({ where }),
      ])

      const shaped = hooks.afterList ? (await hooks.afterList(items, ctx)) ?? items : items
      return sendJson(c, { ok: true, items: shaped, total })
    } catch (error: any) {
      console.error("[StudyMaterial] List error:", error)
      return sendJson(c, { error: { code: "list_failed", message: error.message } }, 500)
    }
  })

  // GET /:id - Get by ID
  router.get("/:id", async (c) => {
    try {
      const id = c.req.param("id")
      const ctx = buildContext(c)
      const prisma = getPrisma()

      // Apply beforeGet hook
      if (hooks.beforeGet) {
        const result = await hooks.beforeGet(id, ctx)
        if (result && !result.ok) {
          return sendJson(c, { error: result.error }, hookErrorStatus(result.error))
        }
      }

      const item = await prisma.studyMaterial.findUnique({
        where: { id },
      })

      if (!item) {
        return sendJson(c, { error: { code: "not_found", message: "StudyMaterial not found" } }, 404)
      }

      const shaped = hooks.afterGet ? (await hooks.afterGet(item, ctx)) ?? item : item
      return sendJson(c, { ok: true, data: shaped })
    } catch (error: any) {
      console.error("[StudyMaterial] Get error:", error)
      return sendJson(c, { error: { code: "get_failed", message: error.message } }, 500)
    }
  })

  // POST / - Create
  router.post("/", async (c) => {
    try {
      let body = await c.req.json()
      const ctx = buildContext(c, body)
      const prisma = getPrisma()

      // Apply beforeCreate hook
      if (hooks.beforeCreate) {
        const result = await hooks.beforeCreate(body, ctx)
        if (result && !result.ok) {
          return sendJson(c, { error: result.error }, hookErrorStatus(result.error))
        }
        if (result?.data) {
          body = result.data
        }
      }

      // Filter the body to schema-known scalars + relation-shaped relations.
      // Prevents accidental relation-as-scalar errors and unknown-key Prisma crashes.
      const picked = pickWritableFields<Prisma.StudyMaterialUncheckedCreateInput>(body)
      if (!picked.ok) {
        return sendJson(c, { error: picked.error }, 400)
      }

      const item = await prisma.studyMaterial.create({
        data: picked.data,
      })

      // Apply afterCreate hook
      if (hooks.afterCreate) {
        await hooks.afterCreate(item, ctx)
      }

      return sendJson(c, { ok: true, data: item }, 201)
    } catch (error: any) {
      console.error("[StudyMaterial] Create error:", error)
      return sendJson(c, { error: { code: "create_failed", message: error.message } }, 500)
    }
  })

  // PATCH /:id - Update
  router.patch("/:id", async (c) => {
    try {
      const id = c.req.param("id")
      let body = await c.req.json()
      const ctx = buildContext(c, body)
      const prisma = getPrisma()

      // Apply beforeUpdate hook
      if (hooks.beforeUpdate) {
        const result = await hooks.beforeUpdate(id, body, ctx)
        if (result && !result.ok) {
          return sendJson(c, { error: result.error }, hookErrorStatus(result.error))
        }
        if (result?.data) {
          body = result.data
        }
      }

      // Same allowlist filter as on create — see pickWritableFields above.
      const picked = pickWritableFields<Prisma.StudyMaterialUncheckedUpdateInput>(body)
      if (!picked.ok) {
        return sendJson(c, { error: picked.error }, 400)
      }

      const item = await prisma.studyMaterial.update({
        where: { id },
        data: picked.data,
      })

      // Apply afterUpdate hook
      if (hooks.afterUpdate) {
        await hooks.afterUpdate(item, ctx)
      }

      return sendJson(c, { ok: true, data: item })
    } catch (error: any) {
      console.error("[StudyMaterial] Update error:", error)
      return sendJson(c, { error: { code: "update_failed", message: error.message } }, 500)
    }
  })

  // DELETE /:id - Delete
  router.delete("/:id", async (c) => {
    try {
      const id = c.req.param("id")
      const ctx = buildContext(c)
      const prisma = getPrisma()

      // Apply beforeDelete hook
      if (hooks.beforeDelete) {
        const result = await hooks.beforeDelete(id, ctx)
        if (result && !result.ok) {
          return sendJson(c, { error: result.error }, hookErrorStatus(result.error))
        }
      }

      if (hooks.performDelete) {
        await hooks.performDelete(id, ctx)
      } else {
        await prisma.studyMaterial.delete({
          where: { id },
        })
      }

      // Apply afterDelete hook
      if (hooks.afterDelete) {
        await hooks.afterDelete(id, ctx)
      }

      return sendJson(c, { ok: true })
    } catch (error: any) {
      console.error("[StudyMaterial] Delete error:", error)
      return sendJson(c, { error: { code: "delete_failed", message: error.message } }, 500)
    }
  })

  return router
}
