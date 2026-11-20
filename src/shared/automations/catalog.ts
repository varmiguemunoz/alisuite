import { NONE_PORT } from './conditions'
import type {
  AutomationEvent,
  Branch,
  NodeType,
  Params,
  SubjectType,
  TimeUnit,
  TriggerDef,
  TriggerType
} from './model'

export type ParamKind =
  | 'text'
  | 'markdown'
  | 'number'
  | 'select'
  | 'boolean'
  | 'tags'
  | 'field'
  | 'url'
  | 'datetime'
  | 'time'
  | 'conditions'
  | 'branches'
  | 'node'
  | 'effort'

export interface ParamSpec {
  key: string
  label: string
  kind: ParamKind
  required?: boolean
  vars?: boolean
  options?: { value: string; label: string }[]
  when?: { key: string; is: string[] }
  min?: number
}

export type RefKind = 'node'

export type Names = (kind: RefKind, id: string) => string | undefined

export type NodeGroup = 'control' | 'email' | 'productividad' | 'integraciones' | 'retirado'

export const NODE_GROUPS: { id: Exclude<NodeGroup, 'retirado'>; label: string }[] = [
  { id: 'control', label: 'Control' },
  { id: 'email', label: 'Email' },
  { id: 'productividad', label: 'Productividad' },
  { id: 'integraciones', label: 'Integraciones' }
]

export interface NodeSpec {
  type: NodeType
  kind: 'action' | 'control'
  group: NodeGroup
  label: string
  description: string
  icon: string
  subjects: SubjectType[] | 'any'
  external: boolean
  destructive: boolean
  communication: boolean
  terminal: boolean
  params: ParamSpec[]
  outputs: { key: string; label: string }[]
  retired?: string
  ports(params: Params): string[]
  validate?(params: Params): string[]
  sentence(params: Params, names: Names): string
}

export type TriggerGroup = 'productividad' | 'tiempo' | 'retirado'

export interface TriggerSpec {
  type: TriggerType
  group: TriggerGroup
  label: string
  description: string
  icon: string
  subject: SubjectType | 'any'
  params: ParamSpec[]
  matches(trigger: TriggerDef, event: AutomationEvent, automationId: string): boolean
  sentence(params: Params, names: Names): string
}

export function str(params: Params, key: string): string {
  const value = params[key]
  return typeof value === 'string' ? value.trim() : ''
}

export function num(params: Params, key: string): number | null {
  const value = params[key]
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  return Number.isFinite(n) ? n : null
}

export function strings(params: Params, key: string): string[] {
  const value = params[key]
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
}

export function branchesOf(params: Params): Branch[] {
  const value = params.branches
  return Array.isArray(value) ? (value as Branch[]) : []
}

const UNIT_LABEL: Record<TimeUnit, [string, string]> = {
  minutes: ['minuto', 'minutos'],
  hours: ['hora', 'horas'],
  days: ['día', 'días']
}

export function unitText(amount: number, unit: TimeUnit): string {
  const [one, many] = UNIT_LABEL[unit] ?? UNIT_LABEL.days
  return `${amount} ${amount === 1 ? one : many}`
}

function unitOf(params: Params, key: string): TimeUnit {
  const u = str(params, key)
  return u === 'minutes' || u === 'hours' ? u : 'days'
}

const UNIT_OPTIONS = [
  { value: 'minutes', label: 'Minutos' },
  { value: 'hours', label: 'Horas' },
  { value: 'days', label: 'Días' }
]

const ref = (names: Names, kind: RefKind, id: string, fallback: string): string =>
  id ? (names(kind, id) ?? id) : fallback

const quote = (value: string): string => `«${value}»`

const next = (): string[] => ['next']
const none = (): string[] => []

const action = (
  spec: Omit<
    NodeSpec,
    'kind' | 'ports' | 'terminal' | 'outputs' | 'external' | 'destructive' | 'communication'
  > &
    Partial<Pick<NodeSpec, 'outputs' | 'external' | 'destructive' | 'communication' | 'retired'>>
): NodeSpec => ({
  kind: 'action',
  ports: next,
  terminal: false,
  outputs: [],
  external: false,
  destructive: false,
  communication: false,
  ...spec
})

const required = (params: Params, specs: ParamSpec[]): string[] =>
  specs
    .filter((p) => p.required && visible(p, params))
    .filter((p) => {
      const v = params[p.key]
      return (
        v === undefined ||
        v === null ||
        (typeof v === 'string' && v.trim() === '') ||
        (Array.isArray(v) && v.length === 0)
      )
    })
    .map((p) => `Falta ${p.label.toLowerCase()}.`)

