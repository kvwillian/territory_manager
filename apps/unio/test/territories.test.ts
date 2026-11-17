import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from 'node:test'
import {
  buildHistoryImportPreview,
  matchHistoryConductor,
  parseHistoryConductorRaw,
  parseHistoryTerritoryTokens,
  validateTerritoryHistoryJson,
} from '../src/features/territories/historyImport.ts'
import {
  compareTerritoryCodes,
  computeTerritoryStatuses,
  parseTerritoryCode,
} from '../src/features/territories/status.ts'
import {
  defaultVolumeForDeparture,
  suggestTerritories,
} from '../src/features/territories/suggestions.ts'
import type {
  ConductorOption,
  TerritoryAssignmentRecord,
  TerritoryRecord,
  TerritorySegmentRecord,
  WorkSessionRecord,
} from '../src/features/territories/types.ts'
import { buildTerritoryWhatsappMessage } from '../src/features/territories/whatsapp.ts'

function mkTerritory(id: string, code: string, regionName = 'Laranjeiras'): TerritoryRecord {
  const parsed = parseTerritoryCode(code)
  return {
    id,
    congregationId: 'cong-1',
    code: parsed.code,
    name: `Território ${parsed.code}`,
    baseNumber: parsed.baseNumber,
    partLabel: parsed.partLabel,
    regionId: `reg-${regionName.toLowerCase()}`,
    regionName,
    address: '',
    shortAddress: '',
    mapsUrl: '',
    imageUrl: '',
    notes: '',
  }
}

function mkAssignment(
  id: string,
  isoDate: string,
  territoryIds: string[],
  opts?: Partial<TerritoryAssignmentRecord>,
): TerritoryAssignmentRecord {
  return {
    id,
    congregationId: 'cong-1',
    isoDate,
    status: 'assigned',
    periodType: 'morning',
    startTime: '09:00',
    meetingLocationId: 'loc-paulo',
    preachingSessionId: 'sess-paulo',
    locationName: 'Casa do irmão Paulo',
    groupId: null,
    groupName: null,
    conductorPublisherIds: ['pub-1'],
    conductorUserIds: [],
    conductorNames: ['Carlos Montero'],
    territoryIds,
    territorySnapshots: territoryIds.map((tid) => ({
      id: tid,
      code: tid.replace(/^t-/, ''),
      name: `Território ${tid}`,
      regionName: 'Laranjeiras',
    })),
    notes: '',
    updatedAtIso: isoDate,
    ...opts,
  }
}

function mkWorkSession(
  id: string,
  territoryId: string,
  isoDate: string,
  segmentsWorked: string[] = [],
): WorkSessionRecord {
  return {
    id,
    congregationId: 'cong-1',
    territoryId,
    conductorUserId: 'user-1',
    conductorName: 'Carlos Montero',
    isoDate,
    segmentsWorked,
    notes: '',
  }
}

function mkSegment(
  id: string,
  territoryId: string,
  status: 'pending' | 'completed',
  lastWorkedIsoDate: string | null = null,
): TerritorySegmentRecord {
  return {
    id,
    congregationId: 'cong-1',
    territoryId,
    description: `Quadra ${id}`,
    status,
    lastWorkedIsoDate,
  }
}

test('parses and sorts split territory codes like 01, 07A, 07B, 17A, 17B naturally', () => {
  assert.deepEqual(parseTerritoryCode('17A'), {
    code: '17A',
    baseNumber: '17',
    numericValue: 17,
    partLabel: 'A',
  })
  assert.deepEqual(parseTerritoryCode('7b'), {
    code: '07B',
    baseNumber: '07',
    numericValue: 7,
    partLabel: 'B',
  })
  const codes = ['17B', '02', '17A', '01', '10', '07B', '07A']
  codes.sort(compareTerritoryCodes)
  assert.deepEqual(codes, ['01', '02', '07A', '07B', '10', '17A', '17B'])
})

