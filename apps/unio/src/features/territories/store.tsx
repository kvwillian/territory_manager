import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAccount } from '../../auth'
import { usePublisherCatalog } from '../publishers/catalog'
import { inferPublisherGender } from '../publishers/importGroups'
import {
  createRegionDoc,
  createTerritoryDocs,
  deleteAssignmentDoc,
  deleteRegionDoc,
  deleteRecurringDepartureDoc,
  deleteTerritoryDoc,
  importHistoryWorkSessionsBatch,
  loadTerritoriesBundle,
  saveAssignmentDoc,
  saveRecurringDepartureDoc,
  setRecurringDepartureActiveDoc,
  updateRegionDoc,
  updateTerritoryDoc,
  type CongregationUserLink,
  type CreateTerritoriesPayload,
  type ImportHistoryBatchResult,
  type ImportHistoryWorkSessionWriteItem,
  type SaveAssignmentPayload,
  type SaveRecurringDeparturePayload,
} from './api'
import { inferPeriodType, weekdayKeyFromIso } from './status'
import type {
  ConductorOption,
  MeetingLocationRecord,
  RecurringDepartureRecord,
  RegionRecord,
  TerritoryAssignmentRecord,
  TerritoryRecord,
  TerritorySegmentRecord,
  WeekdayKey,
  WorkSessionRecord,
} from './types'

export type SundayGroupOption = {
  id: string
  name: string
}

export type DefaultConductorsCriteria = {
  preachingSessionId?: string | null
  meetingLocationId?: string | null
  locationName?: string | null
  dayOfWeek?: WeekdayKey | null
  groupId?: string | null
  groupName?: string | null
  allowedTerritoryIds?: string[]
}

function normalizeGroupBaseName(raw: string): string {
  return raw
    .trim()
    .replace(/^grupo\s+/i, '')
    .replace(/^[a-z]\s*[-—–]\s*/i, '')
    .trim()
    .toLowerCase()
}

export type TerritoriesContextValue = {
  congregationId: string | null
  canManage: boolean
  ready: boolean
  error: string
  regions: RegionRecord[]
  territories: TerritoryRecord[]
  segments: TerritorySegmentRecord[]
  locations: MeetingLocationRecord[]
  recurringDepartures: RecurringDepartureRecord[]
  assignments: TerritoryAssignmentRecord[]
  workSessions: WorkSessionRecord[]
  conductorOptions: ConductorOption[]
  sundayGroups: SundayGroupOption[]
  reload: () => Promise<void>
  resolveConductors: (selectedNamesOrIds: string[]) => {
    publisherIds: string[]
    userIds: string[]
    names: string[]
  }
  getDefaultConductorsFor: (criteria: DefaultConductorsCriteria) => string[]
  createRegion: (name: string) => Promise<RegionRecord>
  renameRegion: (regionId: string, oldName: string, newName: string) => Promise<void>
  deleteRegion: (regionId: string) => Promise<void>
  createTerritories: (
    payload: Omit<CreateTerritoriesPayload, 'congregationId'>,
  ) => Promise<TerritoryRecord[]>
  updateTerritory: (
    territoryId: string,
    patch: {
      code: string
      name?: string
      regionId: string | null
      regionName: string
      address?: string
      imageUrl?: string
      mapsUrl?: string
      notes?: string
    },
  ) => Promise<void>
  deleteTerritory: (territoryId: string) => Promise<void>
  saveRecurringDeparture: (
    payload: Omit<
      SaveRecurringDeparturePayload,
      'congregationId' | 'conductorPublisherIds' | 'conductorUserIds'
    > & { conductorNames: string[] },
  ) => Promise<void>
  toggleRecurringDepartureActive: (sessionId: string, active: boolean) => Promise<void>
  deleteRecurringDeparture: (sessionId: string) => Promise<void>
  saveAssignment: (
    payload: Omit<
      SaveAssignmentPayload,
      'congregationId' | 'conductorPublisherIds' | 'conductorUserIds'
    > & { conductorNames: string[] },
  ) => Promise<string>
  deleteAssignment: (assignmentId: string) => Promise<void>
  importHistoryBatch: (params: {
    items: ImportHistoryWorkSessionWriteItem[]
    ignoredCount: number
  }) => Promise<ImportHistoryBatchResult>
}

