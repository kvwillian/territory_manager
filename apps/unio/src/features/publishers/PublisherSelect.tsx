import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export function PublisherSelect({
  value,
  publishers,
  emptyMessage,
  placeholder,
  label,
  onCommit,
}: {
  value: string
  publishers: { id: string; name: string }[]
  emptyMessage: string
  placeholder: string
  label: string
  onCommit: (name: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [box, setBox] = useState({ top: 0, left: 0, width: 240 })
  const inputRef = useRef<HTMLInputElement>(null)

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

  const visible = useMemo(() => {
    const folded = query.trim().toLocaleLowerCase('pt-BR')
    if (!folded) return publishers
    return publishers.filter((publisher) => publisher.name.toLocaleLowerCase('pt-BR').includes(folded))
  }, [publishers, query])

  function close() {
    setOpen(false)
    setQuery('')
  }

  function commit(name: string) {
    onCommit(name)
    close()
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
            }
            if (event.key === 'Enter') {
              event.preventDefault()
              if (!query.trim()) commit('')
              else if (visible[0]) commit(visible[0].name)
            }
          }}
          className="h-8 w-full rounded-lg border border-indigo bg-white px-2 text-sm text-ink outline-none ring-1 ring-indigo"
        />
      ) : (
        <button
          type="button"
          aria-label={label}
          onClick={() => {
            setQuery('')
            setOpen(true)
          }}
          className="h-8 w-full truncate rounded-lg border border-line bg-white px-2 text-left text-sm text-ink"
        >
          {value || <span className="text-muted">{placeholder}</span>}
        </button>
      )}
      {open ? createPortal(
        <ul
          role="listbox"
          aria-label={label}
          style={{ top: box.top, left: box.left, width: box.width }}
          className="fixed z-40 max-h-56 overflow-y-auto rounded-xl border border-line bg-white py-1 shadow-lg"
        >
          {value ? (
            <li>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => commit('')}
                className="w-full px-3 py-2 text-left text-sm text-muted"
              >
                Limpar
              </button>
            </li>
          ) : null}
          {publishers.length === 0 ? (
            <li className="px-3 py-2 text-xs text-muted">{emptyMessage}</li>
          ) : visible.length === 0 ? (
            <li className="px-3 py-2 text-xs text-muted">Nenhum publicador encontrado.</li>
          ) : visible.map((publisher) => (
            <li key={publisher.id}>
              <button
                type="button"
                role="option"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => commit(publisher.name)}
                className="w-full px-3 py-2 text-left text-sm font-medium"
              >
                {publisher.name}
              </button>
            </li>
          ))}
        </ul>,
        document.body,
      ) : null}
    </div>
  )
}