export function visible(param: ParamSpec, params: Params): boolean {
  return !param.when || param.when.is.includes(str(params, param.when.key))
}

const WAIT_PARAMS: ParamSpec[] = [
  {
    key: 'mode',
    label: 'Tipo de espera',
    kind: 'select',
    required: true,
    options: [
      { value: 'delay', label: 'Durante un tiempo' },
      { value: 'until', label: 'Hasta una fecha y hora' },
      { value: 'condition', label: 'Hasta que se cumpla una condición' }
    ]
  },
  {
    key: 'amount',
    label: 'Cantidad',
    kind: 'number',
    min: 1,
    required: true,
    when: { key: 'mode', is: ['delay'] }
  },
  {
    key: 'unit',
    label: 'Unidad',
    kind: 'select',
    options: UNIT_OPTIONS,
    required: true,
    when: { key: 'mode', is: ['delay'] }
  },
  {
    key: 'from',
    label: 'Fecha',
    kind: 'select',
    required: true,
    when: { key: 'mode', is: ['until'] },
    options: [
      { value: 'fixed', label: 'Una fecha fija' },
      { value: 'field', label: 'Un campo del sujeto' }
    ]
  },
  {
    key: 'at',
    label: 'Fecha y hora',
    kind: 'datetime',
    required: true,
    when: { key: 'from', is: ['fixed'] }
  },
  {
    key: 'field',
    label: 'Campo de fecha',
    kind: 'field',
    required: true,
    when: { key: 'from', is: ['field'] }
  },
  { key: 'offset', label: 'Desplazamiento', kind: 'number', when: { key: 'from', is: ['field'] } },
  {
    key: 'offsetUnit',
    label: 'Unidad del desplazamiento',
    kind: 'select',
    options: UNIT_OPTIONS,
    when: { key: 'from', is: ['field'] }
  },
  {
    key: 'direction',
    label: 'Antes o después',
    kind: 'select',
    when: { key: 'from', is: ['field'] },
    options: [
      { value: 'before', label: 'Antes' },
      { value: 'after', label: 'Después' }
    ]
  },
  {
    key: 'conditions',
    label: 'Condición',
    kind: 'conditions',
    required: true,
    when: { key: 'mode', is: ['condition'] }
  },
  {
    key: 'timeout',
    label: 'Esperar como máximo',
    kind: 'number',
    min: 1,
    required: true,
    when: { key: 'mode', is: ['condition'] }
  },
  {
    key: 'timeoutUnit',
    label: 'Unidad del máximo',
    kind: 'select',
    options: UNIT_OPTIONS,
    required: true,
    when: { key: 'mode', is: ['condition'] }
  }
]

export const MET_PORT = 'met'
export const TIMEOUT_PORT = 'timeout'
export const NEXT_PORT = 'next'

export const PORT_LABELS: Record<string, string> = {
  [NEXT_PORT]: '',
  [MET_PORT]: 'Se cumplió',
  [TIMEOUT_PORT]: 'Tiempo agotado',
  [NONE_PORT]: 'Ninguna'
}