test('separates designation from execution: past assignments alone never mark a territory as worked', () => {
  const territories = [mkTerritory('t-01', '01'), mkTerritory('t-17a', '17A'), mkTerritory('t-17b', '17B')]
  // Past assignments exist 2 days ago, but NO workSessions or completed segments exist!
  const assignments = [
    mkAssignment('a-past-01', '2026-10-20', ['t-01']),
    mkAssignment('a-past-17a', '2026-10-20', ['t-17a']),
  ]

  const statuses = computeTerritoryStatuses({
    territories,
    segments: [],
    assignments,
    workSessions: [],
    referenceIsoDate: '2026-10-22',
  })

  // t-01 was designated on 2026-10-20, NOT worked:
  assert.equal(statuses.get('t-01')?.lastAssignedIsoDate, '2026-10-20')
  assert.equal(statuses.get('t-01')?.lastWorkedIsoDate, null)
  assert.equal(statuses.get('t-01')?.status, 'available')

  // 17A was only designated, NOT worked, so 17A is NOT marked partial/completed either
  assert.equal(statuses.get('t-17a')?.status, 'available')
  assert.equal(statuses.get('t-17b')?.pendingSiblingCompletion, false)

  const suggestion = suggestTerritories({
    isoDate: '2026-10-22',
    periodType: 'morning',
    meetingLocationId: 'loc-paulo',
    allowedTerritoryIds: territories.map((t) => t.id),
    territories,
    segments: [],
    assignments,
    workSessions: [],
  })

  // None discarded as recent because none were worked!
  assert.equal(suggestion.discardedRecent.length, 0)
})

test('Rule 1 overrides 10–15 day window: suggests 17B when 17A was worked 2 days ago, and suggests partial-segment territories worked 3 days ago', () => {
  const territories = [
    mkTerritory('t-16', '16'),
    mkTerritory('t-17a', '17A'),
    mkTerritory('t-17b', '17B'),
    mkTerritory('t-18', '18'),
  ]

  // 17A was worked 2 days ago (2026-10-20 — well inside the 10–15 day window!)
  const workSessions = [mkWorkSession('ws-17a', 't-17a', '2026-10-20')]

  // Also t-16 has 2/4 segments worked 3 days ago (2026-10-19 — also inside the 10–15 day window!)
  const segments = [
    mkSegment('s1', 't-16', 'completed', '2026-10-19'),
    mkSegment('s2', 't-16', 'completed', '2026-10-19'),
    mkSegment('s3', 't-16', 'pending', null),
    mkSegment('s4', 't-16', 'pending', null),
  ]

  const statuses = computeTerritoryStatuses({
    territories,
    segments,
    assignments: [],
    workSessions,
    referenceIsoDate: '2026-10-22',
  })

  assert.equal(statuses.get('t-17a')?.status, 'partial')
  assert.deepEqual(statuses.get('t-17a')?.waitingForSiblingCodes, ['17B'])
  assert.equal(statuses.get('t-17b')?.pendingSiblingCompletion, true)
  assert.equal(statuses.get('t-16')?.status, 'partial')
  assert.equal(statuses.get('t-16')?.hasPartialSegments, true)

  const suggestion = suggestTerritories({
    isoDate: '2026-10-22',
    periodType: 'morning',
    meetingLocationId: 'loc-paulo',
    allowedTerritoryIds: territories.map((t) => t.id),
    territories,
    segments,
    assignments: [],
    workSessions,
    requestedVolume: 2,
  })

  // Both t-16 (partial segments worked 3d ago) and t-17b (counterpart of 17A worked 2d ago)
  // bypass the 10–15 day window and win Priority 1!
  assert.deepEqual(
    suggestion.recommended.map((item) => item.territory.code),
    ['16', '17B'],
  )
  assert.equal(suggestion.discardedRecent.length, 0)
  assert.ok(suggestion.discarded.some((d) => d.territory.code === '17A' && d.kind === 'waitingSibling'))
})

test('Rules 2, 3, 4, 5 & 6: uses workSessions for recency/continuity/age and same-day assignments for conflicts', () => {
  const territories = [
    mkTerritory('t-01', '01', 'Laranjeiras'),
    mkTerritory('t-02', '02', 'Laranjeiras'),
    mkTerritory('t-03', '03', 'Laranjeiras'),
    mkTerritory('t-05', '05', 'Laranjeiras'),
    mkTerritory('t-06', '06', 'Laranjeiras'),
    mkTerritory('t-99', '99', 'Guaíba'), // Excluded by location
  ]

  const workSessions = [
    // Worked 4 days ago -> recent (Rule 2 discard) + continuity anchor at 01!
    mkWorkSession('ws-01', 't-01', '2026-10-18'),
    // Worked 40 days ago
    mkWorkSession('ws-05', 't-05', '2026-09-10'),
  ]

  const assignments = [
    // Another departure on the SAME day (2026-10-22) already designated 02 -> Rule 6 conflict!
    mkAssignment('a-conflict-02', '2026-10-22', ['t-02'], {
      locationName: 'Casa da irmã Divanice',
      startTime: '17:00',
    }),
  ]

  const suggestion = suggestTerritories({
    isoDate: '2026-10-22',
    periodType: 'morning',
    meetingLocationId: 'loc-paulo',
    allowedTerritoryIds: ['t-01', 't-02', 't-03', 't-05', 't-06'],
    territories,
    segments: [],
    assignments,
    workSessions,
  })

  const recommendedCodes = suggestion.recommended.map((item) => item.territory.code)
  assert.equal(recommendedCodes.length, 2)
  assert.ok(recommendedCodes.includes('03'))
  assert.ok(!recommendedCodes.includes('01'))
  assert.ok(!recommendedCodes.includes('02'))
  assert.ok(!recommendedCodes.includes('99'))
  assert.equal(suggestion.conflicts.length, 1)
  assert.equal(suggestion.conflicts[0]?.territory.code, '02')
  assert.equal(suggestion.discardedRecent.length, 1)
  assert.equal(suggestion.discardedRecent[0]?.territory.code, '01')
})

