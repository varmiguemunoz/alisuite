import { useEffect, useMemo, useState } from 'react'
import type { NoteBrief, NoteTarget } from '@shared/notes'
import { notesApi } from '../lib/api'
import { Modal, SearchField } from '../ui'

interface NotePickerProps {
  open: boolean

  noteId: string

  exclude: string[]
  onPick: (target: NoteTarget) => void
  onClose: () => void
}

export function NotePicker({
  open,
  noteId,
  exclude,
  onPick,
  onClose
}: NotePickerProps): React.JSX.Element | null {
  const [query, setQuery] = useState('')
  const [notes, setNotes] = useState<NoteBrief[]>([])

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => {
      notesApi
        .search(query, 30)
        .then(setNotes)
        .catch(() => setNotes([]))
    }, 150)
    return () => clearTimeout(t)
  }, [open, query])

  const skip = useMemo(() => new Set([noteId, ...exclude]), [noteId, exclude])
  const items = notes
    .filter((n) => !skip.has(n.id))
    .map((n) => ({ id: n.id, title: n.title, hint: n.excerpt }))

  const pick = (id: string): void => {
    onPick({ type: 'note', id })
    setQuery('')
  }

  return (
    <Modal open={open} title="Relacionar nota" onClose={onClose} size="sm">
      <div className="flex flex-col gap-3">
        <div className="flex">
          <SearchField
            value={query}
            onChange={setQuery}
            autoFocus
            placeholder="Título o texto de la nota"
            onEnter={() => items[0] && pick(items[0].id)}
          />
        </div>
        <ul className="ui-list overflow-hidden rounded-md bg-night/40 [&>li+li]:shadow-[inset_0_1px_0_var(--color-hairline)]">
          {items.length === 0 && (
            <li className="px-4 py-3 text-caption text-milk-soft">Ninguna nota coincide.</li>
          )}
          {items.slice(0, 30).map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => pick(item.id)}
                className="ui-list-item w-full px-4 py-2.5 text-left transition-colors hover:bg-surface-raised focus-visible:bg-surface-raised"
              >
                <span className="block truncate text-list font-bold">{item.title}</span>
                {item.hint && (
                  <span className="block truncate text-caption text-milk-soft">{item.hint}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  )
}