const CONTROL: NodeSpec[] = [
  {
    type: 'if_else',
    kind: 'control',
    group: 'control',
    label: 'Si / si no',
    description: 'Divide el camino en ramas según condiciones. Gana la primera rama que se cumple.',
    icon: 'Split',
    subjects: 'any',
    external: false,
    destructive: false,
    communication: false,
    terminal: false,
    params: [{ key: 'branches', label: 'Ramas', kind: 'branches', required: true }],
    outputs: [],
    ports: (p) => [...branchesOf(p).map((b) => b.id), NONE_PORT],
    validate: (p) => {
      const branches = branchesOf(p)
      const issues: string[] = []
      if (branches.length === 0) issues.push('Añade al menos una rama.')
      branches.forEach((b, i) => {
        if (!b.name?.trim()) issues.push(`La rama ${i + 1} no tiene nombre.`)
        const conditions = (b.groups ?? []).reduce((n, g) => n + g.conditions.length, 0)
        if (conditions === 0)
          issues.push(`La rama ${quote(b.name || String(i + 1))} no tiene condiciones.`)
      })
      if (new Set(branches.map((b) => b.id)).size !== branches.length)
        issues.push('Hay ramas repetidas.')
      return issues
    },
    sentence: (p) => {
      const n = branchesOf(p).length
      return n === 1 ? 'Si se cumple una condición' : `Elegir entre ${n} ramas`
    }
  },
  {
    type: 'wait',
    kind: 'control',
    group: 'control',
    label: 'Esperar',
    description:
      'Retiene la ejecución un tiempo, hasta una fecha o hasta que se cumpla una condición.',
    icon: 'Clock',
    subjects: 'any',
    external: false,
    destructive: false,
    communication: false,
    terminal: false,
    params: WAIT_PARAMS,
    outputs: [],
    ports: (p) => (str(p, 'mode') === 'condition' ? [MET_PORT, TIMEOUT_PORT] : [NEXT_PORT]),
    validate: (p) => {
      const mode = str(p, 'mode')
      if (mode === 'until' && str(p, 'from') === 'fixed' && Number.isNaN(Date.parse(str(p, 'at'))))
        return ['La fecha no es válida.']
      return []
    },
    sentence: (p) => {
      const mode = str(p, 'mode')
      if (mode === 'delay') return `Esperar ${unitText(num(p, 'amount') ?? 0, unitOf(p, 'unit'))}`
      if (mode === 'until') {
        if (str(p, 'from') === 'fixed')
          return `Esperar hasta ${str(p, 'at').replace('T', ' ').slice(0, 16)}`
        const offset = num(p, 'offset') ?? 0
        const field = str(p, 'field') || 'una fecha'
        if (!offset) return `Esperar hasta ${field}`
        const side = str(p, 'direction') === 'before' ? 'antes de' : 'después de'
        return `Esperar hasta ${unitText(offset, unitOf(p, 'offsetUnit'))} ${side} ${field}`
      }
      if (mode === 'condition')
        return `Esperar a que se cumpla, máximo ${unitText(num(p, 'timeout') ?? 0, unitOf(p, 'timeoutUnit'))}`
      return 'Esperar'
    }
  },
  {
    type: 'go_to',
    kind: 'control',
    group: 'control',
    label: 'Ir a',
    description: 'Vuelve a un paso anterior del mismo camino. Solo puede ir al final de una rama.',
    icon: 'CornerUpLeft',
    subjects: 'any',
    external: false,
    destructive: false,
    communication: false,
    terminal: true,
    params: [{ key: 'target', label: 'Paso', kind: 'node', required: true }],
    outputs: [],
    ports: none,
    sentence: (p, names) => `Ir a ${quote(ref(names, 'node', str(p, 'target'), 'un paso'))}`
  },
  {
    type: 'finish',
    kind: 'control',
    group: 'control',
    label: 'Finalizar',
    description: 'Termina la ejecución aquí.',
    icon: 'CircleStop',
    subjects: 'any',
    external: false,
    destructive: false,
    communication: false,
    terminal: true,
    params: [],
    outputs: [],
    ports: none,
    sentence: () => 'Finalizar'
  }
]

