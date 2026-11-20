import type { Operator, SubjectType } from './model'

export type FieldKind = 'text' | 'number' | 'date' | 'list' | 'boolean' | 'select'

export interface FieldSpec {
  key: string
  label: string
  kind: FieldKind
  options?: { value: string; label: string }[]
  source?: 'status'
}

export const OPERATORS_BY_KIND: Record<FieldKind, Operator[]> = {
  text: ['is', 'is_not', 'contains', 'not_contains', 'starts_with', 'is_empty', 'is_not_empty'],
  number: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'is_empty', 'is_not_empty'],
  date: [
    'before',
    'after',
    'between',
    'within_days',
    'older_than_days',
    'is_empty',
    'is_not_empty'
  ],
  list: ['includes', 'excludes', 'is_empty', 'is_not_empty'],
  boolean: ['is'],
  select: ['is', 'is_not', 'is_empty', 'is_not_empty']
}

export const OPERATOR_LABELS: Record<Operator, string> = {
  is: 'es',
  is_not: 'no es',
  contains: 'contiene',
  not_contains: 'no contiene',
  starts_with: 'empieza por',
  is_empty: 'está vacío',
  is_not_empty: 'tiene valor',
  eq: '=',
  neq: '≠',
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
  between: 'entre',
  before: 'antes de',
  after: 'después de',
  within_days: 'en los últimos N días',
  older_than_days: 'hace más de N días',
  includes: 'incluye',
  excludes: 'no incluye'
}

export const VALUELESS: Operator[] = ['is_empty', 'is_not_empty']

const TASK: FieldSpec[] = [
  { key: 'task.title', label: 'Título de la tarea', kind: 'text' },
  { key: 'task.tags', label: 'Tags de la tarea', kind: 'list' }
]

const MEETING: FieldSpec[] = [
  { key: 'meeting.title', label: 'Título de la reunión', kind: 'text' },
  { key: 'meeting.date', label: 'Fecha de la reunión', kind: 'date' }
]

const COMMON: FieldSpec[] = [{ key: 'now', label: 'Ahora', kind: 'date' }]

export const FIELDS: Record<SubjectType, FieldSpec[]> = {
  contact: [...COMMON],
  prospect: [...COMMON],
  client: [...COMMON],
  task: [...TASK, ...COMMON],
  meeting: [...MEETING, ...COMMON],
  none: COMMON
}

export function fieldSpec(subject: SubjectType, key: string): FieldSpec | null {
  return FIELDS[subject].find((f) => f.key === key) ?? null
}

export interface VariableSpec {
  key: string
  label: string
}

const SUBJECT_VARIABLES: Record<SubjectType, VariableSpec[]> = {
  contact: [],
  prospect: [],
  client: [],
  task: [{ key: 'task.title', label: 'Tarea' }],
  meeting: [{ key: 'meeting.title', label: 'Reunión' }],
  none: []
}

export function subjectVariables(subject: SubjectType): VariableSpec[] {
  return [...SUBJECT_VARIABLES[subject], { key: 'today', label: 'Hoy' }]
}
