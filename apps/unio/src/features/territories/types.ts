export type WeekdayKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

export type DeparturePeriodType = 'morning' | 'afternoon' | 'sunday'

export type TerritoryWorkStatus = 'available' | 'partial' | 'recent'

export type WorkSessionCompletionState = 'completed' | 'partial' | 'incomplete'

export type DayPlanningStatus = 'unplanned' | 'draft' | 'assigned'

export type RegionRecord = {
  id: string
  congregationId: string
  name: string
}

export type TerritorySegmentRecord = {
  id: string
  congregationId: string
  territoryId: string
  description: string
  status: 'pending' | 'completed'
  lastWorkedIsoDate: string | null
}

export type TerritoryRecord = {
  id: string
  congregationId: string
  code: string
  name: string
  baseNumber: string
  partLabel: string | null
  regionId: string | null
  regionName: string
  address: string
  shortAddress: string
  mapsUrl: string
  imageUrl: string
  notes: string
}

export type MeetingLocationRecord = {
  id: string
  congregationId: string
  name: string
  address: string
  shortLocation: string
  houseNumber: string
  latitude: number
  longitude: number
  radiusKm: number
  allowedTerritoryIds: string[]
}

export type RecurringDepartureRecord = {
  id: string
  congregationId: string
  meetingLocationId: string
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

export type TerritorySnapshotItem = {
  id: string
  code: string
  name: string
  regionName: string
}

export type TerritoryAssignmentRecord = {
  id: string
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
  updatedAtIso: string | null
}

export type WorkSessionRecord = {
  id: string
  congregationId: string
  territoryId: string
  conductorUserId: string
  conductorPublisherId?: string | null
  conductorName: string
  conductorRaw?: string
  isoDate: string
  dateEndIso?: string | null
  dateNote?: string | null
  segmentsWorked: string[]
  notes: string
  completionState?: WorkSessionCompletionState
  periodType?: DeparturePeriodType | null
  regionId?: string | null
  regionName?: string
  territoryCodeRaw?: string
  raw?: string
  importSourceKey?: string
}

export type ConductorOption = {
  id: string
  publisherId: string | null
  userId: string | null
  name: string
  groupId: string | null
}

export type TerritoryTimelineEntry = {
  id: string
  kind: 'assignment' | 'workSession'
  isoDate: string
  dateEndIso?: string | null
  dateNote?: string | null
  locationId: string | null
  locationName: string
  regionName?: string
  periodType: DeparturePeriodType | null
  conductorNames: string[]
  conductorRaw?: string
  territoryIds: string[]
  territoryCodes: string[]
  territoryCodeRaw?: string
  executedTerritoryIds: string[]
  completionState?: WorkSessionCompletionState
  raw?: string
  notes: string
}

export type TerritoryStatusSnapshot = {
  territory: TerritoryRecord
  status: TerritoryWorkStatus
  // Effective field execution (strictly from workSessions + segments)
  lastWorkedIsoDate: string | null
  lastWorkedConductorNames: string[]
  daysSinceLastWork: number | null
  workCount: number
  totalSegments: number
  completedSegments: number
  hasPartialSegments: boolean
  hasIncompleteWork?: boolean
  lastWorkCompletionState?: WorkSessionCompletionState | null
  lastWorkNotes?: string
  // Split territory sibling state (based strictly on effective work)
  siblingPartIds: string[]
  pendingSiblingCompletion: boolean
  waitingForSiblingCodes: string[]
  completedSiblingCodes: string[]
  // Designation metadata (from assignments — never treated as worked)
  lastAssignedIsoDate: string | null
  lastAssignedLocationName: string | null
  lastAssignedConductorNames: string[]
  assignmentCount: number
}
