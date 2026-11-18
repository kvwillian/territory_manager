import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Download,
  Eye,
  FileJson,
  History,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { addDays, isoFromDate } from '../../../domain/dates'
import { buildTerritoryHistoryCsv } from '../historyExportCsv'
import {
  buildTerritoryTimeline,
  formatFullDateBr,
  formatShortDayMonth,
  periodTypeLabel,
  weekdayKeyFromIso,
  weekdayLabelLong,
  weekdayLabelShort,
} from '../status'
import { useTerritories } from '../store'
import type { TerritoryAssignmentRecord, TerritoryRecord } from '../types'
import { buildTerritoryWhatsappMessage } from '../whatsapp'
import { HistoryImportModal } from './HistoryImportModal'
import { DeparturePeriodBadge } from './SharedPieces'

type PeriodPreset = '15d' | '30d' | '60d' | '90d' | 'all' | 'custom'

export function TerritoryHistoryTab({
  initialLocationFilter = '',
  onOpenDateInPlanner,
}: {
  initialLocationFilter?: string
  onOpenDateInPlanner?: (isoDate: string) => void
}) {
  const {
    canManage,
    regions,
    territories,
    segments,
    assignments,
    workSessions,
    resolveConductors,
    recordTerritoryExecution,
    clearHistory,
  } = useTerritories()

  const [historyView, setHistoryView] = useState<'timeline' | 'feedback'>('timeline')
  const [feedbackFilter, setFeedbackFilter] = useState<'pending' | 'all'>('pending')
  const [execDoneByKey, setExecDoneByKey] = useState<Record<string, string[]>>({})
  const [execPartialByKey, setExecPartialByKey] = useState<Record<string, boolean>>({})
  const [execCommentByKey, setExecCommentByKey] = useState<Record<string, string>>({})
  const [savingExecKey, setSavingExecKey] = useState<string | null>(null)
  const [feedbackBannerMsg, setFeedbackBannerMsg] = useState('')
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('30d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [locationFilter, setLocationFilter] = useState(initialLocationFilter)
  const [conductorFilter, setConductorFilter] = useState('')
  const [regionFilter, setRegionFilter] = useState('')
  const [territoryFilter, setTerritoryFilter] = useState('')
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [clearModalOpen, setClearModalOpen] = useState(false)
  const [clearWorkSessionsChecked, setClearWorkSessionsChecked] = useState(true)
  const [clearAssignmentsChecked, setClearAssignmentsChecked] = useState(false)
  const [resetSegmentsChecked, setResetSegmentsChecked] = useState(true)
  const [clearingBusy, setClearingBusy] = useState(false)
  const [clearBannerMsg, setClearBannerMsg] = useState('')
  const [clearErrorMsg, setClearErrorMsg] = useState('')

  useEffect(() => {
    if (initialLocationFilter) {
      setLocationFilter(initialLocationFilter)
    }
  }, [initialLocationFilter])

  const todayIso = useMemo(() => isoFromDate(new Date()), [])

  const territoriesById = useMemo(
    () => new Map(territories.map((t) => [t.id, t])),
    [territories],
  )

  const assignmentsById = useMemo(
    () => new Map(assignments.map((a) => [a.id, a])),
    [assignments],
  )

  const segmentsById = useMemo(
    () => new Map(segments.map((s) => [s.id, s])),
    [segments],
  )

  const workSessionsById = useMemo(
    () => new Map(workSessions.map((ws) => [ws.id, ws])),
    [workSessions],
  )

  const allHistory = useMemo(
    () =>
      buildTerritoryTimeline({
        assignments,
        workSessions,
        territoriesById,
      }),
    [assignments, workSessions, territoriesById],
  )

  // If all entries are older than 30 days (e.g. historical dataset), auto-widen nicely when initial load has 0 in 30d
  useEffect(() => {
    if (periodPreset === '30d' && allHistory.length > 0) {
      const minIso = addDays(todayIso, -30)
      const hasRecent = allHistory.some((h) => h.isoDate >= minIso)
      if (!hasRecent) {
        setPeriodPreset('all')
      }
    }
  }, [allHistory, periodPreset, todayIso])

  const uniqueLocations = useMemo(() => {
    const set = new Set<string>()
    for (const h of allHistory) {
      if (h.locationName.trim()) set.add(h.locationName.trim())
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [allHistory])

  const uniqueConductors = useMemo(() => {
    const set = new Set<string>()
    for (const h of allHistory) {
      for (const name of h.conductorNames) {
        if (name.trim()) set.add(name.trim())
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [allHistory])

  const filteredTerritoriesForDropdown = useMemo(() => {
    return territories.filter((t) => !regionFilter || t.regionName === regionFilter)
  }, [territories, regionFilter])

  const filteredRows = useMemo(() => {
    let minIso = ''
    let maxIso = ''
    if (periodPreset === '15d') minIso = addDays(todayIso, -15)
    else if (periodPreset === '30d') minIso = addDays(todayIso, -30)
    else if (periodPreset === '60d') minIso = addDays(todayIso, -60)
    else if (periodPreset === '90d') minIso = addDays(todayIso, -90)
    else if (periodPreset === 'custom') {
      minIso = customFrom
      maxIso = customTo
    }

    return allHistory.filter((entry) => {
      if (minIso && entry.isoDate < minIso) return false
      if (maxIso && entry.isoDate > maxIso) return false
      if (locationFilter && entry.locationName !== locationFilter) return false
      if (
        conductorFilter &&
        !entry.conductorNames.some((n) => n.toLowerCase() === conductorFilter.toLowerCase())
      ) {
        return false
      }
      if (regionFilter) {
        const matchesRegion = entry.territoryIds.some((tid) => {
          const live = territoriesById.get(tid)
          if (live?.regionName === regionFilter) return true
          const assignment = assignmentsById.get(entry.id)
          const snap = assignment?.territorySnapshots.find((s) => s.id === tid)
          return snap?.regionName === regionFilter
        })
        if (!matchesRegion) return false
      }
      if (territoryFilter) {
        if (!entry.territoryIds.includes(territoryFilter)) return false
      }
      return true
    })
  }, [
    allHistory,
    periodPreset,
    todayIso,
    customFrom,
    customTo,
    locationFilter,
    conductorFilter,
    regionFilter,
    territoryFilter,
    territoriesById,
    assignmentsById,
  ])

  const hasActiveFilters =
    Boolean(locationFilter) ||
    Boolean(conductorFilter) ||
    Boolean(regionFilter) ||
    Boolean(territoryFilter) ||
    periodPreset === 'custom'

  const selectedEntry = selectedEntryId
    ? (allHistory.find((e) => e.id === selectedEntryId) ?? null)
    : null
  const selectedAssignment: TerritoryAssignmentRecord | null =
    selectedEntry && selectedEntry.kind === 'assignment'
      ? (assignmentsById.get(selectedEntry.id) ?? null)
      : null

  async function handleConfirmClearHistory() {
    setClearingBusy(true)
    setClearErrorMsg('')
    try {
      const res = await clearHistory({
        clearWorkSessions: clearWorkSessionsChecked,
        clearAssignments: clearAssignmentsChecked,
        resetSegments: resetSegmentsChecked,
      })
      setClearModalOpen(false)
      setSelectedEntryId(null)
      setClearBannerMsg(
        `Histórico limpo com sucesso: ${res.deletedCount} registro(s) removido(s)${
          res.segmentsResetCount > 0
            ? ` e ${res.segmentsResetCount} segmento(s) redefinido(s)`
            : ''
        }.`,
      )
      setTimeout(() => setClearBannerMsg(''), 5000)
    } catch (err) {
      setClearErrorMsg(
        err instanceof Error && err.message
          ? err.message
          : 'Não foi possível limpar o histórico.',
      )
    } finally {
      setClearingBusy(false)
    }
  }

  function handleExportCsv() {
    const csv = buildTerritoryHistoryCsv({
      entries: filteredRows,
      territoriesById,
      segmentsById,
      assignmentsById,
      workSessionsById,
    })
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `historico_territorios_${todayIso}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  function feedbackKey(assignmentId: string, territoryId: string) {
    return `${assignmentId}::${territoryId}`
  }

  const finalizedAssignments = useMemo(() => {
    const sessionsByDateTerritory = new Set(
      workSessions.map((ws) => `${ws.isoDate}::${ws.territoryId}`),
    )
    return assignments
      .filter((a) => a.status === 'assigned' && a.territoryIds.length > 0)
      .map((a) => {
        const pendingCount = a.territoryIds.filter(
          (tid) => !sessionsByDateTerritory.has(`${a.isoDate}::${tid}`),
        ).length
        return {
          assignment: a,
          hasPending: pendingCount > 0,
          pendingCount,
        }
      })
      .sort((a, b) => {
        if (a.assignment.isoDate !== b.assignment.isoDate) {
          return b.assignment.isoDate.localeCompare(a.assignment.isoDate)
        }
        return b.assignment.startTime.localeCompare(a.assignment.startTime)
      })
  }, [assignments, workSessions])

  const pendingFeedbackCount = useMemo(
    () => finalizedAssignments.filter((item) => item.hasPending).length,
    [finalizedAssignments],
  )

  const visibleFeedbackAssignments = useMemo(
    () =>
      feedbackFilter === 'pending'
        ? finalizedAssignments.filter((item) => item.hasPending)
        : finalizedAssignments,
    [finalizedAssignments, feedbackFilter],
  )

  const workSessionByDateTerritory = useMemo(() => {
    const map = new Map<string, (typeof workSessions)[number]>()
    for (const ws of workSessions) {
      map.set(`${ws.isoDate}::${ws.territoryId}`, ws)
    }
    return map
  }, [workSessions])

  async function handleConfirmFeedback(
    assignment: TerritoryAssignmentRecord,
    territory: TerritoryRecord,
  ) {
    const key = feedbackKey(assignment.id, territory.id)
    const terrSegments = segments.filter((s) => s.territoryId === territory.id)
    const existingSession = workSessionByDateTerritory.get(
      `${assignment.isoDate}::${territory.id}`,
    )

    const defaultIds = existingSession
      ? existingSession.segmentsWorked
      : assignment.assignedSegmentsByTerritory?.[territory.id] &&
          assignment.assignedSegmentsByTerritory[territory.id].length > 0
        ? assignment.assignedSegmentsByTerritory[territory.id]
        : terrSegments.map((s) => s.id)

    const doneIds = execDoneByKey[key] ?? defaultIds
    const isPartial =
      execPartialByKey[key] ?? existingSession?.completionState === 'partial'
    const comment = (execCommentByKey[key] ?? existingSession?.notes ?? '').trim()

    const doneSet = new Set(doneIds)
    const pendingIds = terrSegments
      .filter((s) => !doneSet.has(s.id) && !doneSet.has(s.description))
      .map((s) => s.id)

    const completionState =
      isPartial || (terrSegments.length > 0 && pendingIds.length > 0)
        ? 'partial'
        : 'completed'

    const resolved = resolveConductors(assignment.conductorNames)

    setSavingExecKey(key)
    try {
      await recordTerritoryExecution({
        territoryId: territory.id,
        isoDate: assignment.isoDate,
        conductorName: assignment.conductorNames.join(', '),
        conductorUserId: resolved.userIds[0] ?? null,
        conductorPublisherId: resolved.publisherIds[0] ?? null,
        completedSegmentIds: doneIds,
        pendingSegmentIds: pendingIds,
        completionState,
        notes: comment,
        regionId: territory.regionId,
        regionName: territory.regionName,
        territoryCodeRaw: territory.code,
      })
      setFeedbackBannerMsg(
        `Retorno registrado para o território ${territory.code} em ${formatShortDayMonth(
          assignment.isoDate,
        )}.`,
      )
    } finally {
      setSavingExecKey(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Sub-tab Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-white px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setHistoryView('timeline')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
              historyView === 'timeline'
                ? 'bg-indigo text-white shadow-xs'
                : 'text-muted hover:bg-[#F8FAFC] hover:text-ink'
            }`}
          >
            <History size={14} />
            Linha do tempo
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                historyView === 'timeline'
                  ? 'bg-white/20 text-white'
                  : 'bg-[#F1F5F9] text-ink'
              }`}
            >
              {filteredRows.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setHistoryView('feedback')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
              historyView === 'feedback'
                ? 'bg-indigo text-white shadow-xs'
                : 'text-muted hover:bg-[#F8FAFC] hover:text-ink'
            }`}
          >
            <ClipboardCheck size={14} />
            Retorno do dirigente
            {pendingFeedbackCount > 0 ? (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  historyView === 'feedback'
                    ? 'bg-[#FEF08A] text-[#854D0E]'
                    : 'bg-[#FEF3C7] text-[#92400E]'
                }`}
              >
                {pendingFeedbackCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {clearBannerMsg ? (
        <div className="flex items-center justify-between rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 text-xs font-semibold text-[#166534]">
          <span>{clearBannerMsg}</span>
          <button type="button" onClick={() => setClearBannerMsg('')}>
            <X size={15} />
          </button>
        </div>
      ) : null}

      {feedbackBannerMsg ? (
        <div className="flex items-center justify-between rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 text-xs font-semibold text-[#166534]">
          <span>{feedbackBannerMsg}</span>
          <button type="button" onClick={() => setFeedbackBannerMsg('')}>
            <X size={15} />
          </button>
        </div>
      ) : null}

      {historyView === 'timeline' ? (
        <>
          {/* Filters Card */}
      <div className="rounded-2xl border border-line bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
          <div>
            <span className="text-xs font-semibold text-ink">
              Filtros de consulta ({filteredRows.length}{' '}
              {filteredRows.length === 1 ? 'registro' : 'registros'})
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canManage && allHistory.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setClearErrorMsg('')
                  setClearModalOpen(true)
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3.5 text-xs font-semibold text-[#B91C1C] transition hover:bg-[#FEE2E2]"
              >
                <Trash2 size={14} />
                Limpar histórico
              </button>
            ) : null}
            <button
              type="button"
              disabled={filteredRows.length === 0}
              onClick={handleExportCsv}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-white px-3.5 text-xs font-semibold text-ink transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={14} />
              Exportar CSV
            </button>
            <button
              type="button"
              onClick={() => setImportModalOpen(true)}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-indigo px-4 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo/90"
            >
              <FileJson size={15} />
              Importar histórico
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Período</label>
            <select
              value={periodPreset}
              onChange={(e) => setPeriodPreset(e.target.value as PeriodPreset)}
              className="h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-indigo"
            >
              <option value="15d">Últimos 15 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="60d">Últimos 60 dias</option>
              <option value="90d">Últimos 90 dias</option>
              <option value="all">Todo o período</option>
              <option value="custom">Período personalizado</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Local</label>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-indigo"
            >
              <option value="">Todos os locais</option>
              {uniqueLocations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Dirigente</label>
            <select
              value={conductorFilter}
              onChange={(e) => setConductorFilter(e.target.value)}
              className="h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-indigo"
            >
              <option value="">Todos</option>
              {uniqueConductors.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Região</label>
            <select
              value={regionFilter}
              onChange={(e) => {
                setRegionFilter(e.target.value)
                setTerritoryFilter('')
              }}
              className="h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-indigo"
            >
              <option value="">Todas as regiões</option>
              {regions.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Território</label>
            <select
              value={territoryFilter}
              onChange={(e) => setTerritoryFilter(e.target.value)}
              className="h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-indigo"
            >
              <option value="">Todos</option>
              {filteredTerritoriesForDropdown.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.code} — {t.regionName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {periodPreset === 'custom' ? (
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-muted">De:</label>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-9 rounded-xl border border-line bg-white px-3 text-xs text-ink outline-none focus:border-indigo"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-muted">Até:</label>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-9 rounded-xl border border-line bg-white px-3 text-xs text-ink outline-none focus:border-indigo"
              />
            </div>
          </div>
        ) : null}

        {hasActiveFilters ? (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setLocationFilter('')
                setConductorFilter('')
                setRegionFilter('')
                setTerritoryFilter('')
                setPeriodPreset('all')
                setCustomFrom('')
                setCustomTo('')
              }}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo hover:underline"
            >
              <RotateCcw size={13} />
              Limpar filtros
            </button>
          </div>
        ) : null}
      </div>

      {/* History Table */}
      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        {filteredRows.length === 0 ? (
          <div className="p-10 text-center">
            <History size={32} className="mx-auto mb-2 text-muted" />
            <p className="text-base font-semibold text-ink">
              Nenhuma designação encontrada no período
            </p>
            <p className="mt-1 text-sm text-muted">
              Ajuste os filtros acima ou salve designações na aba "Designações".
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-[#F8FAFC] text-xs font-semibold text-muted">
                  <th className="px-5 py-3">Data</th>
                  <th className="px-3 py-3">Dia</th>
                  <th className="px-3 py-3">Local da saída</th>
                  <th className="px-3 py-3">Dirigente(s)</th>
                  <th className="px-3 py-3">Territórios</th>
                  <th className="px-5 py-3 text-right">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredRows.map((row) => {
                  const dayKey = weekdayKeyFromIso(row.isoDate)
                  return (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedEntryId(row.id)}
                      className="cursor-pointer transition hover:bg-[#F8FAFC]"
                    >
                      <td className="px-5 py-3.5 font-medium whitespace-nowrap text-ink">
                        <span title={formatFullDateBr(row.isoDate)}>
                          {formatShortDayMonth(row.isoDate)}
                        </span>
                        <span className="ml-1.5 text-xs text-muted">
                          /{row.isoDate.slice(0, 4)}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 whitespace-nowrap text-[#475569]">
                        {weekdayLabelShort(dayKey)}
                      </td>
                      <td className="px-3 py-3.5 font-medium text-ink">
                        {row.locationName}
                      </td>
                      <td className="px-3 py-3.5 text-[#334155]">
                        {row.conductorNames.length > 0
                          ? row.conductorNames.join(', ')
                          : '—'}
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center rounded-full border border-[#C7D2FE] bg-[#EEF2FF] px-2.5 py-0.5 text-xs font-semibold text-[#4338CA]">
                            {row.territoryCodes.join(', ')}
                          </span>
                          {row.kind === 'workSession' ? (
                            row.completionState === 'partial' ? (
                              <span className="rounded-full bg-[#DBEAFE] px-2 py-0.5 text-[10px] font-semibold text-[#1E40AF]">
                                Parcial (parte)
                              </span>
                            ) : row.completionState === 'incomplete' ? (
                              <span className="rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-semibold text-[#92400E]">
                                Incompleto
                              </span>
                            ) : (
                              <span className="rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[10px] font-semibold text-[#166534]">
                                Trabalhado
                              </span>
                            )
                          ) : row.executedTerritoryIds.length > 0 ? (
                            <span className="rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[10px] font-semibold text-[#166534]">
                              Execução registrada
                            </span>
                          ) : (
                            <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-medium text-[#475569]">
                              Designado
                            </span>
                          )}
                          {row.periodType ? (
                            <span className="rounded-full bg-[#F8FAFC] px-2 py-0.5 text-[10px] font-medium text-muted">
                              {periodTypeLabel(row.periodType)}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedEntryId(row.id)
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-[#EEF2FF] hover:text-indigo"
                          aria-label="Ver detalhes da designação"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4">
            <div>
              <h3 className="text-sm font-semibold text-ink">
                Retorno do dirigente — O que foi feito no campo
              </h3>
              <p className="mt-0.5 text-xs text-muted">
                Registre os segmentos trabalhados e observações das saídas já finalizadas.
              </p>
            </div>

            <div className="inline-flex items-center gap-1 rounded-xl border border-line bg-[#F8FAFC] p-1 text-xs">
              <button
                type="button"
                onClick={() => setFeedbackFilter('pending')}
                className={`rounded-lg px-3 py-1.5 font-semibold transition ${
                  feedbackFilter === 'pending'
                    ? 'bg-white text-ink shadow-2xs'
                    : 'text-muted hover:text-ink'
                }`}
              >
                Pendentes ({pendingFeedbackCount})
              </button>
              <button
                type="button"
                onClick={() => setFeedbackFilter('all')}
                className={`rounded-lg px-3 py-1.5 font-semibold transition ${
                  feedbackFilter === 'all'
                    ? 'bg-white text-ink shadow-2xs'
                    : 'text-muted hover:text-ink'
                }`}
              >
                Todas ({finalizedAssignments.length})
              </button>
            </div>
          </div>

          {visibleFeedbackAssignments.length === 0 ? (
            <div className="rounded-2xl border border-line bg-white px-6 py-12 text-center">
              <CheckCircle2 size={28} className="mx-auto text-[#16A34A]" />
              <p className="mt-3 text-sm font-semibold text-ink">
                {feedbackFilter === 'pending'
                  ? 'Nenhuma designação pendente de retorno'
                  : 'Nenhuma designação finalizada encontrada'}
              </p>
              <p className="mt-1 text-xs text-muted">
                {feedbackFilter === 'pending'
                  ? 'Todas as saídas finalizadas já tiveram o retorno registrado.'
                  : 'Finalize uma saída na aba Designações para registrar o retorno aqui.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleFeedbackAssignments.map(({ assignment }) => (
                <div
                  key={assignment.id}
                  className="rounded-2xl border border-line bg-white p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-ink">
                        {formatFullDateBr(assignment.isoDate)}
                      </span>
                      <DeparturePeriodBadge periodType={assignment.periodType} />
                      <span className="rounded-full border border-line bg-[#F8FAFC] px-2.5 py-0.5 text-xs font-medium text-ink">
                        {assignment.locationName} • {assignment.startTime}
                      </span>
                      {assignment.groupName ? (
                        <span className="rounded-full border border-[#C7D2FE] bg-[#EEF2FF] px-2.5 py-0.5 text-xs font-semibold text-[#4338CA]">
                          {assignment.groupName}
                        </span>
                      ) : null}
                    </div>
                    <span className="text-xs font-medium text-muted">
                      Dirigentes:{' '}
                      <strong className="text-ink">
                        {assignment.conductorNames.length > 0
                          ? assignment.conductorNames.join(', ')
                          : 'Não definido'}
                      </strong>
                    </span>
                  </div>

                  <div className="mt-3 space-y-3">
                    {assignment.territoryIds.map((tid) => {
                      const t = territoriesById.get(tid)
                      if (!t) return null
                      const key = feedbackKey(assignment.id, t.id)
                      const terrSegments = segments.filter((s) => s.territoryId === t.id)
                      const existingSession = workSessionByDateTerritory.get(
                        `${assignment.isoDate}::${t.id}`,
                      )

                      const defaultIds = existingSession
                        ? existingSession.segmentsWorked
                        : assignment.assignedSegmentsByTerritory?.[t.id] &&
                            assignment.assignedSegmentsByTerritory[t.id].length > 0
                          ? assignment.assignedSegmentsByTerritory[t.id]
                          : terrSegments.map((s) => s.id)

                      const doneIds = execDoneByKey[key] ?? defaultIds
                      const doneSet = new Set(doneIds)
                      const isPartial =
                        execPartialByKey[key] ??
                        existingSession?.completionState === 'partial'
                      const comment =
                        execCommentByKey[key] ?? existingSession?.notes ?? ''

                      return (
                        <div
                          key={t.id}
                          className="rounded-xl border border-line bg-[#F8FAFC] p-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1 rounded-full border border-[#C7D2FE] bg-[#EEF2FF] px-2.5 py-0.5 text-xs font-bold text-[#4338CA]">
                                {t.code}
                                <span className="font-normal text-[#6366F1]">
                                  ({t.regionName})
                                </span>
                              </span>

                              {existingSession ? (
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                    existingSession.completionState === 'partial'
                                      ? 'bg-[#FEF3C7] text-[#92400E]'
                                      : 'bg-[#DCFCE7] text-[#166534]'
                                  }`}
                                >
                                  {existingSession.completionState === 'partial'
                                    ? 'Registrado (Parcial)'
                                    : 'Registrado (Concluído)'}
                                </span>
                              ) : (
                                <span className="rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-semibold text-[#92400E]">
                                  Aguardando retorno
                                </span>
                              )}
                            </div>

                            <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-[#1E40AF]">
                              <input
                                type="checkbox"
                                disabled={!canManage}
                                checked={isPartial}
                                onChange={(e) =>
                                  setExecPartialByKey((prev) => ({
                                    ...prev,
                                    [key]: e.target.checked,
                                  }))
                                }
                                className="h-3.5 w-3.5 accent-indigo"
                              />
                              Feito pela metade / parcial
                            </label>
                          </div>

                          {terrSegments.length > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {terrSegments.map((seg) => {
                                const isDone =
                                  doneSet.has(seg.id) || doneSet.has(seg.description)
                                return (
                                  <label
                                    key={seg.id}
                                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                                      isDone
                                        ? 'border-[#86EFAC] bg-[#DCFCE7] text-[#166534]'
                                        : 'border-line bg-white text-muted'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      disabled={!canManage}
                                      checked={isDone}
                                      onChange={(e) => {
                                        const checked = e.target.checked
                                        setExecDoneByKey((prev) => {
                                          const base = prev[key] ?? defaultIds
                                          return {
                                            ...prev,
                                            [key]: checked
                                              ? [...new Set([...base, seg.id])]
                                              : base.filter(
                                                  (id) =>
                                                    id !== seg.id && id !== seg.description,
                                                ),
                                          }
                                        })
                                      }}
                                      className="h-3.5 w-3.5 accent-[#16A34A]"
                                    />
                                    <span>{seg.description}</span>
                                  </label>
                                )
                              })}
                            </div>
                          ) : null}

                          <div className="mt-2.5 flex flex-col gap-2 sm:flex-row">
                            <input
                              type="text"
                              disabled={!canManage}
                              value={comment}
                              onChange={(e) =>
                                setExecCommentByKey((prev) => ({
                                  ...prev,
                                  [key]: e.target.value,
                                }))
                              }
                              placeholder={`Comentário (ex.: fizemos ${t.code}A e ${t.code}B; ${t.code}B ficou pela metade)`}
                              className="h-8 flex-1 rounded-lg border border-line bg-white px-2.5 text-xs text-ink outline-none focus:border-indigo disabled:bg-[#F1F5F9]"
                            />
                            {canManage ? (
                              <button
                                type="button"
                                disabled={savingExecKey === key}
                                onClick={() => void handleConfirmFeedback(assignment, t)}
                                className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-lg bg-[#16A34A] px-3 text-xs font-semibold text-white hover:bg-[#15803D] disabled:opacity-50"
                              >
                                <Check size={13} />
                                {savingExecKey === key
                                  ? 'Salvando...'
                                  : existingSession
                                    ? 'Atualizar retorno'
                                    : 'Confirmar feito'}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Details Drawer */}
      {selectedEntry ? (
        <HistoryDetailDrawer
          entry={selectedEntry}
          assignment={selectedAssignment}
          territoriesById={territoriesById}
          onClose={() => setSelectedEntryId(null)}
          onOpenDateInPlanner={onOpenDateInPlanner}
        />
      ) : null}

      {/* JSON History Import Modal */}
      {importModalOpen ? (
        <HistoryImportModal
          onClose={() => setImportModalOpen(false)}
          onImportedSuccess={() => setPeriodPreset('all')}
        />
      ) : null}

      {/* Clear History Confirmation Modal */}
      {clearModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-line bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#FEF2F2] text-[#DC2626]">
                  <AlertTriangle size={18} />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-ink">Limpar histórico</h3>
                  <p className="text-[11px] text-muted">
                    Escolha quais registros do histórico deseja remover.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setClearModalOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-[#F3F5FB]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 p-6 text-xs">
              {clearErrorMsg ? (
                <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3 text-[#991B1B]">
                  {clearErrorMsg}
                </div>
              ) : null}

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-[#F8FAFC] p-3.5">
                <input
                  type="checkbox"
                  checked={clearWorkSessionsChecked}
                  onChange={(e) => setClearWorkSessionsChecked(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#DC2626]"
                />
                <div>
                  <span className="block font-semibold text-ink">
                    Sessões de execução / histórico importado ({workSessions.length})
                  </span>
                  <span className="mt-0.5 block text-muted">
                    Remove os registros de trabalho em campo (<code className="font-mono">workSessions</code>).
                  </span>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-[#F8FAFC] p-3.5">
                <input
                  type="checkbox"
                  checked={resetSegmentsChecked}
                  onChange={(e) => setResetSegmentsChecked(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#DC2626]"
                />
                <div>
                  <span className="block font-semibold text-ink">
                    Redefinir progresso dos segmentos para pendente
                  </span>
                  <span className="mt-0.5 block text-muted">
                    Marca os segmentos dos territórios novamente como disponíveis/pendentes.
                  </span>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-[#F8FAFC] p-3.5">
                <input
                  type="checkbox"
                  checked={clearAssignmentsChecked}
                  onChange={(e) => setClearAssignmentsChecked(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#DC2626]"
                />
                <div>
                  <span className="block font-semibold text-ink">
                    Designações salvas ({assignments.length})
                  </span>
                  <span className="mt-0.5 block text-muted">
                    Remove também as saídas planejadas na aba Designações (<code className="font-mono">assignments</code>).
                  </span>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-line bg-[#F8FAFC] px-6 py-4">
              <button
                type="button"
                disabled={clearingBusy}
                onClick={() => setClearModalOpen(false)}
                className="h-9 rounded-xl border border-line bg-white px-4 text-xs font-semibold text-ink hover:bg-[#F1F5F9]"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={
                  clearingBusy ||
                  (!clearWorkSessionsChecked &&
                    !clearAssignmentsChecked &&
                    !resetSegmentsChecked)
                }
                onClick={() => void handleConfirmClearHistory()}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#DC2626] px-4 text-xs font-semibold text-white hover:bg-[#B91C1C] disabled:opacity-50"
              >
                <Trash2 size={14} />
                {clearingBusy ? 'Limpando...' : 'Confirmar limpeza'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function HistoryDetailDrawer({
  entry,
  assignment,
  territoriesById,
  onClose,
  onOpenDateInPlanner,
}: {
  entry: ReturnType<typeof buildTerritoryTimeline>[number]
  assignment: TerritoryAssignmentRecord | null
  territoriesById: Map<string, { code: string; regionName: string }>
  onClose: () => void
  onOpenDateInPlanner?: (isoDate: string) => void
}) {
  const [copied, setCopied] = useState(false)
  const dayKey = weekdayKeyFromIso(entry.isoDate)

  const whatsappPreview = useMemo(() => {
    const periodType = assignment?.periodType ?? entry.periodType ?? 'morning'
    return buildTerritoryWhatsappMessage({
      isoDate: entry.isoDate,
      periodType,
      startTime: assignment?.startTime ?? '09:00',
      locationName: entry.locationName,
      groupName: assignment?.groupName,
      conductorNames: entry.conductorNames,
      territoryCodes: entry.territoryCodes,
    })
  }, [assignment, entry])

  async function copyMessage() {
    await navigator.clipboard.writeText(whatsappPreview)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/25 backdrop-blur-[1px]">
      <div className="flex h-full w-full max-w-md flex-col border-l border-line bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-ink">Detalhes da saída</h2>
            <p className="text-xs text-muted">
              {weekdayLabelLong(dayKey)}, {formatFullDateBr(entry.isoDate)}
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

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5 text-sm">
          <div className="flex items-center justify-between">
            {entry.periodType ? (
              <DeparturePeriodBadge periodType={entry.periodType} />
            ) : (
              <span className="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-xs font-medium text-[#475569]">
                Sessão registrada no aplicativo
              </span>
            )}
            {assignment?.startTime ? (
              <span className="text-xs font-semibold text-[#475569]">
                Horário: {assignment.startTime}
              </span>
            ) : null}
          </div>

          <div className="space-y-3 rounded-2xl border border-line bg-[#F8FAFC] p-4 text-xs">
            <div>
              <span className="block text-muted">Local da saída</span>
              <span className="mt-0.5 block text-sm font-semibold text-ink">
                {entry.locationName}
              </span>
            </div>

            {assignment?.groupName ? (
              <div>
                <span className="block text-muted">Grupo de domingo</span>
                <span className="mt-0.5 block font-semibold text-ink">
                  {assignment.groupName}
                </span>
              </div>
            ) : null}

            <div>
              <span className="block text-muted">Dirigentes</span>
              <span className="mt-0.5 block font-semibold text-ink">
                {entry.conductorNames.length > 0
                  ? entry.conductorNames.join(', ')
                  : 'Não informado'}
              </span>
            </div>

            <div>
              <span className="mb-1.5 block text-muted">
                {entry.kind === 'workSession' ? 'Territórios trabalhados' : 'Territórios designados'}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {entry.territoryIds.map((tid, idx) => {
                  const snap = assignment?.territorySnapshots.find((s) => s.id === tid)
                  const live = territoriesById.get(tid)
                  const code = snap?.code ?? entry.territoryCodes[idx] ?? live?.code ?? tid
                  const region = snap?.regionName ?? live?.regionName ?? ''
                  const wasExecuted = entry.executedTerritoryIds.includes(tid)
                  return (
                    <span
                      key={`${tid}-${idx}`}
                      className="inline-flex items-center gap-1 rounded-full border border-[#C7D2FE] bg-[#EEF2FF] px-2.5 py-1 text-xs font-semibold text-[#4338CA]"
                    >
                      {code}
                      {region ? (
                        <span className="font-normal text-[#6366F1]">({region})</span>
                      ) : null}
                      {entry.kind === 'assignment' ? (
                        <span
                          className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
                            wasExecuted
                              ? 'bg-[#DCFCE7] text-[#166534]'
                              : 'bg-white/80 text-[#475569]'
                          }`}
                        >
                          {wasExecuted ? 'Trabalhado' : 'Designado'}
                        </span>
                      ) : null}
                    </span>
                  )
                })}
              </div>
            </div>

            {entry.kind === 'workSession' && entry.completionState ? (
              <div>
                <span className="block text-muted">Estado de conclusão</span>
                <span
                  className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    entry.completionState === 'partial'
                      ? 'bg-[#DBEAFE] text-[#1E40AF]'
                      : entry.completionState === 'incomplete'
                        ? 'bg-[#FEF3C7] text-[#92400E]'
                        : 'bg-[#DCFCE7] text-[#166534]'
                  }`}
                >
                  {entry.completionState === 'partial'
                    ? 'Trabalho parcial (parte)'
                    : entry.completionState === 'incomplete'
                      ? 'Território não concluído (Incompleto)'
                      : 'Concluído'}
                </span>
              </div>
            ) : null}

            {entry.territoryCodeRaw ? (
              <div>
                <span className="block text-muted">Anotação do território na lista</span>
                <span className="mt-0.5 block font-mono font-semibold text-ink">
                  {entry.territoryCodeRaw}
                </span>
              </div>
            ) : null}

            {entry.dateEndIso || entry.dateNote ? (
              <div>
                <span className="block text-muted">Intervalo de datas</span>
                {entry.dateEndIso ? (
                  <p className="mt-0.5 font-semibold text-ink">
                    {formatFullDateBr(entry.isoDate)} até {formatFullDateBr(entry.dateEndIso)}
                  </p>
                ) : null}
                {entry.dateNote ? (
                  <p className="mt-0.5 text-muted">{entry.dateNote}</p>
                ) : null}
              </div>
            ) : null}

            {entry.notes ? (
              <div>
                <span className="block text-muted">Observações</span>
                <p className="mt-0.5 text-ink">{entry.notes}</p>
              </div>
            ) : null}

            {entry.raw ? (
              <div>
                <span className="block text-muted">Registro original (raw)</span>
                <p className="mt-1 rounded-xl border border-line bg-white px-3 py-2 font-mono text-xs text-[#334155]">
                  {entry.raw}
                </p>
              </div>
            ) : null}
          </div>

          {entry.kind === 'assignment' ? (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-[#334155]">
                  Mensagem de WhatsApp desta designação
                </span>
                <button
                  type="button"
                  onClick={() => void copyMessage()}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo hover:underline"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? 'Copiada!' : 'Copiar'}
                </button>
              </div>
              <div className="rounded-xl border border-line bg-[#F8FAFC] p-3.5 whitespace-pre-line text-xs leading-relaxed text-ink">
                {whatsappPreview}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t border-line px-6 py-4">
          {onOpenDateInPlanner ? (
            <button
              type="button"
              onClick={() => {
                onClose()
                onOpenDateInPlanner(entry.isoDate)
              }}
              className="text-xs font-semibold text-indigo hover:underline"
            >
              Abrir data em Designações ({periodTypeLabel(entry.periodType ?? 'morning')})
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-xl border border-line bg-white px-4 text-xs font-semibold text-ink hover:bg-[#F8FAFC]"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
