import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2 } from 'lucide-react'
import type { CongregationPublisher } from '../audio-video/publishers'
import { avatarTone, initials } from './model'

export function PersonField({
  value,
  label,
  publishers,
  publisherStatus,
  onCommit,
}: {
  value: string
  label: string
  publishers: CongregationPublisher[]
  publisherStatus: 'loading' | 'ready' | 'error'
  onCommit: (person: { name: string; publisherId?: string }) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const [box, setBox] = useState({ top: 0, left: 0, width: 240 })
  const inputRef = useRef<HTMLInputElement>(null)
  const skipBlur = useRef(false)

  useEffect(() => {
    if (!open) setQuery(value)
  }, [open, value])

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

  const visible = useMemo(() => {
    const folded = query.trim().toLocaleLowerCase('pt-BR')
    if (!folded) return publishers
    return publishers.filter((publisher) => publisher.name.toLocaleLowerCase('pt-BR').includes(folded))
  }, [publishers, query])

  const exact = useMemo(() => {
    const folded = query.trim().toLocaleLowerCase('pt-BR')
    if (!folded) return undefined
    return publishers.find((publisher) => publisher.name.toLocaleLowerCase('pt-BR') === folded)
  }, [publishers, query])

  function commit(person: { name: string; publisherId?: string }) {
    onCommit(person)
    setQuery(person.name)
    setOpen(false)
  }

  function commitQuery() {
    const name = query.trim()
    if (name === value.trim()) {
      setOpen(false)
      return
    }
    if (exact) commit({ name: exact.name, publisherId: exact.id })
    else commit({ name })
  }

  return (
    <div className="flex min-w-0 items-center gap-2.5" onClick={(event) => event.stopPropagation()}>
      <Avatar name={query || value} />
      <input
        ref={inputRef}
        value={open ? query : value}
        aria-label={label}
        aria-expanded={open}
        role="combobox"
        placeholder="Nome"
        onFocus={() => {
          setQuery(value)
          setOpen(true)
        }}
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
        }}
        onBlur={() => {
          if (skipBlur.current) {
            skipBlur.current = false
            setOpen(false)
            return
          }
          commitQuery()
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            skipBlur.current = true
            setQuery(value)
            setOpen(false)
            inputRef.current?.blur()
          }
          if (event.key === 'Enter') {
            event.preventDefault()
            commitQuery()
            inputRef.current?.blur()
          }
        }}
        className="h-9 min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-1 text-sm font-medium text-ink outline-none placeholder:font-normal placeholder:text-muted hover:border-line focus:border-indigo focus:bg-white"
      />
      {open
        ? createPortal(
            <ul
              role="listbox"
              aria-label={label}
              style={{ top: box.top, left: box.left, width: box.width }}
              className="fixed z-40 max-h-56 overflow-y-auto rounded-xl border border-line bg-white py-1 shadow-lg"
            >
              {query.trim() && !exact ? (
                <li>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => commit({ name: query.trim() })}
                    className="block w-full px-3 py-2 text-left text-sm"
                  >
                    Usar “{query.trim()}”
                  </button>
                </li>
              ) : null}
              {publisherStatus === 'loading' ? (
                <li className="flex items-center gap-2 px-3 py-2 text-xs text-indigo">
                  <Loader2 size={14} className="animate-spin" />
                  Carregando publicadores…
                </li>
              ) : publisherStatus === 'error' ? (
                <li className="px-3 py-2 text-xs text-[#9F1239]">Não foi possível carregar os publicadores.</li>
              ) : visible.length === 0 ? (
                <li className="px-3 py-2 text-xs text-muted">Nenhum publicador encontrado.</li>
              ) : (
                visible.map((publisher) => (
                  <li key={publisher.id}>
                    <button
                      type="button"
                      role="option"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => commit({ name: publisher.name, publisherId: publisher.id })}
                      className="block w-full px-3 py-2 text-left text-sm font-medium"
                    >
                      {publisher.name}
                    </button>
                  </li>
                ))
              )}
            </ul>,
            document.body,
          )
        : null}
    </div>
  )
}

export function Avatar({ name }: { name: string }) {
  const letters = initials(name)
  if (!letters) {
    return <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-dashed border-line text-xs text-muted">+</span>
  }
  const tone = avatarTone(name)
  return (
    <span
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-semibold"
      style={{ background: tone.bg, color: tone.fg }}
    >
      {letters}
    </span>
  )
}
