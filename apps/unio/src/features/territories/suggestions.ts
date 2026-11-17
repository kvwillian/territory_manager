import {
  compareTerritories,
  compareTerritoryCodes,
  computeTerritoryStatuses,
  formatShortDayMonth,
  HARD_RECENT_DAYS_WINDOW,
  parseTerritoryCode,
  RECENT_DAYS_WINDOW,
  weekdayKeyFromIso,
} from './status'
import type {
  DeparturePeriodType,
  TerritoryAssignmentRecord,
  TerritoryRecord,
  TerritorySegmentRecord,
  TerritoryStatusSnapshot,
  WeekdayKey,
  WorkSessionRecord,
} from './types'

export type SuggestedTerritoryItem = {
  territory: TerritoryRecord
  snapshot: TerritoryStatusSnapshot
  priorityTier: 1 | 2 | 3
  reasons: string[]
}

export type DiscardedTerritoryItem = {
  territory: TerritoryRecord
  kind: 'recent' | 'waitingSibling' | 'conflict'
  reason: string
}

export type PartiallyCompletedHighlight = {
  territory: TerritoryRecord
  detail: string
}

export type ConflictTerritoryItem = {
  territory: TerritoryRecord
  conflictingLocationName: string
  conflictingStartTime: string
}

export type TerritorySuggestionResult = {
  recommended: SuggestedTerritoryItem[]
  summaryReasons: string[]
  discarded: DiscardedTerritoryItem[]
  discardedRecent: DiscardedTerritoryItem[]
  partiallyCompleted: PartiallyCompletedHighlight[]
  conflicts: ConflictTerritoryItem[]
  defaultVolume: number
  targetVolume: number
  hasAlternatives: boolean
}

export function defaultVolumeForDeparture(
  dayOfWeek: WeekdayKey,
  periodType: DeparturePeriodType,
): number {
  if (periodType === 'sunday' || dayOfWeek === 'sunday') return 2
  if (dayOfWeek === 'saturday') return 3
  return 2
}

