import { join } from 'path'
import type { DataSource } from 'typeorm'
import type { LocalSummary, RemoteChange, SyncStatus } from '@shared/sync-protocol'
import type { Account } from './account'
import type { SyncEngine } from './cloud/sync/engine'

export const SYNC_MARKER = 'sync-init.json'

const OFF: SyncStatus = {
  phase: 'off',
  pending: 0,
  lastPushAt: null,
  lastPullAt: null,
  error: null,
  bootstrap: null,
  deletedByOthers: []
}

interface SyncDeps {
  db: DataSource
  account: Account
  dataRoot: string
  workspacePath: () => string
  activeOrg: () => { id: string; name: string } | null
  deviceId: () => string
  notify: (changes?: RemoteChange[]) => void
  onStatus: (status: SyncStatus) => void
}

export class Sync {
  private engine: SyncEngine | null = null

  constructor(private readonly deps: SyncDeps) {
    deps.account.onChange(() => void this.refresh())
  }

  status(): SyncStatus {
    return this.engine?.current() ?? OFF
  }

  poke(): void {
    this.engine?.poke()
  }

  async refresh(): Promise<void> {
    const org = this.deps.activeOrg()
    const ready = !!org && !!this.deps.account.cloudApi()
    if (!ready) {
      if (this.engine) {
        await this.engine.stop()
        this.engine = null
        this.deps.onStatus(OFF)
      }
      return
    }
    if (this.engine) return
    const { SyncEngine } = await import('./cloud/sync/engine')
    this.engine = new SyncEngine({
      db: this.deps.db,
      api: () => this.deps.account.cloudApi(),
      orgId: org.id,
      deviceId: this.deps.deviceId(),
      markerFile: join(this.deps.dataRoot, SYNC_MARKER),
      notify: this.deps.notify,
      subscribe: (topic, event, cb) => this.deps.account.subscribe(topic, event, cb),
      onStatus: this.deps.onStatus
    })
    await this.engine.start()
  }

  syncNow(): Promise<SyncStatus> {
    return this.engine?.syncNow() ?? Promise.resolve(OFF)
  }

  pause(paused: boolean): Promise<SyncStatus> {
    return this.engine?.pause(paused) ?? Promise.resolve(OFF)
  }

  redownload(): Promise<SyncStatus> {
    return this.engine?.redownload() ?? Promise.resolve(OFF)
  }

  restore(entity: string, id: string): Promise<SyncStatus> {
    return this.engine?.restore(entity, id) ?? Promise.resolve(OFF)
  }

  async localSummary(): Promise<LocalSummary> {
    const { LocalSyncStore } = await import('./cloud/sync/local-store')
    const tables = (await new LocalSyncStore(this.deps.db).counts()).filter((t) => t.rows > 0)
    return { tables, total: tables.reduce((n, t) => n + t.rows, 0) }
  }

  async stop(): Promise<void> {
    await this.engine?.stop()
  }
}
