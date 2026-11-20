import type { EntityManager } from 'typeorm'
import type { NodeContext, NodeResult } from '../ports'

export class Skip extends Error {}

export function manager(ctx: NodeContext): EntityManager {
  if (!ctx.manager) throw new Error('Este paso necesita una transacción.')
  return ctx.manager
}

export function param(ctx: NodeContext, key: string): string {
  const value = ctx.node.params[key]
  return typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : ''
}

export function numberParam(ctx: NodeContext, key: string): number | null {
  const value = ctx.node.params[key]
  if (value === '' || value === null || value === undefined) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export const done = (output?: Record<string, unknown>): NodeResult => ({ kind: 'next', output })

export function guarded(
  run: (ctx: NodeContext) => Promise<NodeResult>
): (ctx: NodeContext) => Promise<NodeResult> {
  return async (ctx) => {
    try {
      return await run(ctx)
    } catch (err) {
      if (err instanceof Skip) return { kind: 'skip', reason: err.message }
      throw err
    }
  }
}

export function today(ctx: NodeContext, plusDays = 0): string {
  const d = ctx.ports.clock.now()
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate() + plusDays)
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
}