test('Rule 7 & variation rotation: adjusts default volumes and generates alternative suggestions', () => {
  assert.equal(defaultVolumeForDeparture('wednesday', 'morning'), 2)
  assert.equal(defaultVolumeForDeparture('saturday', 'morning'), 3)
  assert.equal(defaultVolumeForDeparture('sunday', 'sunday'), 2)

  const territories = [
    mkTerritory('t-01', '01'),
    mkTerritory('t-02', '02'),
    mkTerritory('t-03', '03'),
    mkTerritory('t-04', '04'),
  ]

  const first = suggestTerritories({
    isoDate: '2026-10-22',
    periodType: 'morning',
    meetingLocationId: 'loc-paulo',
    allowedTerritoryIds: territories.map((t) => t.id),
    territories,
    segments: [],
    assignments: [],
    workSessions: [],
    variationIndex: 0,
  })
  const second = suggestTerritories({
    isoDate: '2026-10-22',
    periodType: 'morning',
    meetingLocationId: 'loc-paulo',
    allowedTerritoryIds: territories.map((t) => t.id),
    territories,
    segments: [],
    assignments: [],
    workSessions: [],
    variationIndex: 1,
  })

  assert.equal(first.hasAlternatives, true)
  assert.notDeepEqual(
    first.recommended.map((r) => r.territory.code),
    second.recommended.map((r) => r.territory.code),
  )
})

test('formats WhatsApp messages for morning, afternoon, and sunday departures', () => {
  const morning = buildTerritoryWhatsappMessage({
    isoDate: '2026-10-21',
    periodType: 'morning',
    startTime: '09:00',
    locationName: 'Casa do irmão Paulo',
    conductorNames: ['Carlos Montero', 'Ana Cláudia'],
    territoryCodes: ['02', '03'],
  })
  assert.ok(morning.includes('🌅 SAÍDA DA MANHÃ – Quarta-feira'))
  assert.ok(morning.includes('09:00'))
  assert.ok(morning.includes('📍 Local: Casa do irmão Paulo'))
  assert.ok(morning.includes('👥 Dirigentes: Carlos Montero e Ana Cláudia'))
  assert.ok(morning.includes('📌 Territórios: 02 e 03'))

  const afternoon = buildTerritoryWhatsappMessage({
    isoDate: '2026-10-22',
    periodType: 'afternoon',
    startTime: '17:00',
    locationName: 'Casa da irmã Divanice',
    conductorNames: ['Roberto'],
    territoryCodes: ['13', '14', '15'],
  })
  assert.ok(afternoon.includes('🌙 SAÍDA DA TARDE – Quinta-feira'))
  assert.ok(afternoon.includes('📌 Territórios: 13, 14 e 15'))

  const sunday = buildTerritoryWhatsappMessage({
    isoDate: '2026-10-25',
    periodType: 'sunday',
    startTime: '09:00',
    locationName: 'Rua das Flores, 120',
    groupName: 'Maria Antônia Prado',
    conductorNames: ['Roberto', 'Mari'],
    territoryCodes: ['24', '25'],
  })
  assert.ok(sunday.includes('🌅 SAÍDA DE CAMPO – DOMINGO'))
  assert.ok(sunday.includes('📍 Grupo Maria Antônia Prado'))
  assert.ok(sunday.includes('🏠 Rua das Flores, 120'))
})

