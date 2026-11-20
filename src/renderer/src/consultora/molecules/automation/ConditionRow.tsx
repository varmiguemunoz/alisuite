import { X } from 'lucide-react'
import {
  FIELDS,
  fieldSpec,
  OPERATOR_LABELS,
  OPERATORS_BY_KIND,
  VALUELESS,
  type Condition,
  type ConditionValue,
  type FieldSpec,
  type SubjectType
} from '@shared/automations'
import { INPUT } from '../../ui'

const SELECT = `${INPUT} cursor-pointer pr-1.5`

function sourceOptions(field: FieldSpec): { value: string; label: string }[] {
  if (field.source === 'status') return []
  return field.options ?? []
}

function ValueInput({
  field,
  condition,
  onChange
}: {
  field: FieldSpec
  condition: Condition
  onChange: (value: ConditionValue) => void
}): React.JSX.Element | null {
  const op = condition.operator
  if (VALUELESS.includes(op)) return null
  const raw = condition.value
  const one = Array.isArray(raw)
    ? String(raw[0] ?? '')
    : raw === null || raw === undefined
      ? ''
      : String(raw)
  const days = op === 'within_days' || op === 'older_than_days'
  const type = days || field.kind === 'number' ? 'number' : field.kind === 'date' ? 'date' : 'text'
  const cast = (v: string): string | number => (type === 'number' && v !== '' ? Number(v) : v)

  if (op === 'between') {
    const pair = Array.isArray(raw) ? raw.map(String) : ['', '']
    const set = (i: number, v: string): void => {
      const next = [pair[0] ?? '', pair[1] ?? '']
      next[i] = v
      onChange(next.map((x) => (type === 'number' && x !== '' ? String(Number(x)) : x)))
    }
    return (
      <span className="flex min-w-0 flex-1 items-center gap-1">
        <input
          aria-label="Desde"
          type={type}
          value={pair[0] ?? ''}
          onChange={(e) => set(0, e.target.value)}
          className={INPUT}
        />
        <span className="text-[12px] text-ob-muted">y</span>
        <input
          aria-label="Hasta"
          type={type}
          value={pair[1] ?? ''}
          onChange={(e) => set(1, e.target.value)}
          className={INPUT}
        />
      </span>
    )
  }
  if (field.kind === 'boolean')
    return (
      <select
        aria-label="Valor"
        value={String(raw ?? 'true')}
        onChange={(e) => onChange(e.target.value === 'true')}
        className={SELECT}
      >
        <option value="true">Sí</option>
        <option value="false">No</option>
      </select>
    )
  if (field.kind === 'select' || field.kind === 'list') {
    const list = sourceOptions(field)
    return (
      <select
        aria-label="Valor"
        value={one}
        onChange={(e) => onChange(e.target.value)}
        className={SELECT}
      >
        <option value="">Elige…</option>
        {list.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    )
  }
  return (
    <input
      aria-label="Valor"
      type={type}
      value={type === 'date' ? one.slice(0, 10) : one}
      placeholder={days ? 'días' : undefined}
      onChange={(e) => onChange(cast(e.target.value))}
      className={INPUT}
    />
  )
}

export function ConditionRow({
  condition,
  subject,
  onChange,
  onRemove
}: {
  condition: Condition
  subject: SubjectType
  onChange: (condition: Condition) => void
  onRemove: () => void
}): React.JSX.Element {
  const fields = FIELDS[subject]
  const field = fieldSpec(subject, condition.field)
  const operators = field ? OPERATORS_BY_KIND[field.kind] : []

  const pickField = (key: string): void => {
    const spec = fieldSpec(subject, key)
    onChange({
      field: key,
      operator: spec ? OPERATORS_BY_KIND[spec.kind][0] : 'is',
      value: undefined
    })
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-[4px] bg-ob-alt p-2">
      <div className="flex items-center gap-1.5">
        <select
          aria-label="Campo"
          value={condition.field}
          onChange={(e) => pickField(e.target.value)}
          className={SELECT}
        >
          <option value="">Elige un campo…</option>
          {fields.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          aria-label="Quitar condición"
          onClick={onRemove}
          className="grid size-7 shrink-0 place-items-center rounded-[4px] text-ob-muted hover:bg-ob-red/15 hover:text-ob-red"
        >
          <X size={14} aria-hidden />
        </button>
      </div>
      {field && (
        <div className="flex flex-col gap-1.5">
          <select
            aria-label="Operador"
            value={condition.operator}
            onChange={(e) =>
              onChange({ ...condition, operator: e.target.value as Condition['operator'] })
            }
            className={SELECT}
          >
            {operators.map((op) => (
              <option key={op} value={op}>
                {OPERATOR_LABELS[op]}
              </option>
            ))}
          </select>
          <ValueInput
            field={field}
            condition={condition}
            onChange={(value) => onChange({ ...condition, value })}
          />
        </div>
      )}
    </div>
  )
}
