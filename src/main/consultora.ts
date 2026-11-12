import type { DataSource } from 'typeorm'
import { ClientService } from './services/client.service'
import { ProjectService } from './services/project.service'
import { MeetingService } from './services/meeting.service'
import { ContextService } from './services/context.service'
import { AiService } from './services/ai.service'
import { RecordingService } from './services/recording.service'
import { MetricsService } from './services/metrics.service'
import { DashboardService } from './services/dashboard.service'

export function createConsultora(
  db: DataSource,
  notify: () => void,
  onRecording: (recording: boolean) => void
): Consultora {
  const clients = new ClientService(db)
  const meetings = new MeetingService(db)
  const ai = new AiService()
  return {
    clients,
    projects: new ProjectService(db),
    meetings,
    ai,
    context: new ContextService(db, clients),
    metrics: new MetricsService(db),
    dashboards: new DashboardService(db),
    recordings: new RecordingService(db, meetings, ai, notify, onRecording)
  }
}

export interface Consultora {
  clients: ClientService
  projects: ProjectService
  meetings: MeetingService
  ai: AiService
  context: ContextService
  metrics: MetricsService
  dashboards: DashboardService
  recordings: RecordingService
}