export function suggestTerritories(params: {
  isoDate: string
  periodType: DeparturePeriodType
  meetingLocationId: string | null
  allowedTerritoryIds: string[] | null
  territories: TerritoryRecord[]
  segments: TerritorySegmentRecord[]
  assignments: TerritoryAssignmentRecord[]
  workSessions: WorkSessionRecord[]
  currentAssignmentId?: string
  requestedVolume?: number
  variationIndex?: number
  recentWindowDays?: number
}): TerritorySuggestionResult {
  const {
    isoDate,
    periodType,
    allowedTerritoryIds,
    territories,
    segments,
    assignments,
    workSessions,
    currentAssignmentId,
    requestedVolume,
    variationIndex = 0,
    recentWindowDays = RECENT_DAYS_WINDOW,
  } = params

  const dayOfWeek = weekdayKeyFromIso(isoDate)
  const defaultVolume = defaultVolumeForDeparture(dayOfWeek, periodType)
  const targetVolume = Math.max(1, requestedVolume ?? defaultVolume)

  // Rule 4 — Respect allowed territories for the selected departure/location
  const allowedSet =
    allowedTerritoryIds && allowedTerritoryIds.length > 0 ? new Set(allowedTerritoryIds) : null
  const pool = (
    allowedSet ? territories.filter((t) => allowedSet.has(t.id)) : [...territories]
  ).sort(compareTerritories)

  // Statuses computed strictly from effective work (workSessions + segments), never from past assignments
  const statuses = computeTerritoryStatuses({
    territories,
    segments,
    assignments,
    workSessions,
    referenceIsoDate: isoDate,
    excludeAssignmentId: currentAssignmentId,
    recentWindowDays,
  })

  // Rule 6 — Prevent conflicts with other departures/groups on the SAME day (uses assignments)
  const sameDayOtherAssignments = assignments.filter(
    (a) => a.isoDate === isoDate && a.id !== currentAssignmentId && a.territoryIds.length > 0,
  )
  const conflictMap = new Map<string, { locationName: string; startTime: string }>()
  for (const other of sameDayOtherAssignments) {
    for (const tid of other.territoryIds) {
      if (!conflictMap.has(tid)) {
        conflictMap.set(tid, {
          locationName: other.locationName || 'Outra saída do dia',
          startTime: other.startTime,
        })
      }
    }
  }

  // Rule 3 continuity anchor: derived STRICTLY from the most recently WORKED territory in this location's pool
  let anchorTerritory: TerritoryRecord | null = null
  let latestWorkedIso = ''
  for (const t of pool) {
    const snap = statuses.get(t.id)
    const workedIso = snap?.lastWorkedIsoDate ?? null
    if (!workedIso || workedIso >= isoDate) continue
    if (!latestWorkedIso || workedIso > latestWorkedIso) {
      latestWorkedIso = workedIso
      anchorTerritory = t
    } else if (workedIso === latestWorkedIso && anchorTerritory) {
      if (compareTerritoryCodes(t.code, anchorTerritory.code) > 0) {
        anchorTerritory = t
      }
    }
  }

  const discarded: DiscardedTerritoryItem[] = []
  const discardedRecent: DiscardedTerritoryItem[] = []
  const partiallyCompleted: PartiallyCompletedHighlight[] = []
  const conflicts: ConflictTerritoryItem[] = []

  type ScoredCandidate = {
    territory: TerritoryRecord
    snapshot: TerritoryStatusSnapshot
    tier: 1 | 2 | 3
    continuityDistance: number
    sameRegionAsAnchor: boolean
    ageSortKey: number
    reasons: string[]
  }

  const primaryCandidates: ScoredCandidate[] = []
  const softRecentFallbacks: ScoredCandidate[] = []

  const anchorParsed = anchorTerritory ? parseTerritoryCode(anchorTerritory.code) : null

  for (const territory of pool) {
    const snap = statuses.get(territory.id)
    if (!snap) continue

    // Rule 6: Same-day conflict check
    const conflict = conflictMap.get(territory.id)
    if (conflict) {
      const timeSuffix = conflict.startTime ? ` (${conflict.startTime})` : ''
      const reason = `Em conflito: já designado em ${conflict.locationName}${timeSuffix}`
      conflicts.push({
        territory,
        conflictingLocationName: conflict.locationName,
        conflictingStartTime: conflict.startTime,
      })
      discarded.push({ territory, kind: 'conflict', reason })
      continue
    }

    // Completed half of a split territory waiting for its counterpart (e.g. 17A completed, waiting 17B)
    if (
      snap.waitingForSiblingCodes.length > 0 &&
      !snap.hasPartialSegments &&
      !snap.hasIncompleteWork
    ) {
      const waitingLabel = snap.waitingForSiblingCodes.join(', ')
      const reason = `parcial – aguarda ${waitingLabel}`
      discarded.push({ territory, kind: 'waitingSibling', reason })
      continue
    }

    // Rule 1 — MAXIMUM PRIORITY: Partially worked territories (evaluated BEFORE Rule 2's 10–15 day window!)
    // Includes:
    // - Unworked counterparts of a started split territory (e.g. 17B when 17A was worked recently)
    // - Territories with partially completed segments
    // - Territories whose latest workSession was partial (`parte`) or `Incompleto`
    const isPendingPartialCompletion =
      snap.pendingSiblingCompletion || snap.hasPartialSegments || Boolean(snap.hasIncompleteWork)
    if (isPendingPartialCompletion) {
      if (snap.hasIncompleteWork) {
        const stateLabel =
          snap.lastWorkCompletionState === 'incomplete'
            ? 'Incompleto'
            : 'Parcialmente trabalhado (parte)'
        const dateSuffix = snap.lastWorkedIsoDate
          ? ` em ${formatShortDayMonth(snap.lastWorkedIsoDate)}`
          : ''
        partiallyCompleted.push({
          territory,
          detail: `${stateLabel}${dateSuffix} — priorizar conclusão`,
        })
      } else if (snap.pendingSiblingCompletion) {
        partiallyCompleted.push({
          territory,
          detail: `Concluir território ${territory.baseNumber} (${snap.completedSiblingCodes.join(', ')} já trabalhado)`,
        })
      } else if (snap.hasPartialSegments) {
        partiallyCompleted.push({
          territory,
          detail: `Parcialmente concluído em campo (${snap.completedSegments}/${snap.totalSegments} trechos)`,
        })
      }

      primaryCandidates.push(
        scoreCandidate({
          territory,
          snap,
          tier: 1,
          anchorTerritory,
          anchorParsed,
        }),
      )
      continue
    }

    // Rule 2 — Avoid repeating territories effectively WORKED in the last 10–15 days
    const days = snap.daysSinceLastWork
    if (days !== null && days <= recentWindowDays) {
      const dateStr = snap.lastWorkedIsoDate
        ? formatShortDayMonth(snap.lastWorkedIsoDate)
        : 'recentemente'
      const item: DiscardedTerritoryItem = {
        territory,
        kind: 'recent',
        reason: `trabalhado em ${dateStr} (há ${days} ${days === 1 ? 'dia' : 'dias'})`,
      }
      discarded.push(item)
      discardedRecent.push(item)

      if (days > HARD_RECENT_DAYS_WINDOW) {
        softRecentFallbacks.push(
          scoreCandidate({
            territory,
            snap,
            tier: 3,
            anchorTerritory,
            anchorParsed,
            extraReason: `Trabalhado há ${days} dias (usado apenas se não houver opções mais antigas).`,
          }),
        )
      }
      continue
    }

    primaryCandidates.push(
      scoreCandidate({
        territory,
        snap,
        tier: 2,
        anchorTerritory,
        anchorParsed,
      }),
    )
  }

  // Sort candidates following Rules 1 -> 3 -> 5
  const sortCandidates = (list: ScoredCandidate[]) =>
    list.sort((a, b) => {
      // Rule 1: Tier 1 (pending partial completions) ALWAYS comes before Tier 2
      if (a.tier !== b.tier) return a.tier - b.tier

      // Rule 3: Continuity within anchor region
      if (a.sameRegionAsAnchor !== b.sameRegionAsAnchor) {
        return a.sameRegionAsAnchor ? -1 : 1
      }

      const aImmediate = a.continuityDistance >= 1 && a.continuityDistance <= 4
      const bImmediate = b.continuityDistance >= 1 && b.continuityDistance <= 4
      if (aImmediate !== bImmediate) {
        return aImmediate ? -1 : 1
      }
      if (aImmediate && bImmediate && a.continuityDistance !== b.continuityDistance) {
        return a.continuityDistance - b.continuityDistance
      }

      // Rule 5: Oldest unworked first (never worked = 100_000, then largest daysSinceLastWork)
      if (a.ageSortKey !== b.ageSortKey) {
        return b.ageSortKey - a.ageSortKey
      }

      return compareTerritories(a.territory, b.territory)
    })

  sortCandidates(primaryCandidates)
  sortCandidates(softRecentFallbacks)

  const orderedPool = [...primaryCandidates, ...softRecentFallbacks]
  if (orderedPool.length === 0) {
    return {
      recommended: [],
      summaryReasons: [],
      discarded,
      discardedRecent,
      partiallyCompleted,
      conflicts,
      defaultVolume,
      targetVolume,
      hasAlternatives: false,
    }
  }

  const picked = pickCohesiveWindow(orderedPool, targetVolume, variationIndex)

  const recommended: SuggestedTerritoryItem[] = picked.map((c) => ({
    territory: c.territory,
    snapshot: c.snapshot,
    priorityTier: c.tier,
    reasons: c.reasons,
  }))

  const summaryReasons = buildSummaryReasons({
    recommended,
    anchorTerritory,
    hasAllowedRestriction: Boolean(allowedSet),
    recentWindowDays,
  })

  return {
    recommended,
    summaryReasons,
    discarded,
    discardedRecent,
    partiallyCompleted,
    conflicts,
    defaultVolume,
    targetVolume,
    hasAlternatives: orderedPool.length > recommended.length,
  }
}

