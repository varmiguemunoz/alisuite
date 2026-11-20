import { describe, expect, it } from 'vitest'
import {
  ACTIVE_SOFT_DELETE_TABLES,
  ACTIVE_SYNC_TABLES,
  NEVER_SYNC,
  isNeverSynced
} from '../shared/edition'

describe('lo que nunca se sincroniza', () => {
  it('ninguna tabla prohibida está en la lista de sincronización activa', () => {
    for (const table of NEVER_SYNC.tables) {
      expect((ACTIVE_SYNC_TABLES as readonly string[]).includes(table)).toBe(false)
    }
  })

  it('los secretos y las claves nunca viajan', () => {
    expect(isNeverSynced('meetings', 'title')).toBe(false)
    expect(isNeverSynced('meetings', 'recording_path')).toBe(true)
    expect(NEVER_SYNC.settings).toEqual(expect.arrayContaining(['openaiApiKey']))
    expect(NEVER_SYNC.files).toEqual(expect.arrayContaining(['settings.json', 'ui-state.json']))
  })

  it('las tablas activas con borrado suave se sincronizan', () => {
    for (const table of ACTIVE_SOFT_DELETE_TABLES) expect(ACTIVE_SYNC_TABLES).toContain(table)
  })
})
