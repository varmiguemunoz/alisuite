import { mkdirSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import type { MigrationInterface, QueryRunner } from 'typeorm'

const TABLES = ['clients', 'projects', 'tags']
const LINKED = ['tasks', 'meetings']
const COLUMNS = ['client_id', 'project_id']
const INDEXES = [
  'idx_tasks_client',
  'idx_tasks_project',
  'idx_meetings_client',
  'idx_meetings_project'
]

async function rowsOf(query: QueryRunner, table: string): Promise<unknown[]> {
  return (await query.hasTable(table)) ? query.query(`SELECT * FROM "${table}"`) : []
}

async function backup(query: QueryRunner): Promise<void> {
  const database = String(query.connection.options.database ?? '')
  if (!database || database === ':memory:') return
  const data: Record<string, unknown[]> = {}
  for (const table of TABLES) data[table] = await rowsOf(query, table)
  for (const table of LINKED) {
    if (!(await query.hasColumn(table, 'client_id'))) continue
    data[`${table}_links`] = await query.query(
      `SELECT id, client_id, project_id FROM "${table}" WHERE client_id IS NOT NULL OR project_id IS NOT NULL`
    )
  }
  if (!Object.values(data).some((rows) => rows.length)) return
  const folder = join(dirname(database), 'backup')
  mkdirSync(folder, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  writeFileSync(join(folder, `clients-projects-${stamp}.json`), JSON.stringify(data, null, 2))
}

export class RemoveClientsProjects1729900000000 implements MigrationInterface {
  name = 'RemoveClientsProjects1729900000000'

  async up(query: QueryRunner): Promise<void> {
    await backup(query)
    for (const table of LINKED)
      for (const op of ['insert', 'update', 'delete'])
        await query.query(`DROP TRIGGER IF EXISTS "change_log_${table}_${op}"`)
    for (const index of INDEXES) await query.query(`DROP INDEX IF EXISTS "${index}"`)
    for (const table of LINKED)
      for (const column of COLUMNS)
        if (await query.hasColumn(table, column))
          await query.query(`ALTER TABLE "${table}" DROP COLUMN "${column}"`)
    for (const table of TABLES) await query.query(`DROP TABLE IF EXISTS "${table}"`)
    if (await query.hasTable('note_relations'))
      await query.query(`DELETE FROM note_relations WHERE target_type = 'client'`)
    const entities = TABLES.map((t) => `'${t}'`).join(', ')
    if (await query.hasTable('change_log'))
      await query.query(`DELETE FROM change_log WHERE entity IN (${entities})`)
    if (await query.hasTable('sync_revs'))
      await query.query(`DELETE FROM sync_revs WHERE entity IN (${entities})`)
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async down(): Promise<void> {}
}
