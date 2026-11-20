import type { ReactNode } from 'react'

export function Chips<T extends string>({
  label,
  value,
  options,
  onChange
}: {
  label: string
  value: T
  options: { id: T; label: ReactNode }[]
  onChange: (value: T) => void
}): React.JSX.Element {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1"
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={`h-[26px] shrink-0 rounded-[4px] px-2.5 text-[12px] font-medium transition-colors ${
            value === o.id
              ? 'bg-ob-active text-ob-text'
              : 'text-ob-muted hover:bg-ob-hover hover:text-ob-text'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
