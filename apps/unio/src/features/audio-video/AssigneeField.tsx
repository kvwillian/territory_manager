import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2 } from 'lucide-react'
import type { RosterField } from './roster'
import { qualifiesFor } from './publishers'
import type { MockPublisher } from '../publishers/mock'

const emptyQualified: Record<RosterField, string> = {
  attendants: 'Ninguém com o privilégio de indicador.',
  microphones: 'Ninguém com o privilégio de microfone, volante ou áudio.',
  sound: 'Ninguém com o privilégio de áudio.',
}

export function AssigneeField({
  value,
  field,
  publishers,
  publisherStatus,
  dark,
  label,
  onCommit,
}: {
  value: string
  field: RosterField
  publishers: MockPublisher[]
  publisherStatus: 'loading' | 'ready' | 'error'
  dark: boolean
  label: string
  onCommit: (name: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const [box, setBox] = useState({ top: 0, left: 0, width: 240 })
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) setQuery(value)
  }, [open, value])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    function place() {
      const element = inputRef.current
      if (!element) return
      const rect = element.getBoundingClientRect()
      setBox({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 240) })
    }
    place()
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [open])

  const qualified = useMemo(() => publishers.filter((publisher) => qualifiesFor(publisher, field)), [publishers, field])
  const visible = useMemo(() => {
    const folded = query.trim().toLocaleLowerCase('pt-BR')
    if (!folded) return qualified
    return qualified.filter((publisher) => publisher.name.toLocaleLowerCase('pt-BR').includes(folded))
  }, [qualified, query])

  function close() {
    setOpen(false)
    setQuery(value)
  }

  function commit(name: string) {
    onCommit(name)
    setOpen(false)
    setQuery(name)
  }

  return (
    <div className="min-w-0" onClick={(event) => event.stopPropagation()}>
      {open ? (
        <input
          ref={inputRef}
          value={query}
          aria-label={label}
          aria-expanded="true"
          role="combobox"
          placeholder="Buscar"
          onChange={(event) => setQuery(event.target.value)}
          onBlur={close}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault()
              close()
              inputRef.current?.blur()
            }
            if (event.key === 'Enter') {
              event.preventDefault()
              if (!query.trim()) commit('')
              else if (visible[0]) commit(visible[0].name)
            }
          }}
          className="h-8 w-40 rounded-full border border-indigo bg-white px-2.5 text-xs text-ink outline-none ring-1 ring-indigo"
        />
      ) : (
        <button
          type="button"
          aria-label={label}
          onClick={() => {
            setQuery('')
            setOpen(true)
          }}
          className={value
            ? `max-w-full truncate rounded-full px-2.5 py-1 text-left text-xs font-medium text-[#0B0E14] ${dark ? 'bg-[#D5DDE8]' : 'bg-[#F1F5F9]'}`
            : 'rounded-full border border-dashed border-line px-2.5 py-1 text-left text-xs text-muted'}
        >
          {value || 'Escolher'}
        </button>
      )}
      {open ? createPortal(
        <ul
          role="listbox"
          aria-label={label}
          style={{ top: box.top, left: box.left, width: box.width }}
          className="fixed z-40 max-h-56 overflow-y-auto rounded-xl border border-line bg-white py-1 shadow-lg"
        >
          {publisherStatus === 'loading' ? (
            <li className="flex items-center gap-2 px-3 py-2 text-xs text-indigo">
              <Loader2 size={14} className="animate-spin" />
              Carregando…
            </li>
          ) : publisherStatus === 'error' ? (
            <li className="px-3 py-2 text-xs text-[#9F1239]">Não foi possível carregar os publicadores.</li>
          ) : qualified.length === 0 ? (
            <li className="px-3 py-2 text-xs text-muted">{emptyQualified[field]}</li>
          ) : visible.length === 0 ? (
            <li className="px-3 py-2 text-xs text-muted">Nenhum publicador encontrado.</li>
          ) : visible.map((publisher) => (
            <li key={publisher.id}>
              <button
                type="button"
                role="option"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => commit(publisher.name)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
              >
                <span className="text-sm font-medium">{publisher.name}</span>
              </button>
            </li>
          ))}
        </ul>,
        document.body,
      ) : null}
    </div>
  )
}