const DOMAIN: NodeSpec[] = [
  action({
    type: 'email_owner',
    group: 'email',
    label: 'Avisarme por email',
    description: 'Te envía un email a ti.',
    icon: 'MailCheck',
    subjects: 'any',
    external: true,
    communication: true,
    params: [
      { key: 'subject', label: 'Asunto', kind: 'text', required: true, vars: true },
      { key: 'body', label: 'Cuerpo', kind: 'markdown', vars: true }
    ],
    sentence: (p) => `Avisarme por email: ${quote(str(p, 'subject'))}`
  }),
  action({
    type: 'create_task',
    group: 'productividad',
    label: 'Crear tarea',
    description: 'Crea una tarea para ti. Si el día está lleno, va al siguiente con hueco.',
    icon: 'ListTodo',
    subjects: 'any',
    outputs: [{ key: 'taskId', label: 'Id de la tarea' }],
    params: [
      { key: 'title', label: 'Título', kind: 'text', required: true, vars: true },
      { key: 'inDays', label: 'En cuántos días', kind: 'number', min: 0 },
      { key: 'tags', label: 'Tags', kind: 'tags' },
      { key: 'effort', label: 'Esfuerzo', kind: 'effort' },
      { key: 'description', label: 'Descripción', kind: 'markdown', vars: true }
    ],
    sentence: (p) => `Crear la tarea ${quote(str(p, 'title'))}`
  }),
  action({
    type: 'create_note',
    group: 'productividad',
    label: 'Crear nota',
    description: 'Crea una nota.',
    icon: 'StickyNote',
    subjects: 'any',
    outputs: [{ key: 'noteId', label: 'Id de la nota' }],
    params: [
      { key: 'title', label: 'Título', kind: 'text', required: true, vars: true },
      { key: 'body', label: 'Contenido', kind: 'markdown', vars: true }
    ],
    sentence: (p) => `Crear la nota ${quote(str(p, 'title'))}`
  }),
  action({
    type: 'notify_mac',
    group: 'productividad',
    label: 'Notificación en el Mac',
    description: 'Muestra una notificación en este Mac.',
    icon: 'Bell',
    subjects: 'any',
    params: [
      { key: 'title', label: 'Título', kind: 'text', required: true, vars: true },
      { key: 'body', label: 'Texto', kind: 'text', vars: true }
    ],
    sentence: (p) => `Notificarme: ${quote(str(p, 'title'))}`
  }),
  action({
    type: 'webhook',
    group: 'integraciones',
    label: 'Webhook',
    description:
      'Envía una petición HTTPS. Guarda el código y la respuesta para los pasos siguientes.',
    icon: 'Webhook',
    subjects: 'any',
    external: true,
    outputs: [
      { key: 'status', label: 'Código HTTP' },
      { key: 'body', label: 'Respuesta' }
    ],
    params: [
      {
        key: 'method',
        label: 'Método',
        kind: 'select',
        required: true,
        options: ['POST', 'PUT', 'PATCH', 'GET'].map((m) => ({ value: m, label: m }))
      },
      { key: 'url', label: 'URL', kind: 'url', required: true, vars: true },
      { key: 'body', label: 'Cuerpo JSON', kind: 'markdown', vars: true }
    ],
    validate: (p) => {
      const url = str(p, 'url')
      return url && !url.startsWith('https://') && !url.startsWith('{{')
        ? ['La URL debe empezar por https://.']
        : []
    },
    sentence: (p) => `${str(p, 'method') || 'POST'} a ${str(p, 'url') || 'una URL'}`
  })
]

// Legacy/retired specs kept for stored automations and published migrations.
// Not exported in ACTIVE_NODES/active UI lists; recognized for validation/graph compat.
const RETIRED_MSG = 'Estos pasos se retiraron; no se puede ejecutar.'

const legacyAction = (type: NodeType, subjects: SubjectType[] | 'any' = 'any'): NodeSpec =>
  action({
    type,
    group: 'retirado',
    label: type,
    description: '',
    icon: 'Circle',
    subjects,
    retired: RETIRED_MSG,
    params: [],
    sentence: () => type
  })

const LEGACY_NODES: NodeSpec[] = [
  legacyAction('add_tag'),
  legacyAction('remove_tag'),
  legacyAction('update_contact'),
  legacyAction('set_field'),
  legacyAction('append_contact_note'),
  legacyAction('assign_client'),
  legacyAction('unassign_client'),
  legacyAction('assign_project'),
  legacyAction('unsubscribe'),
  legacyAction('delete_contact'),
  legacyAction('create_prospect'),
  legacyAction('move_prospect'),
  legacyAction('update_prospect'),
  legacyAction('delete_prospect'),
  legacyAction('send_email'),
  legacyAction('start_sequence'),
  legacyAction('create_client'),
  legacyAction('create_project')
]

const legacyTrigger = (type: TriggerType, subject: SubjectType | 'any'): TriggerSpec => ({
  type,
  group: 'retirado',
  label: type,
  description: '',
  icon: 'Circle',
  subject,
  params: [],
  matches: () => false,
  sentence: () => type
})

const LEGACY_TRIGGERS: TriggerSpec[] = [
  legacyTrigger('contact.created', 'contact'),
  legacyTrigger('contact.tag_added', 'contact'),
  legacyTrigger('contact.tag_removed', 'contact'),
  legacyTrigger('contact.updated', 'contact'),
  legacyTrigger('contact.subscribed', 'contact'),
  legacyTrigger('contact.unsubscribed', 'contact'),
  legacyTrigger('contact.bounced', 'contact'),
  legacyTrigger('prospect.created', 'prospect'),
  legacyTrigger('prospect.stage_changed', 'prospect'),
  legacyTrigger('prospect.won', 'prospect'),
  legacyTrigger('prospect.lost', 'prospect'),
  legacyTrigger('client.created', 'client')
]

export const NODES: NodeSpec[] = [...CONTROL, ...DOMAIN, ...LEGACY_NODES]
export const ACTIVE_NODES: NodeSpec[] = NODES.filter((n) => !n.retired)

const NODE_INDEX = new Map(NODES.map((n) => [n.type, n]))

