import { Check, Minus } from 'lucide-react'

export function Checkbox({
  checked,
  indeterminate = false,
  disabled = false,
  changed = false,
  tone = 'indigo',
  ariaLabel,
  onChange,
}: {
  checked: boolean
  indeterminate?: boolean
  disabled?: boolean
  changed?: boolean
  tone?: 'indigo' | 'danger'
  ariaLabel?: string
  onChange: (next: boolean) => void
}) {
  const active = checked || indeterminate
  const activeStyles =
    tone === 'danger'
      ? 'border-[#E11D48] bg-[#E11D48] text-white shadow-[0_1px_2px_rgba(225,29,72,0.28)]'
      : 'border-indigo bg-indigo text-white shadow-[0_1px_2px_rgba(79,70,229,0.28)]'

  return (
    <span
      role="checkbox"
      tabIndex={disabled ? -1 : 0}
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-disabled={disabled || undefined}
      aria-label={ariaLabel}
      onMouseDown={(event) => {
        event.preventDefault()
      }}
      onClick={(event) => {
        event.stopPropagation()
        if (!disabled) onChange(!checked)
      }}
      onKeyDown={(event) => {
        if (disabled) return
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault()
          event.stopPropagation()
          onChange(!checked)
        }
      }}
      className={`relative inline-grid h-5 w-5 shrink-0 select-none place-items-center align-middle rounded-[7px] border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo/40 ${
        disabled ? 'cursor-not-allowed opacity-45' : 'cursor-pointer'
      } ${
        active
          ? activeStyles
          : 'border-[#94A3B8]/60 bg-transparent text-transparent hover:border-indigo'
      }`}
    >
      {indeterminate ? (
        <Minus size={12} strokeWidth={3} />
      ) : (
        <Check
          size={12}
          strokeWidth={3}
          className={`transition-transform duration-150 ${checked ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}
        />
      )}
      {changed ? (
        <span
          aria-hidden="true"
          className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[#F59E0B]"
        />
      ) : null}
    </span>
  )
}
