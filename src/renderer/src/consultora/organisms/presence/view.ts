import type { PresenceView } from '@shared/presence'
import type { Screen } from '../../lib'

const ENTITY: Partial<Record<Screen['name'], string>> = {
  meeting: 'meetings'
}

export function viewOf(screen: Screen, workspacePath: string | null): PresenceView | null {
  if (screen.name === 'ws-note' || screen.name === 'ws-board' || screen.name === 'ws-image') {
    return workspacePath ? { entity: 'workspace', id: workspacePath } : null
  }
  const entity = ENTITY[screen.name]
  return entity && 'id' in screen && screen.id ? { entity, id: screen.id } : null
}
