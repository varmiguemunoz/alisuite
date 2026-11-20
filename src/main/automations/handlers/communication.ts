import { markdownToHtml } from '@shared/automations'
import type { DayKey, Effort } from '@shared/tasks'
import { insertTaskWithRoom } from '../../services/task.service'
import { NotConfigured, type Handlers, type NodeContext } from '../ports'
import { done, guarded, manager, numberParam, param, Skip, today } from './shared'

export interface NoteWriter {
  create(body: string): Promise<{ id: string }>
}

const EFFORTS: Effort[] = ['bajo', 'medio', 'alto']

function emailPort(ctx: NodeContext): NonNullable<NodeContext['ports']['email']> {
  if (!ctx.ports.email) throw new NotConfigured('El email no está configurado en este equipo.')
  return ctx.ports.email
}

export function communicationHandlers(notes: NoteWriter): Handlers {
  return {
    email_owner: {
      run: guarded(async (ctx) => {
        const port = emailPort(ctx)
        const owner = port.ownerEmail()
        if (!owner) throw new Skip('Falta tu email en Ajustes.')
        const subject = ctx.render(param(ctx, 'subject')).trim()
        const html = markdownToHtml(ctx.render(param(ctx, 'body')))
        if (ctx.dryRun) return done({ to: owner, subject })
        await port.send({
          to: owner,
          subject,
          html,
          idempotencyKey: ctx.idempotencyKey
        })
        return done({ to: owner })
      })
    },
    create_task: {
      run: guarded(async (ctx) => {
        const effort = param(ctx, 'effort') as Effort
        const tags = Array.isArray(ctx.node.params.tags) ? (ctx.node.params.tags as string[]) : []
        const task = await insertTaskWithRoom(manager(ctx), {
          title: ctx.render(param(ctx, 'title')).trim(),
          date: today(ctx, Math.max(0, Math.floor(numberParam(ctx, 'inDays') ?? 0))) as DayKey,
          description: ctx.render(param(ctx, 'description')).trim() || null,
          tags,
          effort: EFFORTS.includes(effort) ? effort : null
        })
        return done({ taskId: task.id, date: task.date })
      })
    },
    create_note: {
      outside: true,
      run: guarded(async (ctx) => {
        const title = ctx.render(param(ctx, 'title')).trim()
        const body = ctx.render(param(ctx, 'body')).trim()
        const text = body ? `# ${title}\n\n${body}` : `# ${title}`
        const note = await notes.create(text)
        return done({ noteId: note.id })
      })
    },
    notify_mac: {
      outside: true,
      run: guarded(async (ctx) => {
        ctx.ports.notifier.notify(ctx.render(param(ctx, 'title')), ctx.render(param(ctx, 'body')))
        return done()
      })
    },
    webhook: {
      outside: true,
      run: guarded(async (ctx) => {
        const method = param(ctx, 'method') || 'POST'
        const url = ctx.render(param(ctx, 'url')).trim()
        const raw = ctx.render(param(ctx, 'body')).trim()
        let body: string | null = null
        if (raw && method !== 'GET') {
          try {
            body = JSON.stringify(JSON.parse(raw))
          } catch {
            return { kind: 'fail', reason: 'El cuerpo no es JSON válido.', retryable: false }
          }
        }
        const response = await ctx.ports.http.request({ url, method, body, timeoutMs: 10_000 })
        let parsed: unknown = response.body
        try {
          parsed = JSON.parse(response.body)
        } catch {
          parsed = response.body
        }
        return done({ status: response.status, body: parsed })
      })
    }
  }
}