const TerritoriesContext = createContext<TerritoriesContextValue | null>(null)

export function TerritoriesProvider({ children }: { children: ReactNode }) {
  const account = useAccount()
  const congregationId = account ? (account.congregationId || 'default') : null
  const canManage =
    account?.role === 'admin' ||
    Boolean(account?.manageFlags?.includes('territories'))

  const { publishers, groups: publisherGroups } = usePublisherCatalog()

  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [regions, setRegions] = useState<RegionRecord[]>([])
  const [territories, setTerritories] = useState<TerritoryRecord[]>([])
  const [segments, setSegments] = useState<TerritorySegmentRecord[]>([])
  const [locations, setLocations] = useState<MeetingLocationRecord[]>([])
  const [rawRecurringDepartures, setRawRecurringDepartures] = useState<RecurringDepartureRecord[]>([])
  const [fieldGroups, setFieldGroups] = useState<Array<{ id: string; name: string }>>([])
  const [rawAssignments, setRawAssignments] = useState<TerritoryAssignmentRecord[]>([])
  const [workSessions, setWorkSessions] = useState<WorkSessionRecord[]>([])
  const [users, setUsers] = useState<CongregationUserLink[]>([])

  const reload = useCallback(async () => {
    if (!congregationId) {
      setReady(true)
      return
    }
    try {
      setError('')
      const bundle = await loadTerritoriesBundle(congregationId)
      setRegions(bundle.regions)
      setTerritories(bundle.territories)
      setSegments(bundle.segments)
      setLocations(bundle.locations)
      setRawRecurringDepartures(bundle.recurringDepartures)
      setFieldGroups(bundle.fieldGroups)
      setRawAssignments(bundle.assignments)
      setWorkSessions(bundle.workSessions)
      setUsers(bundle.users)
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : 'Não foi possível carregar os dados de territórios.',
      )
    } finally {
      setReady(true)
    }
  }, [congregationId])

  useEffect(() => {
    void reload()
  }, [reload])

  const publisherById = useMemo(
    () => new Map(publishers.map((p) => [p.id, p])),
    [publishers],
  )

  const publisherByNormName = useMemo(() => {
    const map = new Map<string, (typeof publishers)[number]>()
    for (const p of publishers) {
      const norm = p.name.trim().toLowerCase()
      if (norm) map.set(norm, p)
    }
    return map
  }, [publishers])

  const userById = useMemo(
    () => new Map(users.map((u) => [u.uid, u])),
    [users],
  )

  const isMaleConductorName = useCallback(
    (rawName: string): boolean => {
      const trimmed = rawName.trim()
      if (!trimmed) return false
      const norm = trimmed.toLowerCase()
      const pub = publisherByNormName.get(norm)
      if (pub) {
        if (pub.status === 'inactive') return false
        return pub.gender === 'masculino'
      }
      const tokenMatch = publishers.find((p) => {
        if (p.status === 'inactive') return false
        const tokens = p.name.trim().toLowerCase().split(/\s+/)
        return tokens.includes(norm)
      })
      if (tokenMatch) {
        return tokenMatch.gender === 'masculino'
      }
      return inferPublisherGender(trimmed) === 'masculino'
    },
    [publisherByNormName, publishers],
  )

  // Only active male publishers and male users are eligible as conductors (Dirigentes)
  const conductorOptions = useMemo<ConductorOption[]>(() => {
    const userByPublisherId = new Map<string, CongregationUserLink>()
    const userByNormName = new Map<string, CongregationUserLink>()
    for (const u of users) {
      if (u.publisherId) userByPublisherId.set(u.publisherId, u)
      userByNormName.set(u.name.trim().toLowerCase(), u)
    }

    const list: ConductorOption[] = []
    const seenNormNames = new Set<string>()

    const activeMalePublishers = publishers.filter(
      (p) => p.status !== 'inactive' && p.gender === 'masculino',
    )
    for (const pub of activeMalePublishers) {
      const norm = pub.name.trim().toLowerCase()
      if (!norm) continue
      seenNormNames.add(norm)
      const linkedUser = userByPublisherId.get(pub.id) ?? userByNormName.get(norm)
      list.push({
        id: pub.id,
        publisherId: pub.id,
        userId: linkedUser?.uid ?? null,
        name: pub.name.trim(),
        groupId: pub.groupId,
      })
    }

    for (const u of users) {
      const norm = u.name.trim().toLowerCase()
      if (!norm || seenNormNames.has(norm)) continue
      const matchedPub =
        (u.publisherId ? publisherById.get(u.publisherId) : undefined) ??
        publisherByNormName.get(norm)
      if (matchedPub && (matchedPub.status === 'inactive' || matchedPub.gender === 'feminino')) {
        continue
      }
      if (!matchedPub && inferPublisherGender(u.name) === 'feminino') {
        continue
      }
      seenNormNames.add(norm)
      list.push({
        id: `user:${u.uid}`,
        publisherId: u.publisherId,
        userId: u.uid,
        name: u.name.trim(),
        groupId: matchedPub?.groupId ?? null,
      })
    }

    return list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }, [publishers, users, publisherById, publisherByNormName])

  const resolveMaleConductorNames = useCallback(
    (
      storedNames: string[],
      conductorPublisherIds: string[],
      conductorUserIds: string[],
    ): string[] => {
      const candidates: string[] = [...storedNames]
      for (const pubId of conductorPublisherIds) {
        const pub = publisherById.get(pubId) ?? userById.get(pubId)
        if (pub?.name) candidates.push(pub.name)
      }
      for (const uid of conductorUserIds) {
        const u = userById.get(uid)
        if (u?.publisherId) {
          const pub = publisherById.get(u.publisherId)
          if (pub?.name) candidates.push(pub.name)
        }
        if (u?.name) {
          candidates.push(u.name)
        } else {
          const pubFallback = publisherById.get(uid)
          if (pubFallback?.name) candidates.push(pubFallback.name)
        }
      }

      const result: string[] = []
      const seen = new Set<string>()
      for (const raw of candidates) {
        const clean = raw.trim()
        if (!clean || !isMaleConductorName(clean)) continue
        const norm = clean.toLowerCase()
        if (seen.has(norm)) continue
        seen.add(norm)
        result.push(clean)
      }
      return result
    },
    [publisherById, userById, isMaleConductorName],
  )

  const territoriesById = useMemo(
    () => new Map(territories.map((t) => [t.id, t])),
    [territories],
  )

  // Group leaders (Superintendente + Ajudante) configured in Grupos / Funções e habilitações
  const getGroupLeaderNames = useCallback(
    (
      groupId?: string | null,
      groupName?: string | null,
      locationName?: string | null,
      allowedTerritoryIds?: string[],
    ): string[] => {
      if (publisherGroups.length === 0) return []

      let matchedGroup = groupId
        ? publisherGroups.find((g) => g.id === groupId)
        : undefined

      if (!matchedGroup && groupName?.trim()) {
        const target = normalizeGroupBaseName(groupName)
        matchedGroup = publisherGroups.find(
          (g) =>
            g.name.trim().toLowerCase() === groupName.trim().toLowerCase() ||
            normalizeGroupBaseName(g.name) === target,
        )
      }

      if (!matchedGroup && locationName?.trim()) {
        const locNorm = normalizeGroupBaseName(locationName)
        matchedGroup = publisherGroups.find((g) => {
          const gBase = normalizeGroupBaseName(g.name)
          return Boolean(gBase && (locNorm === gBase || locNorm.includes(gBase)))
        })
      }

      if (!matchedGroup && allowedTerritoryIds && allowedTerritoryIds.length > 0) {
        const regionCounts = new Map<string, number>()
        for (const tid of allowedTerritoryIds) {
          const t = territoriesById.get(tid)
          if (!t?.regionName) continue
          regionCounts.set(t.regionName, (regionCounts.get(t.regionName) ?? 0) + 1)
        }
        let dominantRegion = ''
        let bestCount = 0
        for (const [reg, count] of regionCounts.entries()) {
          if (count > bestCount) {
            bestCount = count
            dominantRegion = reg
          }
        }
        if (dominantRegion) {
          const regNorm = normalizeGroupBaseName(dominantRegion)
          matchedGroup = publisherGroups.find((g) => {
            const gBase = normalizeGroupBaseName(g.name)
            return Boolean(gBase && (gBase === regNorm || gBase.startsWith(regNorm) || regNorm.startsWith(gBase)))
          })
        }
      }

      if (!matchedGroup) return []

      const names: string[] = []
      if (matchedGroup.superintendentPublisherId) {
        const sg = publisherById.get(matchedGroup.superintendentPublisherId)
        if (sg?.name && isMaleConductorName(sg.name)) {
          names.push(sg.name.trim())
        }
      }
      if (matchedGroup.assistantPublisherId) {
        const ast = publisherById.get(matchedGroup.assistantPublisherId)
        if (
          ast?.name &&
          isMaleConductorName(ast.name) &&
          !names.some((n) => n.toLowerCase() === ast.name.trim().toLowerCase())
        ) {
          names.push(ast.name.trim())
        }
      }
      return names
    },
    [publisherGroups, territoriesById, publisherById, isMaleConductorName],
  )

  // Enrich assignments with resolved male conductor names
  const assignments = useMemo<TerritoryAssignmentRecord[]>(() => {
    return rawAssignments.map((a) => {
      const resolvedNames = resolveMaleConductorNames(
        a.conductorNames,
        a.conductorPublisherIds,
        a.conductorUserIds,
      )
      return {
        ...a,
        conductorNames: resolvedNames,
      }
    })
  }, [rawAssignments, resolveMaleConductorNames])

  // Enrich recurringDepartures with previously set conductors and synthesize missing meetingLocations
  const recurringDepartures = useMemo<RecurringDepartureRecord[]>(() => {
    const findHistoricalConductors = (params: {
      sessionId?: string | null
      meetingLocationId?: string | null
      locationName?: string | null
      dayOfWeek?: WeekdayKey | null
      groupId?: string | null
      groupName?: string | null
      allowedTerritoryIds?: string[]
    }): string[] => {
      const normLoc = (params.locationName ?? '').trim().toLowerCase()

      // 1. Exact session match in assignments
      if (params.sessionId) {
        const bySession = assignments.find(
          (a) => a.preachingSessionId === params.sessionId && a.conductorNames.length > 0,
        )
        if (bySession) return bySession.conductorNames
      }

      // 2. Same location + same weekday in assignments
      if ((params.meetingLocationId || normLoc) && params.dayOfWeek) {
        const byLocAndDay = assignments.find((a) => {
          if (a.conductorNames.length === 0) return false
          if (weekdayKeyFromIso(a.isoDate) !== params.dayOfWeek) return false
          if (params.meetingLocationId && a.meetingLocationId === params.meetingLocationId) {
            return true
          }
          return Boolean(normLoc && a.locationName.trim().toLowerCase() === normLoc)
        })
        if (byLocAndDay) return byLocAndDay.conductorNames
      }

      // 3. Same location (any day) in assignments
      if (params.meetingLocationId || normLoc) {
        const byLoc = assignments.find((a) => {
          if (a.conductorNames.length === 0) return false
          if (params.meetingLocationId && a.meetingLocationId === params.meetingLocationId) {
            return true
          }
          return Boolean(normLoc && a.locationName.trim().toLowerCase() === normLoc)
        })
        if (byLoc) return byLoc.conductorNames
      }

      // 4. Same Sunday group in assignments
      if (params.groupId || params.groupName) {
        const normGrp = normalizeGroupBaseName(params.groupName ?? '')
        const byGroup = assignments.find((a) => {
          if (a.conductorNames.length === 0) return false
          if (params.groupId && a.groupId === params.groupId) return true
          return Boolean(normGrp && normalizeGroupBaseName(a.groupName ?? '') === normGrp)
        })
        if (byGroup) return byGroup.conductorNames
      }

      // 5. WorkSessions on allowed territories
      if (params.allowedTerritoryIds && params.allowedTerritoryIds.length > 0) {
        const allowedSet = new Set(params.allowedTerritoryIds)
        const ws = workSessions.find(
          (w) =>
            allowedSet.has(w.territoryId) &&
            Boolean(w.conductorName) &&
            isMaleConductorName(w.conductorName),
        )
        if (ws) return [ws.conductorName.trim()]
      }

      // 6. Group Superintendente & Ajudante
      return getGroupLeaderNames(
        params.groupId,
        params.groupName,
        params.locationName,
        params.allowedTerritoryIds,
      )
    }

    const hydrated: RecurringDepartureRecord[] = rawRecurringDepartures.map((rec) => {
      const explicitNames = resolveMaleConductorNames(
        rec.conductorNames,
        rec.conductorPublisherIds,
        rec.conductorUserIds,
      )
      const conductorNames =
        explicitNames.length > 0
          ? explicitNames
          : findHistoricalConductors({
              sessionId: rec.id,
              meetingLocationId: rec.meetingLocationId,
              locationName: rec.locationName,
              dayOfWeek: rec.dayOfWeek,
              groupId: rec.sundayGroupId,
              groupName: rec.sundayGroupName,
              allowedTerritoryIds: rec.allowedTerritoryIds,
            })

      return {
        ...rec,
        conductorNames,
      }
    })

    // Also include MeetingLocations from Firebase that don't yet have a preachingSessions document
    const coveredLocationIds = new Set(
      hydrated.map((r) => r.meetingLocationId).filter(Boolean),
    )
    const coveredLocationNames = new Set(
      hydrated.map((r) => r.locationName.trim().toLowerCase()).filter(Boolean),
    )

    for (const loc of locations) {
      if (
        coveredLocationIds.has(loc.id) ||
        coveredLocationNames.has(loc.name.trim().toLowerCase())
      ) {
        continue
      }

      const locAssignments = assignments.filter(
        (a) =>
          a.meetingLocationId === loc.id ||
          a.locationName.trim().toLowerCase() === loc.name.trim().toLowerCase(),
      )

      if (locAssignments.length > 0) {
        // Group by weekday so each scheduled day for this location is preserved
        const seenDays = new Set<WeekdayKey>()
        for (const a of locAssignments) {
          const day = weekdayKeyFromIso(a.isoDate)
          if (seenDays.has(day)) continue
          seenDays.add(day)
          const conductors =
            a.conductorNames.length > 0
              ? a.conductorNames
              : findHistoricalConductors({
                  meetingLocationId: loc.id,
                  locationName: loc.name,
                  dayOfWeek: day,
                  groupId: a.groupId,
                  groupName: a.groupName,
                  allowedTerritoryIds: loc.allowedTerritoryIds,
                })
          hydrated.push({
            id: seenDays.size === 1 ? `loc-session:${loc.id}` : `loc-session:${loc.id}:${day}`,
            congregationId: loc.congregationId,
            meetingLocationId: loc.id,
            locationName: loc.name,
            address: loc.address,
            dayOfWeek: day,
            startTime: a.startTime || '09:00',
            periodType: a.periodType || inferPeriodType(a.startTime || '09:00', day === 'sunday'),
            sundayGroupId: a.groupId,
            sundayGroupName: a.groupName,
            conductorPublisherIds: a.conductorPublisherIds,
            conductorUserIds: a.conductorUserIds,
            conductorNames: conductors,
            allowedTerritoryIds: loc.allowedTerritoryIds,
            active: true,
          })
        }
      } else {
        const conductors = findHistoricalConductors({
          meetingLocationId: loc.id,
          locationName: loc.name,
          allowedTerritoryIds: loc.allowedTerritoryIds,
        })
        hydrated.push({
          id: `loc-session:${loc.id}`,
          congregationId: loc.congregationId,
          meetingLocationId: loc.id,
          locationName: loc.name,
          address: loc.address,
          dayOfWeek: 'tuesday',
          startTime: '09:00',
          periodType: 'morning',
          sundayGroupId: null,
          sundayGroupName: null,
          conductorPublisherIds: [],
          conductorUserIds: [],
          conductorNames: conductors,
          allowedTerritoryIds: loc.allowedTerritoryIds,
          active: true,
        })
      }
    }

    const order: WeekdayKey[] = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ]
    return hydrated.sort((a, b) => {
      const dayDiff = order.indexOf(a.dayOfWeek) - order.indexOf(b.dayOfWeek)
      if (dayDiff !== 0) return dayDiff
      return a.startTime.localeCompare(b.startTime)
    })
  }, [
    rawRecurringDepartures,
    locations,
    assignments,
    workSessions,
    resolveMaleConductorNames,
    isMaleConductorName,
    getGroupLeaderNames,
  ])

  const getDefaultConductorsFor = useCallback(
    (criteria: DefaultConductorsCriteria): string[] => {
      const normLoc = (criteria.locationName ?? '').trim().toLowerCase()

      // 1. Recurring departure match
      if (criteria.preachingSessionId) {
        const rec = recurringDepartures.find((r) => r.id === criteria.preachingSessionId)
        if (rec && rec.conductorNames.length > 0) return rec.conductorNames
      }
      if ((criteria.meetingLocationId || normLoc) && criteria.dayOfWeek) {
        const recByLocDay = recurringDepartures.find((r) => {
          if (r.conductorNames.length === 0 || r.dayOfWeek !== criteria.dayOfWeek) return false
          if (criteria.meetingLocationId && r.meetingLocationId === criteria.meetingLocationId) {
            return true
          }
          return Boolean(normLoc && r.locationName.trim().toLowerCase() === normLoc)
        })
        if (recByLocDay) return recByLocDay.conductorNames
      }
      if (criteria.meetingLocationId || normLoc) {
        const recByLoc = recurringDepartures.find((r) => {
          if (r.conductorNames.length === 0) return false
          if (criteria.meetingLocationId && r.meetingLocationId === criteria.meetingLocationId) {
            return true
          }
          return Boolean(normLoc && r.locationName.trim().toLowerCase() === normLoc)
        })
        if (recByLoc) return recByLoc.conductorNames
      }
      if (criteria.groupId || criteria.groupName) {
        const normGrp = normalizeGroupBaseName(criteria.groupName ?? '')
        const recByGroup = recurringDepartures.find((r) => {
          if (r.conductorNames.length === 0) return false
          if (criteria.groupId && r.sundayGroupId === criteria.groupId) return true
          return Boolean(normGrp && normalizeGroupBaseName(r.sundayGroupName ?? '') === normGrp)
        })
        if (recByGroup) return recByGroup.conductorNames
      }

      // 2. Previous assignments match
      if ((criteria.meetingLocationId || normLoc) && criteria.dayOfWeek) {
        const aByLocDay = assignments.find((a) => {
          if (a.conductorNames.length === 0) return false
          if (weekdayKeyFromIso(a.isoDate) !== criteria.dayOfWeek) return false
          if (criteria.meetingLocationId && a.meetingLocationId === criteria.meetingLocationId) {
            return true
          }
          return Boolean(normLoc && a.locationName.trim().toLowerCase() === normLoc)
        })
        if (aByLocDay) return aByLocDay.conductorNames
      }
      if (criteria.meetingLocationId || normLoc) {
        const aByLoc = assignments.find((a) => {
          if (a.conductorNames.length === 0) return false
          if (criteria.meetingLocationId && a.meetingLocationId === criteria.meetingLocationId) {
            return true
          }
          return Boolean(normLoc && a.locationName.trim().toLowerCase() === normLoc)
        })
        if (aByLoc) return aByLoc.conductorNames
      }
      if (criteria.groupId || criteria.groupName) {
        const normGrp = normalizeGroupBaseName(criteria.groupName ?? '')
        const aByGroup = assignments.find((a) => {
          if (a.conductorNames.length === 0) return false
          if (criteria.groupId && a.groupId === criteria.groupId) return true
          return Boolean(normGrp && normalizeGroupBaseName(a.groupName ?? '') === normGrp)
        })
        if (aByGroup) return aByGroup.conductorNames
      }
      if (criteria.dayOfWeek) {
        const aByDay = assignments.find(
          (a) => a.conductorNames.length > 0 && weekdayKeyFromIso(a.isoDate) === criteria.dayOfWeek,
        )
        if (aByDay) return aByDay.conductorNames
      }

      // 3. Group leaders (Superintendente & Ajudante)
      const groupLeaders = getGroupLeaderNames(
        criteria.groupId,
        criteria.groupName,
        criteria.locationName,
        criteria.allowedTerritoryIds,
      )
      if (groupLeaders.length > 0) return groupLeaders

      return []
    },
    [recurringDepartures, assignments, getGroupLeaderNames],
  )

  const sundayGroups = useMemo<SundayGroupOption[]>(() => {
    const merged = new Map<string, SundayGroupOption>()
    for (const g of publisherGroups) {
      if (g.name.trim()) {
        merged.set(g.id, { id: g.id, name: g.name.trim() })
      }
    }
    for (const fg of fieldGroups) {
      const existsByName = [...merged.values()].some(
        (item) => item.name.toLowerCase() === fg.name.toLowerCase(),
      )
      if (!existsByName && fg.name.trim()) {
        merged.set(fg.id, { id: fg.id, name: fg.name.trim() })
      }
    }
    return [...merged.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }, [publisherGroups, fieldGroups])

  const resolveConductors = useCallback(
    (names: string[]) => {
      const cleanNames: string[] = []
      const publisherIds: string[] = []
      const userIds: string[] = []
      const seen = new Set<string>()

      for (const raw of names) {
        const trimmed = raw.trim()
        if (!trimmed || !isMaleConductorName(trimmed)) continue
        const norm = trimmed.toLowerCase()
        if (seen.has(norm)) continue
        seen.add(norm)
        cleanNames.push(trimmed)

        const match = conductorOptions.find((opt) => opt.name.toLowerCase() === norm)
        if (match?.publisherId) publisherIds.push(match.publisherId)
        if (match?.userId) userIds.push(match.userId)
      }

      return { publisherIds, userIds, names: cleanNames }
    },
    [conductorOptions, isMaleConductorName],
  )

  const value = useMemo<TerritoriesContextValue>(
    () => ({
      congregationId,
      canManage,
      ready,
      error,
      regions,
      territories,
      segments,
      locations,
      recurringDepartures,
      assignments,
      workSessions,
      conductorOptions,
      sundayGroups,
      reload,
      resolveConductors,
      getDefaultConductorsFor,
      async createRegion(name) {
        if (!congregationId) throw new Error('Congregação não identificada.')
        const created = await createRegionDoc(congregationId, name)
        await reload()
        return created
      },
      async renameRegion(regionId, oldName, newName) {
        if (!congregationId) throw new Error('Congregação não identificada.')
        await updateRegionDoc({
          congregationId,
          regionId,
          newName,
          oldName,
          territories,
        })
        await reload()
      },
      async deleteRegion(regionId) {
        await deleteRegionDoc(regionId)
        await reload()
      },
      async createTerritories(payload) {
        if (!congregationId) throw new Error('Congregação não identificada.')
        const created = await createTerritoryDocs({
          ...payload,
          congregationId,
        })
        await reload()
        return created
      },
      async updateTerritory(territoryId, patch) {
        await updateTerritoryDoc(territoryId, patch)
        await reload()
      },
      async deleteTerritory(territoryId) {
        await deleteTerritoryDoc(territoryId, segments)
        await reload()
      },
      async saveRecurringDeparture(payload) {
        if (!congregationId) throw new Error('Congregação não identificada.')
        const resolved = resolveConductors(payload.conductorNames)
        await saveRecurringDepartureDoc(
          {
            ...payload,
            congregationId,
            conductorPublisherIds: resolved.publisherIds,
            conductorUserIds: resolved.userIds,
            conductorNames: resolved.names,
          },
          locations,
          recurringDepartures,
        )
        await reload()
      },
      async toggleRecurringDepartureActive(sessionId, active) {
        if (sessionId.startsWith('loc-session:')) {
          const item = recurringDepartures.find((r) => r.id === sessionId)
          if (item && congregationId) {
            const resolved = resolveConductors(item.conductorNames)
            await saveRecurringDepartureDoc(
              {
                id: item.id,
                congregationId,
                meetingLocationId: item.meetingLocationId,
                locationName: item.locationName,
                address: item.address,
                dayOfWeek: item.dayOfWeek,
                startTime: item.startTime,
                periodType: item.periodType,
                sundayGroupId: item.sundayGroupId,
                sundayGroupName: item.sundayGroupName,
                conductorPublisherIds: resolved.publisherIds,
                conductorUserIds: resolved.userIds,
                conductorNames: resolved.names,
                allowedTerritoryIds: item.allowedTerritoryIds,
                active,
              },
              locations,
              recurringDepartures,
            )
            await reload()
          }
          return
        }
        setRawRecurringDepartures((curr) =>
          curr.map((item) => (item.id === sessionId ? { ...item, active } : item)),
        )
        await setRecurringDepartureActiveDoc(sessionId, active)
        await reload()
      },
      async deleteRecurringDeparture(sessionId) {
        await deleteRecurringDepartureDoc(sessionId)
        await reload()
      },
      async saveAssignment(payload) {
        if (!congregationId) throw new Error('Congregação não identificada.')
        const resolved = resolveConductors(payload.conductorNames)
        const id = await saveAssignmentDoc({
          ...payload,
          congregationId,
          conductorPublisherIds: resolved.publisherIds,
          conductorUserIds: resolved.userIds,
          conductorNames: resolved.names,
        })
        await reload()
        return id
      },
      async deleteAssignment(assignmentId) {
        await deleteAssignmentDoc(assignmentId)
        await reload()
      },
      async importHistoryBatch({ items, ignoredCount }) {
        if (!congregationId) throw new Error('Congregação não identificada.')
        const res = await importHistoryWorkSessionsBatch({
          congregationId,
          items,
          ignoredCount,
        })
        await reload()
        return res
      },
    }),
    [
      congregationId,
      canManage,
      ready,
      error,
      regions,
      territories,
      segments,
      locations,
      recurringDepartures,
      assignments,
      workSessions,
      conductorOptions,
      sundayGroups,
      reload,
      resolveConductors,
      getDefaultConductorsFor,
    ],
  )

  return <TerritoriesContext.Provider value={value}>{children}</TerritoriesContext.Provider>
}

export function useTerritories(): TerritoriesContextValue {
  const ctx = useContext(TerritoriesContext)
  if (!ctx) {
    throw new Error('useTerritories must be used inside TerritoriesProvider')
  }
  return ctx
}
