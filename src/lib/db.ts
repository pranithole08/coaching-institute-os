// SPDX-License-Identifier: Apache-2.0
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { PrismaClient } from '../generated/prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  const prismaDb = resolve(process.cwd(), 'prisma/dev.db')
  if (existsSync(prismaDb)) {
    return `file:${prismaDb}`
  }
  return 'file:./dev.db'
}

const adapter = new PrismaLibSql({
  url: getDatabaseUrl(),
})

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
