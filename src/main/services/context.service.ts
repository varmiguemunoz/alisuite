import { Like, type DataSource } from 'typeorm'
import { todayKey } from '@shared/tasks'
import type { NoteEntity, Overview, SearchHit } from '@shared/consultora'
import { MeetingModel } from '../models/meeting.model'
import { transactionGuard } from '../guards/transaction.guard'
import { AppError } from './app.error'
import { now, requiredText } from './fields'
import { brief, openActionItems } from './meeting.helpers'

export class ContextService {
  constructor(private readonly db: DataSource) {}

  async overview(): Promise<Overview> {
    const meetings = await this.db.getRepository(MeetingModel).find({ order: { date: 'DESC' } })
    return {
      openActionItems: openActionItems(meetings).slice(0, 40),
      recentMeetings: meetings.slice(0, 5).map(brief)
    }
  }

  async search(query: string): Promise<SearchHit[]> {
    const q = requiredText(query, 'La búsqueda', 200)
    const like = Like(`%${q}%`)
    const meetings = await this.db.getRepository(MeetingModel).find({
      where: [
        { title: like },
        { summaryMd: like },
        { decisionsMd: like },
        { rawNotesMd: like },
        { transcriptMd: like }
      ],
      order: { date: 'DESC' }
    })

    return meetings
      .map((m) =>
        hit('meeting', m.id, `${m.date.slice(0, 10)} · ${m.title}`, q, [
          m.title,
          m.summaryMd,
          m.decisionsMd,
          m.rawNotesMd,
          m.transcriptMd
        ])
      )
      .slice(0, 50)
  }

  async appendNote(entity: NoteEntity, ref: string, text: string): Promise<void> {
    const line = `**${todayKey()}** — ${requiredText(text, 'La nota', 5000)}`
    const add = (md: string): string => (md.trim() ? `${md.trimEnd()}\n\n${line}` : line)
    if (entity !== 'meeting') throw new AppError('invalid', 'entity debe ser meeting.')

    await transactionGuard(this.db, async (manager) => {
      const repo = manager.getRepository(MeetingModel)
      const row = await repo.findOneBy({ id: ref })
      if (!row) throw new AppError('not_found', 'No existe esa reunión.')
      await repo.save({ ...row, rawNotesMd: add(row.rawNotesMd), updatedAt: now() })
    })
  }
}

function hit(
  type: SearchHit['type'],
  id: string,
  title: string,
  query: string,
  fields: (string | null)[]
): SearchHit {
  const q = query.toLowerCase()
  const field = fields.find((f) => f?.toLowerCase().includes(q)) ?? ''
  const at = field.toLowerCase().indexOf(q)
  const start = Math.max(0, at - 70)
  const snippet = field
    .slice(start, start + 160)
    .replace(/\s+/g, ' ')
    .trim()
  return {
    type,
    id,
    title,
    snippet: `${start > 0 ? '…' : ''}${snippet}${start + 160 < field.length ? '…' : ''}`
  }
}
