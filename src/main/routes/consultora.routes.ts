import { Router } from 'express'
import type { ClientController } from '../controllers/client.controller'
import type { ProjectController } from '../controllers/project.controller'
import type { MeetingController } from '../controllers/meeting.controller'
import type { ContextController } from '../controllers/context.controller'
import type { MetricsController } from '../controllers/metrics.controller'

export interface ConsultoraControllers {
  clients: ClientController
  projects: ProjectController
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

    .get('/clients', c.clients.list)
    .post('/clients', c.clients.create)
    .get('/clients/:ref', c.clients.get)
    .patch('/clients/:ref', c.clients.update)
    .get('/clients/:ref/impact', c.clients.impact)
    .delete('/clients/:ref', c.clients.remove)
    .get('/clients/:ref/documents', c.context.documents)
    .get('/clients/:ref/documents/read', c.context.readDocument)
    .put('/clients/:ref/documents', c.context.writeDocument)
    .patch('/clients/:ref/documents', c.context.renameDocument)
    .delete('/clients/:ref/documents', c.context.trashDocument)

    .post('/projects', c.projects.create)
    .get('/projects/:ref', c.projects.get)
    .patch('/projects/:ref', c.projects.update)
    .delete('/projects/:ref', c.projects.remove)

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
