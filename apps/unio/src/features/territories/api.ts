import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { isoFromDate } from '../../domain/dates'
import { auth, db, functions } from '../../firebase'
import { compareTerritories, compareTerritoryCodes, inferPeriodType, parseTerritoryCode } from './status'
import type {
  DeparturePeriodType,
  MeetingLocationRecord,
  RecurringDepartureRecord,
  RegionRecord,
  TerritoryAssignmentRecord,
  TerritoryRecord,
  TerritorySegmentRecord,
  TerritorySnapshotItem,
  WeekdayKey,
  WorkSessionCompletionState,
  WorkSessionRecord,
} from './types'

export type CongregationUserLink = {
  uid: string
  name: string
  publisherId: string | null
  role: string
}

export type LoadedTerritoriesBundle = {
  regions: RegionRecord[]
  territories: TerritoryRecord[]
  segments: TerritorySegmentRecord[]
  locations: MeetingLocationRecord[]
  recurringDepartures: RecurringDepartureRecord[]
  fieldGroups: Array<{ id: string; name: string }>
  assignments: TerritoryAssignmentRecord[]
  workSessions: WorkSessionRecord[]
  users: CongregationUserLink[]
}

export function isoToNoonTimestamp(isoDate: string): Timestamp {
  const [y, m, d] = isoDate.split('-').map(Number)
  if (!y || !m || !d) {
    const now = new Date()
    now.setHours(12, 0, 0, 0)
    return Timestamp.fromDate(now)
  }
  return Timestamp.fromDate(new Date(y, m - 1, d, 12, 0, 0, 0))
}

export function firestoreDateToIso(raw: unknown): string | null {
  if (!raw) return null
  if (raw instanceof Timestamp) {
    return isoFromDate(raw.toDate())
  }
  if (typeof raw === 'object' && raw !== null && 'toDate' in raw && typeof (raw as { toDate: unknown }).toDate === 'function') {
    return isoFromDate((raw as { toDate: () => Date }).toDate())
  }
  if (typeof raw === 'object' && raw !== null && 'seconds' in raw && typeof (raw as { seconds: unknown }).seconds === 'number') {
    return isoFromDate(new Date((raw as { seconds: number }).seconds * 1000))
  }
  if (typeof raw === 'string' && raw.length >= 10) {
    const prefix = raw.slice(0, 10)
    if (/^\d{4}-\d{2}-\d{2}$/.test(prefix)) return prefix
    const parsed = new Date(raw)
    if (!Number.isNaN(parsed.getTime())) return isoFromDate(parsed)
  }
  return null
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

function asWeekday(value: unknown): WeekdayKey {
  const valid: WeekdayKey[] = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ]
  return typeof value === 'string' && valid.includes(value as WeekdayKey)
    ? (value as WeekdayKey)
    : 'thursday'
}

