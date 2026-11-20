import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Activity } from 'lucide-react'
import {
  TASK_STATUSES,
  TASK_STATUS_LABEL,
  type DayKey,
  type Task,
  type TaskPatch,
  type TaskStatus
} from '@shared/tasks'
import { TaskDetail } from '../../../components/TaskDetail'
import { errorMessage, onDataChanged, tasksApi } from '../../../lib/api'
import { useOverlay } from '../../../ui/organisms/overlay'
import { ErrorNote, Select } from '../../ui'
import { Properties, PropertyRow } from '../../molecules/Properties'
import { AssigneeRow } from '../orgs/AssigneeRow'

interface TaskDrawerProps {
  task: Task
  today: DayKey
  onClose: () => void

  onChanged: () => void
}

export function TaskDrawer({
  task,
  today,
  onClose,
  onChanged
}: TaskDrawerProps): React.JSX.Element {
  const panel = useRef<HTMLElement>(null)
  useOverlay(true, onClose, panel)
  // Abrir una subtarea apila; Atrás vuelve a la madre.
  const [stack, setStack] = useState<{ task: Task; parent?: Task }[]>([{ task }])
  const current = stack[stack.length - 1]
  const [fresh, setFresh] = useState<Task>(task)
  const [revision, setRevision] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const close = useRef(onClose)
  useEffect(() => {
    close.current = onClose
  }, [onClose])

  useEffect(() => onDataChanged(() => setRevision((r) => r + 1)), [])
  // Estado y relación al día; si la tarea ya no existe (borrada por Claude), se cierra.
  useEffect(() => {
    let alive = true
    tasksApi
      .get(current.task.id)
      .then((view) => {
        if (alive) setFresh(view.task)
      })
      .catch(() => {
        if (alive) close.current()
      })
    return () => {
      alive = false
    }
  }, [current.task.id, revision])

  const patch = async (change: TaskPatch): Promise<void> => {
    try {
      setFresh(await tasksApi.update(fresh.id, change))
      setError(null)
      onChanged()
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-40 flex justify-end [-webkit-app-region:no-drag]">
      <div aria-hidden className="ui-backdrop absolute inset-0 bg-night/40" onClick={onClose} />
      <aside
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={`Tarea ${fresh.title}`}
        tabIndex={-1}
        className="ui-drawer drawer-in relative flex h-full w-[min(480px,calc(100vw-48px))] flex-col bg-surface outline-none"
      >
        <div className="shrink-0 px-5 pt-3">
          <Properties id="task">
            <PropertyRow icon={Activity} label="Estado">
              <Select
                label="Estado"
                value={fresh.status}
                options={TASK_STATUSES.map((s) => ({ value: s, label: TASK_STATUS_LABEL[s] }))}
                onChange={(status) => void patch({ status: status as TaskStatus })}
              />
            </PropertyRow>
            <AssigneeRow
              value={fresh.assigneeId}
              onChange={(id) => void patch({ assignee: id ?? '' })}
            />
          </Properties>
          <ErrorNote message={error} />
        </div>
        <div className="min-h-0 flex-1">
          <TaskDetail
            key={current.task.id}
            task={current.task}
            today={today}
            parent={current.parent}
            revision={revision}
            backLabel={current.parent ? 'Tarea madre' : 'Cerrar'}
            onBack={() => {
              onChanged()
              if (stack.length > 1) setStack((s) => s.slice(0, -1))
              else onClose()
            }}
            onRemove={(removed) => {
              void tasksApi
                .remove(removed.id)
                .then(() => {
                  onChanged()
                  if (stack.length > 1) setStack((s) => s.slice(0, -1))
                  else onClose()
                })
                .catch((e) => setError(errorMessage(e)))
            }}
            onOpenSubtask={(sub, self) => setStack((s) => [...s, { task: sub, parent: self }])}
            onRemoveSubtask={(sub) =>
              void tasksApi
                .remove(sub.id)
                .then(() => {
                  setRevision((r) => r + 1)
                  onChanged()
                })
                .catch((e) => setError(errorMessage(e)))
            }
          />
        </div>
      </aside>
    </div>,
    document.body
  )
}
