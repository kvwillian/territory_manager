import {
  AlertTriangle,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Circle,
  Clock,
  Copy,
  History,
  Home,
  Image as ImageIcon,
  Info,
  Map as MapIcon,
  MessageCircle,
  Minus,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { addDays, headingDate, isoFromDate, weekStart } from '../../../domain/dates'
import {
  buildTerritoryTimeline,
  compareTerritoryCodes,
  computeTerritoryStatuses,
  formatShortDayMonth,
  weekdayKeyFromIso,
  weekdayLabelLong,
  weekdayLabelShort,
} from '../status'
import { useTerritories } from '../store'
import { defaultVolumeForDeparture, suggestTerritories } from '../suggestions'
import type {
  DayPlanningStatus,
  DeparturePeriodType,
  RecurringDepartureRecord,
  TerritoryAssignmentRecord,
  TerritoryRecord,
  TerritorySnapshotItem,
} from '../types'
import {
  buildTerritoryWhatsappMessage,
  buildWhatsappShareUrl,
  formatPortugueseList,
} from '../whatsapp'
import { RecurringDepartureDrawer } from './DepartureLocationsTab'
import {
  ConductorsMultiSelect,
  DeparturePeriodBadge,
  TerritoryMapLightbox,
  TerritoryPill,
  TerritoryStatusLegend,
} from './SharedPieces'

const MONTHS_PT_LONG = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

function formatWeekBannerTitle(isoDate: string): string {
  const monday = weekStart(isoDate)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const d1 = String(monday.getDate()).padStart(2, '0')
  const d2 = String(sunday.getDate()).padStart(2, '0')
  const m1 = MONTHS_PT_LONG[monday.getMonth()] ?? ''
  const m2 = MONTHS_PT_LONG[sunday.getMonth()] ?? ''
  const y2 = sunday.getFullYear()

  if (monday.getMonth() === sunday.getMonth()) {
    return `Semana de ${d1} a ${d2} de ${m1} de ${y2}`
  }
  return `Semana de ${d1} de ${m1} a ${d2} de ${m2} de ${y2}`
}

type DaySlotSource = {
  slotKey: string
  savedAssignment: TerritoryAssignmentRecord | null
  recurringTemplate: RecurringDepartureRecord | null
  periodType: DeparturePeriodType
  startTime: string
  meetingLocationId: string | null
  preachingSessionId: string | null
  locationName: string
  groupId: string | null
  groupName: string | null
  conductorNames: string[]
  territoryIds: string[]
  notes: string
}

export function AssignmentsTab({
  externalIsoDate,
  onClearExternalIsoDate,
  onNavigateToHistory,
}: {
  externalIsoDate?: string | null
  onClearExternalIsoDate?: () => void
  onNavigateToHistory: (locationName?: string) => void
}) {
  const {
    canManage,
    territories,
    segments,
    locations,
    recurringDepartures,
    assignments,
    workSessions,
    conductorOptions,
    sundayGroups,
    getDefaultConductorsFor,
    saveAssignment,
    deleteAssignment,
  } = useTerritories()

  const todayIso = useMemo(() => isoFromDate(new Date()), [])
  const [selectedIsoDate, setSelectedIsoDate] = useState(externalIsoDate || todayIso)
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(0)
  const [extraManualSlots, setExtraManualSlots] = useState<Record<string, number>>({})

  // Editable draft form state for the active slot
  const [periodType, setPeriodType] = useState<DeparturePeriodType>('morning')
  const [startTime, setStartTime] = useState('09:00')
  const [meetingLocationId, setMeetingLocationId] = useState<string | null>(null)
  const [preachingSessionId, setPreachingSessionId] = useState<string | null>(null)
  const [locationName, setLocationName] = useState('')
  const [customManualLocation, setCustomManualLocation] = useState(false)
  const [groupId, setGroupId] = useState<string | null>(null)
  const [groupName, setGroupName] = useState<string>('')
  const [conductorNames, setConductorNames] = useState<string[]>([])
  const [selectedTerritoryIds, setSelectedTerritoryIds] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [isDirty, setIsDirty] = useState(false)

  // Suggestion controls
  const [requestedVolume, setRequestedVolume] = useState<number | undefined>(undefined)
  const [variationIndex, setVariationIndex] = useState(0)
  const [discardedExpanded, setDiscardedExpanded] = useState(false)
  const [manualHighlight, setManualHighlight] = useState(false)
  const availableCardRef = useRef<HTMLDivElement>(null)

  // Feedback & drawers
  const [savingMode, setSavingMode] = useState<'none' | 'draft' | 'assigned'>('none')
  const [toastMessage, setToastMessage] = useState('')
  const [errorBanner, setErrorBanner] = useState('')
  const [copiedWhatsapp, setCopiedWhatsapp] = useState(false)
  const [previewMapTerritory, setPreviewMapTerritory] = useState<TerritoryRecord | null>(null)
  const [editingRecurringDrawer, setEditingRecurringDrawer] = useState<{
    open: boolean
    record: RecurringDepartureRecord | null
  }>({ open: false, record: null })

  useEffect(() => {
    if (externalIsoDate) {
      setSelectedIsoDate(externalIsoDate)
      setSelectedSlotIndex(0)
      onClearExternalIsoDate?.()
    }
  }, [externalIsoDate, onClearExternalIsoDate])

  const territoriesById = useMemo(
    () => new Map(territories.map((t) => [t.id, t])),
    [territories],
  )

  // Compute the 7 days of the selected week (Monday -> Sunday)
  const weekDays = useMemo(() => {
    const monday = weekStart(selectedIsoDate)
    const mondayIso = isoFromDate(monday)
    return Array.from({ length: 7 }, (_, i) => {
      const iso = addDays(mondayIso, i)
      const dayKey = weekdayKeyFromIso(iso)
      const savedForDay = assignments.filter((a) => a.isoDate === iso)

      let status: DayPlanningStatus = 'unplanned'
      if (iso === selectedIsoDate && isDirty) {
        status = 'draft'
      } else if (savedForDay.some((a) => a.status === 'draft')) {
        status = 'draft'
      } else if (savedForDay.some((a) => a.status === 'assigned')) {
        status = 'assigned'
      }

      return {
        iso,
        dayKey,
        shortDay: weekdayLabelShort(dayKey),
        dayMonth: formatShortDayMonth(iso),
        status,
        savedCount: savedForDay.length,
      }
    })
  }, [selectedIsoDate, assignments, isDirty])

  // Build day slots for selectedIsoDate (saved assignments + active recurring templates + optional extra manual slots)
  const daySlots = useMemo<DaySlotSource[]>(() => {
    const dayKey = weekdayKeyFromIso(selectedIsoDate)
    const savedOnDate = assignments
      .filter((a) => a.isoDate === selectedIsoDate)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))

    const activeRecurringOnDay = recurringDepartures
      .filter((r) => r.active && r.dayOfWeek === dayKey)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))

    const coveredSessionIds = new Set(
      savedOnDate.map((a) => a.preachingSessionId).filter((x): x is string => Boolean(x)),
    )

    const slots: DaySlotSource[] = []

    for (const saved of savedOnDate) {
      const linkedRec = saved.preachingSessionId
        ? (recurringDepartures.find((r) => r.id === saved.preachingSessionId) ?? null)
        : null
      const savedConductors =
        saved.conductorNames.length > 0
          ? saved.conductorNames
          : getDefaultConductorsFor({
              preachingSessionId: saved.preachingSessionId,
              meetingLocationId: saved.meetingLocationId,
              locationName: saved.locationName,
              dayOfWeek: dayKey,
              groupId: saved.groupId,
              groupName: saved.groupName,
            })
      slots.push({
        slotKey: `saved:${saved.id}`,
        savedAssignment: saved,
        recurringTemplate: linkedRec,
        periodType: saved.periodType,
        startTime: saved.startTime,
        meetingLocationId: saved.meetingLocationId,
        preachingSessionId: saved.preachingSessionId,
        locationName: saved.locationName,
        groupId: saved.groupId,
        groupName: saved.groupName,
        conductorNames: savedConductors,
        territoryIds: saved.territoryIds,
        notes: saved.notes,
      })
    }

    for (const rec of activeRecurringOnDay) {
      if (coveredSessionIds.has(rec.id)) continue
      const recConductors =
        rec.conductorNames.length > 0
          ? rec.conductorNames
          : getDefaultConductorsFor({
              preachingSessionId: rec.id,
              meetingLocationId: rec.meetingLocationId,
              locationName: rec.locationName,
              dayOfWeek: dayKey,
              groupId: rec.sundayGroupId,
              groupName: rec.sundayGroupName,
              allowedTerritoryIds: rec.allowedTerritoryIds,
            })
      slots.push({
        slotKey: `rec:${rec.id}`,
        savedAssignment: null,
        recurringTemplate: rec,
        periodType: rec.periodType,
        startTime: rec.startTime,
        meetingLocationId: rec.meetingLocationId,
        preachingSessionId: rec.id,
        locationName: rec.locationName,
        groupId: rec.sundayGroupId,
        groupName: rec.sundayGroupName,
        conductorNames: recConductors,
        territoryIds: [],
        notes: '',
      })
    }

    const extraCount = extraManualSlots[selectedIsoDate] ?? 0
    for (let i = 0; i < extraCount; i += 1) {
      const defGroup = dayKey === 'sunday' ? (sundayGroups[0] ?? null) : null
      slots.push({
        slotKey: `manual:${selectedIsoDate}:${i}`,
        savedAssignment: null,
        recurringTemplate: null,
        periodType: dayKey === 'sunday' ? 'sunday' : 'morning',
        startTime: dayKey === 'sunday' ? '09:00' : '09:00',
        meetingLocationId: null,
        preachingSessionId: null,
        locationName: '',
        groupId: defGroup?.id ?? null,
        groupName: defGroup?.name ?? null,
        conductorNames: getDefaultConductorsFor({
          dayOfWeek: dayKey,
          groupId: defGroup?.id ?? null,
          groupName: defGroup?.name ?? null,
        }),
        territoryIds: [],
        notes: '',
      })
    }

    if (slots.length === 0) {
      const prevOnWeekday = assignments.find((a) => weekdayKeyFromIso(a.isoDate) === dayKey)
      const fallbackRec = recurringDepartures.find((r) => r.active) ?? null
      const defaultLocId =
        prevOnWeekday?.meetingLocationId ??
        fallbackRec?.meetingLocationId ??
        locations[0]?.id ??
        null
      const defaultLocName =
        prevOnWeekday?.locationName ??
        fallbackRec?.locationName ??
        locations[0]?.name ??
        ''
      const defaultGroupId =
        dayKey === 'sunday'
          ? (prevOnWeekday?.groupId ?? sundayGroups[0]?.id ?? null)
          : null
      const defaultGroupName =
        dayKey === 'sunday'
          ? (prevOnWeekday?.groupName ?? sundayGroups[0]?.name ?? null)
          : null
      const defaultConductors = getDefaultConductorsFor({
        preachingSessionId: prevOnWeekday?.preachingSessionId ?? fallbackRec?.id ?? null,
        meetingLocationId: defaultLocId,
        locationName: defaultLocName,
        dayOfWeek: dayKey,
        groupId: defaultGroupId,
        groupName: defaultGroupName,
      })

      slots.push({
        slotKey: `blank:${selectedIsoDate}`,
        savedAssignment: null,
        recurringTemplate: null,
        periodType:
          prevOnWeekday?.periodType ?? (dayKey === 'sunday' ? 'sunday' : 'morning'),
        startTime: prevOnWeekday?.startTime ?? fallbackRec?.startTime ?? '09:00',
        meetingLocationId: defaultLocId,
        preachingSessionId: null,
        locationName: defaultLocName,
        groupId: defaultGroupId,
        groupName: defaultGroupName,
        conductorNames: defaultConductors,
        territoryIds: [],
        notes: '',
      })
    }

    return slots
  }, [
    selectedIsoDate,
    assignments,
    recurringDepartures,
    extraManualSlots,
    locations,
    sundayGroups,
    getDefaultConductorsFor,
  ])

  const safeSlotIndex = Math.min(selectedSlotIndex, Math.max(0, daySlots.length - 1))
  const activeSlot = daySlots[safeSlotIndex]!

  // Sync local form whenever activeSlot identity changes
  useEffect(() => {
    setPeriodType(activeSlot.periodType)
    setStartTime(activeSlot.startTime)
    setMeetingLocationId(activeSlot.meetingLocationId)
    setPreachingSessionId(activeSlot.preachingSessionId)
    setLocationName(activeSlot.locationName)
    setCustomManualLocation(false)
    setGroupId(activeSlot.groupId)
    setGroupName(activeSlot.groupName ?? '')
    setConductorNames(activeSlot.conductorNames)
    setSelectedTerritoryIds(activeSlot.territoryIds)
    setNotes(activeSlot.notes)
    setIsDirty(false)
    setRequestedVolume(undefined)
    setVariationIndex(0)
    setErrorBanner('')
  }, [
    selectedIsoDate,
    activeSlot.slotKey,
    activeSlot.savedAssignment?.updatedAtIso,
  ])

  // Hydrate pre-selected conductors / location when async catalog finishes loading and form isn't dirty
  useEffect(() => {
    if (isDirty) return
    if (conductorNames.length === 0 && activeSlot.conductorNames.length > 0) {
      setConductorNames(activeSlot.conductorNames)
    }
    if (!locationName && activeSlot.locationName) {
      setLocationName(activeSlot.locationName)
      setMeetingLocationId(activeSlot.meetingLocationId)
      setPreachingSessionId(activeSlot.preachingSessionId)
    }
    if (!groupName && activeSlot.groupName) {
      setGroupName(activeSlot.groupName)
      setGroupId(activeSlot.groupId)
    }
  }, [
    isDirty,
    conductorNames.length,
    locationName,
    groupName,
    activeSlot.conductorNames,
    activeSlot.locationName,
    activeSlot.meetingLocationId,
    activeSlot.preachingSessionId,
    activeSlot.groupName,
    activeSlot.groupId,
  ])

  // Determine allowed territories for the selected recurring session or location
  const linkedRecurring = useMemo(
    () =>
      preachingSessionId
        ? (recurringDepartures.find((r) => r.id === preachingSessionId) ?? null)
        : null,
    [preachingSessionId, recurringDepartures],
  )

  const linkedLocation = useMemo(
    () =>
      meetingLocationId
        ? (locations.find((l) => l.id === meetingLocationId) ?? null)
        : locations.find(
            (l) => l.name.trim().toLowerCase() === locationName.trim().toLowerCase(),
          ) ?? null,
    [meetingLocationId, locations, locationName],
  )

  const allowedTerritoryIds = useMemo<string[] | null>(() => {
    if (linkedRecurring && linkedRecurring.allowedTerritoryIds.length > 0) {
      return linkedRecurring.allowedTerritoryIds
    }
    if (linkedLocation && linkedLocation.allowedTerritoryIds.length > 0) {
      return linkedLocation.allowedTerritoryIds
    }
    return null
  }, [linkedRecurring, linkedLocation])

  const currentSavedAssignmentId = activeSlot.savedAssignment?.id

  // Status snapshots for all territories relative to selectedIsoDate
  const statusesById = useMemo(
    () =>
      computeTerritoryStatuses({
        territories,
        segments,
        assignments,
        workSessions,
        referenceIsoDate: selectedIsoDate,
        excludeAssignmentId: currentSavedAssignmentId,
      }),
    [territories, segments, assignments, workSessions, selectedIsoDate, currentSavedAssignmentId],
  )

  // Available territories for this departure grouped by region
  const availableByRegion = useMemo(() => {
    const allowedSet = allowedTerritoryIds ? new Set(allowedTerritoryIds) : null
    const list = allowedSet
      ? territories.filter((t) => allowedSet.has(t.id))
      : territories

    const map = new Map<string, TerritoryRecord[]>()
    for (const t of list) {
      const bucket = map.get(t.regionName)
      if (bucket) bucket.push(t)
      else map.set(t.regionName, [t])
    }
    for (const bucket of map.values()) {
      bucket.sort((a, b) => compareTerritoryCodes(a.code, b.code))
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))
  }, [territories, allowedTerritoryIds])

  // Suggestion Engine Execution (7 prioritized rules)
  const suggestion = useMemo(
    () =>
      suggestTerritories({
        isoDate: selectedIsoDate,
        periodType,
        meetingLocationId: linkedLocation?.id ?? meetingLocationId,
        allowedTerritoryIds,
        territories,
        segments,
        assignments,
        workSessions,
        currentAssignmentId: currentSavedAssignmentId,
        requestedVolume,
        variationIndex,
      }),
    [
      selectedIsoDate,
      periodType,
      linkedLocation,
      meetingLocationId,
      allowedTerritoryIds,
      territories,
      segments,
      assignments,
      workSessions,
      currentSavedAssignmentId,
      requestedVolume,
      variationIndex,
    ],
  )

  const conflictById = useMemo(
    () => new Map(suggestion.conflicts.map((c) => [c.territory.id, c])),
    [suggestion.conflicts],
  )

  // Recent history for the selected location ("Últimas saídas neste local")
  const recentLocationHistory = useMemo(() => {
    const history = buildTerritoryTimeline({
      assignments,
      workSessions,
      territoriesById,
      excludeAssignmentId: currentSavedAssignmentId,
    })
    const normLoc = locationName.trim().toLowerCase()
    const filtered = history.filter((item) => {
      if (item.kind !== 'assignment') return false
      if (!normLoc && !meetingLocationId) return true
      if (meetingLocationId && item.locationId === meetingLocationId) return true
      return item.locationName.trim().toLowerCase() === normLoc
    })
    return filtered.slice(0, 5)
  }, [assignments, workSessions, territoriesById, currentSavedAssignmentId, locationName, meetingLocationId])

  // Selected territories ordered naturally
  const selectedTerritoryObjects = useMemo(() => {
    return selectedTerritoryIds
      .map((id) => territoriesById.get(id))
      .filter((t): t is TerritoryRecord => Boolean(t))
      .sort((a, b) => compareTerritoryCodes(a.code, b.code))
  }, [selectedTerritoryIds, territoriesById])

  const previewTerritoryCodes = useMemo(() => {
    if (selectedTerritoryObjects.length > 0) {
      return selectedTerritoryObjects.map((t) => t.code)
    }
    return suggestion.recommended.map((r) => r.territory.code)
  }, [selectedTerritoryObjects, suggestion.recommended])

  // Live WhatsApp Message
  const whatsappMessage = useMemo(
    () =>
      buildTerritoryWhatsappMessage({
        isoDate: selectedIsoDate,
        periodType,
        startTime,
        locationName,
        groupName: periodType === 'sunday' ? groupName : null,
        conductorNames,
        territoryCodes:
          selectedTerritoryObjects.length > 0
            ? selectedTerritoryObjects.map((t) => t.code)
            : previewTerritoryCodes,
      }),
    [
      selectedIsoDate,
      periodType,
      startTime,
      locationName,
      groupName,
      conductorNames,
      selectedTerritoryObjects,
      previewTerritoryCodes,
    ],
  )

  function showToast(msg: string) {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? '' : curr))
    }, 2800)
  }

  function handleSelectLocationOption(val: string) {
    if (val === '__manual__') {
      setCustomManualLocation(true)
      setPreachingSessionId(null)
      setMeetingLocationId(null)
      setLocationName('')
      setIsDirty(true)
      return
    }
    setCustomManualLocation(false)
    if (val.startsWith('rec:')) {
      const recId = val.slice(4)
      const rec = recurringDepartures.find((r) => r.id === recId)
      if (rec) {
        setPreachingSessionId(rec.id)
        setMeetingLocationId(rec.meetingLocationId)
        setLocationName(rec.locationName)
        setPeriodType(rec.periodType)
        setStartTime(rec.startTime)
        setGroupId(rec.sundayGroupId)
        setGroupName(rec.sundayGroupName ?? '')
        setConductorNames(
          rec.conductorNames.length > 0
            ? rec.conductorNames
            : getDefaultConductorsFor({
                preachingSessionId: rec.id,
                meetingLocationId: rec.meetingLocationId,
                locationName: rec.locationName,
                dayOfWeek: rec.dayOfWeek,
                groupId: rec.sundayGroupId,
                groupName: rec.sundayGroupName,
                allowedTerritoryIds: rec.allowedTerritoryIds,
              }),
        )
        setSelectedTerritoryIds([])
        setVariationIndex(0)
        setIsDirty(true)
      }
      return
    }
    if (val.startsWith('loc:')) {
      const locId = val.slice(4)
      const loc = locations.find((l) => l.id === locId)
      if (loc) {
        setPreachingSessionId(null)
        setMeetingLocationId(loc.id)
        setLocationName(loc.name)
        const prevConductors = getDefaultConductorsFor({
          meetingLocationId: loc.id,
          locationName: loc.name,
          dayOfWeek: weekdayKeyFromIso(selectedIsoDate),
          allowedTerritoryIds: loc.allowedTerritoryIds,
        })
        if (prevConductors.length > 0) {
          setConductorNames(prevConductors)
        }
        setSelectedTerritoryIds([])
        setVariationIndex(0)
        setIsDirty(true)
      }
    }
  }

  function toggleTerritoryManual(territoryId: string) {
    if (!canManage) return
    const conflict = conflictById.get(territoryId)
    if (conflict && !selectedTerritoryIds.includes(territoryId)) {
      setErrorBanner(
        `Conflito evitado: o território ${conflict.territory.code} já está designado em "${conflict.conflictingLocationName}" (${conflict.conflictingStartTime}) neste mesmo dia.`,
      )
      return
    }
    setErrorBanner('')
    setIsDirty(true)
    setSelectedTerritoryIds((curr) =>
      curr.includes(territoryId)
        ? curr.filter((id) => id !== territoryId)
        : [...curr, territoryId],
    )
  }

  function applySuggestion() {
    if (!canManage) return
    const ids = suggestion.recommended.map((item) => item.territory.id)
    setSelectedTerritoryIds(ids)
    setIsDirty(true)
    setErrorBanner('')
    showToast(`Sugestão aplicada: ${ids.length} território(s) selecionado(s).`)
  }

  async function handlePersist(targetStatus: 'draft' | 'assigned') {
    if (!canManage) return
    if (!locationName.trim()) {
      setErrorBanner('Informe ou selecione o local da saída antes de salvar.')
      return
    }

    const effectiveTerritoryIds =
      selectedTerritoryIds.length > 0
        ? selectedTerritoryIds
        : targetStatus === 'assigned' && suggestion.recommended.length > 0
          ? suggestion.recommended.map((r) => r.territory.id)
          : selectedTerritoryIds

    if (targetStatus === 'assigned' && effectiveTerritoryIds.length === 0) {
      setErrorBanner('Selecione pelo menos um território (ou use a sugestão) para salvar a designação.')
      return
    }

    // Rule 6 final verification
    for (const tid of effectiveTerritoryIds) {
      const conflict = conflictById.get(tid)
      if (conflict) {
        setErrorBanner(
          `Conflito no mesmo dia: o território ${conflict.territory.code} já pertence à saída "${conflict.conflictingLocationName}".`,
        )
        return
      }
    }

    const snapshots: TerritorySnapshotItem[] = effectiveTerritoryIds.map((tid) => {
      const t = territoriesById.get(tid)
      return {
        id: tid,
        code: t?.code ?? tid,
        name: t?.name ?? `Território ${tid}`,
        regionName: t?.regionName ?? '',
      }
    })

    setSavingMode(targetStatus)
    setErrorBanner('')
    try {
      await saveAssignment({
        id: activeSlot.savedAssignment?.id,
        isoDate: selectedIsoDate,
        status: targetStatus,
        periodType,
        startTime,
        meetingLocationId: linkedLocation?.id ?? meetingLocationId,
        preachingSessionId,
        locationName: locationName.trim(),
        groupId: periodType === 'sunday' ? groupId : null,
        groupName: periodType === 'sunday' ? groupName.trim() || null : null,
        conductorNames,
        territoryIds: effectiveTerritoryIds,
        territorySnapshots: snapshots,
        notes,
      })
      setSelectedTerritoryIds(effectiveTerritoryIds)
      setIsDirty(false)
      showToast(
        targetStatus === 'assigned'
          ? 'Designação salva com sucesso!'
          : 'Rascunho salvo com sucesso!',
      )
    } catch (err) {
      setErrorBanner(
        err instanceof Error ? err.message : 'Não foi possível salvar a designação.',
      )
    } finally {
      setSavingMode('none')
    }
  }

  async function handleCopyWhatsapp() {
    await navigator.clipboard.writeText(whatsappMessage)
    setCopiedWhatsapp(true)
    setTimeout(() => setCopiedWhatsapp(false), 2000)
  }

  const dayLongLabel = weekdayLabelLong(weekdayKeyFromIso(selectedIsoDate))
  const fullHeadingDate = headingDate(selectedIsoDate, dayLongLabel)

  const currentVolume =
    requestedVolume ??
    defaultVolumeForDeparture(weekdayKeyFromIso(selectedIsoDate), periodType)

  // Dropdown value for location selector
  const locationSelectValue = useMemo(() => {
    if (customManualLocation) return '__manual__'
    if (preachingSessionId && recurringDepartures.some((r) => r.id === preachingSessionId)) {
      return `rec:${preachingSessionId}`
    }
    if (meetingLocationId && locations.some((l) => l.id === meetingLocationId)) {
      return `loc:${meetingLocationId}`
    }
    return '__manual__'
  }, [customManualLocation, preachingSessionId, recurringDepartures, meetingLocationId, locations])

  return (
    <div className="space-y-4">
      {/* Weekly Selector Card */}
      <div className="rounded-2xl border border-line bg-white p-4">
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setSelectedIsoDate((iso) => addDays(iso, -7))
                setSelectedSlotIndex(0)
              }}
              className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-white text-ink transition hover:bg-[#F8FAFC]"
              aria-label="Semana anterior"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="inline-flex h-9 items-center gap-2 rounded-xl border border-line bg-[#F8FAFC] px-3.5 text-xs font-semibold text-ink sm:text-sm">
              <Calendar size={15} className="text-indigo" />
              {formatWeekBannerTitle(selectedIsoDate)}
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedIsoDate((iso) => addDays(iso, 7))
                setSelectedSlotIndex(0)
              }}
              className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-white text-ink transition hover:bg-[#F8FAFC]"
              aria-label="Próxima semana"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedIsoDate(todayIso)
              setSelectedSlotIndex(0)
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-white px-3.5 text-xs font-semibold text-ink transition hover:bg-[#F8FAFC]"
          >
            <CalendarDays size={14} className="text-indigo" />
            Hoje
          </button>
        </div>

        {/* 7-Day Strip */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7">
          {weekDays.map((day) => {
            const isSelected = day.iso === selectedIsoDate
            const isToday = day.iso === todayIso
            return (
              <button
                key={day.iso}
                type="button"
                onClick={() => {
                  setSelectedIsoDate(day.iso)
                  setSelectedSlotIndex(0)
                }}
                className={`flex flex-col items-center justify-center rounded-xl border px-2 py-2.5 text-center transition ${
                  isSelected
                    ? 'border-indigo bg-[#EEF2FF] shadow-xs'
                    : 'border-line bg-white hover:border-[#C7D2FE] hover:bg-[#F8FAFC]'
                }`}
              >
                <span
                  className={`text-xs font-bold ${
                    isSelected ? 'text-indigo' : 'text-ink'
                  }`}
                >
                  {day.shortDay}
                  {isToday ? ' •' : ''}
                </span>
                <span className="mt-0.5 text-xs text-muted">{day.dayMonth}</span>
                <span className="mt-2">
                  {day.status === 'assigned' ? (
                    <CheckCircle2
                      size={17}
                      className="text-[#16A34A]"
                      aria-label="Designada"
                    />
                  ) : day.status === 'draft' ? (
                    <Clock size={17} className="text-indigo" aria-label="Rascunho" />
                  ) : (
                    <Circle
                      size={17}
                      className="text-[#94A3B8]"
                      aria-label="Não planejada"
                    />
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Feedback / Error Banners */}
      {toastMessage ? (
        <div className="flex items-center gap-2 rounded-xl border border-[#BBF7D0] bg-[#ECFDF5] px-4 py-2.5 text-xs font-semibold text-[#166534]">
          <CheckCircle2 size={15} />
          {toastMessage}
        </div>
      ) : null}

      {errorBanner ? (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-2.5 text-xs font-medium text-[#B91C1C]">
          <span className="flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0" />
            {errorBanner}
          </span>
          <button type="button" onClick={() => setErrorBanner('')}>
            <X size={14} />
          </button>
        </div>
      ) : null}

      {/* Main 3-Column Desktop Layout */}
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
        {/* LEFT COLUMN (5 cols): Planejar saída + Territórios disponíveis */}
        <div className="space-y-4 xl:col-span-5">
          {/* Card: Planejar saída */}
          <div className="rounded-2xl border border-line bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CalendarDays size={18} className="text-indigo" />
                <h3 className="text-base font-semibold text-ink">Planejar saída</h3>
              </div>

              {canManage ? (
                <button
                  type="button"
                  onClick={() =>
                    setEditingRecurringDrawer({
                      open: true,
                      record: linkedRecurring,
                    })
                  }
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo hover:underline"
                >
                  <Pencil size={12} />
                  {linkedRecurring ? 'Editar saída recorrente' : 'Criar saída recorrente'}
                </button>
              ) : null}
            </div>

            {/* Multiple Departures on Same Day Switcher */}
            {daySlots.length > 1 || canManage ? (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {daySlots.map((slot, idx) => {
                  const active = idx === safeSlotIndex
                  return (
                    <button
                      key={slot.slotKey}
                      type="button"
                      onClick={() => setSelectedSlotIndex(idx)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                        active
                          ? 'border-indigo bg-[#EEF2FF] text-indigo'
                          : 'border-line bg-[#F8FAFC] text-[#475569] hover:text-ink'
                      }`}
                    >
                      {slot.savedAssignment?.status === 'assigned' ? (
                        <CheckCircle2 size={12} className="text-[#16A34A]" />
                      ) : slot.savedAssignment?.status === 'draft' ? (
                        <Clock size={12} className="text-indigo" />
                      ) : null}
                      <span>
                        {slot.startTime} • {slot.locationName || 'Saída manual'}
                      </span>
                    </button>
                  )
                })}

                {canManage ? (
                  <button
                    type="button"
                    onClick={() => {
                      const nextCount = (extraManualSlots[selectedIsoDate] ?? 0) + 1
                      setExtraManualSlots((curr) => ({
                        ...curr,
                        [selectedIsoDate]: nextCount,
                      }))
                      setSelectedSlotIndex(daySlots.length)
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-dashed border-line px-2.5 py-1 text-xs font-medium text-muted hover:border-indigo hover:text-indigo"
                    title="Planejar mais uma saída neste mesmo dia"
                  >
                    <Plus size={12} />
                    Outra saída
                  </button>
                ) : null}
              </div>
            ) : null}

            {/* Date & Period Type Row */}
            <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-[#475569]">{fullHeadingDate}</p>

              <div className="flex items-center gap-1.5">
                {canManage ? (
                  <button
                    type="button"
                    title="Clique para alternar o tipo da saída (Manhã / Tarde / Domingo)"
                    onClick={() => {
                      const order: DeparturePeriodType[] = [
                        'morning',
                        'afternoon',
                        'sunday',
                      ]
                      const next = order[(order.indexOf(periodType) + 1) % order.length]!
                      setPeriodType(next)
                      if (next === 'afternoon' && startTime === '09:00') {
                        setStartTime('17:00')
                      } else if (next === 'morning' && startTime === '17:00') {
                        setStartTime('09:00')
                      }
                      setIsDirty(true)
                    }}
                  >
                    <DeparturePeriodBadge periodType={periodType} />
                  </button>
                ) : (
                  <DeparturePeriodBadge periodType={periodType} />
                )}
              </div>
            </div>

            {/* Location & Time */}
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-12">
              <div className="sm:col-span-8">
                <label className="mb-1.5 block text-xs font-medium text-muted">
                  Local da saída
                </label>
                {!customManualLocation &&
                (recurringDepartures.length > 0 || locations.length > 0) ? (
                  <div className="relative">
                    <Home
                      size={15}
                      className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
                    />
                    <select
                      disabled={!canManage}
                      value={locationSelectValue}
                      onChange={(e) => handleSelectLocationOption(e.target.value)}
                      className="h-[42px] w-full rounded-xl border border-line bg-white pr-8 pl-9 text-sm font-medium text-ink outline-none focus:border-indigo"
                    >
                      {recurringDepartures.length > 0 ? (
                        <optgroup label="Saídas recorrentes">
                          {recurringDepartures.map((r) => (
                            <option key={r.id} value={`rec:${r.id}`}>
                              {r.locationName} ({weekdayLabelShort(r.dayOfWeek)} • {r.startTime})
                            </option>
                          ))}
                        </optgroup>
                      ) : null}
                      {locations.length > 0 ? (
                        <optgroup label="Locais cadastrados">
                          {locations.map((l) => (
                            <option key={l.id} value={`loc:${l.id}`}>
                              {l.name}
                            </option>
                          ))}
                        </optgroup>
                      ) : null}
                      <option value="__manual__">+ Digitar local manual...</option>
                    </select>
                  </div>
                ) : (
                  <div className="flex gap-1.5">
                    <div className="relative flex-1">
                      <Home
                        size={15}
                        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
                      />
                      <input
                        type="text"
                        disabled={!canManage}
                        value={locationName}
                        onChange={(e) => {
                          setLocationName(e.target.value)
                          setIsDirty(true)
                        }}
                        placeholder="Ex.: Casa do irmão Paulo"
                        className="h-[42px] w-full rounded-xl border border-line bg-white pr-3 pl-9 text-sm text-ink outline-none focus:border-indigo"
                      />
                    </div>
                    {recurringDepartures.length > 0 || locations.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setCustomManualLocation(false)}
                        className="rounded-xl border border-line bg-[#F8FAFC] px-2.5 text-xs font-medium text-muted hover:text-ink"
                      >
                        Lista
                      </button>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="sm:col-span-4">
                <label className="mb-1.5 block text-xs font-medium text-muted">
                  Horário
                </label>
                <div className="relative">
                  <Clock
                    size={15}
                    className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
                  />
                  <input
                    type="time"
                    disabled={!canManage}
                    value={startTime}
                    onChange={(e) => {
                      setStartTime(e.target.value)
                      setIsDirty(true)
                    }}
                    className="h-[42px] w-full rounded-xl border border-line bg-white pr-2 pl-9 text-sm font-medium text-ink outline-none focus:border-indigo"
                  />
                </div>
              </div>
            </div>

            {/* Sunday Group Selector */}
            {periodType === 'sunday' ? (
              <div className="mt-3">
                <label className="mb-1.5 block text-xs font-medium text-muted">
                  Grupo de domingo
                </label>
                {sundayGroups.length > 0 ? (
                  <select
                    disabled={!canManage}
                    value={groupName}
                    onChange={(e) => {
                      const val = e.target.value
                      setGroupName(val)
                      const g = sundayGroups.find((x) => x.name === val)
                      setGroupId(g?.id ?? null)
                      const groupConductors = getDefaultConductorsFor({
                        groupId: g?.id ?? null,
                        groupName: val,
                        dayOfWeek: 'sunday',
                        meetingLocationId,
                        locationName,
                      })
                      if (groupConductors.length > 0) {
                        setConductorNames(groupConductors)
                      }
                      setIsDirty(true)
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
                    disabled={!canManage}
                    value={groupName}
                    onChange={(e) => {
                      setGroupName(e.target.value)
                      setIsDirty(true)
                    }}
                    placeholder="Nome do grupo (ex.: Laranjeiras)"
                    className="h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-indigo"
                  />
                )}
              </div>
            ) : null}

            {/* Conductors */}
            <div className="mt-3.5">
              <label className="mb-1.5 block text-xs font-medium text-muted">
                Dirigentes
              </label>
              <ConductorsMultiSelect
                value={conductorNames}
                options={conductorOptions}
                disabled={!canManage}
                onChange={(next) => {
                  setConductorNames(next)
                  setIsDirty(true)
                }}
              />
            </div>

            {/* Assigned Territories Strip */}
            <div className="mt-3.5 border-t border-line pt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted">
                  Territórios designados ({selectedTerritoryObjects.length})
                </span>
                {selectedTerritoryObjects.length > 0 && canManage ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTerritoryIds([])
                      setIsDirty(true)
                    }}
                    className="text-[11px] font-medium text-muted hover:text-ink"
                  >
                    Limpar
                  </button>
                ) : null}
              </div>

              {selectedTerritoryObjects.length === 0 ? (
                <p className="mt-1.5 text-xs text-muted">
                  Nenhum território escolhido ainda. Clique em "Usar esta sugestão" ou selecione manualmente abaixo.
                </p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedTerritoryObjects.map((t) => (
                    <span
                      key={t.id}
                      className="inline-flex items-center gap-1 rounded-full border border-[#C7D2FE] bg-[#EEF2FF] px-2.5 py-0.5 text-xs font-semibold text-[#4338CA]"
                    >
                      {t.code}
                      <span className="font-normal text-[#6366F1]">
                        ({t.regionName})
                      </span>
                      {t.imageUrl ? (
                        <button
                          type="button"
                          onClick={() => setPreviewMapTerritory(t)}
                          title={`Ver mapa de ${t.code}`}
                          className="ml-0.5 rounded-full p-0.5 text-indigo hover:bg-[#E0E7FF]"
                          aria-label={`Ver mapa do território ${t.code}`}
                        >
                          <ImageIcon size={12} />
                        </button>
                      ) : null}
                      {canManage ? (
                        <button
                          type="button"
                          onClick={() => toggleTerritoryManual(t.id)}
                          className="ml-0.5 rounded-full p-0.5 hover:bg-[#E0E7FF]"
                          aria-label={`Remover território ${t.code}`}
                        >
                          <X size={11} />
                        </button>
                      ) : null}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Card: Territórios disponíveis neste local */}
          <div
            ref={availableCardRef}
            className={`rounded-2xl border bg-white p-5 transition ${
              manualHighlight ? 'border-indigo ring-2 ring-indigo/25' : 'border-line'
            }`}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MapIcon size={18} className="text-indigo" />
                <h3 className="text-base font-semibold text-ink">
                  Territórios disponíveis neste local
                </h3>
              </div>
            </div>

            <div className="mb-3.5">
              <TerritoryStatusLegend />
            </div>

            {availableByRegion.length === 0 ? (
              <p className="rounded-xl bg-[#F8FAFC] p-4 text-xs text-muted">
                Nenhum território disponível para este local. Cadastre territórios na aba "Territórios".
              </p>
            ) : (
              <div className="space-y-3">
                {availableByRegion.map(([regionName, items]) => (
                  <div
                    key={regionName}
                    className="rounded-xl border border-line/70 bg-[#F8FAFC] p-3.5"
                  >
                    <h4 className="mb-2.5 text-xs font-bold text-ink">
                      {regionName} ({items.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {items.map((territory) => {
                        const snap = statusesById.get(territory.id)
                        const isSelected = selectedTerritoryIds.includes(territory.id)
                        return (
                          <TerritoryPill
                            key={territory.id}
                            code={territory.code}
                            status={snap?.status ?? 'available'}
                            snapshot={snap}
                            selected={isSelected}
                            disabled={!canManage}
                            onClick={() => toggleTerritoryManual(territory.id)}
                          />
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CENTER COLUMN (4 cols): Territórios sugeridos + Últimas saídas */}
        <div className="space-y-4 xl:col-span-4">
          {/* Card: Territórios sugeridos */}
          <div className="rounded-2xl border border-line bg-white p-5">
            <div className="mb-3.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-indigo" />
                <h3 className="text-base font-semibold text-ink">
                  Territórios sugeridos
                </h3>
              </div>

              {/* Rule 7 Volume Stepper */}
              <div
                className="inline-flex items-center gap-1 rounded-lg border border-line bg-[#F8FAFC] px-1.5 py-0.5 text-xs"
                title="Quantidade sugerida de territórios (Regra 7)"
              >
                <button
                  type="button"
                  onClick={() => {
                    setRequestedVolume(Math.max(1, currentVolume - 1))
                    setVariationIndex(0)
                  }}
                  className="grid h-5 w-5 place-items-center rounded text-muted hover:bg-white hover:text-ink"
                  aria-label="Diminuir quantidade"
                >
                  <Minus size={12} />
                </button>
                <span className="min-w-[1.25rem] text-center font-semibold text-ink">
                  {currentVolume}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setRequestedVolume(Math.min(8, currentVolume + 1))
                    setVariationIndex(0)
                  }}
                  className="grid h-5 w-5 place-items-center rounded text-muted hover:bg-white hover:text-ink"
                  aria-label="Aumentar quantidade"
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>

            {suggestion.recommended.length === 0 ? (
              <div className="rounded-xl border border-line bg-[#F8FAFC] p-4 text-xs text-muted">
                Não há territórios elegíveis livres de conflito para sugerir nesta data.
              </div>
            ) : (
              <>
                {/* Green Banner */}
                <div className="flex items-center gap-2.5 rounded-xl border border-[#BBF7D0] bg-[#ECFDF5] px-3.5 py-2.5">
                  <CheckCircle2 size={18} className="shrink-0 text-[#16A34A]" />
                  <span className="text-sm font-bold text-[#14532D]">
                    Sugestão:{' '}
                    {formatPortugueseList(
                      suggestion.recommended.map((r) => r.territory.code),
                    )}
                  </span>
                </div>

                {/* Motivos da escolha */}
                <div className="mt-3.5">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                    <Info size={14} className="text-muted" />
                    Motivos da escolha
                  </p>
                  <ul className="mt-2 space-y-1.5 pl-4 text-xs text-[#334155] list-disc">
                    {suggestion.summaryReasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {/* Partially Completed Highlight when present */}
            {suggestion.partiallyCompleted.length > 0 ? (
              <div className="mt-3 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2 text-xs text-[#1E40AF]">
                <span className="font-semibold">Parcialmente concluídos: </span>
                {suggestion.partiallyCompleted
                  .map((p) => `${p.territory.code} (${p.detail})`)
                  .join(' • ')}
              </div>
            ) : null}

            {/* Conflicts Warning when present */}
            {suggestion.conflicts.length > 0 ? (
              <div className="mt-3 rounded-xl border border-[#FDE68A] bg-[#FEF3C7] px-3 py-2 text-xs text-[#92400E]">
                <span className="font-semibold">
                  Conflitos evitados no dia ({suggestion.conflicts.length}):{' '}
                </span>
                {suggestion.conflicts
                  .map(
                    (c) =>
                      `${c.territory.code} (${c.conflictingLocationName} ${c.conflictingStartTime})`,
                  )
                  .join(', ')}
              </div>
            ) : null}

            {/* Discarded Accordion */}
            {suggestion.discarded.length > 0 ? (
              <div className="mt-3 rounded-xl border border-line bg-[#F8FAFC] px-3.5 py-2.5">
                <button
                  type="button"
                  onClick={() => setDiscardedExpanded((v) => !v)}
                  className="flex w-full items-center justify-between text-left text-xs font-semibold text-ink"
                >
                  <span>Territórios descartados ({suggestion.discarded.length})</span>
                  {discardedExpanded ? (
                    <ChevronUp size={14} className="text-muted" />
                  ) : (
                    <ChevronDown size={14} className="text-muted" />
                  )}
                </button>

                {!discardedExpanded ? (
                  <p className="mt-1 truncate text-[11px] text-muted">
                    {suggestion.discarded
                      .slice(0, 3)
                      .map((d) => `${d.territory.code} (${d.reason})`)
                      .join(' e ')}
                    {suggestion.discarded.length > 3 ? '...' : ''}
                  </p>
                ) : (
                  <ul className="mt-2 space-y-1 text-[11px] text-[#475569]">
                    {suggestion.discarded.map((d) => (
                      <li key={d.territory.id}>
                        <span className="font-semibold text-ink">
                          {d.territory.code}:
                        </span>{' '}
                        {d.reason}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}

            {/* Actions */}
            {canManage ? (
              <div className="mt-4 space-y-2">
                <button
                  type="button"
                  disabled={suggestion.recommended.length === 0}
                  onClick={applySuggestion}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-indigo text-xs font-semibold text-white shadow-xs transition hover:opacity-95 disabled:opacity-50"
                >
                  <Check size={15} />
                  Usar esta sugestão
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      availableCardRef.current?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'nearest',
                      })
                      setManualHighlight(true)
                      setTimeout(() => setManualHighlight(false), 1600)
                    }}
                    className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-line bg-white px-2 text-xs font-medium text-ink transition hover:bg-[#F8FAFC]"
                  >
                    <Pencil size={13} className="text-muted" />
                    Escolher manualmente
                  </button>

                  <button
                    type="button"
                    disabled={!suggestion.hasAlternatives}
                    onClick={() => setVariationIndex((v) => v + 1)}
                    className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-line bg-white px-2 text-xs font-medium text-ink transition hover:bg-[#F8FAFC] disabled:opacity-50"
                  >
                    <RefreshCw size={13} className="text-muted" />
                    Gerar outra
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {/* Card: Últimas saídas neste local */}
          <div className="rounded-2xl border border-line bg-white p-5">
            <div className="mb-3.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <History size={18} className="text-indigo" />
                <h3 className="text-base font-semibold text-ink">
                  Últimas saídas neste local
                </h3>
              </div>

              <button
                type="button"
                onClick={() => onNavigateToHistory(locationName || undefined)}
                className="rounded-lg border border-line bg-[#F8FAFC] px-2.5 py-1 text-[11px] font-semibold text-ink transition hover:border-[#C7D2FE] hover:text-indigo"
              >
                Ver histórico
              </button>
            </div>

            {recentLocationHistory.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted">
                Nenhuma saída anterior registrada para este local.
              </p>
            ) : (
              <div className="divide-y divide-line">
                {recentLocationHistory.map((row) => (
                  <div
                    key={row.id}
                    className="flex items-center justify-between gap-2 py-2.5 text-xs first:pt-0 last:pb-0"
                  >
                    <span className="w-14 shrink-0 font-medium text-muted">
                      {formatShortDayMonth(row.isoDate)}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium text-ink">
                      {row.conductorNames.length > 0
                        ? row.conductorNames.join(', ')
                        : '—'}
                    </span>
                    <span className="shrink-0 rounded-full border border-[#C7D2FE] bg-[#EEF2FF] px-2.5 py-0.5 text-xs font-semibold text-[#4338CA]">
                      {row.territoryCodes.join(', ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (3 cols): Mensagem para WhatsApp + Salvar designação */}
        <div className="xl:col-span-3">
          <div className="rounded-2xl border border-line bg-white p-5">
            <div className="mb-3.5 flex items-center gap-2">
              <MessageCircle size={18} className="text-[#16A34A]" />
              <h3 className="text-base font-semibold text-ink">
                Mensagem para WhatsApp
              </h3>
            </div>

            <div className="rounded-xl border border-line bg-[#F8FAFC] p-4 whitespace-pre-line text-[13px] leading-relaxed text-ink">
              {whatsappMessage}
            </div>

            <div className="mt-3.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => void handleCopyWhatsapp()}
                className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-line bg-white px-2 text-xs font-semibold text-ink transition hover:bg-[#F8FAFC]"
              >
                {copiedWhatsapp ? (
                  <Check size={14} className="text-[#16A34A]" />
                ) : (
                  <Copy size={14} className="text-indigo" />
                )}
                {copiedWhatsapp ? 'Copiado!' : 'Copiar mensagem'}
              </button>

              <a
                href={buildWhatsappShareUrl(whatsappMessage)}
                target="_blank"
                rel="noreferrer"
                className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-line bg-white px-2 text-xs font-semibold text-ink transition hover:bg-[#F8FAFC]"
              >
                <MessageCircle size={14} className="text-[#16A34A]" />
                Compartilhar
              </a>
            </div>

            {canManage ? (
              <div className="mt-4 space-y-2 border-t border-line pt-4">
                <button
                  type="button"
                  disabled={savingMode !== 'none'}
                  onClick={() => void handlePersist('assigned')}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo text-sm font-semibold text-white shadow-xs transition hover:opacity-95 disabled:opacity-50"
                >
                  <Check size={16} />
                  {savingMode === 'assigned'
                    ? 'Salvando...'
                    : 'Salvar designação'}
                </button>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    disabled={savingMode !== 'none'}
                    onClick={() => void handlePersist('draft')}
                    className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-indigo"
                  >
                    <Clock size={12} />
                    {savingMode === 'draft'
                      ? 'Salvando rascunho...'
                      : 'Salvar como rascunho'}
                  </button>

                  {activeSlot.savedAssignment ? (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!activeSlot.savedAssignment) return
                        await deleteAssignment(activeSlot.savedAssignment.id)
                        showToast('Designação removida desta data.')
                      }}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#DC2626] hover:underline"
                    >
                      <Trash2 size={12} />
                      Remover
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {previewMapTerritory && previewMapTerritory.imageUrl ? (
        <TerritoryMapLightbox
          imageUrl={previewMapTerritory.imageUrl}
          title={`${previewMapTerritory.code} — ${previewMapTerritory.name}`}
          subtitle={previewMapTerritory.regionName}
          mapsUrl={previewMapTerritory.mapsUrl}
          onClose={() => setPreviewMapTerritory(null)}
        />
      ) : null}

      {/* Edit Recurring Departure Drawer */}
      {editingRecurringDrawer.open ? (
        <RecurringDepartureDrawer
          initialRecord={editingRecurringDrawer.record}
          defaultDayOfWeek={weekdayKeyFromIso(selectedIsoDate)}
          onClose={() => setEditingRecurringDrawer({ open: false, record: null })}
        />
      ) : null}
    </div>
  )
}
