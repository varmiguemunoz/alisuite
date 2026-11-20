import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { DataSource } from 'typeorm'
import { isolatedConfig, memoryDb } from '../main/test/helpers'
import { MeetingService } from '../main/services/meeting.service'
import { TaskService } from '../main/services/task.service'
import { SyncEngine } from '../main/cloud/sync/engine'
import { SyncMutations } from '../../services/cloud/src/application/sync'
import type { AuthUser, MembershipRepository } from '../../services/cloud/src/ports'
import { MemoryStore, ORG, fakeApi, member } from './support/memory-cloud'

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

describe('sincronización de punta a punta con dos copias', () => {
  let a: DataSource
  let b: DataSource
  let server: SyncMutations
  let engineA: SyncEngine
  let engineB: SyncEngine

  const engine = (db: DataSource, user: AuthUser, device: string): SyncEngine =>
    new SyncEngine({
      db,
      api: () => fakeApi(server, user),
      orgId: ORG,
      deviceId: device,
      markerFile: '/nonexistent/sync-init.json',
      notify: () => undefined,
      subscribe: () => () => undefined,
      onStatus: () => undefined
    })

  beforeEach(async () => {
    isolatedConfig()
    a = await memoryDb()
    b = await memoryDb()
    server = new SyncMutations(
      new MemoryStore(),
      member,
      { changes: async () => undefined },
      { now: () => Date.now() }
    )
    engineA = engine(a, { userId: 'ua', email: 'a@acme.com' }, 'device-a')
    engineB = engine(b, { userId: 'ub', email: 'b@acme.com' }, 'device-b')
    await a.query(`INSERT INTO sync_state (key, value) VALUES ('bootstrapped', '1')`)
  })
  afterEach(async () => {
    await engineA.stop()
    await engineB.stop()
    await a.destroy()
    await b.destroy()
  })

  const both = async (): Promise<void> => {
    await engineA.syncNow()
    await engineB.syncNow()
    await engineA.syncNow()
  }

  it('una reunión creada en A aparece en B', async () => {
    const created = await new MeetingService(a).create({ title: 'Acme' })
    await both()
    const found = await new MeetingService(b).get(created.id)
    expect(found.title).toBe('Acme')
    expect(engineA.current().phase).toBe('synced')
  })

  it('campos distintos del mismo registro se conservan los dos', async () => {
    const created = await new MeetingService(a).create({ title: 'Acme' })
    await both()
    await new MeetingService(a).update(created.id, { title: 'Acme SAS' })
    await new MeetingService(b).update(created.id, { summaryMd: 'Energía' })
    await both()
    for (const db of [a, b]) {
      const c = await new MeetingService(db).get(created.id)
      expect(c.title).toBe('Acme SAS')
      expect(c.summaryMd).toBe('Energía')
    }
  })

  it('el mismo campo: gana el cambio más reciente en las dos copias', async () => {
    const created = await new MeetingService(a).create({ title: 'Acme' })
    await both()
    await new MeetingService(a).update(created.id, { summaryMd: 'Primero' })
    await sleep(5)
    await new MeetingService(b).update(created.id, { summaryMd: 'Segundo' })
    await both()
    expect((await new MeetingService(a).get(created.id)).summaryMd).toBe('Segundo')
    expect((await new MeetingService(b).get(created.id)).summaryMd).toBe('Segundo')
  })

  it('sin conexión los cambios esperan y llegan todos al volver', async () => {
    const meetings = new MeetingService(a)
    for (const title of ['Uno', 'Dos', 'Tres']) await meetings.create({ title })
    await both()
    const page = await new MeetingService(b).list({ pageSize: 50 })
    const names = page.days.flatMap((d) => d.meetings.map((m) => m.title)).sort()
    expect(names).toEqual(['Dos', 'Tres', 'Uno'])
  })

  it('un borrado llega como borrado y avisa a quien no lo hizo', async () => {
    const created = await new MeetingService(a).create({ title: 'Acme' })
    await both()
    await new MeetingService(a).remove(created.id)
    await both()
    await expect(new MeetingService(b).get(created.id)).rejects.toThrow()
    expect(engineB.current().deletedByOthers.map((d) => d.id)).toContain(created.id)
  })

  it('reordenar a la vez no pierde ni duplica tareas', async () => {
    const tasksA = new TaskService(a)
    const day = '2026-10-14'
    const ids: string[] = []
    for (const title of ['T1', 'T2', 'T3']) ids.push((await tasksA.add(day, title)).id)
    await both()
    await tasksA.reorder(day, [ids[2], ids[0], ids[1]])
    await new TaskService(b).reorder(day, [ids[1], ids[2], ids[0]])
    await both()
    for (const db of [a, b]) {
      const list = await new TaskService(db).getDay(day)
      expect(list.map((t) => t.id).sort()).toEqual([...ids].sort())
    }
  })

  it('enviar dos veces el mismo cambio no lo aplica dos veces', async () => {
    const store = new MemoryStore()
    server = new SyncMutations(
      store,
      member,
      { changes: async () => undefined },
      { now: () => Date.now() }
    )
    await new MeetingService(a).create({ title: 'Acme' })
    await engineA.syncNow()
    const first = store.mutations.length
    await a.query(`UPDATE sync_state SET value = '0' WHERE key = 'last_pushed'`)
    await engineA.syncNow()
    expect(store.mutations.length).toBe(first)
  })

  it('un lector no puede enviar cambios y las tablas no sincronizables se rechazan', async () => {
    const viewer: MembershipRepository = {
      find: async (user) => ({
        org: { id: ORG, name: 'Acme', plan: 'trial', maxMembers: 5 },
        membership: { orgId: ORG, userId: user.userId, role: 'viewer', status: 'active' }
      })
    }
    const readOnly = new SyncMutations(
      new MemoryStore(),
      viewer,
      { changes: async () => undefined },
      { now: () => Date.now() }
    )
    await expect(
      readOnly.push({ userId: 'u', email: null }, { orgId: ORG, deviceId: 'd', mutations: [] })
    ).rejects.toThrow(/lectura/)
    const res = await server.push(
      { userId: 'u', email: null },
      {
        orgId: ORG,
        deviceId: 'd',
        mutations: [
          {
            mutationId: 'device-x:1',
            entity: 'resend_outbox',
            id: 's1',
            op: 'upsert',
            fields: { foo: 'x' },
            rev: '000000000000001:000000:d'
          }
        ]
      }
    )
    expect(res.rejected).toHaveLength(1)
    expect(res.applied).toBe(0)
  })
})
