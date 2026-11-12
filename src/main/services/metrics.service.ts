import { IsNull, type DataSource } from 'typeorm'
import type { Meeting } from '@shared/consultora'
import {
  METRIC_KINDS,
  METRIC_PERIODS,
  dayOf,
  inRange,
  periodRange,
  previousRange,
  rangeDays,
  type ActionItemsMetric,
  type DayRange,
  type MeetingsMetric,
  type MetricKind,
  type MetricsQuery,
  type MetricsResult,
  type OverdueMetric,
  type TaskCountsMetric,
  type TasksByStatusMetric,
  type TrendPoint
} from '@shared/metrics'
import {
  addDays,
  fromDayKey,
  todayKey,
  toDayKey,
  type DayKey,
  type Task as TaskType
} from '@shared/tasks'
import { TaskModel } from '../models/task.model'
import { MeetingModel } from '../models/meeting.model'
import { AppError } from './app.error'

const LIST_LIMIT = 20

export function buckets(r: DayRange): DayRange[] {
  const days = rangeDays(r)
  const out: DayRange[] = []
  if (days <= 120) {
    const step = days <= 31 ? 1 : 7
    for (let from = r.from; from <= r.to; from = addDays(from, step)) {
      const to = addDays(from, step - 1)
      out.push({ from, to: to > r.to ? r.to : to })
    }
    return out
  }
  const d = fromDayKey(r.from)
  d.setDate(1)
  while (toDayKey(d) <= r.to) {
    const first = toDayKey(d)
    const last = toDayKey(new Date(d.getFullYear(), d.getMonth() + 1, 0))
    out.push({ from: first < r.from ? r.from : first, to: last > r.to ? r.to : last })
    d.setMonth(d.getMonth() + 1)
  }
  return out
}

const series = (r: DayRange, days: DayKey[]): TrendPoint[] =>
  buckets(r).map((b) => ({ from: b.from, value: days.filter((d) => inRange(d, b)).length }))

const closedDay = (t: TaskType): DayKey | null =>
  t.status === 'done' && t.completedAt ? dayOf(t.completedAt) : null

export function taskCounts(
  tasks: TaskType[],
  range: DayRange,
  previous: DayRange
): TaskCountsMetric {
  const closed = tasks.map(closedDay).filter((d): d is DayKey => d !== null)
  return {
    open: tasks.filter((t) => t.status !== 'done').length,
    closed: closed.filter((d) => inRange(d, range)).length,
    closedPrevious: closed.filter((d) => inRange(d, previous)).length,
    trend: series(range, closed)
  }
}

export function tasksByStatus(tasks: TaskType[], range: DayRange): TasksByStatusMetric {
  const own = tasks.filter((t) => inRange(t.date, range))
  return {
    todo: own.filter((t) => t.status === 'todo').length,
    doing: own.filter((t) => t.status === 'doing').length,
    done: own.filter((t) => t.status === 'done').length
  }
}

export function overdue(tasks: TaskType[], today: DayKey): OverdueMetric {
  return {
    tasks: tasks
      .filter((t) => t.status !== 'done' && t.date < today)
      .sort((a, b) => a.date.localeCompare(b.date) || a.position - b.position)
      .slice(0, LIST_LIMIT)
      .map((t) => ({ id: t.id, title: t.title, date: t.date })),
    steps: []
  }
}

type MeetingBrief = Pick<Meeting, 'id' | 'title' | 'date' | 'actionItems'>

export function meetingsIn(meetings: MeetingBrief[], range: DayRange): MeetingsMetric {
  const own = meetings
    .filter((m) => inRange(dayOf(m.date), range))
    .sort((a, b) => a.date.localeCompare(b.date))
  return {
    count: own.length,
    rows: own.slice(0, LIST_LIMIT).map((m) => ({ id: m.id, title: m.title, date: dayOf(m.date) }))
  }
}

export function openActionItems(meetings: MeetingBrief[]): ActionItemsMetric {
  const rows = meetings.flatMap((m) =>
    (m.actionItems ?? []).flatMap((item, index) =>
      item.done
        ? []
        : [{ meetingId: m.id, meetingTitle: m.title, index, text: item.text, due: item.due }]
    )
  )
  rows.sort((a, b) => (a.due ?? '￿').localeCompare(b.due ?? '￿'))
  return { count: rows.length, rows: rows.slice(0, LIST_LIMIT) }
}

const NEEDS = {
  tasks: ['tasks', 'tasksByStatus', 'overdue'],
  meetings: ['meetings', 'actionItems']
} satisfies Record<string, MetricKind[]>

export class MetricsService {
  constructor(private readonly db: DataSource) {}

  async query(input: MetricsQuery, today: DayKey = todayKey()): Promise<MetricsResult> {
    const period = METRIC_PERIODS.some((p) => p.id === input?.period) ? input.period : 'week'
    if (period === 'range' && (!input.from || !input.to || input.from > input.to)) {
      throw new AppError('invalid', 'El rango necesita from y to, con from antes que to.')
    }
    const range = periodRange(period, today, { from: input.from ?? today, to: input.to ?? today })
    const previous = previousRange(range)
    const kinds = new Set(
      input?.kinds?.length ? input.kinds.filter((k) => METRIC_KINDS.includes(k)) : METRIC_KINDS
    )
    const needs = (list: MetricKind[]): boolean => list.some((k) => kinds.has(k))

    const manager = this.db.manager

    const tasks = needs(NEEDS.tasks)
      ? await manager.getRepository(TaskModel).find({
          where: { parentId: IsNull(), ...(input?.assignee ? { assigneeId: input.assignee } : {}) }
        })
      : []
    const meetings: MeetingBrief[] = needs(NEEDS.meetings)
      ? await manager
          .getRepository(MeetingModel)
          .find({ select: { id: true, title: true, date: true, actionItems: true } })
      : []

    const result: MetricsResult = {
      today,
      range,
      previous,
      pipeline: null
    }
    if (kinds.has('tasks')) result.tasks = taskCounts(tasks, range, previous)
    if (kinds.has('tasksByStatus')) result.tasksByStatus = tasksByStatus(tasks, range)
    if (kinds.has('overdue')) result.overdue = overdue(tasks, today)
    if (kinds.has('meetings')) result.meetings = meetingsIn(meetings, range)
    if (kinds.has('actionItems')) result.actionItems = openActionItems(meetings)
    return result
  }
}
