import type { DataSource } from 'typeorm'
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
  const meetings = new MeetingService(db)
  const ai = new AiService()
  return {
    meetings,
    ai,
    context: new ContextService(db),
    metrics: new MetricsService(db),
    dashboards: new DashboardService(db),
    recordings: new RecordingService(db, meetings, ai, notify, onRecording)
  }
}

export interface Consultora {
  meetings: MeetingService
  ai: AiService
  context: ContextService
  metrics: MetricsService
  dashboards: DashboardService
  recordings: RecordingService
}
