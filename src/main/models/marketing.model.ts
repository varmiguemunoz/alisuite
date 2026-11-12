import { EntitySchema } from 'typeorm'
import { ALIVE, DELETED_AT, type SoftDeletable } from './soft-delete'
import type { Tag } from '@shared/marketing'

export const TagModel = new EntitySchema<Tag & SoftDeletable>({
  name: 'Tag',
  tableName: 'tags',
  columns: {
    id: { type: 'text', primary: true },
    slug: { type: 'text' },
    name: { type: 'text' },
    createdAt: { name: 'created_at', type: 'text' },
    deletedAt: DELETED_AT
  },
  indices: [{ name: 'uq_tags_slug', columns: ['slug'], unique: true, where: ALIVE }]
})