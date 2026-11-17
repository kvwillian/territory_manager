import { ChevronDown, Check, ExternalLink, Moon, Sun, Sunrise, Users, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { formatShortDayMonth } from '../status'
import type {
  ConductorOption,
  DeparturePeriodType,
  TerritoryStatusSnapshot,
  TerritoryWorkStatus,
} from '../types'

export function territoryPillTone(status: TerritoryWorkStatus): string {
  if (status === 'available') {
    return 'border-[#BBF7D0] bg-[#DCFCE7] text-[#166534] hover:border-[#86EFAC]'
  }
  if (status === 'partial') {
    return 'border-[#BFDBFE] bg-[#DBEAFE] text-[#1E40AF] hover:border-[#93C5FD]'
  }
  return 'border-[#CBD5E1] bg-[#E2E8F0] text-[#475569] hover:border-[#94A3B8]'
}

export function statusLabelPt(status: TerritoryWorkStatus): string {
  if (status === 'available') return 'Disponível'
  if (status === 'partial') return 'Parcialmente trabalhado'
  return 'Trabalhado recentemente'
}

export function TerritoryPill({
  code,
  status,
  snapshot,
  selected = false,
  onClick,
  disabled = false,
}: {
  code: string
  status: TerritoryWorkStatus
  snapshot?: TerritoryStatusSnapshot
  selected?: boolean
  onClick?: () => void
  disabled?: boolean
}) {
  const tooltipParts: string[] = [`Território ${code} — ${statusLabelPt(status)}`]
  if (snapshot?.missingSegmentCodes && snapshot.missingSegmentCodes.length > 0) {
    const doneStr =
      snapshot.completedSegmentCodes && snapshot.completedSegmentCodes.length > 0
        ? ` (${snapshot.completedSegmentCodes.join(', ')} já trabalhado)`
        : ''
    tooltipParts.push(
      `Faltando concluir: ${snapshot.missingSegmentCodes.join(', ')}${doneStr}`,
    )
  } else if (snapshot?.waitingForSiblingCodes.length) {
    tooltipParts.push(`Aguarda conclusão de ${snapshot.waitingForSiblingCodes.join(', ')}`)
  } else if (snapshot?.pendingSiblingCompletion) {
    tooltipParts.push(
      `Prioridade: concluir par (${snapshot.completedSiblingCodes.join(', ')} já trabalhado)`,
    )
  } else if (snapshot?.hasPartialSegments) {
    tooltipParts.push(
      `Trechos: ${snapshot.completedSegments}/${snapshot.totalSegments} concluídos`,
    )
  }
  if (snapshot?.lastWorkedIsoDate) {
    tooltipParts.push(`Último trabalho: ${formatShortDayMonth(snapshot.lastWorkedIsoDate)}`)
  } else {
    tooltipParts.push('Sem trabalho efetivo registrado')
  }
  if (snapshot?.lastAssignedIsoDate) {
    tooltipParts.push(`Última designação: ${formatShortDayMonth(snapshot.lastAssignedIsoDate)}`)
  }

  const missingBadge =
    snapshot?.missingSegmentCodes && snapshot.missingSegmentCodes.length > 0
      ? snapshot.missingSegmentCodes.join('/')
      : null

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={tooltipParts.join(' • ')}
      className={`inline-flex h-8 min-w-[2.45rem] items-center justify-center gap-1 rounded-full border px-2.5 text-xs font-semibold transition select-none ${territoryPillTone(
        status,
      )} ${
        selected
          ? 'ring-2 ring-indigo ring-offset-1 shadow-xs font-bold'
          : ''
      } ${disabled ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
    >
      {selected ? <Check size={12} className="mr-0.5 shrink-0 text-indigo" /> : null}
      <span>{code}</span>
      {missingBadge ? (
        <span className="rounded-full bg-white/80 px-1.5 py-0.2 text-[10px] font-bold text-[#1E40AF]">
          falta {missingBadge}
        </span>
      ) : null}
    </button>
  )
}

export function TerritoryStatusLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-[#475569]">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#22C55E]" />
        Disponível
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#3B82F6]" />
        Parcial (A/B)
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#94A3B8]" />
        Recente (até 15 dias)
      </span>
    </div>
  )
}

export function DeparturePeriodBadge({ periodType }: { periodType: DeparturePeriodType }) {
  if (periodType === 'afternoon') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C7D2FE] bg-[#EEF2FF] px-2.5 py-1 text-xs font-medium text-[#4338CA]">
        <Moon size={13} />
        Saída da tarde
      </span>
    )
  }
  if (periodType === 'sunday') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#A7F3D0] bg-[#ECFDF5] px-2.5 py-1 text-xs font-medium text-[#047857]">
        <Sunrise size={13} />
        Saída de domingo
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FDE68A] bg-[#FEF3C7] px-2.5 py-1 text-xs font-medium text-[#B45309]">
      <Sun size={13} />
      Saída da manhã
    </span>
  )
}

export function ActiveSwitch({
  checked,
  onChange,
  disabled = false,
  label,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  label?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label ?? (checked ? 'Ativo' : 'Inativo')}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors focus-visible:ring-2 focus-visible:ring-indigo/40 outline-none ${
        checked ? 'bg-[#22C55E]' : 'bg-[#CBD5E1]'
      } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
    >
      <span
        className={`h-5 w-5 rounded-full bg-[#FFFFFF] shadow-xs transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

export function TerritoryMapLightbox({
  imageUrl,
  title,
  subtitle,
  mapsUrl,
  onClose,
}: {
  imageUrl: string
  title: string
  subtitle?: string
  mapsUrl?: string
  onClose: () => void
}) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4 backdrop-blur-[2px]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <div>
            <h3 className="text-sm font-semibold text-ink">{title}</h3>
            {subtitle ? <p className="text-xs text-muted">{subtitle}</p> : null}
          </div>
          <div className="flex items-center gap-2">
            {mapsUrl ? (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-[#F8FAFC] px-3 text-xs font-semibold text-indigo hover:bg-[#EEF2FF]"
              >
                Abrir no Google Maps
                <ExternalLink size={13} />
              </a>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-[#F3F5FB] hover:text-ink"
              aria-label="Fechar imagem"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center overflow-auto bg-[#0F172A] p-3">
          <img
            src={imageUrl}
            alt={title}
            className="max-h-[78vh] w-auto max-w-full rounded-lg object-contain"
          />
        </div>
      </div>
    </div>
  )
}

export function ConductorsMultiSelect({
  value,
  options,
  onChange,
  disabled = false,
  placeholder = 'Selecionar dirigentes...',
}: {
  value: string[]
  options: ConductorOption[]
  onChange: (next: string[]) => void
  disabled?: boolean
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocMouseDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [open])

  const selectedSet = useMemo(
    () => new Set(value.map((n) => n.trim().toLowerCase())),
    [value],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return options
    return options.filter((opt) => opt.name.toLowerCase().includes(q))
  }, [options, search])

  function toggleName(name: string) {
    const norm = name.trim().toLowerCase()
    if (selectedSet.has(norm)) {
      onChange(value.filter((item) => item.trim().toLowerCase() !== norm))
    } else {
      onChange([...value, name.trim()])
    }
  }

  function addCustom() {
    const trimmed = search.trim()
    if (!trimmed) return
    if (!selectedSet.has(trimmed.toLowerCase())) {
      onChange([...value, trimmed])
    }
    setSearch('')
  }

  return (
    <div ref={rootRef} className="relative">
      <div
        onClick={() => {
          if (!disabled) setOpen(true)
        }}
        className={`flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-1.5 text-sm transition ${
          disabled ? 'opacity-70' : 'cursor-pointer hover:border-[#C7D2FE]'
        }`}
      >
        <Users size={16} className="mr-1 shrink-0 text-muted" />
        {value.length === 0 ? (
          <span className="text-sm text-muted">{placeholder}</span>
        ) : (
          value.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1 rounded-full border border-[#C7D2FE] bg-[#EEF2FF] px-2.5 py-0.5 text-xs font-medium text-[#4338CA]"
            >
              {name}
              {disabled ? null : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleName(name)
                  }}
                  className="rounded-full p-0.5 text-[#4338CA] hover:bg-[#E0E7FF]"
                  aria-label={`Remover ${name}`}
                >
                  <X size={12} />
                </button>
              )}
            </span>
          ))
        )}
        <span className="ml-auto pl-1 text-muted">
          <ChevronDown size={16} />
        </span>
      </div>

      {open && !disabled ? (
        <div className="absolute right-0 left-0 z-40 mt-1.5 rounded-xl border border-line bg-white p-2 shadow-lg">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                if (filtered.length === 1) {
                  toggleName(filtered[0]!.name)
                  setSearch('')
                } else {
                  addCustom()
                }
              }
            }}
            placeholder="Buscar publicador ou digitar nome..."
            autoFocus
            className="mb-2 w-full rounded-lg border border-line bg-[#F8FAFC] px-3 py-1.5 text-sm text-ink outline-none focus:border-indigo"
          />
          <div className="max-h-52 overflow-y-auto">
            {filtered.map((opt) => {
              const checked = selectedSet.has(opt.name.toLowerCase())
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggleName(opt.name)}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-sm transition ${
                    checked
                      ? 'bg-[#EEF2FF] font-medium text-[#4338CA]'
                      : 'text-ink hover:bg-[#F8FAFC]'
                  }`}
                >
                  <span className="truncate">{opt.name}</span>
                  {checked ? <Check size={14} className="shrink-0 text-indigo" /> : null}
                </button>
              )
            })}

            {search.trim() &&
            !options.some((o) => o.name.toLowerCase() === search.trim().toLowerCase()) ? (
              <button
                type="button"
                onClick={addCustom}
                className="mt-1 flex w-full items-center gap-2 rounded-lg bg-[#F8FAFC] px-2.5 py-1.5 text-left text-xs font-medium text-indigo hover:bg-[#EEF2FF]"
              >
                + Adicionar "{search.trim()}"
              </button>
            ) : null}

            {filtered.length === 0 && !search.trim() ? (
              <p className="px-2.5 py-2 text-xs text-muted">Nenhum publicador encontrado.</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
