import type { WidgetKind, WidgetSize } from '@shared/metrics'
import {
  ActionItems,
  Meetings,
  Overdue,
  TasksByStatus,
  TasksOpenClosed,
  type WidgetViewProps
} from './widgets'

export type WidgetSettingKey = 'period'

export interface WidgetDef {
  kind: WidgetKind
  title: string
  description: string
  size: WidgetSize
  rows: 1 | 2

  settings: WidgetSettingKey[]
  View: (props: WidgetViewProps) => React.JSX.Element
}

export const WIDGETS: Record<WidgetKind, WidgetDef> = {
  'tasks-open-closed': {
    kind: 'tasks-open-closed',
    title: 'Tareas abiertas y cerradas',
    description: 'Abiertas ahora, cerradas en el periodo y su tendencia.',
    size: 'quarter',
    rows: 1,
    settings: ['period'],
    View: TasksOpenClosed
  },
  'tasks-by-status': {
    kind: 'tasks-by-status',
    title: 'Tareas por estado',
    description: 'Pendiente, En curso y Hecha de las tareas del periodo.',
    size: 'half',
    rows: 1,
    settings: ['period'],
    View: TasksByStatus
  },
  overdue: {
    kind: 'overdue',
    title: 'Atrasadas',
    description: 'Tareas de días pasados y próximos pasos vencidos.',
    size: 'half',
    rows: 2,
    settings: [],
    View: Overdue
  },
  meetings: {
    kind: 'meetings',
    title: 'Reuniones',
    description: 'Reuniones del periodo.',
    size: 'quarter',
    rows: 2,
    settings: ['period'],
    View: Meetings
  },
  'action-items': {
    kind: 'action-items',
    title: 'Action items abiertos',
    description: 'Lo pendiente de todas las reuniones.',
    size: 'quarter',
    rows: 2,
    settings: [],
    View: ActionItems
  }
}
