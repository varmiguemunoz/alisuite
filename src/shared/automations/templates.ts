import { insert } from './graph'
import {
  emptyDefinition,
  ROOT_SLOT,
  type Definition,
  type NodeDef,
  type SubjectType,
  type TriggerDef
} from './model'

export interface AutomationTemplate {
  id: string
  name: string
  description: string
  subject: SubjectType
  build(): Definition
}

const step = (
  id: string,
  type: NodeDef['type'],
  name: string,
  params: NodeDef['params']
): NodeDef => ({
  id,
  type,
  name,
  params,
  next: {}
})

function chain(subject: SubjectType, trigger: TriggerDef, nodes: NodeDef[]): Definition {
  let def: Definition = { ...emptyDefinition(subject), triggers: [trigger] }
  let slot = ROOT_SLOT
  for (const node of nodes) {
    def = insert(def, slot, node)
    slot = { parent: node.id, port: 'next' }
  }
  return def
}

export const TEMPLATES: AutomationTemplate[] = [
  {
    id: 'weekly',
    name: 'Revisión semanal',
    description: 'Cada lunes a las 9 crea una tarea de revisión.',
    subject: 'none',
    build: () =>
      chain(
        'none',
        {
          id: 't1',
          type: 'schedule',
          params: { frequency: 'weekly', weekday: '1', time: '09:00' },
          conditions: []
        },
        [step('n1', 'create_task', 'Revisar semana', { title: 'Revisar la semana', inDays: 0 })]
      )
  }
]
