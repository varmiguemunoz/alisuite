import { EntitySchema } from 'typeorm'

export interface DashboardRow {
  id: string
  name: string
  owner: string
  layout: string
  updatedAt: string
}

export const DashboardModel = new EntitySchema<DashboardRow>({
  name: 'Dashboard',
  tableName: 'dashboards',
  columns: {
    id: { type: 'text', primary: true },
    name: { type: 'text' },
    owner: { type: 'text', default: 'local' },
    layout: { type: 'text' },
    updatedAt: { name: 'updated_at', type: 'text' }
  }
})