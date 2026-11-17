import {
  CalendarRange,
  Check,
  Copy,
  Home,
  Moon,
  MoreVertical,
  Pencil,
  Plus,
  Sun,
  Sunrise,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  compareTerritoryCodes,
  periodTypeLabel,
  weekdayLabelLong,
  weekdayLabelShort,
} from '../status'
import { useTerritories } from '../store'
import type {
  DeparturePeriodType,
  RecurringDepartureRecord,
  TerritoryRecord,
  WeekdayKey,
} from '../types'
import { ActiveSwitch, ConductorsMultiSelect } from './SharedPieces'
import { WeekendDeparturesTab } from './WeekendDeparturesTab'

const WEEKDAYS: WeekdayKey[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

export function summarizeAllowedByRegion(
  allowedIds: string[],
  territoriesById: Map<string, TerritoryRecord>,
): { summaryText: string; detailedTooltip: string } {
  if (allowedIds.length === 0) {
    return { summaryText: 'Todos os territórios', detailedTooltip: 'Sem restrição por região' }
  }
  const byRegion = new Map<string, string[]>()
  for (const id of allowedIds) {
    const t = territoriesById.get(id)
    if (!t) continue
    const bucket = byRegion.get(t.regionName)
    if (bucket) bucket.push(t.code)
    else byRegion.set(t.regionName, [t.code])
  }
  if (byRegion.size === 0) {
    return { summaryText: 'Nenhum território válido', detailedTooltip: '' }
  }

  const summaryParts: string[] = []
  const detailParts: string[] = []
  const sortedEntries = [...byRegion.entries()].sort((a, b) =>
    a[0].localeCompare(b[0], 'pt-BR'),
  )
  for (const [region, codes] of sortedEntries) {
    codes.sort(compareTerritoryCodes)
    summaryParts.push(`${region} (${codes.length})`)
    detailParts.push(`${region}: ${codes.join(', ')}`)
  }
  return {
    summaryText: summaryParts.join(', '),
    detailedTooltip: detailParts.join(' | '),
  }
}

export function DepartureLocationsTab({
  onOpenDateInPlanner,
}: {
  onOpenDateInPlanner?: (isoDate: string) => void
}) {
  const {
    canManage,
    territories,
    recurringDepartures,
    toggleRecurringDepartureActive,
    deleteRecurringDeparture,
  } = useTerritories()

  const [subTab, setSubTab] = useState<'recurring' | 'weekend'>('recurring')
  const [dayFilter, setDayFilter] = useState<'' | WeekdayKey>('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [drawerTarget, setDrawerTarget] = useState<
    null | { mode: 'create' } | { mode: 'edit'; record: RecurringDepartureRecord } | { mode: 'duplicate'; record: RecurringDepartureRecord }
  >(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const territoriesById = useMemo(
    () => new Map(territories.map((t) => [t.id, t])),
    [territories],
  )

  const filtered = useMemo(
    () =>
      recurringDepartures.filter((item) => {
        if (dayFilter && item.dayOfWeek !== dayFilter) return false
        if (statusFilter === 'active' && !item.active) return false
        if (statusFilter === 'inactive' && item.active) return false
        return true
      }),
    [recurringDepartures, dayFilter, statusFilter],
  )

  return (
    <div className="space-y-4">
      {/* Sub-tabs: Saídas recorrentes | Sábados e Domingos */}
      <div className="inline-flex flex-wrap items-center gap-1 rounded-2xl border border-line bg-white p-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <button
          type="button"
          onClick={() => setSubTab('recurring')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition sm:text-sm ${
            subTab === 'recurring'
              ? 'bg-indigo text-white shadow-xs'
              : 'text-muted hover:bg-[#F8FAFC] hover:text-ink'
          }`}
        >
          <Home size={15} />
          Saídas recorrentes
        </button>
        <button
          type="button"
          onClick={() => setSubTab('weekend')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition sm:text-sm ${
            subTab === 'weekend'
              ? 'bg-indigo text-white shadow-xs'
              : 'text-muted hover:bg-[#F8FAFC] hover:text-ink'
          }`}
        >
          <CalendarRange size={15} />
          Sábados e Domingos
        </button>
      </div>

      {subTab === 'weekend' ? (
        <WeekendDeparturesTab
          onOpenDateInPlanner={(isoDate) => onOpenDateInPlanner?.(isoDate)}
        />
      ) : (
        <>
          {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={dayFilter}
            onChange={(e) => setDayFilter(e.target.value as '' | WeekdayKey)}
            className="h-10 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-indigo"
          >
            <option value="">Todos os dias</option>
            {WEEKDAYS.map((d) => (
              <option key={d} value={d}>
                {weekdayLabelLong(d)}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="h-10 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-indigo"
          >
            <option value="all">Ativas e inativas</option>
            <option value="active">Somente ativas</option>
            <option value="inactive">Somente inativas</option>
          </select>
        </div>

        {canManage ? (
          <button
            type="button"
            onClick={() => setDrawerTarget({ mode: 'create' })}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo px-4 text-sm font-semibold text-white shadow-xs transition hover:opacity-95"
          >
            <Plus size={16} />
            Nova saída
          </button>
        ) : null}
      </div>

      {/* Departure Rows */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white p-10 text-center">
          <Home size={32} className="mx-auto mb-2 text-muted" />
          <p className="text-base font-semibold text-ink">
            Nenhuma saída recorrente cadastrada
          </p>
          <p className="mt-1 text-sm text-muted">
            Configure os locais, dias, horários, dirigentes padrão e territórios permitidos da congregação.
          </p>
          {canManage ? (
            <button
              type="button"
              onClick={() => setDrawerTarget({ mode: 'create' })}
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-indigo px-4 text-sm font-semibold text-white"
            >
              <Plus size={16} />
              Cadastrar saída recorrente
            </button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const { summaryText, detailedTooltip } = summarizeAllowedByRegion(
              item.allowedTerritoryIds,
              territoriesById,
            )
            const isSunday = item.periodType === 'sunday'
            const displayTitle =
              isSunday && item.sundayGroupName
                ? item.sundayGroupName.toLowerCase().startsWith('grupo')
                  ? item.sundayGroupName
                  : `Grupo ${item.sundayGroupName}`
                : item.locationName

            return (
              <div
                key={item.id}
                className={`flex flex-col gap-4 rounded-2xl border border-line bg-white p-4 transition md:flex-row md:items-center md:justify-between ${
                  item.active ? '' : 'opacity-65'
                }`}
              >
                {/* Left: Icon + Title + Day/Time/Type */}
                <div className="flex min-w-0 items-center gap-3.5 md:w-[36%]">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-indigo-soft text-indigo">
                    {isSunday ? <Users size={20} /> : <Home size={20} />}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-semibold text-ink">
                        {displayTitle}
                      </h3>
                      {!item.active ? (
                        <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-semibold text-muted">
                          Inativa
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      {weekdayLabelShort(item.dayOfWeek)} • {item.startTime} •{' '}
                      {periodTypeLabel(item.periodType)}
                      {isSunday && item.sundayGroupName && item.locationName
                        ? ` • ${item.locationName}`
                        : ''}
                    </p>
                  </div>
                </div>

                {/* Middle: Conductors & Allowed Territories */}
                <div className="min-w-0 flex-1 space-y-1 text-xs">
                  <p className="truncate text-[#334155]">
                    <span className="font-medium text-muted">Dirigentes: </span>
                    <span className="font-medium text-ink">
                      {item.conductorNames.length > 0
                        ? item.conductorNames.join(', ')
                        : 'A definir'}
                    </span>
                  </p>
                  <p className="truncate text-[#334155]" title={detailedTooltip}>
                    <span className="font-medium text-muted">Territórios: </span>
                    <span className="font-medium text-ink">{summaryText}</span>
                  </p>
                </div>

                {/* Right: Active Switch & Menu */}
                <div className="relative flex shrink-0 items-center justify-end gap-3">
                  <ActiveSwitch
                    checked={item.active}
                    disabled={!canManage}
                    label={`Ativar ou desativar ${displayTitle}`}
                    onChange={(next) => void toggleRecurringDepartureActive(item.id, next)}
                  />

                  {canManage ? (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setOpenMenuId((curr) => (curr === item.id ? null : item.id))
                        }
                        className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-[#F3F5FB] hover:text-ink"
                        aria-label="Opções da saída"
                      >
                        <MoreVertical size={16} />
                      </button>

                      {openMenuId === item.id ? (
                        <div className="absolute top-10 right-0 z-30 w-44 rounded-xl border border-line bg-white p-1.5 shadow-lg">
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null)
                              setDrawerTarget({ mode: 'edit', record: item })
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-ink hover:bg-[#F8FAFC]"
                          >
                            <Pencil size={14} />
                            Editar saída
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null)
                              setDrawerTarget({ mode: 'duplicate', record: item })
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-ink hover:bg-[#F8FAFC]"
                          >
                            <Copy size={14} />
                            Duplicar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null)
                              setConfirmDeleteId(item.id)
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-[#DC2626] hover:bg-[#FEF2F2]"
                          >
                            <Trash2 size={14} />
                            Excluir
                          </button>
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </div>

                {confirmDeleteId === item.id ? (
                  <div className="flex w-full items-center justify-between rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-xs md:w-auto">
                    <span className="mr-3 font-medium text-[#991B1B]">
                      Excluir esta configuração recorrente?
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded-lg border border-line bg-white px-2.5 py-1 font-medium text-ink"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          setConfirmDeleteId(null)
                          await deleteRecurringDeparture(item.id)
                        }}
                        className="rounded-lg bg-[#DC2626] px-2.5 py-1 font-semibold text-white"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}

      {drawerTarget ? (
        <RecurringDepartureDrawer
          initialRecord={
            drawerTarget.mode === 'create'
              ? null
              : drawerTarget.mode === 'duplicate'
                ? { ...drawerTarget.record, id: '', meetingLocationId: '' }
                : drawerTarget.record
          }
          onClose={() => setDrawerTarget(null)}
        />
      ) : null}
        </>
      )}
    </div>
  )
}

export function RecurringDepartureDrawer({
  initialRecord,
  defaultDayOfWeek,
  onClose,
}: {
  initialRecord: RecurringDepartureRecord | null
  defaultDayOfWeek?: WeekdayKey
  onClose: () => void
}) {
  const {
    locations,
    territories,
    conductorOptions,
    sundayGroups,
    getDefaultConductorsFor,
    saveRecurringDeparture,
  } = useTerritories()

  const isEditing = Boolean(initialRecord?.id)

  const [periodType, setPeriodType] = useState<DeparturePeriodType>(
    initialRecord?.periodType ?? (defaultDayOfWeek === 'sunday' ? 'sunday' : 'morning'),
  )
  const [dayOfWeek, setDayOfWeek] = useState<WeekdayKey>(
    initialRecord?.dayOfWeek ?? defaultDayOfWeek ?? 'tuesday',
  )
  const [startTime, setStartTime] = useState(
    initialRecord?.startTime ?? (periodType === 'afternoon' ? '17:00' : '09:00'),
  )
  const [locationName, setLocationName] = useState(initialRecord?.locationName ?? '')
  const [address, setAddress] = useState(initialRecord?.address ?? '')
  const [sundayGroupId, setSundayGroupId] = useState<string>(
    initialRecord?.sundayGroupId ?? sundayGroups[0]?.id ?? '',
  )
  const [sundayGroupName, setSundayGroupName] = useState<string>(
    initialRecord?.sundayGroupName ?? sundayGroups[0]?.name ?? '',
  )
  const [conductorNames, setConductorNames] = useState<string[]>(() => {
    if (initialRecord?.conductorNames && initialRecord.conductorNames.length > 0) {
      return initialRecord.conductorNames
    }
    return getDefaultConductorsFor({
      preachingSessionId: initialRecord?.id ?? null,
      meetingLocationId: initialRecord?.meetingLocationId ?? null,
      locationName: initialRecord?.locationName ?? null,
      dayOfWeek: initialRecord?.dayOfWeek ?? defaultDayOfWeek ?? 'tuesday',
      groupId:
        (initialRecord?.periodType ?? (defaultDayOfWeek === 'sunday' ? 'sunday' : 'morning')) === 'sunday'
          ? (initialRecord?.sundayGroupId ?? sundayGroups[0]?.id ?? null)
          : null,
      groupName:
        (initialRecord?.periodType ?? (defaultDayOfWeek === 'sunday' ? 'sunday' : 'morning')) === 'sunday'
          ? (initialRecord?.sundayGroupName ?? sundayGroups[0]?.name ?? null)
          : null,
      allowedTerritoryIds: initialRecord?.allowedTerritoryIds,
    })
  })
  const [allowedIds, setAllowedIds] = useState<string[]>(
    initialRecord?.allowedTerritoryIds ?? [],
  )
  const [active, setActive] = useState<boolean>(initialRecord?.active ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const groupedTerritories = useMemo(() => {
    const map = new Map<string, TerritoryRecord[]>()
    for (const t of territories) {
      const list = map.get(t.regionName)
      if (list) list.push(t)
      else map.set(t.regionName, [t])
    }
    for (const list of map.values()) {
      list.sort((a, b) => compareTerritoryCodes(a.code, b.code))
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))
  }, [territories])

  const allowedSet = useMemo(() => new Set(allowedIds), [allowedIds])

  function handlePeriodChange(next: DeparturePeriodType) {
    setPeriodType(next)
    if (next === 'sunday') {
      setDayOfWeek('sunday')
      const targetGroup =
        sundayGroups.find((g) => g.name === sundayGroupName) ?? sundayGroups[0]
      if (!sundayGroupName && targetGroup) {
        setSundayGroupId(targetGroup.id)
        setSundayGroupName(targetGroup.name)
      }
      if (conductorNames.length === 0 && targetGroup) {
        const defaults = getDefaultConductorsFor({
          groupId: targetGroup.id,
          groupName: targetGroup.name,
          dayOfWeek: 'sunday',
          locationName,
        })
        if (defaults.length > 0) setConductorNames(defaults)
      }
    } else if (dayOfWeek === 'sunday') {
      setDayOfWeek('saturday')
    }
    if (next === 'afternoon' && startTime === '09:00') {
      setStartTime('17:00')
    } else if (next === 'morning' && startTime === '17:00') {
      setStartTime('09:00')
    }
  }

  function toggleTerritory(id: string) {
    setAllowedIds((curr) =>
      curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id],
    )
  }

  function toggleRegionAll(regionItems: TerritoryRecord[]) {
    const ids = regionItems.map((t) => t.id)
    const allChecked = ids.every((id) => allowedSet.has(id))
    if (allChecked) {
      const removeSet = new Set(ids)
      setAllowedIds((curr) => curr.filter((id) => !removeSet.has(id)))
    } else {
      setAllowedIds((curr) => [...new Set([...curr, ...ids])])
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!locationName.trim()) {
      setError('Informe o nome do local ou ponto de encontro.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const matchedLoc = locations.find(
        (l) => l.name.trim().toLowerCase() === locationName.trim().toLowerCase(),
      )
      await saveRecurringDeparture({
        id: initialRecord?.id || undefined,
        meetingLocationId: initialRecord?.meetingLocationId || matchedLoc?.id || null,
        locationName: locationName.trim(),
        address: address.trim(),
        dayOfWeek: periodType === 'sunday' ? 'sunday' : dayOfWeek,
        startTime: startTime.trim() || '09:00',
        periodType,
        sundayGroupId: periodType === 'sunday' ? sundayGroupId || null : null,
        sundayGroupName:
          periodType === 'sunday' ? sundayGroupName.trim() || null : null,
        conductorNames,
        allowedTerritoryIds: allowedIds,
        active,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar saída recorrente.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/25 backdrop-blur-[1px]">
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="flex h-full w-full max-w-lg flex-col border-l border-line bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-ink">
              {isEditing ? 'Editar saída recorrente' : 'Nova saída recorrente'}
            </h2>
            <p className="text-xs text-muted">
              Defina local, dia, horário, dirigentes padrão e territórios permitidos.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-[#F3F5FB]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {error ? (
            <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-xs text-[#B91C1C]">
              {error}
            </div>
          ) : null}

          {/* Period Type */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#334155]">
              Tipo da saída
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { key: 'morning', label: 'Manhã', icon: Sun },
                  { key: 'afternoon', label: 'Tarde', icon: Moon },
                  { key: 'sunday', label: 'Domingo', icon: Sunrise },
                ] as const
              ).map((opt) => {
                const Icon = opt.icon
                const selected = periodType === opt.key
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => handlePeriodChange(opt.key)}
                    className={`flex h-10 items-center justify-center gap-1.5 rounded-xl border text-xs font-semibold transition ${
                      selected
                        ? 'border-indigo bg-[#EEF2FF] text-indigo'
                        : 'border-line bg-white text-[#475569] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <Icon size={14} />
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Sunday Group when Sunday */}
          {periodType === 'sunday' ? (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#334155]">
                Grupo de domingo
              </label>
              {sundayGroups.length > 0 ? (
                <select
                  value={sundayGroupName}
                  onChange={(e) => {
                    const chosenName = e.target.value
                    setSundayGroupName(chosenName)
                    const g = sundayGroups.find((x) => x.name === chosenName)
                    setSundayGroupId(g?.id ?? '')
                    const defaults = getDefaultConductorsFor({
                      groupId: g?.id ?? null,
                      groupName: chosenName,
                      dayOfWeek: 'sunday',
                      locationName,
                    })
                    if (defaults.length > 0) {
                      setConductorNames(defaults)
                    }
                  }}
                  className="h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-indigo"
                >
                  <option value="">Selecionar grupo...</option>
                  {sundayGroups.map((g) => (
                    <option key={g.id} value={g.name}>
                      {g.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={sundayGroupName}
                  onChange={(e) => setSundayGroupName(e.target.value)}
                  placeholder="Ex.: Maria Antônia Prado"
                  className="h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-indigo"
                />
              )}
            </div>
          ) : null}

          {/* Location Name */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#334155]">
              Nome do local ou ponto de encontro
            </label>
            <input
              type="text"
              list="existing-meeting-locations"
              value={locationName}
              onChange={(e) => {
                const next = e.target.value
                setLocationName(next)
                const existing = locations.find(
                  (l) => l.name.toLowerCase() === next.trim().toLowerCase(),
                )
                if (existing) {
                  if (!address) setAddress(existing.address)
                  if (allowedIds.length === 0 && existing.allowedTerritoryIds.length > 0) {
                    setAllowedIds(existing.allowedTerritoryIds)
                  }
                  if (conductorNames.length === 0) {
                    const defaults = getDefaultConductorsFor({
                      meetingLocationId: existing.id,
                      locationName: existing.name,
                      dayOfWeek,
                      allowedTerritoryIds: existing.allowedTerritoryIds,
                    })
                    if (defaults.length > 0) setConductorNames(defaults)
                  }
                }
              }}
              placeholder="Ex.: Casa do irmão Paulo"
              className="h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-indigo"
            />
            <datalist id="existing-meeting-locations">
              {locations.map((l) => (
                <option key={l.id} value={l.name} />
              ))}
            </datalist>
          </div>

          {/* Weekday & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#334155]">
                Dia da semana
              </label>
              <select
                value={periodType === 'sunday' ? 'sunday' : dayOfWeek}
                disabled={periodType === 'sunday'}
                onChange={(e) => setDayOfWeek(e.target.value as WeekdayKey)}
                className="h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-indigo disabled:opacity-70"
              >
                {WEEKDAYS.map((d) => (
                  <option key={d} value={d}>
                    {weekdayLabelLong(d)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#334155]">
                Horário
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-indigo"
              />
            </div>
          </div>

          {/* Optional Address */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#334155]">
              Endereço / Referência (opcional)
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Rua, número ou complemento"
              className="h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-indigo"
            />
          </div>

          {/* Default Conductors */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#334155]">
              Dirigentes padrão
            </label>
            <ConductorsMultiSelect
              value={conductorNames}
              options={conductorOptions}
              onChange={setConductorNames}
              placeholder="Selecionar dirigentes padrão..."
            />
          </div>

          {/* Allowed Territories by Region */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-semibold text-[#334155]">
                Territórios permitidos ({allowedIds.length} selecionados)
              </label>
              {allowedIds.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setAllowedIds([])}
                  className="text-xs font-medium text-muted hover:text-ink"
                >
                  Limpar seleção
                </button>
              ) : null}
            </div>

            {groupedTerritories.length === 0 ? (
              <p className="rounded-xl border border-line bg-[#F8FAFC] p-3 text-xs text-muted">
                Cadastre os territórios na aba "Territórios" para vinculá-los a este local.
              </p>
            ) : (
              <div className="space-y-2.5">
                {groupedTerritories.map(([region, items]) => {
                  const selectedInRegion = items.filter((t) => allowedSet.has(t.id)).length
                  const allSelected = selectedInRegion === items.length && items.length > 0
                  return (
                    <div
                      key={region}
                      className="rounded-xl border border-line bg-[#F8FAFC] p-3"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-ink">
                          {region}{' '}
                          <span className="font-normal text-muted">
                            ({selectedInRegion}/{items.length})
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleRegionAll(items)}
                          className="text-[11px] font-semibold text-indigo hover:underline"
                        >
                          {allSelected ? 'Desmarcar região' : 'Selecionar todos'}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {items.map((t) => {
                          const checked = allowedSet.has(t.id)
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => toggleTerritory(t.id)}
                              className={`inline-flex h-7 min-w-[2.25rem] items-center justify-center rounded-full border px-2 text-xs font-semibold transition ${
                                checked
                                  ? 'border-indigo bg-indigo text-white'
                                  : 'border-line bg-white text-[#475569] hover:border-[#C7D2FE]'
                              }`}
                            >
                              {checked ? <Check size={11} className="mr-0.5" /> : null}
                              {t.code}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between rounded-xl border border-line bg-[#F8FAFC] px-3.5 py-3">
            <div>
              <p className="text-xs font-semibold text-ink">Saída ativa</p>
              <p className="text-[11px] text-muted">
                Alterações afetam os próximos planejamentos sem modificar designações já salvas.
              </p>
            </div>
            <ActiveSwitch checked={active} onChange={setActive} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-line px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-line bg-white px-4 text-sm font-medium text-ink hover:bg-[#F8FAFC]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-10 rounded-xl bg-indigo px-5 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar saída'}
          </button>
        </div>
      </form>
    </div>
  )
}
