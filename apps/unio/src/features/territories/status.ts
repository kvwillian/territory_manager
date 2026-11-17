import { parseIso } from '../../domain/dates'
import type {
  DeparturePeriodType,
  TerritoryAssignmentRecord,
  TerritoryRecord,
  TerritorySegmentRecord,
  TerritorySegmentStatusItem,
  TerritoryStatusSnapshot,
  TerritoryTimelineEntry,
  TerritoryWorkStatus,
  WeekdayKey,
  WorkSessionCompletionState,
  WorkSessionRecord,
} from './types'

export const RECENT_DAYS_WINDOW = 15
export const HARD_RECENT_DAYS_WINDOW = 10
export const SIBLING_CYCLE_DAYS = 90

export type ParsedTerritoryCode = {
  code: string
  baseNumber: string
  numericValue: number | null
  partLabel: string | null
}

export function parseTerritoryCode(rawInput: string, fallbackName = ''): ParsedTerritoryCode {
  const candidate = (rawInput || fallbackName).trim()
  if (!candidate) {
    return { code: '00', baseNumber: '00', numericValue: 0, partLabel: null }
  }

  const stripped = candidate.replace(/^territ[oó]rio\s+/i, '').trim()
  const match = stripped.match(/^0*(\d+)\s*[-/]?\s*([A-Za-z])?$/)
  if (match) {
    const digits = match[1]!
    const numericValue = Number.parseInt(digits, 10)
    const paddedBase =
      digits.length === 1 && stripped.startsWith('0')
        ? `0${digits}`
        : (stripped.match(/^(0*\d+)/)?.[1] ?? digits)
    const normalizedBase = paddedBase.length === 1 ? paddedBase.padStart(2, '0') : paddedBase
    const partLabel = match[2] ? match[2].toUpperCase() : null
    return {
      code: partLabel ? `${normalizedBase}${partLabel}` : normalizedBase,
      baseNumber: normalizedBase,
      numericValue: Number.isFinite(numericValue) ? numericValue : null,
      partLabel,
    }
  }

  return {
    code: stripped.toUpperCase(),
    baseNumber: stripped.toUpperCase(),
    numericValue: null,
    partLabel: null,
  }
}

export function compareTerritoryCodes(aCode: string, bCode: string): number {
  const a = parseTerritoryCode(aCode)
  const b = parseTerritoryCode(bCode)
  if (a.numericValue !== null && b.numericValue !== null && a.numericValue !== b.numericValue) {
    return a.numericValue - b.numericValue
  }
  if (a.numericValue !== null && b.numericValue === null) return -1
  if (a.numericValue === null && b.numericValue !== null) return 1
  if (a.baseNumber !== b.baseNumber) {
    return a.baseNumber.localeCompare(b.baseNumber, 'pt-BR', { numeric: true })
  }
  const partA = a.partLabel ?? ''
  const partB = b.partLabel ?? ''
  return partA.localeCompare(partB, 'pt-BR')
}

export function compareTerritories(a: TerritoryRecord, b: TerritoryRecord): number {
  const regionCmp = a.regionName.localeCompare(b.regionName, 'pt-BR')
  if (regionCmp !== 0) return regionCmp
  return compareTerritoryCodes(a.code, b.code)
}

