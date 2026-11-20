import {
  House,
  CalendarClock,
  Library,
  ListChecks,
  Tags as TagsIcon,
  Workflow,
  type LucideIcon
} from 'lucide-react'
import type { Screen } from './lib'

export type Section =
  'home' | 'workspace' | 'tasks' | 'meetings' | 'tags' | 'automations' | 'settings'

export interface SectionLink {
  id: Section
  label: string
  icon: LucideIcon
}

export const SECTIONS: SectionLink[] = [
  { id: 'home', label: 'Inicio', icon: House },
  { id: 'workspace', label: 'Workspace', icon: Library },
  { id: 'tasks', label: 'Tareas', icon: ListChecks },
  { id: 'meetings', label: 'Reuniones', icon: CalendarClock },
  { id: 'tags', label: 'Tags', icon: TagsIcon },
  { id: 'automations', label: 'Automatizaciones', icon: Workflow }
]

export const rootOf = (id: Section): Screen =>
  id === 'workspace' ? { name: 'workspace', folder: null } : { name: id }

export const isWorkspaceScreen = (s: Screen): boolean =>
  s.name === 'workspace' || s.name === 'ws-note' || s.name === 'ws-board' || s.name === 'ws-image'