test('parses territory tokens preserving partial (parte), incomplete (Incompleto / Falta), observations, and sequential parts', () => {
  const tokens = parseHistoryTerritoryTokens([
    '32 A(parte)',
    '29 Incompleto',
    '14B (Lambertti)',
    '07A (Falta T. C Duarte)',
    'parte do 10A',
    '01 ■■',
    'Comércio 14A',
    '14A',
    'C',
  ])

  // 32 A(parte) -> 32A, partial
  assert.equal(tokens[0]?.normalizedCode, '32A')
  assert.equal(tokens[0]?.completionState, 'partial')

  // 29 Incompleto -> 29, incomplete
  assert.equal(tokens[1]?.normalizedCode, '29')
  assert.equal(tokens[1]?.completionState, 'incomplete')

  // 14B (Lambertti) -> 14B, completed, observation Lambertti
  assert.equal(tokens[2]?.normalizedCode, '14B')
  assert.equal(tokens[2]?.completionState, 'completed')
  assert.ok(tokens[2]?.observations.includes('Lambertti'))

  // 07A (Falta T. C Duarte) -> 07A, incomplete, observation Falta T. C Duarte
  assert.equal(tokens[3]?.normalizedCode, '07A')
  assert.equal(tokens[3]?.completionState, 'incomplete')
  assert.ok(tokens[3]?.observations.includes('Falta T. C Duarte'))

  // parte do 10A -> 10A, partial
  assert.equal(tokens[4]?.normalizedCode, '10A')
  assert.equal(tokens[4]?.completionState, 'partial')

  // 01 ■■ -> 01, completed, observation ■■
  assert.equal(tokens[5]?.normalizedCode, '01')
  assert.equal(tokens[5]?.completionState, 'completed')
  assert.ok(tokens[5]?.observations.includes('■■'))

  // Comércio 14A -> 14A, completed, observation Comércio
  assert.equal(tokens[6]?.normalizedCode, '14A')
  assert.ok(tokens[6]?.observations.includes('Comércio'))

  // ["14A", "C"] -> "14C"
  assert.equal(tokens[7]?.normalizedCode, '14A')
  assert.equal(tokens[8]?.normalizedCode, '14C')
  assert.equal(tokens[8]?.expandedFromSequence, true)
})

test('parses conductor periods/groups and flags ambiguous conductor names for confirmation', () => {
  const bessaTarde = parseHistoryConductorRaw('Bessa (Tarde)', '2026-07-28')
  assert.equal(bessaTarde.cleanName, 'Bessa')
  assert.equal(bessaTarde.periodType, 'afternoon')

  const bessaManha = parseHistoryConductorRaw('Bessa (manhã)', '2026-08-18')
  assert.equal(bessaManha.cleanName, 'Bessa')
  assert.equal(bessaManha.periodType, 'morning')

  const gpGuaiba = parseHistoryConductorRaw('Gp Guaíba - Bessa', '2026-10-11')
  assert.equal(gpGuaiba.cleanName, 'Bessa')
  assert.equal(gpGuaiba.groupHint, 'Guaíba')
  assert.equal(gpGuaiba.periodType, 'sunday')

  const conductorOptions: ConductorOption[] = [
    { id: 'p-bessa', publisherId: 'p-bessa', userId: null, name: 'José Bessa', groupId: 'g-c' },
    { id: 'p-montero', publisherId: 'p-montero', userId: null, name: 'Carlos Montero', groupId: 'g-d' },
    { id: 'p-alberto', publisherId: 'p-alberto', userId: null, name: 'Carlos Alberto', groupId: 'g-b' },
    { id: 'p-mat1', publisherId: 'p-mat1', userId: null, name: 'Matheus Esteves', groupId: 'g-a' },
    { id: 'p-mat2', publisherId: 'p-mat2', userId: null, name: 'Matheus Brisoti', groupId: 'g-d' },
    { id: 'p-joao1', publisherId: 'p-joao1', userId: null, name: 'João Aristeu', groupId: 'g-a' },
    { id: 'p-joao2', publisherId: 'p-joao2', userId: null, name: 'João Vitor Fernandes', groupId: 'g-f' },
  ]

  // Unique match: "Bessa" -> "José Bessa"
  const mBessa = matchHistoryConductor({
    parsedConductor: parseHistoryConductorRaw('Bessa'),
    conductorOptions,
  })
  assert.equal(mBessa.status, 'matched')
  assert.equal(mBessa.matched?.name, 'José Bessa')

  // Unique initial match: "Carlos M" -> "Carlos Montero" (since M matches Montero, not Alberto)
  const mCarlosM = matchHistoryConductor({
    parsedConductor: parseHistoryConductorRaw('Carlos M'),
    conductorOptions,
  })
  assert.equal(mCarlosM.status, 'matched')
  assert.equal(mCarlosM.matched?.name, 'Carlos Montero')

  // Ambiguous: "João" -> must NOT auto-match, must return candidates for confirmation
  const mJoao = matchHistoryConductor({
    parsedConductor: parseHistoryConductorRaw('João'),
    conductorOptions,
  })
  assert.equal(mJoao.status, 'ambiguous')
  assert.equal(mJoao.candidates.length, 2)

  // Ambiguous: "Mateus" -> matches both Matheus Esteves and Matheus Brisoti
  const mMateus = matchHistoryConductor({
    parsedConductor: parseHistoryConductorRaw('Mateus'),
    conductorOptions,
  })
  assert.equal(mMateus.status, 'ambiguous')
  assert.equal(mMateus.candidates.length, 2)
})