function scoreCandidate(params: {
  territory: TerritoryRecord
  snap: TerritoryStatusSnapshot
  tier: 1 | 2 | 3
  anchorTerritory: TerritoryRecord | null
  anchorParsed: ReturnType<typeof parseTerritoryCode> | null
  extraReason?: string
}) {
  const { territory, snap, tier, anchorTerritory, anchorParsed, extraReason } = params
  const parsed = parseTerritoryCode(territory.code)

  const sameRegionAsAnchor = anchorTerritory
    ? territory.regionName.trim().toLowerCase() === anchorTerritory.regionName.trim().toLowerCase()
    : false

  let continuityDistance = 999
  if (
    sameRegionAsAnchor &&
    anchorParsed &&
    anchorParsed.numericValue !== null &&
    parsed.numericValue !== null
  ) {
    const diff = parsed.numericValue - anchorParsed.numericValue
    continuityDistance = diff > 0 ? diff : 100 + Math.abs(diff)
  }

  const ageSortKey = snap.daysSinceLastWork === null ? 100_000 : snap.daysSinceLastWork

  const reasons: string[] = []
  if (snap.hasIncompleteWork) {
    const stateLabel =
      snap.lastWorkCompletionState === 'incomplete'
        ? 'incompleto'
        : 'parcialmente trabalhado (parte)'
    const dateSuffix = snap.lastWorkedIsoDate
      ? ` em ${formatShortDayMonth(snap.lastWorkedIsoDate)}`
      : ''
    reasons.push(
      `Prioridade máxima: território registrado como ${stateLabel}${dateSuffix} — concluir pendência.`,
    )
  }
  if (snap.pendingSiblingCompletion) {
    reasons.push(
      `Prioridade máxima: conclui o território ${territory.baseNumber} (${snap.completedSiblingCodes.join(', ')} já foi trabalhado).`,
    )
  }
  if (snap.hasPartialSegments) {
    reasons.push(
      `Prioridade máxima: conclui trechos pendentes (${snap.completedSegments}/${snap.totalSegments} já trabalhados).`,
    )
  }
  if (sameRegionAsAnchor && anchorTerritory && continuityDistance >= 1 && continuityDistance <= 4) {
    reasons.push(
      `Dá continuidade à região ${territory.regionName} (${anchorTerritory.code} já foi trabalhado).`,
    )
  }
  if (snap.daysSinceLastWork === null) {
    reasons.push('Ainda sem registro de trabalho efetivo.')
  } else if (snap.daysSinceLastWork > RECENT_DAYS_WINDOW) {
    reasons.push(
      `Sem trabalhar há ${snap.daysSinceLastWork} dias (último trabalho em ${formatShortDayMonth(snap.lastWorkedIsoDate!)}).`,
    )
  }
  if (extraReason) {
    reasons.push(extraReason)
  }

  return {
    territory,
    snapshot: snap,
    tier,
    continuityDistance,
    sameRegionAsAnchor,
    ageSortKey,
    reasons,
  }
}

