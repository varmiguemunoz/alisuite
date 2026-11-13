import { describe, expect, it } from 'vitest'
import {
  describeDefinition,
  emptyDefinition,
  evaluate,
  insert,
  isDestructive,
  nextRun,
  nextRuns,
  NODES,
  NODE_TYPES,
  pickBranch,
  render,
  ROOT_SLOT,
  testCondition,
  TRIGGERS,
  TRIGGER_TYPES,
  triggerSpec,
  TEMPLATES,
  newNode,
  newTrigger,
  portsOf,
  branchesOf,
  validateDefinition,
  type AutomationEvent,
  type Definition,
  type NodeDef,
  type Scope
} from '@shared/automations'

const scope: Scope = {
  now: '2026-10-14T12:00:00.000Z',
  today: '2026-10-14',
  client: { name: 'Acme', status: 'activo' },
  task: { title: 'Llamar a Acme', tags: ['ventas', 'urgente'] },
  meeting: { title: 'Kickoff', date: '2026-10-10T12:00:00.000Z' },
  steps: { n1: { status: 200, body: '{"ok":true}' } }
}

const node = (id: string, type: NodeDef['type'], params: NodeDef['params'] = {}): NodeDef => ({
  id,
  type,
  name: id,
  params,
  next: {}
})

const base = (): Definition => ({
  ...emptyDefinition('task'),
  triggers: [{ id: 't1', type: 'task.completed', params: {}, conditions: [] }]
})

describe('catálogo', () => {
  it('cubre todos los tipos activos sin repetir', () => {
    expect(
      NODES.filter((n) => !n.retired)
        .map((n) => n.type)
        .sort()
    ).toEqual([...NODE_TYPES].sort())
    expect(
      TRIGGERS.filter((t) => (TRIGGER_TYPES as readonly string[]).includes(t.type))
        .map((t) => t.type)
        .sort()
    ).toEqual([...TRIGGER_TYPES].sort())
  })

  it('el trigger de tarea completada filtra por tag cuando se indica', () => {
    const spec = triggerSpec('task.completed')!
    const trigger = {
      id: 't1',
      type: 'task.completed' as const,
      params: { tag: 'ventas' },
      conditions: []
    }
    const event = (tags: string[]): AutomationEvent => ({
      id: 'e',
      type: 'task.completed',
      subject: { type: 'task', id: 'task-1' },
      payload: { tags },
      createdAt: ''
    })
    expect(spec.matches(trigger, event(['ventas', 'urgente']), 'a1')).toBe(true)
    expect(spec.matches(trigger, event(['otro']), 'a1')).toBe(false)
  })

  it('manual y programada solo responden a su automatización', () => {
    const manual = triggerSpec('manual')!
    const event: AutomationEvent = {
      id: 'e',
      type: 'manual',
      subject: { type: 'client', id: 'c1' },
      payload: { automationId: 'a1' },
      createdAt: ''
    }
    const trigger = { id: 't', type: 'manual' as const, params: {}, conditions: [] }
    expect(manual.matches(trigger, event, 'a1')).toBe(true)
    expect(manual.matches(trigger, event, 'a2')).toBe(false)
  })
})

describe('condiciones', () => {
  it('operadores de texto, fecha y lista', () => {
    expect(testCondition({ field: 'client.name', operator: 'contains', value: 'ac' }, scope)).toBe(
      true
    )
    expect(
      testCondition({ field: 'task.title', operator: 'starts_with', value: 'Llamar' }, scope)
    ).toBe(true)
    expect(
      testCondition({ field: 'task.tags', operator: 'includes', value: 'ventas' }, scope)
    ).toBe(true)
    expect(
      testCondition({ field: 'task.tags', operator: 'excludes', value: 'cliente' }, scope)
    ).toBe(true)
    expect(testCondition({ field: 'meeting.date', operator: 'within_days', value: 7 }, scope)).toBe(
      true
    )
    expect(
      testCondition({ field: 'meeting.date', operator: 'older_than_days', value: 7 }, scope)
    ).toBe(false)
  })

  it('un campo que falta cuenta como vacío y no rompe', () => {
    expect(testCondition({ field: 'client.status', operator: 'is_not_empty' }, scope)).toBe(true)
    expect(testCondition({ field: 'nada.de.nada', operator: 'is_empty' }, scope)).toBe(true)
    expect(testCondition({ field: 'nada.de.nada', operator: 'contains', value: 'x' }, scope)).toBe(
      false
    )
  })

  it('AND dentro del grupo, OR dentro del grupo y AND entre grupos', () => {
    const yes = { field: 'task.tags', operator: 'includes' as const, value: 'ventas' }
    const no = { field: 'task.tags', operator: 'includes' as const, value: 'cliente' }
    expect(evaluate([{ join: 'and', conditions: [yes, no] }], scope)).toBe(false)
    expect(evaluate([{ join: 'or', conditions: [yes, no] }], scope)).toBe(true)
    expect(
      evaluate(
        [
          { join: 'or', conditions: [yes] },
          { join: 'or', conditions: [no] }
        ],
        scope
      )
    ).toBe(false)
  })

  it('gana la primera rama que se cumple, y si ninguna, none', () => {
    const yes = {
      join: 'and' as const,
      conditions: [{ field: 'task.tags', operator: 'includes' as const, value: 'ventas' }]
    }
    const later = {
      join: 'and' as const,
      conditions: [{ field: 'client.name', operator: 'is' as const, value: 'Acme' }]
    }
    const never = {
      join: 'and' as const,
      conditions: [{ field: 'task.tags', operator: 'includes' as const, value: 'x' }]
    }
    expect(
      pickBranch(
        [
          { id: 'a', name: 'A', groups: [yes] },
          { id: 'b', name: 'B', groups: [later] }
        ],
        scope
      )
    ).toBe('a')
    expect(pickBranch([{ id: 'a', name: 'A', groups: [never] }], scope)).toBe('none')
  })
})

