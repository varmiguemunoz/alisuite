import { createContext, useContext } from 'react'
import type { Definition, Fragment, Names, NodeStats, Slot } from '@shared/automations'
import type { TreeDrag } from '../../hooks/useTreeDrag'

export type Selection =
  | { kind: 'node'; id: string }
  | { kind: 'trigger'; id: string }
  | { kind: 'slot'; slot: Slot }
  | { kind: 'add-trigger' }

export interface Editor {
  def: Definition
  apply: (change: (def: Definition) => Definition) => string | null
  names: Names
  issues: Record<string, string[]>
  selection: Selection | null
  select: (selection: Selection | null) => void
  drag: TreeDrag
  stats: NodeStats | null
  path: Set<string> | null
  clipboard: Fragment | null
  setClipboard: (fragment: Fragment | null) => void
  notify: (message: string | null) => void
}

export const EditorContext = createContext<Editor | null>(null)

export function useEditor(): Editor {
  const editor = useContext(EditorContext)
  if (!editor) throw new Error('useEditor fuera del editor de automatizaciones')
  return editor
}

export function namesFrom(def: Definition): Names {
  return (kind, id) => (kind === 'node' ? def.nodes[id]?.name : undefined)
}
