import type { Handlers } from '../ports'
import { communicationHandlers, type NoteWriter } from './communication'
import { CONTROL_HANDLERS } from './control'

export function createHandlers(notes: NoteWriter): Handlers {
  return {
    ...CONTROL_HANDLERS,
    ...communicationHandlers(notes)
  }
}
