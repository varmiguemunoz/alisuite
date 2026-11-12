import { useCallback, useMemo, useState } from 'react'
import { normalizeName } from '@shared/consultora'
import type { TaskTagSummary } from '@shared/tasks'
import { attempt, useLoad } from '../lib'
import {
  ConfirmButton,
  EditableText,
  Empty,
  ErrorNote,
  List,
  Page,
  Row,
  SearchField,
  Section
} from '../ui'

const tasks = window.api.tasks

export function Tags(): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  const taskLoad = useCallback(() => tasks.tagSummaries(), [])
  const { data: taskTags, error: taskError, reload: reloadTasks } = useLoad(taskLoad)

  const q = normalizeName(query)
  const taskList = useMemo(
    () => (taskTags ?? []).filter((t) => !q || normalizeName(t.tag).includes(q)),
    [taskTags, q]
  )

  const run = async (fn: () => Promise<unknown>): Promise<void> => setError(await attempt(fn))

  return (
    <Page title="Tags" meta={taskTags && <span>{taskTags.length} de tareas</span>}>
      <div className="mt-5 flex">
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Buscar tag"
          label="Buscar tag"
        />
      </div>
      <ErrorNote message={error ?? taskError} />

      <Section title="Tareas">
        {taskList.length === 0 ? (
          <Empty title={q ? 'Ningún tag coincide.' : 'Aún no hay tags de tareas.'} />
        ) : (
          <List>
            {taskList.map((t) => (
              <TaskTagRow
                key={t.tag}
                tag={t}
                onRename={(name) => void run(() => tasks.renameTag(t.tag, name).then(reloadTasks))}
                onRemove={() => void run(() => tasks.removeTag(t.tag).then(reloadTasks))}
              />
            ))}
          </List>
        )}
      </Section>
    </Page>
  )
}

function TaskTagRow({
  tag,
  onRename,
  onRemove
}: {
  tag: TaskTagSummary
  onRename: (name: string) => void
  onRemove: () => void
}): React.JSX.Element {
  return (
    <Row>
      <span className="min-w-0 flex-1 truncate text-[14px]">{tag.tag}</span>
      <span className="shrink-0 text-[12px] text-ob-muted">{tag.tasks} tareas</span>
      <EditableText value={tag.tag} onSave={onRename} label="Renombrar tag" />
      <ConfirmButton label="Borrar tag" onConfirm={onRemove} />
    </Row>
  )
}
