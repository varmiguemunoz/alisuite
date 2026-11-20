import { mkdtempSync, readdirSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { DataSource } from 'typeorm'
import { RemoveClientsProjects1729900000000 } from '../main/db/migrations/RemoveClientsProjects'
import { memoryDb } from '../main/test/helpers'

const LEGACY = [
  `CREATE TABLE clients (id text PRIMARY KEY, name text)`,
  `CREATE TABLE projects (id text PRIMARY KEY, client_id text, name text)`,
  `CREATE TABLE tags (id text PRIMARY KEY, slug text)`,
  `CREATE TABLE tasks (id text PRIMARY KEY, title text, client_id text, project_id text)`,
  `CREATE TABLE meetings (id text PRIMARY KEY, title text, client_id text, project_id text)`,
  `CREATE INDEX idx_tasks_client ON tasks (client_id)`,
  `CREATE INDEX idx_meetings_project ON meetings (project_id)`,
  `CREATE TABLE change_log (entity text, entity_id text)`,
  `CREATE TABLE sync_revs (entity text, entity_id text, field text, rev text)`,
  `CREATE TABLE note_relations (id text, note_id text, target_type text, target_id text)`,
  `CREATE TRIGGER change_log_tasks_update AFTER UPDATE ON tasks BEGIN INSERT INTO change_log VALUES ('tasks', NEW.client_id); END`,
  `INSERT INTO clients VALUES ('c1', 'Acme')`,
  `INSERT INTO projects VALUES ('p1', 'c1', 'Web')`,
  `INSERT INTO tasks VALUES ('t1', 'Llamar', 'c1', 'p1')`,
  `INSERT INTO meetings VALUES ('m1', 'Kickoff', 'c1', NULL)`,
  `INSERT INTO change_log VALUES ('clients', 'c1'), ('tasks', 't1')`,
  `INSERT INTO sync_revs VALUES ('projects', 'p1', 'name', 'r'), ('tasks', 't1', 'title', 'r')`,
  `INSERT INTO note_relations VALUES ('r1', 'n1', 'client', 'c1'), ('r2', 'n1', 'note', 'n2')`
]

describe('migración que retira Clientes y Proyectos', () => {
  let db: DataSource | null = null
  afterEach(async () => {
    await db?.destroy()
    db = null
  })

  it('respalda, borra tablas y columnas y conserva tareas y reuniones', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'daylios-migration-'))
    db = new DataSource({ type: 'better-sqlite3', database: join(dir, 'daylios.db') })
    await db.initialize()
    for (const sql of LEGACY) await db.query(sql)
    const runner = db.createQueryRunner()
    await new RemoveClientsProjects1729900000000().up(runner)
    await runner.release()

    const tables = (await db.query(`SELECT name FROM sqlite_master WHERE type = 'table'`)).map(
      (t: { name: string }) => t.name
    )
    expect(tables).not.toContain('clients')
    expect(tables).not.toContain('projects')
    expect(tables).not.toContain('tags')
    const columns = (await db.query(`PRAGMA table_info(tasks)`)).map(
      (c: { name: string }) => c.name
    )
    expect(columns).toEqual(['id', 'title'])
    expect(await db.query(`SELECT id, title FROM meetings`)).toEqual([
      { id: 'm1', title: 'Kickoff' }
    ])
    expect(await db.query(`SELECT entity FROM change_log`)).toEqual([{ entity: 'tasks' }])
    expect(await db.query(`SELECT entity FROM sync_revs`)).toEqual([{ entity: 'tasks' }])
    expect(await db.query(`SELECT id FROM note_relations`)).toEqual([{ id: 'r2' }])

    const [file] = readdirSync(join(dir, 'backup'))
    const saved = JSON.parse(readFileSync(join(dir, 'backup', file), 'utf8'))
    expect(saved.clients).toEqual([{ id: 'c1', name: 'Acme' }])
    expect(saved.projects).toHaveLength(1)
    expect(saved.tasks_links).toEqual([{ id: 't1', client_id: 'c1', project_id: 'p1' }])
  })

  it('una base nueva queda sin tablas ni columnas de clientes', async () => {
    db = await memoryDb()
    const tables = (await db.query(`SELECT name FROM sqlite_master WHERE type = 'table'`)).map(
      (t: { name: string }) => t.name
    )
    for (const gone of ['clients', 'projects', 'tags']) expect(tables).not.toContain(gone)
    for (const table of ['tasks', 'meetings']) {
      const columns = (await db.query(`PRAGMA table_info(${table})`)).map(
        (c: { name: string }) => c.name
      )
      expect(columns).not.toContain('client_id')
      expect(columns).not.toContain('project_id')
    }
  })
})
