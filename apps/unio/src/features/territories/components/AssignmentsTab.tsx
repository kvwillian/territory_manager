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
  TerritorySegmentStatusItem,
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
    resolveConductors,
    saveTerritorySegments,
    saveAssignment,
    deleteAssignment,
    recordTerritoryExecution,
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
  const [assignedSegmentsByTerritory, setAssignedSegmentsByTerritory] = useState<
    Record<string, string[]>
  >({})
  const [notes, setNotes] = useState('')
  const [isDirty, setIsDirty] = useState(false)

  // Execution feedback state per territory (for marking segments done + comment on the day)
  const [execDoneSegmentsByTerritory, setExecDoneSegmentsByTerritory] = useState<
    Record<string, string[]>
  >({})
  const [execCommentByTerritory, setExecCommentByTerritory] = useState<Record<string, string>>({})
  const [execPartialFlagByTerritory, setExecPartialFlagByTerritory] = useState<
    Record<string, boolean>
  >({})
  const [savingExecutionTerritoryId, setSavingExecutionTerritoryId] = useState<string | null>(null)

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

  const segmentsByTerritoryId = useMemo(() => {
    const map = new Map<string, typeof segments>()
    for (const seg of segments) {
      const bucket = map.get(seg.territoryId)
      if (bucket) bucket.push(seg)
      else map.set(seg.territoryId, [seg])
    }
    for (const bucket of map.values()) {
      bucket.sort((a, b) => compareTerritoryCodes(a.description, b.description))
    }
    return map
  }, [segments])

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
    const coveredGroupKeys = new Set<string>()
    for (const saved of savedOnDate) {
      if (saved.groupId) coveredGroupKeys.add(`id:${saved.groupId}`)
      if (saved.groupName?.trim()) coveredGroupKeys.add(`name:${saved.groupName.trim().toLowerCase()}`)
    }

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
      if (rec.sundayGroupId && coveredGroupKeys.has(`id:${rec.sundayGroupId}`)) continue
      if (
        rec.sundayGroupName?.trim() &&
        coveredGroupKeys.has(`name:${rec.sundayGroupName.trim().toLowerCase()}`)
      ) {
        continue
      }
      if (rec.sundayGroupId) coveredGroupKeys.add(`id:${rec.sundayGroupId}`)
      if (rec.sundayGroupName?.trim()) {
        coveredGroupKeys.add(`name:${rec.sundayGroupName.trim().toLowerCase()}`)
      }
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

    // On Sundays, ensure every congregation group has its own dedicated departure slot
    if (dayKey === 'sunday') {
      for (const grp of sundayGroups) {
        if (
          coveredGroupKeys.has(`id:${grp.id}`) ||
          coveredGroupKeys.has(`name:${grp.name.trim().toLowerCase()}`)
        ) {
          continue
        }
        const prevGroupAssign = assignments.find(
          (a) =>
            a.periodType === 'sunday' &&
            (a.groupId === grp.id ||
              (a.groupName ?? '').trim().toLowerCase() === grp.name.trim().toLowerCase()),
        )
        const defaultLocId =
          prevGroupAssign?.meetingLocationId ?? locations[0]?.id ?? null
        const defaultLocName =
          prevGroupAssign?.locationName ?? locations[0]?.name ?? ''
        const grpConductors = getDefaultConductorsFor({
          meetingLocationId: defaultLocId,
          locationName: defaultLocName,
          dayOfWeek: 'sunday',
          groupId: grp.id,
          groupName: grp.name,
        })
        slots.push({
          slotKey: `group:${grp.id}`,
          savedAssignment: null,
          recurringTemplate: null,
          periodType: 'sunday',
          startTime: prevGroupAssign?.startTime ?? '09:00',
          meetingLocationId: defaultLocId,
          preachingSessionId: null,
          locationName: defaultLocName,
          groupId: grp.id,
          groupName: grp.name,
          conductorNames:
            grpConductors.length > 0
              ? grpConductors
              : grp.superintendentName
                ? [grp.superintendentName]
                : [],
          territoryIds: [],
          notes: '',
        })
      }
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

  // Effective segments per territory (merges registered segments + historical part codes from workSessions)
  const effectiveSegmentsByTerritoryId = useMemo(() => {
    const map = new Map<string, TerritorySegmentStatusItem[]>()
    for (const t of territories) {
      const snap = statusesById.get(t.id)
      const items = snap?.segmentItems ? [...snap.segmentItems] : []
      if (items.length === 0) {
        const regSegs = segmentsByTerritoryId.get(t.id) ?? []
        for (const s of regSegs) {
          items.push({
            id: s.id,
            code: s.description.trim() || t.code,
            status: s.status === 'completed' ? 'completed' : 'pending',
            lastWorkedIsoDate: s.lastWorkedIsoDate,
            isMissingInCycle: s.status !== 'completed',
          })
        }
      }
      items.sort((a, b) => compareTerritoryCodes(a.code, b.code))
      if (items.length > 0) {
        map.set(t.id, items)
      }
    }
    return map
  }, [territories, statusesById, segmentsByTerritoryId])

  const getDefaultSegmentSelectionForTerritory = (territoryId: string): string[] => {
    const snap = statusesById.get(territoryId)
    const effSegs = effectiveSegmentsByTerritoryId.get(territoryId) ?? []
    if (effSegs.length === 0) return []
    if (snap?.missingSegmentIds && snap.missingSegmentIds.length > 0) {
      return snap.missingSegmentIds
    }
    const nonCompleted = effSegs.filter((s) => s.status !== 'completed')
    if (nonCompleted.length > 0 && nonCompleted.length < effSegs.length) {
      return nonCompleted.map((s) => s.id)
    }
    return effSegs.map((s) => s.id)
  }

  const resolveChosenSegmentsForTerritory = (
    territoryId: string,
    rawAssigned?: string[],
  ): TerritorySegmentStatusItem[] => {
    const effSegs = effectiveSegmentsByTerritoryId.get(territoryId) ?? []
    if (effSegs.length === 0) return []
    const effectiveList =
      rawAssigned && rawAssigned.length > 0
        ? rawAssigned
        : getDefaultSegmentSelectionForTerritory(territoryId)
    const idSet = new Set(effectiveList)
    const upperCodeSet = new Set(effectiveList.map((v) => v.trim().toUpperCase()))
    const matched = effSegs.filter(
      (s) => idSet.has(s.id) || upperCodeSet.has(s.code.trim().toUpperCase()),
    )
    return matched.length > 0 ? matched : effSegs
  }

  const [splittingTerritoryId, setSplittingTerritoryId] = useState<string | null>(null)

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

    const initialAssignedSegs: Record<string, string[]> = {
      ...(activeSlot.savedAssignment?.assignedSegmentsByTerritory ?? {}),
    }
    for (const snapItem of activeSlot.savedAssignment?.territorySnapshots ?? []) {
      if (
        !initialAssignedSegs[snapItem.id] &&
        snapItem.assignedSegmentCodes &&
        snapItem.assignedSegmentCodes.length > 0
      ) {
        initialAssignedSegs[snapItem.id] = snapItem.assignedSegmentCodes
      }
    }
    for (const tid of activeSlot.territoryIds) {
      if (!initialAssignedSegs[tid]) {
        const defaults = getDefaultSegmentSelectionForTerritory(tid)
        if (defaults.length > 0) {
          initialAssignedSegs[tid] = defaults
        }
      }
    }
    setAssignedSegmentsByTerritory(initialAssignedSegs)

    const initialExecDone: Record<string, string[]> = {}
    for (const tid of activeSlot.territoryIds) {
      const effSegs = effectiveSegmentsByTerritoryId.get(tid) ?? []
      initialExecDone[tid] = effSegs.filter((s) => s.status === 'completed').map((s) => s.id)
    }
    setExecDoneSegmentsByTerritory(initialExecDone)
    setExecCommentByTerritory({})
    setExecPartialFlagByTerritory({})

    setNotes(activeSlot.notes)
    setIsDirty(false)
    setRequestedVolume(undefined)
    setVariationIndex(0)
    setErrorBanner('')
  }, [
    selectedIsoDate,
    activeSlot.slotKey,
    activeSlot.savedAssignment?.updatedAtIso,
    segmentsByTerritoryId,
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
    const formatTerritoryWithSegments = (t: TerritoryRecord): string => {
      const effSegs = effectiveSegmentsByTerritoryId.get(t.id) ?? []
      if (effSegs.length === 0) return t.code
      const chosenSegs = resolveChosenSegmentsForTerritory(
        t.id,
        assignedSegmentsByTerritory[t.id],
      )
      if (chosenSegs.length === 0 || chosenSegs.length === effSegs.length) {
        return t.code
      }
      return chosenSegs.map((s) => s.code).join(', ')
    }

    if (selectedTerritoryObjects.length > 0) {
      return selectedTerritoryObjects.map(formatTerritoryWithSegments)
    }
    return suggestion.recommended.map((r) => {
      if (r.recommendedSegmentCodes && r.recommendedSegmentCodes.length > 0) {
        return r.recommendedSegmentCodes.join(', ')
      }
      return formatTerritoryWithSegments(r.territory)
    })
  }, [
    selectedTerritoryObjects,
    suggestion.recommended,
    effectiveSegmentsByTerritoryId,
    assignedSegmentsByTerritory,
  ])

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
        territoryCodes: previewTerritoryCodes,
      }),
    [
      selectedIsoDate,
      periodType,
      startTime,
      locationName,
      groupName,
      conductorNames,
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
    setSelectedTerritoryIds((curr) => {
      const exists = curr.includes(territoryId)
      if (exists) {
        return curr.filter((id) => id !== territoryId)
      }
      const defaults = getDefaultSegmentSelectionForTerritory(territoryId)
      if (defaults.length > 0) {
        setAssignedSegmentsByTerritory((prev) => ({
          ...prev,
          [territoryId]: prev[territoryId]?.length ? prev[territoryId]! : defaults,
        }))
      }
      return [...curr, territoryId]
    })
  }

  function toggleAssignedSegment(territoryId: string, segment: TerritorySegmentStatusItem) {
    if (!canManage) return
    const effSegs = effectiveSegmentsByTerritoryId.get(territoryId) ?? []
    setIsDirty(true)
    setAssignedSegmentsByTerritory((curr) => {
      const currentlyChosen = resolveChosenSegmentsForTerritory(
        territoryId,
        curr[territoryId],
      )
      const chosenIdSet = new Set(currentlyChosen.map((s) => s.id))
      const isSelected = chosenIdSet.has(segment.id)
      const nextChosen = isSelected
        ? currentlyChosen.filter((s) => s.id !== segment.id)
        : [...currentlyChosen, segment]
      // If user unchecks the last segment, keep at least that segment selected
      const finalChosen = nextChosen.length > 0 ? nextChosen : [segment]
      const finalIds = effSegs
        .filter((s) => finalChosen.some((c) => c.id === s.id))
        .map((s) => s.id)
      return {
        ...curr,
        [territoryId]: finalIds,
      }
    })
  }

  function selectMissingSegmentsOnly(territoryId: string) {
    if (!canManage) return
    const snap = statusesById.get(territoryId)
    const effSegs = effectiveSegmentsByTerritoryId.get(territoryId) ?? []
    const missingIds =
      snap?.missingSegmentIds && snap.missingSegmentIds.length > 0
        ? snap.missingSegmentIds
        : effSegs.filter((s) => s.status !== 'completed').map((s) => s.id)
    if (missingIds.length === 0) return
    setIsDirty(true)
    setAssignedSegmentsByTerritory((curr) => ({
      ...curr,
      [territoryId]: missingIds,
    }))
  }

  function selectAllTerritorySegments(territoryId: string) {
    if (!canManage) return
    const effSegs = effectiveSegmentsByTerritoryId.get(territoryId) ?? []
    if (effSegs.length === 0) return
    setIsDirty(true)
    setAssignedSegmentsByTerritory((curr) => ({
      ...curr,
      [territoryId]: effSegs.map((s) => s.id),
    }))
  }

  async function handleQuickSplitForDesignation(
    territory: TerritoryRecord,
    totalParts: number,
    selectCodes?: string[],
  ) {
    if (!canManage) return
    const base = territory.baseNumber || territory.code
    const nextSegInputs = Array.from({ length: totalParts }, (_, i) => {
      const letter = String.fromCharCode(65 + i)
      return {
        description: `${base}${letter}`,
        status: 'pending' as const,
        lastWorkedIsoDate: null,
      }
    })
    const codesToSelect =
      selectCodes && selectCodes.length > 0
        ? selectCodes
        : nextSegInputs.map((s) => s.description)

    setAssignedSegmentsByTerritory((prev) => ({
      ...prev,
      [territory.id]: codesToSelect,
    }))
    setIsDirty(true)
    setSplittingTerritoryId(territory.id)
    try {
      await saveTerritorySegments(territory.id, nextSegInputs)
      showToast(
        `Território ${territory.code} dividido em ${nextSegInputs.map((s) => s.description).join(', ')} (${codesToSelect.join(', ')} selecionado).`,
      )
    } catch (err) {
      setErrorBanner(
        err instanceof Error
          ? err.message
          : 'Não foi possível dividir os segmentos deste território.',
      )
    } finally {
      setSplittingTerritoryId(null)
    }
  }

  function applySuggestion() {
    if (!canManage) return
    const ids = suggestion.recommended.map((item) => item.territory.id)
    setSelectedTerritoryIds(ids)
    setAssignedSegmentsByTerritory((prev) => {
      const next = { ...prev }
      for (const item of suggestion.recommended) {
        const tid = item.territory.id
        if (item.recommendedSegmentIds && item.recommendedSegmentIds.length > 0) {
          next[tid] = item.recommendedSegmentIds
        } else {
          const defaults = getDefaultSegmentSelectionForTerritory(tid)
          if (defaults.length > 0) {
            next[tid] = defaults
          }
        }
      }
      return next
    })
    setIsDirty(true)
    setErrorBanner('')
    showToast(`Sugestão aplicada: ${ids.length} território(s) selecionado(s).`)
  }

  async function handleRecordExecutionForTerritory(territory: TerritoryRecord) {
    const effSegs = effectiveSegmentsByTerritoryId.get(territory.id) ?? []
    const realSegs = segmentsByTerritoryId.get(territory.id) ?? []
    const completedIds = execDoneSegmentsByTerritory[territory.id] ?? []
    const completedSet = new Set(completedIds)

    const realCompletedIds = realSegs
      .filter((s) => completedSet.has(s.id) || completedSet.has(s.description))
      .map((s) => s.id)
    const realPendingIds = realSegs
      .filter((s) => !completedSet.has(s.id) && !completedSet.has(s.description))
      .map((s) => s.id)

    const comment = (execCommentByTerritory[territory.id] ?? '').trim()
    const isExplicitlyPartial = Boolean(execPartialFlagByTerritory[territory.id])
    const commentMentionsPartial =
      /\b(parte|metade|parcial|incompleto|falta)\b/i.test(comment)

    const allSegmentsDone =
      effSegs.length > 0 ? completedIds.length >= effSegs.length : true
    const completionState =
      isExplicitlyPartial || commentMentionsPartial || !allSegmentsDone
        ? 'partial'
        : 'completed'

    const resolvedCond = resolveConductors(conductorNames)
    const primaryConductorName =
      resolvedCond.names[0] ?? conductorNames[0] ?? 'Dirigente'
    const completedDescs = effSegs
      .filter((s) => completedSet.has(s.id) || completedSet.has(s.code))
      .map((s) => s.code)

    const noteParts: string[] = []
    if (completedDescs.length > 0) {
      noteParts.push(`Segmentos feitos: ${completedDescs.join(', ')}`)
    }
    if (isExplicitlyPartial && !commentMentionsPartial) {
      noteParts.push('Trabalho parcial / pela metade')
    }
    if (comment) {
      noteParts.push(comment)
    }

    setSavingExecutionTerritoryId(territory.id)
    setErrorBanner('')
    try {
      await recordTerritoryExecution({
        territoryId: territory.id,
        isoDate: selectedIsoDate,
        conductorName: primaryConductorName,
        conductorUserId: resolvedCond.userIds[0] ?? null,
        conductorPublisherId: resolvedCond.publisherIds[0] ?? null,
        completedSegmentIds: realCompletedIds,
        pendingSegmentIds: realPendingIds,
        completionState,
        notes: noteParts.join(' · '),
        regionId: territory.regionId,
        regionName: territory.regionName,
        territoryCodeRaw:
          completedDescs.length > 0 ? completedDescs.join(', ') : territory.code,
      })
      showToast(`Execução do território ${territory.code} registrada com sucesso!`)
    } catch (err) {
      setErrorBanner(
        err instanceof Error
          ? err.message
          : 'Não foi possível registrar a execução deste território.',
      )
    } finally {
      setSavingExecutionTerritoryId(null)
    }
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

    const cleanAssignedSegmentsMap: Record<string, string[]> = {}
    const snapshots: TerritorySnapshotItem[] = effectiveTerritoryIds.map((tid) => {
      const t = territoriesById.get(tid)
      const effSegs = effectiveSegmentsByTerritoryId.get(tid) ?? []
      const chosenSegs = resolveChosenSegmentsForTerritory(
        tid,
        assignedSegmentsByTerritory[tid],
      )
      const chosenCodes = chosenSegs.map((s) => s.code)
      // Store both IDs and codes when segments are inferred, or IDs when registered
      const storedIdentifiers = chosenSegs.map((s) =>
        s.id.startsWith('inferred:') ? s.code : s.id,
      )
      if (storedIdentifiers.length > 0) {
        cleanAssignedSegmentsMap[tid] = storedIdentifiers
      }
      const isSubsetSelected =
        effSegs.length > 0 &&
        chosenCodes.length > 0 &&
        chosenCodes.length < effSegs.length
      return {
        id: tid,
        code: isSubsetSelected ? chosenCodes.join(', ') : (t?.code ?? tid),
        name: t?.name ?? `Território ${tid}`,
        regionName: t?.regionName ?? '',
        ...(storedIdentifiers.length > 0 ? { assignedSegmentIds: storedIdentifiers } : {}),
        ...(chosenCodes.length > 0 ? { assignedSegmentCodes: chosenCodes } : {}),
      }
    })

    setSavingMode(targetStatus)
    setErrorBanner('')
    try {
      // Materialize inferred segments into Firestore `segments` collection if not yet registered
      for (const tid of effectiveTerritoryIds) {
        const regSegs = segmentsByTerritoryId.get(tid) ?? []
        const effSegs = effectiveSegmentsByTerritoryId.get(tid) ?? []
        if (regSegs.length === 0 && effSegs.length > 0) {
          await saveTerritorySegments(
            tid,
            effSegs.map((s) => ({
              description: s.code,
              status: s.status === 'completed' ? 'completed' : 'pending',
              lastWorkedIsoDate: s.lastWorkedIsoDate,
            })),
          )
        }
      }

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
        assignedSegmentsByTerritory: cleanAssignedSegmentsMap,
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

            {/* Multiple Departures on Same Day Switcher (or Group Selector on Sundays) */}
            {daySlots.length > 1 || weekdayKeyFromIso(selectedIsoDate) === 'sunday' || canManage ? (
              <div className="mt-3 space-y-1.5">
                {weekdayKeyFromIso(selectedIsoDate) === 'sunday' ? (
                  <span className="block text-[11px] font-semibold text-muted">
                    Selecione o grupo para definir a saída e os territórios:
                  </span>
                ) : null}
                <div className="flex flex-wrap items-center gap-1.5">
                  {daySlots.map((slot, idx) => {
                    const active = idx === safeSlotIndex
                    const labelText = slot.groupName
                      ? `${slot.groupName}${slot.territoryIds.length > 0 ? ` (${slot.territoryIds.length})` : ''}`
                      : `${slot.startTime} • ${slot.locationName || 'Saída manual'}`
                    return (
                      <button
                        key={slot.slotKey}
                        type="button"
                        onClick={() => setSelectedSlotIndex(idx)}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                          active
                            ? 'border-indigo bg-[#EEF2FF] text-indigo font-semibold'
                            : 'border-line bg-[#F8FAFC] text-[#475569] hover:text-ink'
                        }`}
                      >
                        {slot.savedAssignment?.status === 'assigned' ? (
                          <CheckCircle2 size={12} className="text-[#16A34A]" />
                        ) : slot.savedAssignment?.status === 'draft' ? (
                          <Clock size={12} className="text-indigo" />
                        ) : null}
                        <span>{labelText}</span>
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
                      const targetSlotIdx = daySlots.findIndex(
                        (s) =>
                          (s.groupName ?? '').trim().toLowerCase() === val.trim().toLowerCase(),
                      )
                      if (targetSlotIdx >= 0 && targetSlotIdx !== safeSlotIndex && !isDirty) {
                        setSelectedSlotIndex(targetSlotIdx)
                        return
                      }
                      setGroupName(val)
                      const g = sundayGroups.find((x) => x.name === val)
                      setGroupId(g?.id ?? null)
                      const matchingRec = recurringDepartures.find(
                        (r) =>
                          r.dayOfWeek === 'sunday' &&
                          (r.sundayGroupId === g?.id ||
                            (r.sundayGroupName ?? '').trim().toLowerCase() ===
                              val.trim().toLowerCase()),
                      )
                      if (matchingRec) {
                        setPreachingSessionId(matchingRec.id)
                        setMeetingLocationId(matchingRec.meetingLocationId)
                        setLocationName(matchingRec.locationName)
                        setStartTime(matchingRec.startTime)
                      }
                      const groupConductors = getDefaultConductorsFor({
                        preachingSessionId: matchingRec?.id ?? null,
                        groupId: g?.id ?? null,
                        groupName: val,
                        dayOfWeek: 'sunday',
                        meetingLocationId: matchingRec?.meetingLocationId ?? meetingLocationId,
                        locationName: matchingRec?.locationName ?? locationName,
                      })
                      if (groupConductors.length > 0) {
                        setConductorNames(groupConductors)
                      } else if (g?.superintendentName) {
                        setConductorNames([g.superintendentName])
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
                <div className="mt-2 space-y-2">
                  {selectedTerritoryObjects.map((t) => {
                    const effSegs = effectiveSegmentsByTerritoryId.get(t.id) ?? []
                    const chosenSegs = resolveChosenSegmentsForTerritory(
                      t.id,
                      assignedSegmentsByTerritory[t.id],
                    )
                    const chosenIdSet = new Set(chosenSegs.map((s) => s.id))
                    const isSubsetChosen =
                      effSegs.length > 0 &&
                      chosenSegs.length > 0 &&
                      chosenSegs.length < effSegs.length
                    const missingSegs = effSegs.filter(
                      (s) => s.isMissingInCycle || s.status !== 'completed',
                    )
                    const hasSomeCompletedAndSomeMissing =
                      effSegs.length > 0 &&
                      missingSegs.length > 0 &&
                      missingSegs.length < effSegs.length
                    const isDesignatedSaved =
                      activeSlot.savedAssignment?.status === 'assigned'
                    const execDoneIds = execDoneSegmentsByTerritory[t.id] ?? []
                    const execDoneSet = new Set(execDoneIds)
                    const baseNum = t.baseNumber || t.code

                    return (
                      <div
                        key={t.id}
                        className="rounded-xl border border-[#C7D2FE] bg-[#F8FAFC] p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-full border border-[#C7D2FE] bg-[#EEF2FF] px-2.5 py-0.5 text-xs font-bold text-[#4338CA]">
                              {t.code}
                              <span className="font-normal text-[#6366F1]">
                                ({t.regionName})
                              </span>
                            </span>
                            {isSubsetChosen ? (
                              <span className="rounded-full border border-[#93C5FD] bg-[#DBEAFE] px-2 py-0.5 text-[10px] font-bold text-[#1E40AF]">
                                Designando: {chosenSegs.map((s) => s.code).join(', ')}
                              </span>
                            ) : null}
                            {isDesignatedSaved ? (
                              <span className="rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[10px] font-semibold text-[#166534]">
                                Designado
                              </span>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-1">
                            {t.imageUrl ? (
                              <button
                                type="button"
                                onClick={() => setPreviewMapTerritory(t)}
                                title={`Ver mapa de ${t.code}`}
                                className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2 py-1 text-[11px] font-medium text-indigo hover:bg-[#EEF2FF]"
                              >
                                <ImageIcon size={12} />
                                Mapa
                              </button>
                            ) : null}
                            {canManage ? (
                              <button
                                type="button"
                                onClick={() => toggleTerritoryManual(t.id)}
                                className="rounded-lg p-1 text-muted hover:bg-[#FEE2E2] hover:text-[#DC2626]"
                                aria-label={`Remover território ${t.code}`}
                              >
                                <X size={13} />
                              </button>
                            ) : null}
                          </div>
                        </div>

                        {/* Segment selector for designation */}
                        {effSegs.length > 0 ? (
                          <div className="mt-2.5 border-t border-line pt-2">
                            <div className="flex flex-wrap items-center justify-between gap-1.5">
                              <span className="text-[11px] font-semibold text-[#475569]">
                                Segmentos para designar nesta saída:
                              </span>
                              {canManage ? (
                                <div className="flex flex-wrap items-center gap-1">
                                  {hasSomeCompletedAndSomeMissing ? (
                                    <button
                                      type="button"
                                      onClick={() => selectMissingSegmentsOnly(t.id)}
                                      className="rounded-md border border-[#93C5FD] bg-[#EFF6FF] px-2 py-0.5 text-[10px] font-bold text-[#1E40AF] transition hover:bg-[#DBEAFE]"
                                      title="Selecionar apenas os segmentos que faltam concluir"
                                    >
                                      Só o que falta ({missingSegs.map((s) => s.code).join(', ')})
                                    </button>
                                  ) : null}
                                  {isSubsetChosen ? (
                                    <button
                                      type="button"
                                      onClick={() => selectAllTerritorySegments(t.id)}
                                      className="rounded-md border border-line bg-white px-2 py-0.5 text-[10px] font-medium text-[#475569] transition hover:border-[#C7D2FE] hover:text-indigo"
                                    >
                                      Território inteiro
                                    </button>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>

                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {effSegs.map((seg) => {
                                const isChosen = chosenIdSet.has(seg.id)
                                return (
                                  <button
                                    key={seg.id}
                                    type="button"
                                    disabled={!canManage}
                                    onClick={() => toggleAssignedSegment(t.id, seg)}
                                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                                      isChosen
                                        ? 'border-indigo bg-indigo text-white shadow-2xs'
                                        : 'border-line bg-white text-[#475569] hover:border-[#C7D2FE]'
                                    }`}
                                  >
                                    <span>{seg.code}</span>
                                    {seg.isMissingInCycle ? (
                                      <span
                                        className={`rounded px-1 text-[9px] font-bold ${
                                          isChosen
                                            ? 'bg-[#FEF08A] text-[#854D0E]'
                                            : 'bg-[#DBEAFE] text-[#1E40AF]'
                                        }`}
                                      >
                                        falta
                                      </span>
                                    ) : seg.status === 'partial' ? (
                                      <span
                                        className={`rounded px-1 text-[9px] font-bold ${
                                          isChosen
                                            ? 'bg-white/25 text-white'
                                            : 'bg-[#FEF3C7] text-[#92400E]'
                                        }`}
                                      >
                                        parcial
                                      </span>
                                    ) : seg.status === 'completed' ? (
                                      <span
                                        className={`rounded px-1 text-[9px] ${
                                          isChosen
                                            ? 'bg-white/20 text-white'
                                            : 'bg-[#DCFCE7] text-[#166534]'
                                        }`}
                                      >
                                        feito
                                        {seg.lastWorkedIsoDate
                                          ? ` ${formatShortDayMonth(seg.lastWorkedIsoDate)}`
                                          : ''}
                                      </span>
                                    ) : null}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        ) : canManage ? (
                          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2">
                            <span className="text-[11px] text-muted">
                              Designar segmento específico:
                            </span>
                            <div className="flex flex-wrap items-center gap-1">
                              <button
                                type="button"
                                disabled={splittingTerritoryId === t.id}
                                onClick={() =>
                                  void handleQuickSplitForDesignation(t, 2, [`${baseNum}A`])
                                }
                                className="rounded-lg border border-line bg-white px-2 py-0.5 text-[11px] font-semibold text-[#475569] transition hover:border-indigo hover:text-indigo disabled:opacity-50"
                                title={`Dividir em ${baseNum}A e ${baseNum}B e designar apenas ${baseNum}A`}
                              >
                                Apenas {baseNum}A
                              </button>
                              <button
                                type="button"
                                disabled={splittingTerritoryId === t.id}
                                onClick={() =>
                                  void handleQuickSplitForDesignation(t, 2, [`${baseNum}B`])
                                }
                                className="rounded-lg border border-line bg-white px-2 py-0.5 text-[11px] font-semibold text-[#475569] transition hover:border-indigo hover:text-indigo disabled:opacity-50"
                                title={`Dividir em ${baseNum}A e ${baseNum}B e designar apenas ${baseNum}B`}
                              >
                                Apenas {baseNum}B
                              </button>
                              <button
                                type="button"
                                disabled={splittingTerritoryId === t.id}
                                onClick={() =>
                                  void handleQuickSplitForDesignation(t, 3)
                                }
                                className="rounded-lg border border-dashed border-[#C7D2FE] bg-white px-2 py-0.5 text-[11px] font-semibold text-indigo transition hover:bg-[#EEF2FF] disabled:opacity-50"
                                title={`Dividir o território ${t.code} em ${baseNum}A, ${baseNum}B e ${baseNum}C`}
                              >
                                + Dividir A/B/C
                              </button>
                            </div>
                          </div>
                        ) : null}

                        {/* Conductor / Admin Day Execution Checklist (shown once departure is saved as Designada) */}
                        {isDesignatedSaved ? (
                          <div className="mt-3 rounded-xl border border-line bg-white p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-[11px] font-bold text-ink">
                                Retorno do dirigente — O que foi feito neste dia:
                              </span>
                              <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-[#1E40AF]">
                                <input
                                  type="checkbox"
                                  checked={Boolean(execPartialFlagByTerritory[t.id])}
                                  onChange={(e) =>
                                    setExecPartialFlagByTerritory((prev) => ({
                                      ...prev,
                                      [t.id]: e.target.checked,
                                    }))
                                  }
                                  className="h-3.5 w-3.5 accent-indigo"
                                />
                                Feito pela metade / parcial
                              </label>
                            </div>

                            {effSegs.length > 0 ? (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {effSegs.map((seg) => {
                                  const isDone =
                                    execDoneSet.has(seg.id) || execDoneSet.has(seg.code)
                                  const wasAssignedToday = chosenIdSet.has(seg.id)
                                  return (
                                    <label
                                      key={seg.id}
                                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                                        isDone
                                          ? 'border-[#86EFAC] bg-[#DCFCE7] text-[#166534]'
                                          : wasAssignedToday
                                            ? 'border-[#C7D2FE] bg-[#EEF2FF]/60 text-ink'
                                            : 'border-line bg-[#F8FAFC] text-muted'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isDone}
                                        onChange={(e) => {
                                          const checked = e.target.checked
                                          setExecDoneSegmentsByTerritory((prev) => {
                                            const list = prev[t.id] ?? []
                                            return {
                                              ...prev,
                                              [t.id]: checked
                                                ? [...new Set([...list, seg.id])]
                                                : list.filter(
                                                    (id) => id !== seg.id && id !== seg.code,
                                                  ),
                                            }
                                          })
                                        }}
                                        className="h-3.5 w-3.5 accent-[#16A34A]"
                                      />
                                      <span>{seg.code}</span>
                                    </label>
                                  )
                                })}
                              </div>
                            ) : null}

                            <div className="mt-2.5 flex flex-col gap-2 sm:flex-row">
                              <input
                                type="text"
                                value={execCommentByTerritory[t.id] ?? ''}
                                onChange={(e) =>
                                  setExecCommentByTerritory((prev) => ({
                                    ...prev,
                                    [t.id]: e.target.value,
                                  }))
                                }
                                placeholder={`Comentário (ex.: fizemos ${t.code}A e ${t.code}B; ${t.code}B ficou pela metade)`}
                                className="h-8 flex-1 rounded-lg border border-line bg-[#F8FAFC] px-2.5 text-xs text-ink outline-none focus:border-indigo focus:bg-white"
                              />
                              <button
                                type="button"
                                disabled={savingExecutionTerritoryId === t.id}
                                onClick={() => void handleRecordExecutionForTerritory(t)}
                                className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-lg bg-[#16A34A] px-3 text-xs font-semibold text-white hover:bg-[#15803D] disabled:opacity-50"
                              >
                                <Check size={13} />
                                {savingExecutionTerritoryId === t.id
                                  ? 'Salvando...'
                                  : 'Confirmar feito'}
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
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
                {availableByRegion.map(([regionName, items]) => {
                  const selectedInRegion = items.filter((item) =>
                    selectedTerritoryIds.includes(item.id),
                  )
                  return (
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

                      {/* Inline segment picker right inside the region card for selected territories */}
                      {selectedInRegion.length > 0 ? (
                        <div className="mt-3 space-y-2 border-t border-line/80 pt-2.5">
                          <span className="block text-[11px] font-semibold text-[#475569]">
                            Segmentos dos territórios selecionados em {regionName}:
                          </span>
                          {selectedInRegion.map((t) => {
                            const effSegs = effectiveSegmentsByTerritoryId.get(t.id) ?? []
                            const chosenSegs = resolveChosenSegmentsForTerritory(
                              t.id,
                              assignedSegmentsByTerritory[t.id],
                            )
                            const chosenIdSet = new Set(chosenSegs.map((s) => s.id))
                            const missingSegs = effSegs.filter(
                              (s) => s.isMissingInCycle || s.status !== 'completed',
                            )
                            const hasSomeCompletedAndSomeMissing =
                              effSegs.length > 0 &&
                              missingSegs.length > 0 &&
                              missingSegs.length < effSegs.length
                            const baseNum = t.baseNumber || t.code

                            return (
                              <div
                                key={t.id}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#C7D2FE] bg-white px-2.5 py-1.5"
                              >
                                <span className="text-xs font-bold text-[#4338CA]">
                                  Terr. {t.code}:
                                </span>
                                {effSegs.length > 0 ? (
                                  <div className="flex flex-wrap items-center gap-1">
                                    {effSegs.map((seg) => {
                                      const isChosen = chosenIdSet.has(seg.id)
                                      return (
                                        <button
                                          key={seg.id}
                                          type="button"
                                          disabled={!canManage}
                                          onClick={() => toggleAssignedSegment(t.id, seg)}
                                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold transition ${
                                            isChosen
                                              ? 'border-indigo bg-indigo text-white'
                                              : 'border-line bg-[#F8FAFC] text-[#475569] hover:border-[#C7D2FE]'
                                          }`}
                                        >
                                          <span>{seg.code}</span>
                                          {seg.isMissingInCycle ? (
                                            <span
                                              className={`rounded px-1 text-[9px] font-bold ${
                                                isChosen
                                                  ? 'bg-[#FEF08A] text-[#854D0E]'
                                                  : 'bg-[#DBEAFE] text-[#1E40AF]'
                                              }`}
                                            >
                                              falta
                                            </span>
                                          ) : seg.status === 'completed' ? (
                                            <span
                                              className={`rounded px-1 text-[9px] ${
                                                isChosen
                                                  ? 'bg-white/20 text-white'
                                                  : 'bg-[#DCFCE7] text-[#166534]'
                                              }`}
                                            >
                                              feito
                                            </span>
                                          ) : null}
                                        </button>
                                      )
                                    })}
                                    {canManage && hasSomeCompletedAndSomeMissing ? (
                                      <button
                                        type="button"
                                        onClick={() => selectMissingSegmentsOnly(t.id)}
                                        className="ml-1 rounded-md border border-[#93C5FD] bg-[#EFF6FF] px-2 py-0.5 text-[10px] font-bold text-[#1E40AF] hover:bg-[#DBEAFE]"
                                      >
                                        Só o que falta
                                      </button>
                                    ) : null}
                                  </div>
                                ) : canManage ? (
                                  <div className="flex flex-wrap items-center gap-1">
                                    <button
                                      type="button"
                                      disabled={splittingTerritoryId === t.id}
                                      onClick={() =>
                                        void handleQuickSplitForDesignation(t, 2, [
                                          `${baseNum}A`,
                                        ])
                                      }
                                      className="rounded-md border border-line bg-[#F8FAFC] px-2 py-0.5 text-[11px] font-semibold text-[#475569] hover:border-indigo hover:text-indigo"
                                    >
                                      Apenas {baseNum}A
                                    </button>
                                    <button
                                      type="button"
                                      disabled={splittingTerritoryId === t.id}
                                      onClick={() =>
                                        void handleQuickSplitForDesignation(t, 2, [
                                          `${baseNum}B`,
                                        ])
                                      }
                                      className="rounded-md border border-line bg-[#F8FAFC] px-2 py-0.5 text-[11px] font-semibold text-[#475569] hover:border-indigo hover:text-indigo"
                                    >
                                      Apenas {baseNum}B
                                    </button>
                                    <button
                                      type="button"
                                      disabled={splittingTerritoryId === t.id}
                                      onClick={() =>
                                        void handleQuickSplitForDesignation(t, 3)
                                      }
                                      className="rounded-md border border-dashed border-[#C7D2FE] bg-white px-2 py-0.5 text-[11px] font-semibold text-indigo hover:bg-[#EEF2FF]"
                                    >
                                      + A/B/C
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-muted">
                                    Território completo
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      ) : null}
                    </div>
                  )
                })}
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
                      suggestion.recommended.map((r) =>
                        r.recommendedSegmentCodes && r.recommendedSegmentCodes.length > 0
                          ? r.recommendedSegmentCodes.join(', ')
                          : r.territory.code,
                      ),
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
