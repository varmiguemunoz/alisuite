import type { ReactNode } from 'react'
import { TASK_STATUSES, TASK_STATUS_LABEL } from '@shared/tasks'
import type { MetricsResult } from '@shared/metrics'
import { shortDate, type Go } from '../../lib'
import { StatValue } from '../../atoms/StatValue'
import { Delta } from '../../atoms/Delta'
import { BarList } from '../../molecules/BarList'
import { Sparkline } from '../../molecules/Sparkline'
import { WidgetFrame, type WidgetState } from './WidgetFrame'
import { openTasks, rangeLabel } from './lib'

export interface WidgetViewProps {
  result: MetricsResult | null
  error: string | null
  go: Go
  toolbar?: ReactNode
}

const stateOf = (props: WidgetViewProps, ready: boolean, empty = false): WidgetState =>
  props.error ? 'error' : !props.result || !ready ? 'loading' : empty ? 'empty' : 'ready'

function LinkRow({
  title,
  meta,
  onClick,
  late
}: {
  title: string
  meta: string
  onClick: () => void
  late?: boolean
}): React.JSX.Element {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-baseline justify-between gap-3 rounded-[4px] px-1 py-1 text-left transition-colors hover:bg-ob-hover"
      >
        <span className="min-w-0 truncate text-[13px] text-ob-text">{title}</span>
        <span className={`shrink-0 text-[12px] ${late ? 'text-ob-yellow' : 'text-ob-muted'}`}>
          {meta}
        </span>
      </button>
    </li>
  )
}

export function TasksOpenClosed(props: WidgetViewProps): React.JSX.Element {
  const m = props.result?.tasks
  return (
    <WidgetFrame
      title="Tareas abiertas y cerradas"
      state={stateOf(props, !!m)}
      error={props.error}
      toolbar={props.toolbar}
      onOpen={() => openTasks(props.go, 'open')}
      summary={
        m &&
        `${m.open} tareas abiertas ahora y ${m.closed} cerradas en el periodo, frente a ${m.closedPrevious} en el anterior.`
      }
      table={
        m && {
          columns: ['Desde', 'Cerradas'],
          rows: m.trend.map((p) => [shortDate(p.from), String(p.value)])
        }
      }
    >
      {m && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <StatValue value={String(m.open)} caption="Abiertas ahora" />
            <StatValue
              value={String(m.closed)}
              caption={<Delta current={m.closed} previous={m.closedPrevious} />}
            />
          </div>
          <div className="mt-3">
            <Sparkline values={m.trend.map((p) => p.value)} />
          </div>
        </>
      )}
    </WidgetFrame>
  )
}

export function TasksByStatus(props: WidgetViewProps): React.JSX.Element {
  const m = props.result?.tasksByStatus
  const total = m ? m.todo + m.doing + m.done : 0
  return (
    <WidgetFrame
      title="Tareas por estado"
      state={stateOf(props, !!m, total === 0)}
      error={props.error}
      toolbar={props.toolbar}
      emptyText="Sin tareas en este periodo."
      onOpen={() => openTasks(props.go, 'week')}
      summary={m && TASK_STATUSES.map((s) => `${TASK_STATUS_LABEL[s]} ${m[s]}`).join(', ')}
      table={
        m && {
          columns: ['Estado', 'Tareas'],
          rows: TASK_STATUSES.map((s) => [TASK_STATUS_LABEL[s], String(m[s])])
        }
      }
    >
      {m && (
        <BarList
          items={TASK_STATUSES.map((s) => ({
            id: s,
            label: TASK_STATUS_LABEL[s],
            value: m[s],
            display: String(m[s])
          }))}
        />
      )}
    </WidgetFrame>
  )
}

export function Overdue(props: WidgetViewProps): React.JSX.Element {
  const m = props.result?.overdue
  const today = props.result?.today
  const ago = (day: string): string => {
    if (!today) return shortDate(day)
    const days = Math.round(
      (new Date(`${today}T12:00:00`).getTime() - new Date(`${day}T12:00:00`).getTime()) / 86_400_000
    )
    return days === 1 ? 'ayer' : `hace ${days} días`
  }
  return (
    <WidgetFrame
      title="Atrasadas"
      state={stateOf(props, !!m, !m?.tasks.length)}
      error={props.error}
      toolbar={props.toolbar}
      emptyText="Nada atrasado."
      onOpen={() => openTasks(props.go, 'overdue')}
      summary={m && `${m.tasks.length} tareas atrasadas.`}
    >
      {m && m.tasks.length > 0 && (
        <ul>
          {m.tasks.map((t) => (
            <LinkRow
              key={t.id}
              title={t.title}
              meta={ago(t.date)}
              late
              onClick={() => openTasks(props.go, 'overdue')}
            />
          ))}
        </ul>
      )}
    </WidgetFrame>
  )
}

export function Meetings(props: WidgetViewProps): React.JSX.Element {
  const m = props.result?.meetings
  return (
    <WidgetFrame
      title="Reuniones"
      state={stateOf(props, !!m, m?.count === 0)}
      error={props.error}
      toolbar={props.toolbar}
      emptyText="Sin reuniones en este periodo."
      onOpen={() => props.go({ name: 'meetings' })}
      summary={
        m && props.result
          ? `${m.count} reuniones entre ${rangeLabel(props.result.range)}.`
          : undefined
      }
    >
      {m && (
        <>
          <StatValue
            value={String(m.count)}
            caption={props.result && rangeLabel(props.result.range)}
          />
          <ul className="mt-2">
            {m.rows.map((r) => (
              <LinkRow
                key={r.id}
                title={r.title}
                meta={shortDate(r.date)}
                onClick={() => props.go({ name: 'meeting', id: r.id })}
              />
            ))}
          </ul>
        </>
      )}
    </WidgetFrame>
  )
}

export function ActionItems(props: WidgetViewProps): React.JSX.Element {
  const m = props.result?.actionItems
  return (
    <WidgetFrame
      title="Action items abiertos"
      state={stateOf(props, !!m, m?.count === 0)}
      error={props.error}
      toolbar={props.toolbar}
      emptyText="Todo al día."
      summary={m && `${m.count} action items sin hacer.`}
    >
      {m && (
        <>
          <StatValue value={String(m.count)} caption="Sin hacer, de todas las reuniones" />
          <ul className="mt-2">
            {m.rows.map((r) => (
              <LinkRow
                key={`${r.meetingId}-${r.index}`}
                title={r.text}
                meta={r.due ? shortDate(r.due) : r.meetingTitle}
                onClick={() => props.go({ name: 'meeting', id: r.meetingId })}
              />
            ))}
          </ul>
        </>
      )}
    </WidgetFrame>
  )
}


