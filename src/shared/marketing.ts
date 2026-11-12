export interface Tag {
  id: string
  slug: string
  name: string
  createdAt: string
}

export type TagRef = Pick<Tag, 'slug' | 'name'>

export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}