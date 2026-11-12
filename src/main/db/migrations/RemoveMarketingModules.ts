import type { MigrationInterface, QueryRunner } from 'typeorm'

export class RemoveMarketingModules1729800000000 implements MigrationInterface {
  name = 'RemoveMarketingModules1729800000000'

  async up(query: QueryRunner): Promise<void> {
    await query.query(`DROP TABLE IF EXISTS contact_tags`)
    await query.query(`DROP TABLE IF EXISTS contact_events`)
    await query.query(`DROP TABLE IF EXISTS contacts`)
    await query.query(`DROP TABLE IF EXISTS prospects`)
    await query.query(`DROP TABLE IF EXISTS pipelines`)
    await query.query(`DROP TABLE IF EXISTS stages`)
    await query.query(`DROP TABLE IF EXISTS lead_sources`)
    await query.query(`DROP TABLE IF EXISTS newsletters`)
    await query.query(`DROP TABLE IF EXISTS resend_outbox`)
    await query.query(`DROP TABLE IF EXISTS hub_receipts`)
    await query.query(`DROP TABLE IF EXISTS stage_events`)
  }

  async down(): Promise<void> {
    // Irreversible: removed modules are not restored.
  }
}
