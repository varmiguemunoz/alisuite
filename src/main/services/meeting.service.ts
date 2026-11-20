import { randomUUID } from 'crypto'
import type { DataSource } from 'typeorm'
import { toDayKey } from '@shared/tasks'
import {
  LANGUAGES,
  type ActionItem,
  type Meeting,
  type MeetingFilter,
  type MeetingInput,
  type MeetingsPage,
  type OpenActionItem
} from '@shared/consultora'
import { MeetingModel } from '../models/meeting.model'

import { transactionGuard } from '../guards/transaction.guard'
import { AppError } from './app.error'
import { markdown, now, oneOf, optionalText, optionalUserId, requiredText } from './fields'
import { actionItems, brief } from './meeting.helpers'
import { pageByDay } from './page-by-day'

export class MeetingService {
  constructor(private readonly db: DataSource) {}

  async get(id: unknown): Promise<Meeting> {
    const meeting =
      typeof id === 'string' ? await this.db.getRepository(MeetingModel).findOneBy({ id }) : null
    if (!meeting) throw new AppError('not_found', 'No existe esa reunión.')
    return meeting
  }

  async list(filter: MeetingFilter): Promise<MeetingsPage> {
    const meetings = await this.db.getRepository(MeetingModel).find({ order: { date: 'DESC' } })
    // Filtro de fechas por día local (la fecha se guarda en ISO UTC).
    const items = meetings
      .map((m) => ({ date: toDayKey(new Date(m.date)), meeting: brief(m) }))
      .filter((i) => (!filter.from || i.date >= filter.from) && (!filter.to || i.date <= filter.to))

    const { days, ...pages } = pageByDay(items, filter.page ?? 1, filter.pageSize ?? 7)
    return {
      ...pages,
      days: days.map((d) => ({ date: d.date, meetings: d.items.map((i) => i.meeting) }))
    }
  }

  create(input: MeetingInput): Promise<Meeting> {
    return transactionGuard(this.db, async (manager) => {
      const stamp = now()
      const meeting: Meeting = {
        id: randomUUID(),
        date: input.date ? checkDate(input.date) : stamp,
        title: input.title ? requiredText(input.title, 'El título') : 'Reunión',
        assigneeId: optionalUserId(input.assigneeId),
        participants: checkParticipants(input.participants ?? []),
        summaryMd: markdown(input.summaryMd, 'El resumen'),
        decisionsMd: markdown(input.decisionsMd, 'Las decisiones'),
        actionItems: checkActionItems(input.actionItems ?? []),
        transcriptMd: '',
        rawNotesMd: markdown(input.rawNotesMd, 'Las notas'),
        recordingPath: null,
        durationSec: null,
        language: null,
        status: 'ready',
        error: null,
        createdAt: stamp,
        updatedAt: stamp
      }
      await manager.getRepository(MeetingModel).insert(meeting)
      return meeting
    })
  }

  update(id: unknown, patch: MeetingInput): Promise<Meeting> {
    return transactionGuard(this.db, async (manager) => {
      const meetings = manager.getRepository(MeetingModel)
      const meeting = await this.get(id)
      if (patch.title !== undefined) meeting.title = requiredText(patch.title, 'El título')
      if (patch.assigneeId !== undefined) meeting.assigneeId = optionalUserId(patch.assigneeId)
      if (patch.date !== undefined) meeting.date = checkDate(patch.date)
      if (patch.participants !== undefined)
        meeting.participants = checkParticipants(patch.participants)
      if (patch.summaryMd !== undefined) meeting.summaryMd = markdown(patch.summaryMd, 'El resumen')
      if (patch.decisionsMd !== undefined)
        meeting.decisionsMd = markdown(patch.decisionsMd, 'Las decisiones')
      if (patch.actionItems !== undefined) meeting.actionItems = checkActionItems(patch.actionItems)
      if (patch.rawNotesMd !== undefined)
        meeting.rawNotesMd = markdown(patch.rawNotesMd, 'Las notas')
      if (patch.language !== undefined) {
        const language =
          patch.language === null ? null : oneOf(patch.language, LANGUAGES, 'El idioma')
        // Otro idioma = otra transcripción: se borra para que «Resumir de nuevo» vuelva a transcribir.
        if (language !== meeting.language && meeting.recordingPath) meeting.transcriptMd = ''
        meeting.language = language
      }
      meeting.updatedAt = now()
      return meetings.save(meeting)
    })
  }

  async remove(id: unknown): Promise<void> {
    await transactionGuard(this.db, async (manager) => {
      const meeting = await this.get(id)
      await manager.getRepository(MeetingModel).softDelete({ id: meeting.id })
    })
  }

  updateActionItem(id: unknown, index: number, patch: Partial<ActionItem>): Promise<Meeting> {
    return transactionGuard(this.db, async (manager) => {
      const meeting = await this.get(id)
      const item = meeting.actionItems[index]
      if (!item) throw new AppError('not_found', 'No existe ese action item.')
      meeting.actionItems[index] = checkActionItems([{ ...item, ...patch }])[0]
      meeting.updatedAt = now()
      return manager.getRepository(MeetingModel).save(meeting)
    })
  }

  async listActionItems(filter: { done?: boolean }): Promise<OpenActionItem[]> {
    const meetings = await this.db.getRepository(MeetingModel).find()
    const done = filter.done ?? false
    return actionItems(meetings).filter((item) => item.done === done)
  }
}

function checkDate(value: unknown): string {
  const date = typeof value === 'string' ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) throw new AppError('invalid', 'La fecha no es válida.')
  return date.toISOString()
}

function checkParticipants(value: unknown): string[] {
  if (!Array.isArray(value)) throw new AppError('invalid', 'Los participantes deben ser una lista.')
  return value.map((p) => requiredText(p, 'Cada participante', 120))
}

function checkActionItems(value: unknown): ActionItem[] {
  if (!Array.isArray(value)) throw new AppError('invalid', 'Los action items deben ser una lista.')
  return value.map((item) => ({
    text: requiredText(item?.text, 'Cada action item', 500),
    owner: optionalText(item?.owner, 'El responsable', 120),
    due: optionalText(item?.due, 'La fecha límite', 60),
    done: item?.done === true
  }))
}