export function diffIsoDays(earlierIso: string, laterIso: string): number {
  const a = parseIso(earlierIso)
  const b = parseIso(laterIso)
  a.setHours(12, 0, 0, 0)
  b.setHours(12, 0, 0, 0)
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

export function weekdayKeyFromIso(isoDate: string): WeekdayKey {
  const day = parseIso(isoDate).getDay()
  const keys: WeekdayKey[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ]
  return keys[day] ?? 'monday'
}

export function weekdayLabelLong(day: WeekdayKey): string {
  const map: Record<WeekdayKey, string> = {
    monday: 'Segunda-feira',
    tuesday: 'Terça-feira',
    wednesday: 'Quarta-feira',
    thursday: 'Quinta-feira',
    friday: 'Sexta-feira',
    saturday: 'Sábado',
    sunday: 'Domingo',
  }
  return map[day]
}

export function weekdayLabelShort(day: WeekdayKey): string {
  const map: Record<WeekdayKey, string> = {
    monday: 'Seg',
    tuesday: 'Ter',
    wednesday: 'Qua',
    thursday: 'Qui',
    friday: 'Sex',
    saturday: 'Sáb',
    sunday: 'Dom',
  }
  return map[day]
}

export function periodTypeLabel(periodType: DeparturePeriodType): string {
  if (periodType === 'morning') return 'Saída da manhã'
  if (periodType === 'afternoon') return 'Saída da tarde'
  return 'Saída de domingo'
}

export function inferPeriodType(startTime: string, isSunday: boolean): DeparturePeriodType {
  if (isSunday) return 'sunday'
  const hour = Number.parseInt(startTime.split(':')[0] ?? '9', 10)
  if (Number.isFinite(hour) && hour >= 13) return 'afternoon'
  return 'morning'
}

export function formatShortDayMonth(isoDate: string): string {
  const [, month, day] = isoDate.split('-')
  if (!month || !day) return isoDate
  return `${day}/${month}`
}

export function formatFullDateBr(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  if (!year || !month || !day) return isoDate
  return `${day}/${month}/${year}`
}

/**
 * Builds timeline entries keeping `assignments` (designations) and `workSessions` (field executions)
 * clearly distinguished. An assignment only marks `executedTerritoryIds` when an actual `workSession`
 * occurred for that territory on or shortly after the assignment date.
 */
export function buildTerritoryTimeline(params: {
  assignments: TerritoryAssignmentRecord[]
  workSessions: WorkSessionRecord[]
  territoriesById: Map<string, TerritoryRecord>
  excludeAssignmentId?: string
}): TerritoryTimelineEntry[] {
  const { assignments, workSessions, territoriesById, excludeAssignmentId } = params
  const items: TerritoryTimelineEntry[] = []

  // Map workSessions by territoryId to correlate execution with assignments without conflating them
  const workDatesByTerritory = new Map<string, string[]>()
  for (const ws of workSessions) {
    const bucket = workDatesByTerritory.get(ws.territoryId)
    if (bucket) bucket.push(ws.isoDate)
    else workDatesByTerritory.set(ws.territoryId, [ws.isoDate])
  }

  const effectiveAssignments = assignments
    .filter(
      (a) =>
        a.status === 'assigned' &&
        a.id !== excludeAssignmentId &&
        a.territoryIds.length > 0,
    )
    .sort((a, b) => b.isoDate.localeCompare(a.isoDate) || b.startTime.localeCompare(a.startTime))

  for (const assignment of effectiveAssignments) {
    const snapshotById = new Map(assignment.territorySnapshots.map((snap) => [snap.id, snap]))
    const codes = assignment.territoryIds.map(
      (id) => snapshotById.get(id)?.code ?? territoriesById.get(id)?.code ?? id,
    )
    // Check which assigned territories have a matching workSession within [isoDate, isoDate + 7 days]
    const executedTerritoryIds = assignment.territoryIds.filter((tid) => {
      const dates = workDatesByTerritory.get(tid) ?? []
      return dates.some((d) => {
        const diff = diffIsoDays(assignment.isoDate, d)
        return diff >= 0 && diff <= 7
      })
    })

    items.push({
      id: assignment.id,
      kind: 'assignment',
      isoDate: assignment.isoDate,
      locationId: assignment.meetingLocationId,
      locationName: assignment.locationName || 'Saída avulsa',
      periodType: assignment.periodType,
      conductorNames: assignment.conductorNames,
      territoryIds: assignment.territoryIds,
      territoryCodes: codes,
      executedTerritoryIds,
      notes: assignment.notes,
    })
  }

  for (const session of workSessions) {
    const territory = territoriesById.get(session.territoryId)
    const regionName = session.regionName || territory?.regionName || ''
    const displayCode =
      territory?.code ?? session.territoryCodeRaw ?? session.territoryId
    items.push({
      id: `ws-${session.id}`,
      kind: 'workSession',
      isoDate: session.isoDate,
      dateEndIso: session.dateEndIso ?? null,
      dateNote: session.dateNote ?? null,
      locationId: null,
      locationName: regionName ? `Execução em campo (${regionName})` : 'Execução em campo',
      regionName,
      periodType: session.periodType ?? null,
      conductorNames: session.conductorName ? [session.conductorName] : [],
      conductorRaw: session.conductorRaw,
      territoryIds: [session.territoryId],
      territoryCodes: [displayCode],
      territoryCodeRaw: session.territoryCodeRaw,
      executedTerritoryIds: [session.territoryId],
      completionState: session.completionState ?? 'completed',
      raw: session.raw,
      notes: session.notes,
    })
  }

  return items.sort((a, b) => {
    const dateCmp = b.isoDate.localeCompare(a.isoDate)
    if (dateCmp !== 0) return dateCmp
    if (a.kind !== b.kind) return a.kind === 'workSession' ? -1 : 1
    return 0
  })
}

/**
 * Computes territory statuses strictly separating designation (`assignments`) from execution
 * (`workSessions` + `segments`). Past `assignments` NEVER mark a territory as worked, recent,
 * or completed.
 */
function stripTerritoryRawTokenToCode(rawToken: string, fallbackBase: string): ParsedTerritoryCode {
  const cleaned = rawToken
    .replace(/^parte\s+d[eo]\s+/i, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\bincompleto\b/gi, ' ')
    .replace(/\bparte\b/gi, ' ')
    .replace(/^com[eé]rcio\s+/i, '')
    .replace(/[^\w\s]/g, ' ')
    .trim()
  const spacedMatch = cleaned.match(/^(\d+)\s+([A-Za-z])$/)
  if (spacedMatch) {
    return parseTerritoryCode(`${spacedMatch[1]}${spacedMatch[2]!.toUpperCase()}`)
  }
  if (/^[A-Za-z]$/.test(cleaned)) {
    return parseTerritoryCode(`${fallbackBase}${cleaned.toUpperCase()}`)
  }
  return parseTerritoryCode(cleaned || fallbackBase)
}

export function computeTerritoryStatuses(params: {
  territories: TerritoryRecord[]
  segments: TerritorySegmentRecord[]
  assignments: TerritoryAssignmentRecord[]
  workSessions: WorkSessionRecord[]
  referenceIsoDate: string
  excludeAssignmentId?: string
  recentWindowDays?: number
}): Map<string, TerritoryStatusSnapshot> {
  const {
    territories,
    segments,
    assignments,
    workSessions,
    referenceIsoDate,
    excludeAssignmentId,
    recentWindowDays = RECENT_DAYS_WINDOW,
  } = params

  // 1. Group segments and workSessions by territory
  const segmentsByTerritory = new Map<string, TerritorySegmentRecord[]>()
  for (const seg of segments) {
    const bucket = segmentsByTerritory.get(seg.territoryId)
    if (bucket) bucket.push(seg)
    else segmentsByTerritory.set(seg.territoryId, [seg])
  }
  for (const bucket of segmentsByTerritory.values()) {
    bucket.sort((a, b) => compareTerritoryCodes(a.description, b.description))
  }

  const sessionsByTerritory = new Map<string, WorkSessionRecord[]>()
  const sortedWorkSessions = [...workSessions].sort((a, b) => b.isoDate.localeCompare(a.isoDate))
  for (const ws of sortedWorkSessions) {
    const delta = diffIsoDays(ws.isoDate, referenceIsoDate)
    if (delta < 0) continue
    const bucket = sessionsByTerritory.get(ws.territoryId)
    if (bucket) bucket.push(ws)
    else sessionsByTerritory.set(ws.territoryId, [ws])
  }

  // 2. Compute EFFECTIVE WORK strictly from workSessions + segments (never from assignments!)
  type WorkMeta = {
    lastWorkedIsoDate: string | null
    lastWorkedConductorNames: string[]
    daysSinceLastWork: number | null
    workCount: number
    latestCompletedSessionIso: string | null
    lastWorkCompletionState: WorkSessionCompletionState | null
    lastWorkNotes: string
    hasIncompleteWork: boolean
    effectiveCompletedIso: string | null
    segmentItems: TerritorySegmentStatusItem[]
    missingSegmentIds: string[]
    missingSegmentCodes: string[]
    completedSegmentCodes: string[]
    completedSegmentsCount: number
    totalSegmentsCount: number
  }
  const workByTerritory = new Map<string, WorkMeta>()
  for (const t of territories) {
    workByTerritory.set(t.id, {
      lastWorkedIsoDate: null,
      lastWorkedConductorNames: [],
      daysSinceLastWork: null,
      workCount: 0,
      latestCompletedSessionIso: null,
      lastWorkCompletionState: null,
      lastWorkNotes: '',
      hasIncompleteWork: false,
      effectiveCompletedIso: null,
      segmentItems: [],
      missingSegmentIds: [],
      missingSegmentCodes: [],
      completedSegmentCodes: [],
      completedSegmentsCount: 0,
      totalSegmentsCount: 0,
    })
  }

  for (const ws of sortedWorkSessions) {
    const meta = workByTerritory.get(ws.territoryId)
    if (!meta) continue
    const delta = diffIsoDays(ws.isoDate, referenceIsoDate)
    if (delta < 0) continue // Future session relative to referenceIsoDate
    const state = ws.completionState ?? 'completed'
    meta.workCount += 1
    if (state === 'completed') {
      if (!meta.latestCompletedSessionIso || ws.isoDate > meta.latestCompletedSessionIso) {
        meta.latestCompletedSessionIso = ws.isoDate
      }
    }
    if (!meta.lastWorkedIsoDate || ws.isoDate > meta.lastWorkedIsoDate) {
      meta.lastWorkedIsoDate = ws.isoDate
      meta.lastWorkedConductorNames = ws.conductorName ? [ws.conductorName] : []
      meta.daysSinceLastWork = delta
      meta.lastWorkCompletionState = state
      meta.lastWorkNotes = ws.notes ?? ''
    } else if (ws.isoDate === meta.lastWorkedIsoDate && state === 'completed') {
      meta.lastWorkCompletionState = 'completed'
    }
  }

  for (const t of territories) {
    const meta = workByTerritory.get(t.id)!
    const segs = segmentsByTerritory.get(t.id) ?? []
    const tSessions = sessionsByTerritory.get(t.id) ?? []
    let latestSegWorkedIso: string | null = null

    for (const seg of segs) {
      if (!seg.lastWorkedIsoDate) continue
      const delta = diffIsoDays(seg.lastWorkedIsoDate, referenceIsoDate)
      if (delta < 0) continue
      if (!latestSegWorkedIso || seg.lastWorkedIsoDate > latestSegWorkedIso) {
        latestSegWorkedIso = seg.lastWorkedIsoDate
      }
      if (!meta.lastWorkedIsoDate || seg.lastWorkedIsoDate > meta.lastWorkedIsoDate) {
        meta.lastWorkedIsoDate = seg.lastWorkedIsoDate
        meta.daysSinceLastWork = delta
      }
    }

    // Build unified segment definitions for this territory (from `segments` collection + part letters in `workSessions`)
    const knownSegMap = new Map<
      string,
      { id: string; code: string; segRecord: TerritorySegmentRecord | null }
    >()
    for (const seg of segs) {
      const parsedSeg = parseTerritoryCode(seg.description)
      const normCode =
        parsedSeg.partLabel && parsedSeg.baseNumber === t.baseNumber
          ? parsedSeg.code
          : seg.description.trim()
      knownSegMap.set(normCode.toUpperCase(), {
        id: seg.id,
        code: normCode,
        segRecord: seg,
      })
    }

    // Also infer part segments (e.g. 03A, 03B) if `t` is a base territory and `workSessions` reference part letters
    if (!t.partLabel) {
      const lettersSeen = new Set<string>()
      for (const ws of tSessions) {
        if (!ws.territoryCodeRaw) continue
        const parsedRaw = stripTerritoryRawTokenToCode(ws.territoryCodeRaw, t.baseNumber)
        if (parsedRaw.partLabel && parsedRaw.baseNumber === t.baseNumber) {
          lettersSeen.add(parsedRaw.partLabel.toUpperCase())
        }
      }
      if (lettersSeen.size > 0) {
        const alphabet = ['A', 'B', 'C', 'D']
        let maxIdx = 1 // At least A and B when any letter is seen
        for (const l of lettersSeen) {
          const idx = alphabet.indexOf(l)
          if (idx > maxIdx) maxIdx = idx
        }
        for (let i = 0; i <= maxIdx; i += 1) {
          const code = `${t.baseNumber}${alphabet[i]}`
          if (!knownSegMap.has(code.toUpperCase())) {
            knownSegMap.set(code.toUpperCase(), {
              id: `virtual-seg:${t.id}:${code}`,
              code,
              segRecord: null,
            })
          }
        }
      }
    }

    const knownSegList = [...knownSegMap.values()].sort((a, b) =>
      compareTerritoryCodes(a.code, b.code),
    )

    if (knownSegList.length > 0) {
      // Evaluate each segment's latest work date and state
      const rawSegEvaluations = knownSegList.map((kSeg) => {
        let lastIso: string | null = kSeg.segRecord?.lastWorkedIsoDate ?? null
        let lastState: 'pending' | 'partial' | 'completed' =
          kSeg.segRecord?.status === 'completed' ? 'completed' : 'pending'

        // Check workSessions in chronological order (oldest -> newest) so newest wins
        const chronological = [...tSessions].reverse()
        for (const ws of chronological) {
          const wsState = ws.completionState ?? 'completed'
          const parsedRaw = ws.territoryCodeRaw
            ? stripTerritoryRawTokenToCode(ws.territoryCodeRaw, t.baseNumber)
            : null
          const isWholeTerritorySession =
            ws.segmentsWorked.length === 0 && (!parsedRaw || !parsedRaw.partLabel)
          const matchesThisSeg =
            isWholeTerritorySession ||
            ws.segmentsWorked.includes(kSeg.id) ||
            (parsedRaw?.partLabel &&
              parsedRaw.code.toUpperCase() === kSeg.code.toUpperCase())

          if (matchesThisSeg) {
            if (!lastIso || ws.isoDate >= lastIso) {
              lastIso = ws.isoDate
              lastState =
                wsState === 'partial' || wsState === 'incomplete'
                  ? 'partial'
                  : 'completed'
            }
          }
        }

        // If the segment document itself in Firestore was explicitly marked completed more recently
        if (kSeg.segRecord?.status === 'completed') {
          lastState = 'completed'
        }

        return {
          id: kSeg.id,
          code: kSeg.code,
          lastWorkedIsoDate: lastIso,
          rawState: lastState,
        }
      })

      // Determine current cycle anchor across the territory's segments
      let latestCycleSegIso: string | null = null
      for (const ev of rawSegEvaluations) {
        if (ev.lastWorkedIsoDate && (!latestCycleSegIso || ev.lastWorkedIsoDate > latestCycleSegIso)) {
          latestCycleSegIso = ev.lastWorkedIsoDate
        }
      }

      const cycleActive =
        latestCycleSegIso !== null &&
        diffIsoDays(latestCycleSegIso, referenceIsoDate) <= SIBLING_CYCLE_DAYS

      const evaluatedItems: TerritorySegmentStatusItem[] = rawSegEvaluations.map((ev) => {
        if (!cycleActive || !latestCycleSegIso) {
          return {
            id: ev.id,
            code: ev.code,
            status: ev.rawState === 'completed' ? 'completed' : 'pending',
            lastWorkedIsoDate: ev.lastWorkedIsoDate,
            isMissingInCycle: false,
          }
        }
        const workedInCurrentCycle =
          ev.lastWorkedIsoDate !== null &&
          diffIsoDays(ev.lastWorkedIsoDate, latestCycleSegIso) <= 30

        if (workedInCurrentCycle && ev.rawState === 'completed') {
          return {
            id: ev.id,
            code: ev.code,
            status: 'completed',
            lastWorkedIsoDate: ev.lastWorkedIsoDate,
            isMissingInCycle: false,
          }
        }
        if (workedInCurrentCycle && ev.rawState === 'partial') {
          return {
            id: ev.id,
            code: ev.code,
            status: 'partial',
            lastWorkedIsoDate: ev.lastWorkedIsoDate,
            isMissingInCycle: true,
          }
        }
        return {
          id: ev.id,
          code: ev.code,
          status: 'pending',
          lastWorkedIsoDate: ev.lastWorkedIsoDate,
          isMissingInCycle: true,
        }
      })

      const completedInCycle = evaluatedItems.filter((i) => i.status === 'completed')
      const missingInCycle = evaluatedItems.filter((i) => i.status !== 'completed')
      const hasMixedCycle =
        completedInCycle.length > 0 && missingInCycle.length > 0

      meta.segmentItems = evaluatedItems.map((item) => ({
        ...item,
        isMissingInCycle: hasMixedCycle ? item.status !== 'completed' : item.status === 'partial',
      }))
      meta.totalSegmentsCount = evaluatedItems.length
      meta.completedSegmentsCount = completedInCycle.length

      if (hasMixedCycle) {
        meta.missingSegmentIds = missingInCycle.map((m) => m.id)
        meta.missingSegmentCodes = missingInCycle.map((m) => m.code)
        meta.completedSegmentCodes = completedInCycle.map((c) => c.code)
      } else if (evaluatedItems.some((i) => i.status === 'partial')) {
        const partials = evaluatedItems.filter((i) => i.status === 'partial')
        meta.missingSegmentIds = partials.map((m) => m.id)
        meta.missingSegmentCodes = partials.map((m) => m.code)
        meta.completedSegmentCodes = completedInCycle.map((c) => c.code)
      }
    }

    const latestSessionIsIncomplete =
      (meta.lastWorkCompletionState === 'partial' ||
        meta.lastWorkCompletionState === 'incomplete') &&
      (!meta.latestCompletedSessionIso ||
        meta.latestCompletedSessionIso < (meta.lastWorkedIsoDate ?? ''))

    meta.hasIncompleteWork =
      latestSessionIsIncomplete || meta.missingSegmentCodes.length > 0

    if (meta.hasIncompleteWork) {
      // Latest execution was partial (`parte`), `Incompleto`, or only a subset of segments were completed in the cycle
      meta.effectiveCompletedIso = null
    } else if (meta.totalSegmentsCount > 0) {
      if (meta.completedSegmentsCount === meta.totalSegmentsCount) {
        meta.effectiveCompletedIso =
          meta.latestCompletedSessionIso ?? meta.lastWorkedIsoDate ?? latestSegWorkedIso
        if (meta.workCount === 0 && meta.effectiveCompletedIso) {
          meta.workCount = 1
        }
      } else if (meta.completedSegmentsCount > 0) {
        meta.effectiveCompletedIso = null
      } else {
        meta.effectiveCompletedIso = meta.latestCompletedSessionIso
      }
    } else {
      // Territory has no segment subdivisions -> latest completed workSession represents effective completion
      meta.effectiveCompletedIso = meta.latestCompletedSessionIso
    }
  }

  // 3. Separately track DESIGNATION metadata from `assignments` (never mixed with work!)
  type AssignMeta = {
    lastAssignedIsoDate: string | null
    lastAssignedLocationName: string | null
    lastAssignedConductorNames: string[]
    assignmentCount: number
  }
  const assignByTerritory = new Map<string, AssignMeta>()
  for (const t of territories) {
    assignByTerritory.set(t.id, {
      lastAssignedIsoDate: null,
      lastAssignedLocationName: null,
      lastAssignedConductorNames: [],
      assignmentCount: 0,
    })
  }

  const effectiveAssignments = assignments
    .filter((a) => a.status === 'assigned' && a.id !== excludeAssignmentId)
    .sort((a, b) => b.isoDate.localeCompare(a.isoDate) || b.startTime.localeCompare(a.startTime))

  for (const a of effectiveAssignments) {
    for (const tid of a.territoryIds) {
      const meta = assignByTerritory.get(tid)
      if (!meta) continue
      meta.assignmentCount += 1
      if (!meta.lastAssignedIsoDate || a.isoDate > meta.lastAssignedIsoDate) {
        meta.lastAssignedIsoDate = a.isoDate
        meta.lastAssignedLocationName = a.locationName || null
        meta.lastAssignedConductorNames = a.conductorNames
      }
    }
  }

  // 4. Group split territory parts (e.g. 17A, 17B within same region + baseNumber)
  const siblingGroups = new Map<string, TerritoryRecord[]>()
  for (const t of territories) {
    if (!t.partLabel) continue
    const key = `${t.regionName.trim().toLowerCase()}::${t.baseNumber}`
    const group = siblingGroups.get(key)
    if (group) group.push(t)
    else siblingGroups.set(key, [t])
  }
  for (const group of siblingGroups.values()) {
    group.sort((a, b) => compareTerritoryCodes(a.code, b.code))
  }

  const result = new Map<string, TerritoryStatusSnapshot>()

  for (const t of territories) {
    const wMeta = workByTerritory.get(t.id)!
    const aMeta = assignByTerritory.get(t.id)!
    const totalSegments = wMeta.totalSegmentsCount
    const completedSegments = wMeta.completedSegmentsCount
    const hasPartialSegments =
      (totalSegments > 0 && completedSegments > 0 && completedSegments < totalSegments) ||
      wMeta.missingSegmentCodes.length > 0

    const groupKey = t.partLabel ? `${t.regionName.trim().toLowerCase()}::${t.baseNumber}` : ''
    const siblings = groupKey ? (siblingGroups.get(groupKey) ?? []) : []
    const hasSplitGroup = siblings.length >= 2
    const siblingPartIds = hasSplitGroup ? siblings.filter((s) => s.id !== t.id).map((s) => s.id) : []

    let pendingSiblingCompletion = false
    let waitingForSiblingCodes: string[] = []
    let completedSiblingCodes: string[] = []

    if (hasSplitGroup) {
      // Find latest effective completion date across all parts of this base territory
      let latestCycleIso: string | null = null
      for (const sib of siblings) {
        const sibCompleted = workByTerritory.get(sib.id)?.effectiveCompletedIso ?? null
        if (sibCompleted && (!latestCycleIso || sibCompleted > latestCycleIso)) {
          latestCycleIso = sibCompleted
        }
      }

      if (latestCycleIso) {
        const cycleAgeDays = diffIsoDays(latestCycleIso, referenceIsoDate)
        if (cycleAgeDays >= 0 && cycleAgeDays <= SIBLING_CYCLE_DAYS) {
          const workedInCycle: TerritoryRecord[] = []
          const unworkedInCycle: TerritoryRecord[] = []
          for (const sib of siblings) {
            const sibCompleted = workByTerritory.get(sib.id)?.effectiveCompletedIso ?? null
            if (sibCompleted && diffIsoDays(sibCompleted, latestCycleIso) <= 30) {
              workedInCycle.push(sib)
            } else {
              unworkedInCycle.push(sib)
            }
          }

          if (workedInCycle.length > 0 && unworkedInCycle.length > 0) {
            if (unworkedInCycle.some((u) => u.id === t.id)) {
              pendingSiblingCompletion = true
              completedSiblingCodes = workedInCycle.map((w) => w.code)
            } else {
              waitingForSiblingCodes = unworkedInCycle.map((u) => u.code)
            }
          }
        }
      }
    }

    const isRecentWork =
      wMeta.daysSinceLastWork !== null &&
      wMeta.daysSinceLastWork >= 0 &&
      wMeta.daysSinceLastWork <= recentWindowDays

    let status: TerritoryWorkStatus = 'available'
    if (hasPartialSegments || wMeta.hasIncompleteWork || waitingForSiblingCodes.length > 0) {
      status = 'partial'
    } else if (pendingSiblingCompletion) {
      // Pending counterpart (e.g. 17B when 17A was worked recently) stays available/eligible!
      status = 'available'
    } else if (isRecentWork) {
      status = 'recent'
    }

    result.set(t.id, {
      territory: t,
      status,
      lastWorkedIsoDate: wMeta.lastWorkedIsoDate,
      lastWorkedConductorNames: wMeta.lastWorkedConductorNames,
      daysSinceLastWork: wMeta.daysSinceLastWork,
      workCount: wMeta.workCount,
      totalSegments,
      completedSegments,
      hasPartialSegments,
      hasIncompleteWork: wMeta.hasIncompleteWork,
      lastWorkCompletionState: wMeta.lastWorkCompletionState,
      lastWorkNotes: wMeta.lastWorkNotes,
      segmentItems: wMeta.segmentItems,
      missingSegmentIds: wMeta.missingSegmentIds,
      missingSegmentCodes: wMeta.missingSegmentCodes,
      completedSegmentCodes: wMeta.completedSegmentCodes,
      siblingPartIds,
      pendingSiblingCompletion,
      waitingForSiblingCodes,
      completedSiblingCodes,
      lastAssignedIsoDate: aMeta.lastAssignedIsoDate,
      lastAssignedLocationName: aMeta.lastAssignedLocationName,
      lastAssignedConductorNames: aMeta.lastAssignedConductorNames,
      assignmentCount: aMeta.assignmentCount,
    })
  }

  return result
}
