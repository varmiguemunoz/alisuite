import { Router } from 'express'
import type { MeetingController } from '../controllers/meeting.controller'
import type { ContextController } from '../controllers/context.controller'
import type { MetricsController } from '../controllers/metrics.controller'

export interface ConsultoraControllers {
  meetings: MeetingController
  context: ContextController
  metrics: MetricsController
}

export function consultoraRoutes(c: ConsultoraControllers): Router {
  return Router()
    .get('/overview', c.context.overview)
    .get('/metrics', c.metrics.query)
    .get('/dashboard', c.metrics.dashboard)
    .get('/search', c.context.search)
    .post('/notes/append', c.context.appendNote)

    .get('/meetings', c.meetings.list)
    .post('/meetings', c.meetings.create)
    .get('/meetings/:id', c.meetings.get)
    .patch('/meetings/:id', c.meetings.update)
    .delete('/meetings/:id', c.meetings.remove)
    .patch('/meetings/:id/action-items/:index', c.meetings.updateActionItem)
    .post('/meetings/:id/process', c.meetings.process)
    .get('/action-items', c.meetings.actionItems)
    .post('/meetings/import', c.meetings.importRecording)
}