function pickCohesiveWindow<
  T extends {
    territory: TerritoryRecord
    tier: 1 | 2 | 3
    ageSortKey: number
  },
>(ordered: T[], count: number, variationIndex: number): T[] {
  if (ordered.length <= count) {
    return [...ordered].sort((a, b) => compareTerritories(a.territory, b.territory))
  }

  // Always preserve Tier 1 (pending partial completions) even if user explores alternatives,
  // unless there are more Tier 1 items than `count`, in which case rotate within Tier 1 first!
  const tier1 = ordered.filter((item) => item.tier === 1)
  const nonTier1 = ordered.filter((item) => item.tier !== 1)

  const selected: T[] = []
  const usedIds = new Set<string>()
  const normalizedVar = Math.max(0, variationIndex)

  if (tier1.length >= count) {
    const start = (normalizedVar * count) % tier1.length
    for (let i = 0; i < count; i += 1) {
      const pick = tier1[(start + i) % tier1.length]!
      if (!usedIds.has(pick.territory.id)) {
        usedIds.add(pick.territory.id)
        selected.push(pick)
      }
    }
    return selected.sort((a, b) => compareTerritories(a.territory, b.territory))
  }

  for (const urgent of tier1) {
    selected.push(urgent)
    usedIds.add(urgent.territory.id)
  }

  const remainingNeeded = count - selected.length
  if (remainingNeeded <= 0 || nonTier1.length === 0) {
    return selected.sort((a, b) => compareTerritories(a.territory, b.territory))
  }

  const startIdx = (normalizedVar * Math.max(1, remainingNeeded)) % nonTier1.length
  const lead = selected[0] ?? nonTier1[startIdx]!
  if (!usedIds.has(lead.territory.id)) {
    selected.push(lead)
    usedIds.add(lead.territory.id)
  }

  const leadNum = parseTerritoryCode(lead.territory.code).numericValue
  const leadRegion = lead.territory.regionName.trim().toLowerCase()

  const poolRest = nonTier1.filter((item) => !usedIds.has(item.territory.id))
  poolRest.sort((a, b) => {
    const aSameRegion = a.territory.regionName.trim().toLowerCase() === leadRegion
    const bSameRegion = b.territory.regionName.trim().toLowerCase() === leadRegion
    if (aSameRegion !== bSameRegion) return aSameRegion ? -1 : 1

    if (aSameRegion && bSameRegion && leadNum !== null) {
      const aNum = parseTerritoryCode(a.territory.code).numericValue
      const bNum = parseTerritoryCode(b.territory.code).numericValue
      if (aNum !== null && bNum !== null) {
        const aGap = aNum >= leadNum ? aNum - leadNum : 50 + (leadNum - aNum)
        const bGap = bNum >= leadNum ? bNum - leadNum : 50 + (leadNum - bNum)
        if (aGap !== bGap) return aGap - bGap
      }
    }

    if (a.ageSortKey !== b.ageSortKey) return b.ageSortKey - a.ageSortKey
    return compareTerritories(a.territory, b.territory)
  })

  for (const candidate of poolRest) {
    if (selected.length >= count) break
    selected.push(candidate)
  }

  return selected.sort((a, b) => compareTerritories(a.territory, b.territory))
}

