import { useState } from 'react'
import { X } from 'lucide-react'

export interface TagRef {
  slug: string
  name: string
}

export function TagEditor({
  tags,
  onAdd,
  onRemove
}: {
  tags: TagRef[]
  onAdd: (tag: string) => void
  onRemove: (slug: string) => void
}): React.JSX.Element {
  const [draft, setDraft] = useState('')
  const commit = (): void => {
    const value = draft.trim()
    if (value) onAdd(value)
    setDraft('')
  }

  return (
    <div className="flex min-h-[30px] flex-wrap items-center gap-1 rounded-[4px] border border-ob-border bg-ob-bg px-1.5 py-1 transition-colors focus-within:border-ob-accent">
      {tags.map((t) => (
        <span
          key={t.slug}
          title={t.slug}
          className="inline-flex h-5 items-center gap-0.5 rounded-full bg-ob-accent/15 pr-0.5 pl-2 text-[12px] text-ob-link"
        >
          {t.name}
          <button
            type="button"
            onClick={() => onRemove(t.slug)}
            aria-label={`Quitar tag ${t.name}`}
            className="grid size-4 place-items-center rounded-full text-ob-link transition-colors hover:bg-ob-red/20 hover:text-ob-red"
          >
            <X size={11} strokeWidth={2.5} />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            commit()
          } else if (e.key === 'Backspace' && !draft && tags.length) {
            onRemove(tags[tags.length - 1].slug)
          }
        }}
        onBlur={commit}
        placeholder={tags.length ? 'Añadir…' : 'Añadir tag y Enter'}
        aria-label="Añadir tag"
        className="h-6 min-w-32 flex-1 bg-transparent px-1 text-[13px] text-ob-text outline-none placeholder:text-ob-faint"
      />
    </div>
  )
}
