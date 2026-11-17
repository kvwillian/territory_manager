import {
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Home,
  Save,
  Sun,
  Sunrise,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { isoFromDate } from '../../../domain/dates'
import { formatShortDayMonth } from '../status'
import { useTerritories } from '../store'
import type { RecurringDepartureRecord, TerritoryAssignmentRecord } from '../types'
import { ActiveSwitch, ConductorsMultiSelect } from './SharedPieces'

const MONTHS_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

export function listWeekendDatesForMonth(
  year: number,
  monthZeroBased: number,
): { saturdays: string[]; sundays: string[] } {
  const saturdays: string[] = []
  const sundays: string[] = []
  const cursor = new Date(year, monthZeroBased, 1, 12, 0, 0, 0)
  while (cursor.getMonth() === monthZeroBased) {
    const dow = cursor.getDay()
    if (dow === 6) saturdays.push(isoFromDate(cursor))
    else if (dow === 0) sundays.push(isoFromDate(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return { saturdays, sundays }
}

type SaturdayDraft = {
  assignmentId?: string
  startTime: string
  meetingLocationId: string | null
  locationName: string
  customLocation: boolean
  conductorNames: string[]
  notes: string
  dirty: boolean
}

type SundayGroupDraft = {
  recurringId?: string
  groupId: string
  groupName: string
  superintendentName: string | null
  startTime: string
  meetingLocationId: string | null
  locationName: string
  customLocation: boolean
  conductorNames: string[]
  active: boolean
  dirty: boolean
}

export function WeekendDeparturesTab({
  onOpenDateInPlanner,
}: {
  onOpenDateInPlanner: (isoDate: string) => void
}) {
  const {
    canManage,
    locations,
    recurringDepartures,
    assignments,
    conductorOptions,
    sundayGroups,
    saveAssignment,
    saveRecurringDeparture,
  } = useTerritories()

  const now = useMemo(() => new Date(), [])
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())

  const { saturdays, sundays } = useMemo(
    () => listWeekendDatesForMonth(selectedYear, selectedMonth),
    [selectedYear, selectedMonth],
  )

  const [saturdayDrafts, setSaturdayDrafts] = useState<Record<string, SaturdayDraft>>({})
  const [sundayGroupDrafts, setSundayGroupDrafts] = useState<Record<string, SundayGroupDraft>>({})
  const [savingSatIso, setSavingSatIso] = useState<string | null>(null)
  const [savingAllSats, setSavingAllSats] = useState(false)
  const [savingSunGroupId, setSavingSunGroupId] = useState<string | null>(null)
  const [savingAllSunGroups, setSavingAllSunGroups] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  function showToast(msg: string) {
    setToastMsg(msg)
    setTimeout(() => {
      setToastMsg((curr) => (curr === msg ? '' : curr))
    }, 3200)
  }

  // Hydrate Saturday drafts from saved assignments (or recurring Saturday template)
  useEffect(() => {
    const satRecurring = recurringDepartures.find((r) => r.active && r.dayOfWeek === 'saturday') ?? null

    setSaturdayDrafts((prev) => {
      const next: Record<string, SaturdayDraft> = {}
      for (const iso of saturdays) {
        if (prev[iso]?.dirty) {
          next[iso] = prev[iso]!
          continue
        }
        const saved = assignments.find((a) => a.isoDate === iso) ?? null
        const locId = saved?.meetingLocationId ?? satRecurring?.meetingLocationId ?? locations[0]?.id ?? null
        const locName = saved?.locationName ?? satRecurring?.locationName ?? locations[0]?.name ?? ''
        const matchesKnownLoc = Boolean(
          locId && locations.some((l) => l.id === locId),
        )
        next[iso] = {
          assignmentId: saved?.id,
          startTime: saved?.startTime ?? satRecurring?.startTime ?? '09:00',
          meetingLocationId: matchesKnownLoc ? locId : null,
          locationName: locName,
          customLocation: Boolean(locName && !matchesKnownLoc),
          conductorNames: saved?.conductorNames ?? [],
          notes: saved?.notes ?? '',
          dirty: false,
        }
      }
      return next
    })
  }, [saturdays, assignments, recurringDepartures, locations])

  // Hydrate Sunday group drafts from recurringDepartures + sundayGroups (defaulting conductors to SS!)
  useEffect(() => {
    setSundayGroupDrafts((prev) => {
      const next: Record<string, SundayGroupDraft> = {}
      for (const grp of sundayGroups) {
        if (prev[grp.id]?.dirty) {
          next[grp.id] = prev[grp.id]!
          continue
        }
        const rec: RecurringDepartureRecord | undefined = recurringDepartures.find(
          (r) =>
            r.dayOfWeek === 'sunday' &&
            (r.sundayGroupId === grp.id ||
              (r.sundayGroupName ?? '').trim().toLowerCase() === grp.name.trim().toLowerCase()),
        )
        const locId = rec?.meetingLocationId ?? locations[0]?.id ?? null
        const locName = rec?.locationName ?? locations[0]?.name ?? ''
        const matchesKnownLoc = Boolean(
          locId && locations.some((l) => l.id === locId),
        )
        const defaultConductors =
          rec && rec.conductorNames.length > 0
            ? rec.conductorNames
            : grp.superintendentName
              ? [grp.superintendentName]
              : []

        next[grp.id] = {
          recurringId: rec?.id && !rec.id.startsWith('loc-session:') ? rec.id : undefined,
          groupId: grp.id,
          groupName: grp.name,
          superintendentName: grp.superintendentName ?? null,
          startTime: rec?.startTime ?? '09:00',
          meetingLocationId: matchesKnownLoc ? locId : null,
          locationName: locName,
          customLocation: Boolean(locName && !matchesKnownLoc),
          conductorNames: defaultConductors,
          active: rec ? rec.active : true,
          dirty: false,
        }
      }
      return next
    })
  }, [sundayGroups, recurringDepartures, locations])

  function shiftMonth(delta: number) {
    const d = new Date(selectedYear, selectedMonth + delta, 1)
    setSelectedYear(d.getFullYear())
    setSelectedMonth(d.getMonth())
  }

  function updateSatDraft(iso: string, patch: Partial<SaturdayDraft>) {
    setSaturdayDrafts((curr) => {
      const existing = curr[iso]
      if (!existing) return curr
      return {
        ...curr,
        [iso]: { ...existing, ...patch, dirty: true },
      }
    })
  }

  function updateSunDraft(groupId: string, patch: Partial<SundayGroupDraft>) {
    setSundayGroupDrafts((curr) => {
      const existing = curr[groupId]
      if (!existing) return curr
      return {
        ...curr,
        [groupId]: { ...existing, ...patch, dirty: true },
      }
    })
  }

  async function persistSingleSaturday(iso: string) {
    if (!canManage) return
    const draft = saturdayDrafts[iso]
    if (!draft) return
    if (!draft.locationName.trim()) {
      setErrorMsg(`Informe o local da saída para o sábado ${formatShortDayMonth(iso)}.`)
      return
    }
    const existing: TerritoryAssignmentRecord | undefined = assignments.find((a) => a.isoDate === iso)
    setSavingSatIso(iso)
    setErrorMsg('')
    try {
      await saveAssignment({
        id: existing?.id ?? draft.assignmentId,
        isoDate: iso,
        status: existing?.status ?? 'draft',
        periodType: 'morning',
        startTime: draft.startTime || '09:00',
        meetingLocationId: draft.meetingLocationId,
        preachingSessionId: existing?.preachingSessionId ?? null,
        locationName: draft.locationName.trim(),
        groupId: null,
        groupName: null,
        conductorNames: draft.conductorNames,
        territoryIds: existing?.territoryIds ?? [],
        territorySnapshots: existing?.territorySnapshots ?? [],
        assignedSegmentsByTerritory: existing?.assignedSegmentsByTerritory ?? {},
        notes: draft.notes,
      })
      setSaturdayDrafts((curr) => ({
        ...curr,
        [iso]: { ...curr[iso]!, dirty: false },
      }))
      showToast(`Saída de sábado (${formatShortDayMonth(iso)}) salva!`)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao salvar saída de sábado.')
    } finally {
      setSavingSatIso(null)
    }
  }

  async function persistAllSaturdays() {
    if (!canManage) return
    setSavingAllSats(true)
    setErrorMsg('')
    let savedCount = 0
    try {
      for (const iso of saturdays) {
        const draft = saturdayDrafts[iso]
        if (!draft || !draft.locationName.trim()) continue
        const existing = assignments.find((a) => a.isoDate === iso)
        await saveAssignment({
          id: existing?.id ?? draft.assignmentId,
          isoDate: iso,
          status: existing?.status ?? 'draft',
          periodType: 'morning',
          startTime: draft.startTime || '09:00',
          meetingLocationId: draft.meetingLocationId,
          preachingSessionId: existing?.preachingSessionId ?? null,
          locationName: draft.locationName.trim(),
          groupId: null,
          groupName: null,
          conductorNames: draft.conductorNames,
          territoryIds: existing?.territoryIds ?? [],
          territorySnapshots: existing?.territorySnapshots ?? [],
          assignedSegmentsByTerritory: existing?.assignedSegmentsByTerritory ?? {},
          notes: draft.notes,
        })
        savedCount += 1
      }
      setSaturdayDrafts((curr) => {
        const next = { ...curr }
        for (const iso of Object.keys(next)) {
          next[iso] = { ...next[iso]!, dirty: false }
        }
        return next
      })
      showToast(`${savedCount} sábado(s) do mês salvos com sucesso!`)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao salvar os sábados do mês.')
    } finally {
      setSavingAllSats(false)
    }
  }

  async function persistSingleSundayGroup(groupId: string) {
    if (!canManage) return
    const draft = sundayGroupDrafts[groupId]
    if (!draft) return
    if (!draft.locationName.trim()) {
      setErrorMsg(`Informe o local de saída para o grupo "${draft.groupName}".`)
      return
    }
    const locObj = draft.meetingLocationId
      ? locations.find((l) => l.id === draft.meetingLocationId)
      : locations.find((l) => l.name.trim().toLowerCase() === draft.locationName.trim().toLowerCase())

    setSavingSunGroupId(groupId)
    setErrorMsg('')
    try {
      await saveRecurringDeparture({
        id: draft.recurringId,
        meetingLocationId: locObj?.id ?? draft.meetingLocationId,
        locationName: draft.locationName.trim(),
        address: locObj?.address ?? '',
        dayOfWeek: 'sunday',
        startTime: draft.startTime || '09:00',
        periodType: 'sunday',
        sundayGroupId: draft.groupId,
        sundayGroupName: draft.groupName,
        conductorNames: draft.conductorNames,
        allowedTerritoryIds: locObj?.allowedTerritoryIds ?? [],
        active: draft.active,
      })
      setSundayGroupDrafts((curr) => ({
        ...curr,
        [groupId]: { ...curr[groupId]!, dirty: false },
      }))
      showToast(`Saída de domingo do grupo ${draft.groupName} salva!`)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao salvar saída de domingo do grupo.')
    } finally {
      setSavingSunGroupId(null)
    }
  }

  async function persistAllSundayGroups() {
    if (!canManage) return
    setSavingAllSunGroups(true)
    setErrorMsg('')
    let savedCount = 0
    try {
      for (const grp of sundayGroups) {
        const draft = sundayGroupDrafts[grp.id]
        if (!draft || !draft.locationName.trim()) continue
        const locObj = draft.meetingLocationId
          ? locations.find((l) => l.id === draft.meetingLocationId)
          : locations.find((l) => l.name.trim().toLowerCase() === draft.locationName.trim().toLowerCase())
        await saveRecurringDeparture({
          id: draft.recurringId,
          meetingLocationId: locObj?.id ?? draft.meetingLocationId,
          locationName: draft.locationName.trim(),
          address: locObj?.address ?? '',
          dayOfWeek: 'sunday',
          startTime: draft.startTime || '09:00',
          periodType: 'sunday',
          sundayGroupId: draft.groupId,
          sundayGroupName: draft.groupName,
          conductorNames: draft.conductorNames,
          allowedTerritoryIds: locObj?.allowedTerritoryIds ?? [],
          active: draft.active,
        })
        savedCount += 1
      }
      setSundayGroupDrafts((curr) => {
        const next = { ...curr }
        for (const gid of Object.keys(next)) {
          next[gid] = { ...next[gid]!, dirty: false }
        }
        return next
      })
      showToast(`${savedCount} grupo(s) de domingo salvos com sucesso!`)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao salvar grupos de domingo.')
    } finally {
      setSavingAllSunGroups(false)
    }
  }

  const monthHeading = `${MONTHS_PT[selectedMonth] ?? ''} de ${selectedYear}`

  return (
    <div className="space-y-5">
      {/* Month Selector Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4">
        <div>
          <h2 className="text-base font-bold text-ink">
            Configuração mensal de Sábados e Domingos
          </h2>
          <p className="text-xs text-muted">
            Defina todos os sábados do mês (congregação toda) e os locais e dirigentes (SS) de cada grupo aos domingos.
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-white text-ink hover:bg-[#F8FAFC]"
            aria-label="Mês anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="inline-flex h-9 items-center gap-2 rounded-xl border border-line bg-[#F8FAFC] px-3.5 text-xs font-semibold text-ink sm:text-sm">
            <Calendar size={15} className="text-indigo" />
            {monthHeading}
          </div>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-white text-ink hover:bg-[#F8FAFC]"
            aria-label="Próximo mês"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {toastMsg ? (
        <div className="flex items-center gap-2 rounded-xl border border-[#BBF7D0] bg-[#ECFDF5] px-4 py-2.5 text-xs font-semibold text-[#166534]">
          <CheckCircle2 size={15} />
          {toastMsg}
        </div>
      ) : null}

      {errorMsg ? (
        <div className="flex items-center gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-2.5 text-xs font-medium text-[#B91C1C]">
          <AlertTriangle size={15} />
          {errorMsg}
        </div>
      ) : null}

      {/* SECTION 1: Sábados do mês (Congregação toda) */}
      <section className="rounded-2xl border border-line bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#FEF3C7] text-[#B45309]">
              <Sun size={18} />
            </span>
            <div>
              <h3 className="text-base font-bold text-ink">
                Sábados de {monthHeading} ({saturdays.length})
              </h3>
              <p className="text-xs text-muted">
                Congregação toda — configure local, horário e dirigentes diferentes para cada sábado do mês.
              </p>
            </div>
          </div>

          {canManage && saturdays.length > 0 ? (
            <button
              type="button"
              disabled={savingAllSats}
              onClick={() => void persistAllSaturdays()}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-indigo px-4 text-xs font-semibold text-white shadow-xs hover:bg-indigo/90 disabled:opacity-50"
            >
              <Save size={14} />
              {savingAllSats ? 'Salvando sábados...' : 'Salvar todos os sábados'}
            </button>
          ) : null}
        </div>

        <div className="space-y-3">
          {saturdays.map((iso) => {
            const draft = saturdayDrafts[iso]
            if (!draft) return null
            const saved = assignments.find((a) => a.isoDate === iso)
            const statusLabel =
              saved?.status === 'assigned'
                ? 'Designado'
                : saved
                  ? 'Pré-configurado'
                  : 'Não salvo'

            return (
              <div
                key={iso}
                className="rounded-2xl border border-line bg-[#F8FAFC] p-4"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-ink border border-line">
                      <CalendarDays size={13} className="text-indigo" />
                      Sábado, {formatShortDayMonth(iso)}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        saved?.status === 'assigned'
                          ? 'bg-[#DCFCE7] text-[#166534]'
                          : saved
                            ? 'bg-[#EEF2FF] text-indigo'
                            : 'bg-[#F1F5F9] text-muted'
                      }`}
                    >
                      {statusLabel}
                    </span>
                    {draft.dirty ? (
                      <span className="rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-semibold text-[#92400E]">
                        Alterações pendentes
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenDateInPlanner(iso)}
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-line bg-white px-2.5 text-[11px] font-semibold text-indigo hover:bg-[#EEF2FF]"
                    >
                      Abrir em Designações
                      <ArrowUpRight size={12} />
                    </button>
                    {canManage ? (
                      <button
                        type="button"
                        disabled={savingSatIso === iso}
                        onClick={() => void persistSingleSaturday(iso)}
                        className="inline-flex h-8 items-center gap-1 rounded-lg bg-indigo px-3 text-[11px] font-semibold text-white hover:bg-indigo/90 disabled:opacity-50"
                      >
                        <Check size={12} />
                        {savingSatIso === iso ? 'Salvando...' : 'Salvar'}
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                  {/* Horário */}
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-[11px] font-medium text-muted">
                      Horário
                    </label>
                    <div className="relative">
                      <Clock
                        size={13}
                        className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted"
                      />
                      <input
                        type="time"
                        disabled={!canManage}
                        value={draft.startTime}
                        onChange={(e) => updateSatDraft(iso, { startTime: e.target.value })}
                        className="h-10 w-full rounded-xl border border-line bg-white pr-2 pl-8 text-xs font-medium text-ink outline-none focus:border-indigo"
                      />
                    </div>
                  </div>

                  {/* Local de saída */}
                  <div className="md:col-span-4">
                    <label className="mb-1 block text-[11px] font-medium text-muted">
                      Local de saída
                    </label>
                    {!draft.customLocation && locations.length > 0 ? (
                      <div className="relative">
                        <Home
                          size={13}
                          className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted"
                        />
                        <select
                          disabled={!canManage}
                          value={draft.meetingLocationId ?? '__custom__'}
                          onChange={(e) => {
                            const val = e.target.value
                            if (val === '__custom__') {
                              updateSatDraft(iso, {
                                customLocation: true,
                                meetingLocationId: null,
                                locationName: '',
                              })
                            } else {
                              const loc = locations.find((l) => l.id === val)
                              updateSatDraft(iso, {
                                customLocation: false,
                                meetingLocationId: loc?.id ?? null,
                                locationName: loc?.name ?? '',
                              })
                            }
                          }}
                          className="h-10 w-full rounded-xl border border-line bg-white pr-2 pl-8 text-xs font-medium text-ink outline-none focus:border-indigo"
                        >
                          {locations.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                              {loc.name}
                            </option>
                          ))}
                          <option value="__custom__">+ Digitar local personalizado...</option>
                        </select>
                      </div>
                    ) : (
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          disabled={!canManage}
                          value={draft.locationName}
                          onChange={(e) => updateSatDraft(iso, { locationName: e.target.value })}
                          placeholder="Ex.: Salão do Reino / Casa..."
                          className="h-10 flex-1 rounded-xl border border-line bg-white px-3 text-xs text-ink outline-none focus:border-indigo"
                        />
                        {locations.length > 0 ? (
                          <button
                            type="button"
                            onClick={() =>
                              updateSatDraft(iso, {
                                customLocation: false,
                                meetingLocationId: locations[0]?.id ?? null,
                                locationName: locations[0]?.name ?? '',
                              })
                            }
                            className="rounded-xl border border-line bg-white px-2.5 text-[11px] font-medium text-muted hover:text-ink"
                          >
                            Lista
                          </button>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {/* Dirigentes */}
                  <div className="md:col-span-6">
                    <label className="mb-1 block text-[11px] font-medium text-muted">
                      Dirigente(s)
                    </label>
                    <ConductorsMultiSelect
                      value={draft.conductorNames}
                      options={conductorOptions}
                      disabled={!canManage}
                      placeholder="Selecionar dirigentes deste sábado..."
                      onChange={(next) => updateSatDraft(iso, { conductorNames: next })}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* SECTION 2: Domingos por Grupo (Dirigente padrão = SS do grupo, local configurável) */}
      <section className="rounded-2xl border border-line bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#ECFDF5] text-[#047857]">
              <Sunrise size={18} />
            </span>
            <div>
              <h3 className="text-base font-bold text-ink">
                Domingos separados por grupo ({sundayGroups.length})
              </h3>
              <p className="text-xs text-muted">
                Os grupos são puxados automaticamente com o SS como dirigente padrão. Configure o local de saída e altere qualquer campo se precisar.
              </p>
            </div>
          </div>

          {canManage && sundayGroups.length > 0 ? (
            <button
              type="button"
              disabled={savingAllSunGroups}
              onClick={() => void persistAllSundayGroups()}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-indigo px-4 text-xs font-semibold text-white shadow-xs hover:bg-indigo/90 disabled:opacity-50"
            >
              <Save size={14} />
              {savingAllSunGroups ? 'Salvando grupos...' : 'Salvar todos os grupos'}
            </button>
          ) : null}
        </div>

        {sundayGroups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-[#F8FAFC] p-6 text-center text-xs text-muted">
            Nenhum grupo cadastrado ainda. Cadastre grupos na aba Publicadores → Grupos.
          </div>
        ) : (
          <div className="space-y-3">
            {sundayGroups.map((grp) => {
              const draft = sundayGroupDrafts[grp.id]
              if (!draft) return null
              return (
                <div
                  key={grp.id}
                  className="rounded-2xl border border-line bg-[#F8FAFC] p-4"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#A7F3D0] bg-[#ECFDF5] px-2.5 py-1 text-xs font-bold text-[#047857]">
                        <Users size={13} />
                        {grp.name}
                      </span>
                      {grp.superintendentName ? (
                        <span className="rounded-full border border-line bg-white px-2.5 py-0.5 text-[11px] font-medium text-ink">
                          SS: <strong>{grp.superintendentName}</strong>
                        </span>
                      ) : null}
                      {draft.dirty ? (
                        <span className="rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-semibold text-[#92400E]">
                          Alterações pendentes
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-xs text-muted">
                        <span>{draft.active ? 'Ativo' : 'Inativo'}</span>
                        <ActiveSwitch
                          checked={draft.active}
                          disabled={!canManage}
                          label={`Ativar saída de domingo para ${grp.name}`}
                          onChange={(next) => updateSunDraft(grp.id, { active: next })}
                        />
                      </div>

                      {canManage ? (
                        <button
                          type="button"
                          disabled={savingSunGroupId === grp.id}
                          onClick={() => void persistSingleSundayGroup(grp.id)}
                          className="inline-flex h-8 items-center gap-1 rounded-lg bg-indigo px-3 text-[11px] font-semibold text-white hover:bg-indigo/90 disabled:opacity-50"
                        >
                          <Check size={12} />
                          {savingSunGroupId === grp.id ? 'Salvando...' : 'Salvar grupo'}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                    {/* Horário */}
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-[11px] font-medium text-muted">
                        Horário
                      </label>
                      <div className="relative">
                        <Clock
                          size={13}
                          className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted"
                        />
                        <input
                          type="time"
                          disabled={!canManage}
                          value={draft.startTime}
                          onChange={(e) => updateSunDraft(grp.id, { startTime: e.target.value })}
                          className="h-10 w-full rounded-xl border border-line bg-white pr-2 pl-8 text-xs font-medium text-ink outline-none focus:border-indigo"
                        />
                      </div>
                    </div>

                    {/* Local de saída configurável */}
                    <div className="md:col-span-4">
                      <label className="mb-1 block text-[11px] font-medium text-muted">
                        Local de saída (configurável)
                      </label>
                      {!draft.customLocation && locations.length > 0 ? (
                        <div className="relative">
                          <Home
                            size={13}
                            className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted"
                          />
                          <select
                            disabled={!canManage}
                            value={draft.meetingLocationId ?? '__custom__'}
                            onChange={(e) => {
                              const val = e.target.value
                              if (val === '__custom__') {
                                updateSunDraft(grp.id, {
                                  customLocation: true,
                                  meetingLocationId: null,
                                  locationName: '',
                                })
                              } else {
                                const loc = locations.find((l) => l.id === val)
                                updateSunDraft(grp.id, {
                                  customLocation: false,
                                  meetingLocationId: loc?.id ?? null,
                                  locationName: loc?.name ?? '',
                                })
                              }
                            }}
                            className="h-10 w-full rounded-xl border border-line bg-white pr-2 pl-8 text-xs font-medium text-ink outline-none focus:border-indigo"
                          >
                            {locations.map((loc) => (
                              <option key={loc.id} value={loc.id}>
                                {loc.name}
                              </option>
                            ))}
                            <option value="__custom__">+ Digitar local personalizado...</option>
                          </select>
                        </div>
                      ) : (
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            disabled={!canManage}
                            value={draft.locationName}
                            onChange={(e) => updateSunDraft(grp.id, { locationName: e.target.value })}
                            placeholder="Ex.: Casa do irmão..."
                            className="h-10 flex-1 rounded-xl border border-line bg-white px-3 text-xs text-ink outline-none focus:border-indigo"
                          />
                          {locations.length > 0 ? (
                            <button
                              type="button"
                              onClick={() =>
                                updateSunDraft(grp.id, {
                                  customLocation: false,
                                  meetingLocationId: locations[0]?.id ?? null,
                                  locationName: locations[0]?.name ?? '',
                                })
                              }
                              className="rounded-xl border border-line bg-white px-2.5 text-[11px] font-medium text-muted hover:text-ink"
                            >
                              Lista
                            </button>
                          ) : null}
                        </div>
                      )}
                    </div>

                    {/* Dirigentes (SS pré-selecionado, editável) */}
                    <div className="md:col-span-6">
                      <label className="mb-1 block text-[11px] font-medium text-muted">
                        Dirigente(s) (padrão: SS do grupo)
                      </label>
                      <ConductorsMultiSelect
                        value={draft.conductorNames}
                        options={conductorOptions}
                        disabled={!canManage}
                        placeholder="Selecionar dirigentes..."
                        onChange={(next) => updateSunDraft(grp.id, { conductorNames: next })}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Quick links to the Sundays of this month in Designações */}
        {sundays.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3.5">
            <span className="text-xs font-medium text-muted">
              Domingos de {MONTHS_PT[selectedMonth]}:
            </span>
            {sundays.map((iso) => (
              <button
                key={iso}
                type="button"
                onClick={() => onOpenDateInPlanner(iso)}
                className="inline-flex items-center gap-1 rounded-lg border border-line bg-[#F8FAFC] px-2.5 py-1 text-xs font-semibold text-indigo hover:border-[#C7D2FE] hover:bg-[#EEF2FF]"
              >
                {formatShortDayMonth(iso)}
                <ArrowUpRight size={12} />
              </button>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  )
}