export async function loadTerritoriesBundle(congregationId: string): Promise<LoadedTerritoriesBundle> {
  const effectiveCongId = congregationId.trim() || 'default'
  const byCong = (colName: string) =>
    getDocs(query(collection(db, colName), where('congregationId', '==', effectiveCongId)))
  const safeByCong = (colName: string) =>
    byCong(colName).catch(() => ({ docs: [] as Awaited<ReturnType<typeof byCong>>['docs'] }))

  const [
    regionsSnap,
    territoriesSnap,
    segmentsSnap,
    locationsSnap,
    sessionsSnap,
    fieldGroupsSnap,
    assignmentsSnap,
    workSessionsSnap,
    usersSnap,
  ] = await Promise.all([
    safeByCong('neighborhoods'),
    byCong('territories'),
    safeByCong('segments'),
    safeByCong('meetingLocations'),
    safeByCong('preachingSessions'),
    safeByCong('fieldGroups'),
    safeByCong('assignments'),
    safeByCong('workSessions'),
    safeByCong('users'),
  ])

  const users: CongregationUserLink[] = usersSnap.docs.map((snap) => {
    const data = snap.data()
    return {
      uid: snap.id,
      name: asString(data.name, 'Dirigente'),
      publisherId: typeof data.publisherId === 'string' && data.publisherId ? data.publisherId : null,
      role: asString(data.role, 'conductor'),
    }
  })
  const userById = new Map(users.map((u) => [u.uid, u]))

  const regions: RegionRecord[] = regionsSnap.docs
    .map((snap) => {
      const data = snap.data()
      return {
        id: snap.id,
        congregationId,
        name: asString(data.name).trim(),
      }
    })
    .filter((r) => r.name.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

  const territories: TerritoryRecord[] = territoriesSnap.docs
    .map((snap) => {
      const data = snap.data()
      const rawNumber = asString(data.number).trim()
      const rawName = asString(data.name).trim()
      const parsed = parseTerritoryCode(rawNumber, rawName)
      const explicitBase = asString(data.baseNumber).trim()
      const explicitPart = typeof data.partLabel === 'string' && data.partLabel.trim() ? data.partLabel.trim().toUpperCase() : null

      return {
        id: snap.id,
        congregationId,
        code: rawNumber ? parsed.code : parsed.code,
        name: rawName || `Território ${parsed.code}`,
        baseNumber: explicitBase || parsed.baseNumber,
        partLabel: explicitPart ?? parsed.partLabel,
        regionId: typeof data.neighborhoodId === 'string' && data.neighborhoodId ? data.neighborhoodId : null,
        regionName: asString(data.neighborhood, 'Sem região').trim() || 'Sem região',
        address: asString(data.address),
        shortAddress: asString(data.shortAddress),
        mapsUrl: asString(data.mapsUrl),
        imageUrl: asString(data.imageUrl),
        notes: asString(data.notes),
      }
    })
    .sort(compareTerritories)

  const territoriesById = new Map(territories.map((t) => [t.id, t]))

  // Ensure any region name present on territories also exists as a virtual/selectable region in memory
  const knownRegionNames = new Set(regions.map((r) => r.name.toLowerCase()))
  for (const t of territories) {
    const key = t.regionName.toLowerCase()
    if (t.regionName && !knownRegionNames.has(key)) {
      knownRegionNames.add(key)
      regions.push({
        id: t.regionId ?? `virtual-${key}`,
        congregationId,
        name: t.regionName,
      })
    }
  }
  regions.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

  const segments: TerritorySegmentRecord[] = segmentsSnap.docs.map((snap) => {
    const data = snap.data()
    return {
      id: snap.id,
      congregationId,
      territoryId: asString(data.territoryId),
      description: asString(data.description),
      status: data.status === 'completed' ? 'completed' : 'pending',
      lastWorkedIsoDate: firestoreDateToIso(data.lastWorkedDate),
    }
  })

  const locations: MeetingLocationRecord[] = locationsSnap.docs
    .map((snap) => {
      const data = snap.data()
      return {
        id: snap.id,
        congregationId,
        name: asString(data.name, 'Local de saída').trim(),
        address: asString(data.address),
        shortLocation: asString(data.shortLocation),
        houseNumber: asString(data.houseNumber),
        latitude: typeof data.latitude === 'number' ? data.latitude : 0,
        longitude: typeof data.longitude === 'number' ? data.longitude : 0,
        radiusKm: typeof data.radiusKm === 'number' ? data.radiusKm : 2,
        allowedTerritoryIds: asStringArray(data.allowedTerritories),
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

  const locationById = new Map(locations.map((l) => [l.id, l]))

  const fieldGroups = fieldGroupsSnap.docs
    .map((snap) => ({
      id: snap.id,
      name: asString(snap.data().name).trim(),
    }))
    .filter((g) => g.name.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

  const fieldGroupById = new Map(fieldGroups.map((g) => [g.id, g.name]))

  const recurringDepartures: RecurringDepartureRecord[] = sessionsSnap.docs
    .map((snap) => {
      const data = snap.data()
      const meetingLocationId = asString(data.meetingLocationId)
      const loc = locationById.get(meetingLocationId)
      const isSundaySession = data.isSundaySession === true || data.dayOfWeek === 'sunday'
      const startTime = asString(data.startTime, '09:00')
      const rawPeriod = data.periodType
      const periodType: DeparturePeriodType =
        rawPeriod === 'morning' || rawPeriod === 'afternoon' || rawPeriod === 'sunday'
          ? rawPeriod
          : inferPeriodType(startTime, isSundaySession)

      const conductorUserIds = asStringArray(data.conductorIds)
      const conductorPublisherIds = asStringArray(data.conductorPublisherIds)
      const storedConductorNames = asStringArray(data.conductorNames)
      const fallbackNames = conductorUserIds
        .map((uid) => userById.get(uid)?.name)
        .filter((n): n is string => Boolean(n))

      const sessionAllowed = asStringArray(data.allowedTerritoryIds)
      const allowedTerritoryIds =
        sessionAllowed.length > 0 ? sessionAllowed : (loc?.allowedTerritoryIds ?? [])

      const sundayGroupId =
        typeof data.sundayGroupId === 'string' && data.sundayGroupId ? data.sundayGroupId : null
      const sundayGroupName =
        typeof data.sundayGroupName === 'string' && data.sundayGroupName
          ? data.sundayGroupName
          : sundayGroupId
            ? (fieldGroupById.get(sundayGroupId) ?? null)
            : null

      return {
        id: snap.id,
        congregationId,
        meetingLocationId,
        locationName: asString(data.locationName).trim() || loc?.name || 'Local de saída',
        address: loc?.address ?? asString(data.address),
        dayOfWeek: asWeekday(data.dayOfWeek),
        startTime,
        periodType,
        sundayGroupId,
        sundayGroupName,
        conductorPublisherIds,
        conductorUserIds,
        conductorNames: storedConductorNames.length > 0 ? storedConductorNames : fallbackNames,
        allowedTerritoryIds,
        active: data.active !== false,
      }
    })
    .sort((a, b) => {
      const order: WeekdayKey[] = [
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday',
      ]
      const dayDiff = order.indexOf(a.dayOfWeek) - order.indexOf(b.dayOfWeek)
      if (dayDiff !== 0) return dayDiff
      return a.startTime.localeCompare(b.startTime)
    })

  const sessionById = new Map(recurringDepartures.map((s) => [s.id, s]))

  const assignments: TerritoryAssignmentRecord[] = assignmentsSnap.docs
    .map((snap) => {
      const data = snap.data()
      const isoDate =
        (typeof data.isoDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.isoDate)
          ? data.isoDate
          : firestoreDateToIso(data.date)) ?? isoFromDate(new Date())

      const meetingLocationId =
        typeof data.meetingLocationId === 'string' && data.meetingLocationId
          ? data.meetingLocationId
          : null
      const preachingSessionId =
        typeof data.preachingSessionId === 'string' && data.preachingSessionId
          ? data.preachingSessionId
          : null

      const linkedSession = preachingSessionId ? sessionById.get(preachingSessionId) : undefined
      const linkedLoc = meetingLocationId ? locationById.get(meetingLocationId) : undefined

      const startTime = asString(data.startTime) || linkedSession?.startTime || '09:00'
      const groupId = typeof data.groupId === 'string' && data.groupId ? data.groupId : null
      const rawPeriod = data.periodType
      const periodType: DeparturePeriodType =
        rawPeriod === 'morning' || rawPeriod === 'afternoon' || rawPeriod === 'sunday'
          ? rawPeriod
          : inferPeriodType(startTime, Boolean(groupId) || linkedSession?.periodType === 'sunday')

      const conductorUserIds = asStringArray(data.conductorIds)
      if (conductorUserIds.length === 0 && typeof data.conductorId === 'string' && data.conductorId) {
        conductorUserIds.push(data.conductorId)
      }
      const conductorPublisherIds = asStringArray(data.conductorPublisherIds)
      const storedNames = asStringArray(data.conductorNames)
      const fallbackNames = conductorUserIds
        .map((uid) => userById.get(uid)?.name)
        .filter((n): n is string => Boolean(n))

      const territoryIds = asStringArray(data.territoryIds)
      const rawSnapshots = Array.isArray(data.territorySnapshots) ? data.territorySnapshots : []
      const territorySnapshots: TerritorySnapshotItem[] =
        rawSnapshots.length > 0
          ? rawSnapshots
              .map((item) => {
                if (!item || typeof item !== 'object') return null
                const rec = item as Record<string, unknown>
                const id = asString(rec.id)
                if (!id) return null
                const live = territoriesById.get(id)
                return {
                  id,
                  code: asString(rec.code) || live?.code || id,
                  name: asString(rec.name) || live?.name || `Território ${id}`,
                  regionName: asString(rec.regionName) || live?.regionName || '',
                }
              })
              .filter((x): x is TerritorySnapshotItem => x !== null)
          : territoryIds.map((id) => {
              const live = territoriesById.get(id)
              return {
                id,
                code: live?.code ?? id,
                name: live?.name ?? `Território ${id}`,
                regionName: live?.regionName ?? '',
              }
            })

      // Sort territoryIds and snapshots in natural territory code order
      territorySnapshots.sort((a, b) => compareTerritoryCodes(a.code, b.code))

      return {
        id: snap.id,
        congregationId,
        isoDate,
        status: data.status === 'draft' ? ('draft' as const) : ('assigned' as const),
        periodType,
        startTime,
        meetingLocationId,
        preachingSessionId,
        locationName:
          asString(data.locationName).trim() ||
          linkedLoc?.name ||
          linkedSession?.locationName ||
          (groupId ? fieldGroupById.get(groupId) ?? 'Saída de domingo' : 'Saída de campo'),
        groupId,
        groupName:
          asString(data.groupName).trim() ||
          (groupId ? (fieldGroupById.get(groupId) ?? null) : null),
        conductorPublisherIds,
        conductorUserIds,
        conductorNames: storedNames.length > 0 ? storedNames : fallbackNames,
        territoryIds: territorySnapshots.map((s) => s.id),
        territorySnapshots,
        notes: asString(data.notes),
        updatedAtIso: firestoreDateToIso(data.updatedAt) ?? firestoreDateToIso(data.createdAt),
      }
    })
    .sort((a, b) => b.isoDate.localeCompare(a.isoDate) || a.startTime.localeCompare(b.startTime))

  const workSessions: WorkSessionRecord[] = workSessionsSnap.docs
    .map((snap) => {
      const data = snap.data()
      const conductorUserId = asString(data.conductorId)
      const notes = asString(data.notes)
      const importedConductorMatch = notes.match(/Dirigente na lista:\s*([^·\n]+)/i)
      const importedConductorName = importedConductorMatch?.[1]?.trim() ?? ''
      const explicitConductorName = asString(data.conductorName)

      const rawCompletion = asString(data.completionState).toLowerCase()
      let completionState: WorkSessionCompletionState = 'completed'
      if (rawCompletion === 'partial' || rawCompletion === 'incomplete') {
        completionState = rawCompletion
      } else if (/Territ[oó]rio n[aã]o conclu[ií]do|\bIncompleto\b/i.test(notes)) {
        completionState = 'incomplete'
      } else if (/Trabalho parcial|\(parte\)/i.test(notes)) {
        completionState = 'partial'
      }

      const rawPeriod = asString(data.periodType).toLowerCase()
      const periodType: DeparturePeriodType | null =
        rawPeriod === 'morning' || rawPeriod === 'afternoon' || rawPeriod === 'sunday'
          ? rawPeriod
          : null

      const rawField =
        asString(data.raw) || (notes.match(/Raw:\s*(.+)$/i)?.[1]?.trim() ?? '')

      return {
        id: snap.id,
        congregationId,
        territoryId: asString(data.territoryId),
        conductorUserId,
        conductorPublisherId: asString(data.conductorPublisherId) || null,
        conductorName:
          explicitConductorName ||
          importedConductorName ||
          (userById.get(conductorUserId)?.name ?? ''),
        conductorRaw: asString(data.conductorRaw) || undefined,
        isoDate:
          asString(data.isoDate) ||
          firestoreDateToIso(data.date) ||
          isoFromDate(new Date()),
        dateEndIso: asString(data.dateEndIso) || null,
        dateNote: asString(data.dateNote) || null,
        segmentsWorked: asStringArray(data.segmentsWorked),
        notes,
        completionState,
        periodType,
        regionId: asString(data.regionId) || null,
        regionName: asString(data.regionName) || undefined,
        territoryCodeRaw: asString(data.territoryCodeRaw) || undefined,
        raw: rawField || undefined,
        importSourceKey: asString(data.importSourceKey) || undefined,
      }
    })
    .sort((a, b) => b.isoDate.localeCompare(a.isoDate))

  return {
    regions,
    territories,
    segments,
    locations,
    recurringDepartures,
    fieldGroups,
    assignments,
    workSessions,
    users,
  }
}

export async function createRegionDoc(congregationId: string, name: string): Promise<RegionRecord> {
  const cleanName = name.trim()
  const ref = doc(collection(db, 'neighborhoods'))
  await setDoc(ref, {
    congregationId,
    name: cleanName,
    createdAt: Timestamp.now(),
  })
  return { id: ref.id, congregationId, name: cleanName }
}

export async function updateRegionDoc(params: {
  congregationId: string
  regionId: string
  newName: string
  oldName: string
  territories: TerritoryRecord[]
}): Promise<void> {
  const { congregationId, regionId, newName, oldName, territories } = params
  const cleanName = newName.trim()
  const batch = writeBatch(db)

  if (!regionId.startsWith('virtual-')) {
    batch.update(doc(db, 'neighborhoods', regionId), {
      name: cleanName,
      updatedAt: Timestamp.now(),
    })
  } else {
    const newRef = doc(collection(db, 'neighborhoods'))
    batch.set(newRef, {
      congregationId,
      name: cleanName,
      createdAt: Timestamp.now(),
    })
  }

  for (const t of territories) {
    if (
      t.regionId === regionId ||
      t.regionName.trim().toLowerCase() === oldName.trim().toLowerCase()
    ) {
      batch.update(doc(db, 'territories', t.id), {
        neighborhood: cleanName,
        ...(regionId.startsWith('virtual-') ? {} : { neighborhoodId: regionId }),
        updatedAt: Timestamp.now(),
      })
    }
  }

  await batch.commit()
}

export async function deleteRegionDoc(regionId: string): Promise<void> {
  if (regionId.startsWith('virtual-')) return
  await deleteDoc(doc(db, 'neighborhoods', regionId))
}

export type CreateTerritoriesPayload = {
  congregationId: string
  codes: string[]
  regionId: string | null
  regionName: string
  customLabelPrefix?: string
  address?: string
  imageUrl?: string
  mapsUrl?: string
  notes?: string
}

export async function createTerritoryDocs(payload: CreateTerritoriesPayload): Promise<TerritoryRecord[]> {
  const {
    congregationId,
    codes,
    regionId,
    regionName,
    customLabelPrefix,
    address = '',
    imageUrl = '',
    mapsUrl = '',
    notes = '',
  } = payload

  const cleanRegion = regionName.trim()
  let resolvedRegionId = regionId && !regionId.startsWith('virtual-') ? regionId : null

  const batch = writeBatch(db)
  if (!resolvedRegionId) {
    const regRef = doc(collection(db, 'neighborhoods'))
    resolvedRegionId = regRef.id
    batch.set(regRef, {
      congregationId,
      name: cleanRegion,
      createdAt: Timestamp.now(),
    })
  }

  const created: TerritoryRecord[] = []
  const now = Timestamp.now()

  for (const rawCode of codes) {
    const parsed = parseTerritoryCode(rawCode)
    const ref = doc(collection(db, 'territories'))
    const name = customLabelPrefix?.trim()
      ? codes.length > 1
        ? `${customLabelPrefix.trim()} ${parsed.code}`
        : customLabelPrefix.trim()
      : `Território ${parsed.code}`

    batch.set(ref, {
      congregationId,
      name,
      number: parsed.code,
      baseNumber: parsed.baseNumber,
      partLabel: parsed.partLabel,
      neighborhood: cleanRegion,
      neighborhoodId: resolvedRegionId,
      address: address.trim() || null,
      shortAddress: null,
      mapsUrl: mapsUrl.trim() || null,
      imageUrl: imageUrl.trim() || null,
      centroidLat: null,
      centroidLng: null,
      notes: notes.trim() || null,
      createdAt: now,
      updatedAt: now,
    })

    created.push({
      id: ref.id,
      congregationId,
      code: parsed.code,
      name,
      baseNumber: parsed.baseNumber,
      partLabel: parsed.partLabel,
      regionId: resolvedRegionId,
      regionName: cleanRegion,
      address: address.trim(),
      shortAddress: '',
      mapsUrl: mapsUrl.trim(),
      imageUrl: imageUrl.trim(),
      notes: notes.trim(),
    })
  }

  await batch.commit()
  return created
}

export async function updateTerritoryDoc(
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
): Promise<void> {
  const parsed = parseTerritoryCode(patch.code)
  const cleanRegion = patch.regionName.trim()
  const cleanName = patch.name?.trim() || `Território ${parsed.code}`
  await updateDoc(doc(db, 'territories', territoryId), {
    number: parsed.code,
    name: cleanName,
    baseNumber: parsed.baseNumber,
    partLabel: parsed.partLabel,
    neighborhood: cleanRegion,
    neighborhoodId: patch.regionId && !patch.regionId.startsWith('virtual-') ? patch.regionId : null,
    address: patch.address?.trim() || null,
    imageUrl: patch.imageUrl?.trim() || null,
    mapsUrl: patch.mapsUrl?.trim() || null,
    notes: patch.notes?.trim() || null,
    updatedAt: Timestamp.now(),
  })
}

export async function deleteTerritoryDoc(
  territoryId: string,
  segments: TerritorySegmentRecord[],
): Promise<void> {
  const batch = writeBatch(db)
  for (const seg of segments) {
    if (seg.territoryId === territoryId) {
      batch.delete(doc(db, 'segments', seg.id))
    }
  }
  batch.delete(doc(db, 'territories', territoryId))
  await batch.commit()
}

export type SaveRecurringDeparturePayload = {
  id?: string
  congregationId: string
  meetingLocationId?: string | null
  locationName: string
  address: string
  dayOfWeek: WeekdayKey
  startTime: string
  periodType: DeparturePeriodType
  sundayGroupId: string | null
  sundayGroupName: string | null
  conductorPublisherIds: string[]
  conductorUserIds: string[]
  conductorNames: string[]
  allowedTerritoryIds: string[]
  active: boolean
}

export async function saveRecurringDepartureDoc(
  payload: SaveRecurringDeparturePayload,
  existingLocations: MeetingLocationRecord[],
  existingDepartures: RecurringDepartureRecord[],
): Promise<void> {
  const {
    id,
    congregationId,
    locationName,
    address,
    dayOfWeek,
    startTime,
    periodType,
    sundayGroupId,
    sundayGroupName,
    conductorPublisherIds,
    conductorUserIds,
    conductorNames,
    allowedTerritoryIds,
    active,
  } = payload

  const cleanLocName = locationName.trim()
  const now = Timestamp.now()
  const batch = writeBatch(db)

  const isVirtualLocSession = Boolean(id && id.startsWith('loc-session:'))
  const virtualLocId =
    isVirtualLocSession && id ? id.slice('loc-session:'.length).split(':')[0] || null : null

  // Find or create MeetingLocation
  let locId = payload.meetingLocationId || virtualLocId || null
  const matchedByName = existingLocations.find(
    (l) => l.name.trim().toLowerCase() === cleanLocName.toLowerCase(),
  )
  if (!locId && matchedByName) {
    locId = matchedByName.id
  }

  const sessionId =
    !id || isVirtualLocSession ? doc(collection(db, 'preachingSessions')).id : id

  // Union allowed territories across all sessions sharing this location for Flutter compatibility
  const unionAllowed = new Set<string>(allowedTerritoryIds)
  for (const other of existingDepartures) {
    if (other.id !== id && other.id !== sessionId && other.meetingLocationId && other.meetingLocationId === locId) {
      for (const tid of other.allowedTerritoryIds) unionAllowed.add(tid)
    }
  }

  if (!locId) {
    const locRef = doc(collection(db, 'meetingLocations'))
    locId = locRef.id
    batch.set(locRef, {
      congregationId,
      name: cleanLocName,
      address: address.trim() || null,
      shortLocation: null,
      houseNumber: null,
      latitude: 0,
      longitude: 0,
      radiusKm: 2.0,
      allowedTerritories: [...unionAllowed],
      createdAt: now,
      updatedAt: now,
    })
  } else {
    batch.update(doc(db, 'meetingLocations', locId), {
      name: cleanLocName,
      address: address.trim() || null,
      allowedTerritories: [...unionAllowed],
      updatedAt: now,
    })
  }

  const sessionRef = doc(db, 'preachingSessions', sessionId)
  const sessionData = {
    congregationId,
    meetingLocationId: locId,
    locationName: cleanLocName,
    address: address.trim() || null,
    dayOfWeek,
    startTime: startTime.trim() || '09:00',
    periodType,
    isSundaySession: periodType === 'sunday',
    sundayGroupId: periodType === 'sunday' ? sundayGroupId : null,
    sundayGroupName: periodType === 'sunday' ? sundayGroupName : null,
    conductorPublisherIds,
    conductorIds: conductorUserIds,
    conductorNames,
    allowedTerritoryIds,
    active,
    updatedAt: now,
  }

  if (id && !isVirtualLocSession) {
    batch.update(sessionRef, sessionData)
  } else {
    batch.set(sessionRef, { ...sessionData, createdAt: now })
  }

  // If Sunday and a Sunday group name is provided without a fieldGroups doc, keep fieldGroups synced for Flutter
  if (periodType === 'sunday' && sundayGroupId && sundayGroupName) {
    batch.set(
      doc(db, 'fieldGroups', sundayGroupId),
      {
        congregationId,
        name: sundayGroupName,
        updatedAt: now,
      },
      { merge: true },
    )
  }

  await batch.commit()
}

export async function setRecurringDepartureActiveDoc(
  sessionId: string,
  active: boolean,
): Promise<void> {
  await updateDoc(doc(db, 'preachingSessions', sessionId), {
    active,
    updatedAt: Timestamp.now(),
  })
}

export async function deleteRecurringDepartureDoc(sessionId: string): Promise<void> {
  if (sessionId.startsWith('loc-session:')) {
    const locId = sessionId.slice('loc-session:'.length).split(':')[0]
    if (locId) {
      await deleteDoc(doc(db, 'meetingLocations', locId))
    }
    return
  }
  await deleteDoc(doc(db, 'preachingSessions', sessionId))
}

export type SaveAssignmentPayload = {
  id?: string
  congregationId: string
  isoDate: string
  status: 'draft' | 'assigned'
  periodType: DeparturePeriodType
  startTime: string
  meetingLocationId: string | null
  preachingSessionId: string | null
  locationName: string
  groupId: string | null
  groupName: string | null
  conductorPublisherIds: string[]
  conductorUserIds: string[]
  conductorNames: string[]
  territoryIds: string[]
  territorySnapshots: TerritorySnapshotItem[]
  notes: string
}

export async function saveAssignmentDoc(payload: SaveAssignmentPayload): Promise<string> {
  const now = Timestamp.now()
  const ref = payload.id ? doc(db, 'assignments', payload.id) : doc(collection(db, 'assignments'))

  // Draft isolation: only expose conductorIds to Flutter mobile sync once status === 'assigned'
  const effectiveUserIds = payload.status === 'assigned' ? payload.conductorUserIds : []

  const docData = {
    congregationId: payload.congregationId,
    date: isoToNoonTimestamp(payload.isoDate),
    isoDate: payload.isoDate,
    status: payload.status,
    periodType: payload.periodType,
    startTime: payload.startTime.trim() || '09:00',
    meetingLocationId: payload.meetingLocationId,
    preachingSessionId:
      payload.preachingSessionId && !payload.preachingSessionId.startsWith('loc-session:')
        ? payload.preachingSessionId
        : null,
    locationName: payload.locationName.trim(),
    groupId: payload.periodType === 'sunday' ? payload.groupId : null,
    groupName: payload.periodType === 'sunday' ? payload.groupName : null,
    conductorPublisherIds: payload.conductorPublisherIds,
    conductorNames: payload.conductorNames,
    conductorIds: effectiveUserIds,
    conductorId: effectiveUserIds[0] ?? null,
    territoryIds: payload.territoryIds,
    territorySnapshots: payload.territorySnapshots,
    notes: payload.notes.trim(),
    updatedAt: now,
  }

  if (payload.id) {
    await updateDoc(ref, docData)
  } else {
    await setDoc(ref, { ...docData, createdAt: now })
  }

  return ref.id
}

export async function deleteAssignmentDoc(assignmentId: string): Promise<void> {
  await deleteDoc(doc(db, 'assignments', assignmentId))
}

export type ImportHistoryWorkSessionWriteItem = {
  docId: string
  importSourceKey: string
  territoryId: string
  conductorUserId: string | null
  conductorPublisherId: string | null
  conductorName: string
  conductorRaw: string
  isoDate: string
  dateEndIso: string | null
  dateNote: string | null
  completionState: WorkSessionCompletionState
  periodType: DeparturePeriodType | null
  regionId: string | null
  regionName: string
  territoryCodeRaw: string
  raw: string
  notes: string
}

export type ImportHistoryBatchResult = {
  importedCount: number
  duplicatesSkipped: number
  ignoredCount: number
}

export async function importHistoryWorkSessionsBatch(params: {
  congregationId: string
  items: ImportHistoryWorkSessionWriteItem[]
  ignoredCount: number
}): Promise<ImportHistoryBatchResult> {
  const { congregationId, items, ignoredCount } = params
  if (items.length === 0) {
    return { importedCount: 0, duplicatesSkipped: 0, ignoredCount }
  }

  // 1. Try authorized backend Cloud Function first
  try {
    const callImport = httpsCallable<
      {
        congregationId: string
        items: ImportHistoryWorkSessionWriteItem[]
        ignoredCount: number
      },
      ImportHistoryBatchResult
    >(functions, 'importTerritoryHistory')
    const response = await callImport({
      congregationId,
      items,
      ignoredCount,
    })
    if (response.data && typeof response.data.importedCount === 'number') {
      return response.data
    }
  } catch (err) {
    const code =
      err && typeof err === 'object' && 'code' in err ? String((err as { code: unknown }).code) : ''
    if (code.includes('permission-denied') || code.includes('unauthenticated')) {
      throw err
    }
    // If function is not deployed yet in current environment, fall back to direct Firestore batch write
  }

  // 2. Fallback: Idempotent chunked Firestore writeBatch respecting security rules
  const currentUid = auth.currentUser?.uid ?? ''
  const existingSnap = await getDocs(
    query(collection(db, 'workSessions'), where('congregationId', '==', congregationId)),
  )
  const existingDocIds = new Set<string>()
  const existingSourceKeys = new Set<string>()
  for (const docSnap of existingSnap.docs) {
    existingDocIds.add(docSnap.id)
    const d = docSnap.data()
    const key = asString(d.importSourceKey)
    if (key) existingSourceKeys.add(key)
  }

  const toCommit: Array<{ id: string; payload: Record<string, unknown> }> = []
  let duplicatesSkipped = 0
  const now = Timestamp.now()

  for (const item of items) {
    if (
      existingDocIds.has(item.docId) ||
      existingSourceKeys.has(item.importSourceKey)
    ) {
      duplicatesSkipped += 1
      continue
    }
    existingDocIds.add(item.docId)
    existingSourceKeys.add(item.importSourceKey)

    toCommit.push({
      id: item.docId,
      payload: {
        congregationId,
        territoryId: item.territoryId,
        conductorId: item.conductorUserId || currentUid || 'historical-import',
        conductorPublisherId: item.conductorPublisherId,
        conductorName: item.conductorName,
        conductorRaw: item.conductorRaw,
        date: isoToNoonTimestamp(item.isoDate),
        isoDate: item.isoDate,
        dateEndIso: item.dateEndIso,
        dateNote: item.dateNote,
        segmentsWorked: [],
        completionState: item.completionState,
        periodType: item.periodType,
        regionId: item.regionId,
        regionName: item.regionName,
        territoryCodeRaw: item.territoryCodeRaw,
        raw: item.raw,
        notes: item.notes,
        importSourceKey: item.importSourceKey,
        importedAt: now,
        importedByUid: currentUid || null,
      },
    })
  }

  const chunkSize = 400
  for (let i = 0; i < toCommit.length; i += chunkSize) {
    const batch = writeBatch(db)
    for (const op of toCommit.slice(i, i + chunkSize)) {
      batch.set(doc(db, 'workSessions', op.id), op.payload)
    }
    await batch.commit()
  }

  return {
    importedCount: toCommit.length,
    duplicatesSkipped,
    ignoredCount,
  }
}