describe('plantillas', () => {
  it('resuelve sujeto, salidas de pasos y deja vacío lo desconocido', () => {
    expect(render('Cliente {{client.name}} · {{task.title}}', scope)).toBe(
      'Cliente Acme · Llamar a Acme'
    )
    expect(render('Código {{steps.n1.status}}', scope)).toBe('Código 200')
    expect(render('[{{client.nada}}]', scope)).toBe('[]')
    expect(render('{{task.tags}}', scope)).toBe('ventas, urgente')
  })

  it('escapa HTML cuando se pide', () => {
    expect(render('{{x}}', { x: '<b>"hola"</b>' }, { html: true })).toBe(
      '&lt;b&gt;&quot;hola&quot;&lt;/b&gt;'
    )
  })
})

describe('programadas', () => {
  it('diaria salta fines de semana y semanal cae en su día', () => {
    const friday = new Date(2026, 9, 16, 10, 0)
    const daily = nextRuns({ frequency: 'daily', time: '09:00', skipWeekends: true }, friday, 1)[0]
    expect(daily.getDay()).toBe(1)
    const weekly = nextRun({ frequency: 'weekly', time: '08:30', weekday: '3' }, friday)!
    expect(weekly.getDay()).toBe(3)
    expect(weekly.getHours()).toBe(8)
  })

  it('mensual con día 31 cae en el último día del mes', () => {
    const run = nextRun(
      { frequency: 'monthly', time: '09:00', monthday: 31 },
      new Date(2026, 10, 1)
    )!
    expect(run.getMonth()).toBe(10)
    expect(run.getDate()).toBe(30)
  })

  it('una hora inválida no programa nada', () => {
    expect(nextRun({ frequency: 'daily', time: 'mañana' }, new Date())).toBeNull()
  })
})

describe('validación', () => {
  it('una automatización correcta no tiene errores', () => {
    let def = base()
    def = insert(def, ROOT_SLOT, node('n1', 'create_task', { title: 'Seguimiento' }))
    expect(validateDefinition(def)).toEqual([])
    expect(describeDefinition(def)).toBe(
      'Cuando se completa una tarea → crear la tarea «seguimiento»'
    )
  })

  it('exige trigger, parámetros requeridos y sujeto compatible', () => {
    let def: Definition = { ...emptyDefinition('task') }
    def = insert(def, ROOT_SLOT, node('n1', 'create_project', {}))
    const messages = validateDefinition(def).map((i) => i.message)
    expect(messages).toContain('Añade al menos un trigger.')
    expect(messages).toContain('Falta nombre.')
    expect(messages).toContain('Este paso no aplica a este tipo de sujeto.')
  })

  it('valida referencias contra los datos actuales', () => {
    let def = base()
    def.triggers[0] = {
      id: 't1',
      type: 'meeting.ready',
      params: { client: 'borrado' },
      conditions: []
    }
    def = { ...def, subject: 'meeting' }
    const issues = validateDefinition(def, { client: new Set(['acme']) })
    expect(issues.map((i) => i.message)).toContain('El cliente ya no existe.')
  })

  it('ramas sin condiciones y espera por condición sin máximo son errores', () => {
    let def = insert(
      base(),
      ROOT_SLOT,
      node('if', 'if_else', { branches: [{ id: 'b1', name: 'A', groups: [] }] })
    )
    def = insert(
      def,
      { parent: 'if', port: 'none' },
      node('w', 'wait', { mode: 'condition', conditions: [] })
    )
    const messages = validateDefinition(def).map((i) => i.message)
    expect(messages).toContain('La rama «A» no tiene condiciones.')
    expect(messages).toContain('Falta condición.')
    expect(messages).toContain('Falta esperar como máximo.')
  })

  it('una condición con operador que no corresponde al campo es error', () => {
    const def = base()
    def.triggers[0].conditions = [
      { join: 'and', conditions: [{ field: 'client.name', operator: 'gt', value: 1 }] }
    ]
    expect(validateDefinition(def).map((i) => i.message)).toContain(
      'El operador no sirve para cliente.'
    )
  })

  it('no marca destructivo un flujo sin pasos destructivos', () => {
    const def = insert(base(), ROOT_SLOT, node('n1', 'create_task', { title: 'Seguimiento' }))
    expect(isDestructive(def)).toBe(false)
  })
})

describe('plantillas', () => {
  it('todas validan sin errores', () => {
    for (const t of TEMPLATES) expect(validateDefinition(t.build()), t.id).toEqual([])
  })
})

describe('fábrica de nodos', () => {
  it('crea nodos y triggers con valores por defecto válidos', () => {
    const wait = newNode('wait', 'w')
    expect(wait.params).toMatchObject({ mode: 'delay', amount: 1, unit: 'days' })
    const split = newNode('if_else', 's')
    expect(portsOf(split)).toEqual([branchesOf(split.params)[0].id, 'none'])
    expect(newTrigger('schedule', 't').params).toMatchObject({ frequency: 'daily' })
  })
})