function buildSummaryReasons(params: {
  recommended: SuggestedTerritoryItem[]
  anchorTerritory: TerritoryRecord | null
  hasAllowedRestriction: boolean
  recentWindowDays: number
}): string[] {
  const { recommended, anchorTerritory, hasAllowedRestriction, recentWindowDays } = params
  if (recommended.length === 0) return []

  const bullets: string[] = []
  const plural = recommended.length > 1

  const partialWork = recommended.find((r) => r.snapshot.hasIncompleteWork)
  const partialSibling = recommended.find((r) => r.snapshot.pendingSiblingCompletion)
  const partialSeg = recommended.find((r) => r.snapshot.hasPartialSegments)

  if (partialWork) {
    const label =
      partialWork.snapshot.lastWorkCompletionState === 'incomplete'
        ? 'incompleto'
        : 'parcial (parte)'
    bullets.push(
      `Prioriza concluir o território ${partialWork.territory.code} (registrado como ${label}).`,
    )
  }
  if (partialSibling) {
    bullets.push(
      `Prioriza concluir o território ${partialSibling.territory.baseNumber} (${partialSibling.snapshot.completedSiblingCodes.join(', ')} já foi trabalhado).`,
    )
  }
  if (partialSeg) {
    bullets.push(
      `Prioriza concluir o território ${partialSeg.territory.code} (${partialSeg.snapshot.completedSegments}/${partialSeg.snapshot.totalSegments} trechos realizados).`,
    )
  }

  const nonPartialItems = recommended.filter(
    (r) =>
      !r.snapshot.pendingSiblingCompletion &&
      !r.snapshot.hasPartialSegments &&
      !r.snapshot.hasIncompleteWork,
  )
  const allNonPartialRespectRecent =
    nonPartialItems.length > 0 &&
    nonPartialItems.every(
      (r) => r.snapshot.daysSinceLastWork === null || r.snapshot.daysSinceLastWork > recentWindowDays,
    )
  if (allNonPartialRespectRecent) {
    bullets.push(
      plural
        ? `Não foram trabalhados nos últimos ${recentWindowDays} dias.`
        : `Não foi trabalhado nos últimos ${recentWindowDays} dias.`,
    )
  }

  if (
    anchorTerritory &&
    recommended.some(
      (r) => r.territory.regionName.toLowerCase() === anchorTerritory.regionName.toLowerCase(),
    )
  ) {
    bullets.push(`Dão continuidade à região (${anchorTerritory.code} já foi trabalhado).`)
  } else if (recommended.length >= 2) {
    const regions = new Set(recommended.map((r) => r.territory.regionName))
    if (regions.size === 1) {
      bullets.push(`Mantêm sequência contínua na região ${recommended[0]!.territory.regionName}.`)
    }
  }

  const oldest = recommended
    .map((r) => r.snapshot.daysSinceLastWork)
    .filter((d): d is number => d !== null)
  if (recommended.some((r) => r.snapshot.daysSinceLastWork === null)) {
    bullets.push(
      plural
        ? 'Priorizam territórios sem registro de trabalho recente.'
        : 'Prioriza território sem registro de trabalho recente.',
    )
  } else if (oldest.length > 0 && bullets.length < 3) {
    const maxDays = Math.max(...oldest)
    bullets.push(`Priorizam territórios mais antigos (até ${maxDays} dias sem trabalho).`)
  }

  if (hasAllowedRestriction) {
    bullets.push(plural ? 'Estão disponíveis neste local.' : 'Está disponível neste local.')
  }

  return bullets.slice(0, 4)
}