export function nodeSpec(type: NodeType): NodeSpec | undefined {
  return NODE_INDEX.get(type)
}

export function nodeAllowed(spec: NodeSpec, subject: SubjectType): boolean {
  return spec.subjects === 'any' || spec.subjects.includes(subject)
}

export function nodeIssues(spec: NodeSpec, params: Params): string[] {
  if (spec.retired) return [spec.retired]
  return [...required(params, spec.params), ...(spec.validate?.(params) ?? [])]
}

const payload = (event: AutomationEvent, key: string): unknown => event.payload[key]
const optional = (key: string, label: string, kind: ParamKind): ParamSpec => ({ key, label, kind })

export const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export const TRIGGERS: TriggerSpec[] = [
  ...LEGACY_TRIGGERS,
  {
    type: 'task.completed',
    group: 'productividad',
    label: 'Se completa una tarea',
    description: 'Se marca una tarea como hecha.',
    icon: 'CircleCheck',
    subject: 'task',
    params: [optional('tag', 'Tag de la tarea', 'text')],
    matches: (t, e) => {
      const tag = str(t.params, 'tag')
      const tags = payload(e, 'tags')
      return e.type === 'task.completed' && (!tag || (Array.isArray(tags) && tags.includes(tag)))
    },
    sentence: (p) =>
      str(p, 'tag') ? `Se completa una tarea con ${quote(str(p, 'tag'))}` : 'Se completa una tarea'
  },
  {
    type: 'meeting.ready',
    group: 'productividad',
    label: 'Reunión lista',
    description: 'Una reunión termina de transcribirse y resumirse.',
    icon: 'AudioLines',
    subject: 'meeting',
    params: [],
    matches: (_, e) => e.type === 'meeting.ready',
    sentence: () => 'Reunión lista'
  },
  {
    type: 'schedule',
    group: 'tiempo',
    label: 'Programada',
    description: 'Corre a una hora fija, sin sujeto. Como máximo una vez por hora.',
    icon: 'CalendarClock',
    subject: 'none',
    params: [
      {
        key: 'frequency',
        label: 'Frecuencia',
        kind: 'select',
        required: true,
        options: [
          { value: 'daily', label: 'Cada día' },
          { value: 'weekly', label: 'Cada semana' },
          { value: 'monthly', label: 'Cada mes' }
        ]
      },
      { key: 'time', label: 'Hora', kind: 'time', required: true },
      {
        key: 'weekday',
        label: 'Día de la semana',
        kind: 'select',
        required: true,
        when: { key: 'frequency', is: ['weekly'] },
        options: WEEKDAYS.map((d, i) => ({ value: String(i), label: d }))
      },
      {
        key: 'monthday',
        label: 'Día del mes',
        kind: 'number',
        min: 1,
        required: true,
        when: { key: 'frequency', is: ['monthly'] }
      },
      {
        key: 'skipWeekends',
        label: 'Saltar fines de semana',
        kind: 'boolean',
        when: { key: 'frequency', is: ['daily'] }
      }
    ],
    matches: (t, e, automationId) =>
      e.type === 'schedule' &&
      payload(e, 'automationId') === automationId &&
      payload(e, 'triggerId') === t.id,
    sentence: (p) => {
      const time = str(p, 'time') || '…'
      const f = str(p, 'frequency')
      if (f === 'weekly')
        return `Cada ${WEEKDAYS[num(p, 'weekday') ?? 1]?.toLowerCase()} a las ${time}`
      if (f === 'monthly') return `El día ${num(p, 'monthday') ?? 1} de cada mes a las ${time}`
      return `Cada día a las ${time}`
    }
  },
  {
    type: 'manual',
    group: 'tiempo',
    label: 'A mano',
    description: 'Se ejecuta a mano sobre un sujeto, desde su ficha o desde Claude.',
    icon: 'Hand',
    subject: 'any',
    params: [],
    matches: (_, e, automationId) =>
      e.type === 'manual' && payload(e, 'automationId') === automationId,
    sentence: () => 'Se ejecuta a mano'
  }
]

const TRIGGER_INDEX = new Map(TRIGGERS.map((t) => [t.type, t]))

export function triggerSpec(type: TriggerType): TriggerSpec | undefined {
  return TRIGGER_INDEX.get(type)
}

export function triggerIssues(spec: TriggerSpec, params: Params): string[] {
  return required(params, spec.params)
}

export function triggerAllowed(spec: TriggerSpec, subject: SubjectType): boolean {
  return spec.subject === 'any' || spec.subject === subject
}
