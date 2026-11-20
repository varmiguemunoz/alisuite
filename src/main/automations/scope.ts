import { type EntityManager } from 'typeorm'
import type { AutomationEvent, Scope, SubjectType } from '@shared/automations'
import { TaskModel } from '../models/task.model'
import { MeetingModel } from '../models/meeting.model'

export interface ScopeSource {
  subjectType: SubjectType
  subjectId: string | null
  event: AutomationEvent
  outputs: Record<string, Record<string, unknown>>
}

const day = (date: Date): string => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export async function loadScope(
  manager: EntityManager,
  source: ScopeSource,
  now: Date
): Promise<Scope> {
  const scope: Scope = {
    now: now.toISOString(),
    today: day(now),
    trigger: source.event.payload,
    steps: source.outputs
  }
  const id = source.subjectId
  if (!id) return scope

  if (source.subjectType === 'task') {
    const task = await manager.getRepository(TaskModel).findOneBy({ id })
    if (task) scope.task = task
  } else if (source.subjectType === 'meeting') {
    const meeting = await manager.getRepository(MeetingModel).findOneBy({ id })
    if (meeting) scope.meeting = meeting
  }
  return scope
}

export function subjectExists(scope: Scope, subject: SubjectType): boolean {
  if (subject === 'none') return true
  return scope[subject] !== undefined
}
