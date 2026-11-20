// SPDX-License-Identifier: MIT
/**
 * User Hooks
 *
 * Customize business logic for CRUD operations.
 * This file is safe to edit - it will not be overwritten.
 */

/**
 * Result from a hook that can modify or reject the operation
 */
export interface HookResult<T = any> {
  ok: boolean
  error?: { code: string; message: string }
  data?: T
}

/**
 * Hook context with Prisma client
 */
export interface HookContext {
  body: any
  params: Record<string, string>
  query: Record<string, string>
  userId?: string
  tunnelAuthenticated: boolean
  /** Full auth principal from the auth middleware (via, workspaceId, projectId, ...). */
  auth?: any
  prisma: any
}

/**
 * Hooks for User routes
 */
export interface UserHooks {
  /**
   * Called before listing records. Can modify where/include/orderBy.
   * Note: Query parameters (except limit, offset, userId, include, orderBy) are automatically
   * added to the where clause. This hook receives them and can override/extend them.
   */
  beforeList?: (ctx: HookContext) => Promise<HookResult<{ where?: any; include?: any; orderBy?: any }> | void>
  /** Called with listed records before they are returned. Return a replacement array to reshape them. */
  afterList?: (items: any[], ctx: HookContext) => Promise<any[] | void>
  /** Called before getting a single record. Can reject access. */
  beforeGet?: (id: string, ctx: HookContext) => Promise<HookResult | void>
  /** Called with a fetched record before it is returned. Return a replacement to reshape it. */
  afterGet?: (item: any, ctx: HookContext) => Promise<any | void>
  /** Called before creating a record. Can modify input or reject. */
  beforeCreate?: (input: any, ctx: HookContext) => Promise<HookResult<any> | void>
  /** Called after creating a record. Can perform side effects. */
  afterCreate?: (record: any, ctx: HookContext) => Promise<void>
  /** Called before updating a record. Can modify input or reject. */
  beforeUpdate?: (id: string, input: any, ctx: HookContext) => Promise<HookResult<any> | void>
  /** Called after updating a record. Can perform side effects. */
  afterUpdate?: (record: any, ctx: HookContext) => Promise<void>
  /** Called before deleting a record. Can reject deletion. */
  beforeDelete?: (id: string, ctx: HookContext) => Promise<HookResult | void>
  /** Replaces the default delete when set (e.g. to remove dependent rows in one transaction). */
  performDelete?: (id: string, ctx: HookContext) => Promise<void>
  /** Called after deleting a record. Can perform cleanup. */
  afterDelete?: (id: string, ctx: HookContext) => Promise<void>
}

/**
 * Default User hooks (customize as needed)
 */
export const userHooks: UserHooks = {
  // beforeList: async (ctx) => {
  //   // Query params are automatically added to where clause
  //   // Example: GET /api/projects?workspaceId=123 => where: { workspaceId: "123" }
  //   
  //   // You can override or extend the where clause:
  //   // return { ok: true, data: { where: { ...ctx.query, userId: ctx.userId } } }
  // },
  // beforeCreate: async (input, ctx) => {
  //   // Set userId on create
  //   return { ok: true, data: { ...input, userId: ctx.userId } }
  // },
}