test('validates historico_territorios_2026.json, enforces idempotency, and feeds partial/incomplete workSessions into suggestion engine', () => {
  const jsonPath = resolve(
    process.cwd(),
    'apps/unio/src/features/territories/data/historico_territorios_2026.json',
  )
  const rawJson = JSON.parse(readFileSync(jsonPath, 'utf-8')) as unknown
  const validated = validateTerritoryHistoryJson(rawJson)
  assert.equal(validated.ok, true)
  if (!validated.ok) return

  assert.equal(validated.data.schemaVersion, '1.0')
  assert.equal(validated.data.regions.length, 2)

  const territories: TerritoryRecord[] = [
    mkTerritory('t-lar-19a', '19A', 'Laranjeiras'),
    mkTerritory('t-lar-19b', '19B', 'Laranjeiras'),
    mkTerritory('t-lar-19c', '19C', 'Laranjeiras'),
    mkTerritory('t-lar-20', '20', 'Laranjeiras'),
    mkTerritory('t-gua-29', '29', 'Guaíba'),
  ]
  const regions = [
    { id: 'reg-guaiba', congregationId: 'cong-1', name: 'Guaíba' },
    { id: 'reg-laranjeiras', congregationId: 'cong-1', name: 'Laranjeiras' },
  ]
  const conductorOptions: ConductorOption[] = [
    { id: 'p-montero', publisherId: 'p-montero', userId: null, name: 'Carlos Montero', groupId: null },
    { id: 'p-roberto', publisherId: 'p-roberto', userId: null, name: 'Roberto Silva', groupId: null },
  ]

  const firstPreview = buildHistoryImportPreview({
    congregationId: 'cong-1',
    file: validated.data,
    regions,
    territories,
    conductorOptions,
    existingWorkSessions: [],
  })

  // 64 entries in Guaíba + 76 in Laranjeiras = 140 entries
  assert.equal(firstPreview.summary.totalEntries, 140)
  assert.ok(firstPreview.summary.partialOrIncompleteCount >= 9)
  assert.equal(firstPreview.summary.duplicateCount, 0)

  // Simulate importing the matched items into workSessions, then running a 2nd import with the same file
  const importedSessions: WorkSessionRecord[] = firstPreview.items
    .filter((i) => i.matchedTerritory !== null)
    .map((i) => ({
      id: i.workSessionDocId,
      congregationId: 'cong-1',
      territoryId: i.matchedTerritory!.id,
      conductorUserId: 'u-1',
      conductorName: i.effectiveConductorName,
      isoDate: i.isoDate,
      segmentsWorked: [],
      notes: i.formattedNotes,
      completionState: i.completionState,
      raw: i.rawLine,
      importSourceKey: i.importSourceKey,
    }))

  const secondPreview = buildHistoryImportPreview({
    congregationId: 'cong-1',
    file: validated.data,
    regions,
    territories,
    conductorOptions,
    existingWorkSessions: importedSessions,
  })

  // Every previously imported item is now flagged as duplicate (idempotent!)
  assert.equal(secondPreview.summary.duplicateCount, importedSessions.length)

  // Verify status & suggestion engine on Laranjeiras 19A, 19B, 19C(parte) worked on 2026-11-01
  const suggestion = suggestTerritories({
    isoDate: '2026-11-05',
    periodType: 'morning',
    meetingLocationId: 'loc-paulo',
    allowedTerritoryIds: ['t-lar-19a', 't-lar-19b', 't-lar-19c', 't-lar-20'],
    territories,
    segments: [],
    assignments: [],
    workSessions: importedSessions,
    requestedVolume: 1,
  })

  // 19C was worked on 2026-11-01 as "19C(parte)" -> completionState = 'partial', so Rule 1 prioritizes 19C even 4 days later!
  assert.equal(suggestion.recommended[0]?.territory.code, '19C')
  assert.equal(suggestion.recommended[0]?.priorityTier, 1)
})
