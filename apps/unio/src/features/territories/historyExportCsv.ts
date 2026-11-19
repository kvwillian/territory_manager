import type {
  TerritoryAssignmentRecord,
  TerritoryRecord,
  TerritorySegmentRecord,
  TerritoryTimelineEntry,
  WorkSessionRecord,
} from './types'

export function escapeCsvCell(value: string): string {
  const safe = value.replace(/\r?\n/g, ' ').trim()
  if (/[",;\n\r]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`
  }
  return safe
}

const MONTH_NAMES_PT = [
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

function resolveEntryDetails(params: {
  entry: TerritoryTimelineEntry
  territoriesById: Map<string, TerritoryRecord>
  segmentsById?: Map<string, TerritorySegmentRecord>
  assignmentsById?: Map<string, TerritoryAssignmentRecord>
  workSessionsById?: Map<string, WorkSessionRecord>
}) {
  const { entry, territoriesById, segmentsById, assignmentsById, workSessionsById } = params
  const ws = entry.kind === 'workSession' ? workSessionsById?.get(entry.id) : undefined
  const assignment = entry.kind === 'assignment' ? assignmentsById?.get(entry.id) : undefined

  const territoryCodes: string[] = []
  const segmentCodes: string[] = []
  const regionNames = new Set<string>()
  if (entry.regionName) regionNames.add(entry.regionName)

  const count = Math.max(entry.territoryIds.length, entry.territoryCodes.length)
  for (let i = 0; i < count; i += 1) {
    const tid = entry.territoryIds[i] ?? ''
    const tObj = tid ? territoriesById.get(tid) : undefined
    const snap = assignment?.territorySnapshots.find((s) => s.id === tid)
    const code = entry.territoryCodes[i] ?? tObj?.code ?? snap?.code ?? tid
    if (code) territoryCodes.push(code)

    const reg = tObj?.regionName ?? snap?.regionName ?? ''
    if (reg) regionNames.add(reg)

    if (ws && ws.segmentsWorked.length > 0 && segmentsById) {
      for (const sid of ws.segmentsWorked) {
        const desc = segmentsById.get(sid)?.description
        if (desc && !segmentCodes.includes(desc)) segmentCodes.push(desc)
      }
    } else if (snap?.assignedSegmentCodes && snap.assignedSegmentCodes.length > 0) {
      for (const desc of snap.assignedSegmentCodes) {
        if (desc && !segmentCodes.includes(desc)) segmentCodes.push(desc)
      }
    }
  }

  if (segmentCodes.length === 0 && entry.territoryCodeRaw) {
    const rawCode = entry.territoryCodeRaw.trim()
    if (rawCode && !territoryCodes.includes(rawCode)) {
      segmentCodes.push(rawCode)
    }
  }

  return {
    ws,
    assignment,
    territoryCodes,
    segmentCodes,
    regionNames,
  }
}

export function buildTerritoryHistoryCsv(params: {
  entries: TerritoryTimelineEntry[]
  territoriesById: Map<string, TerritoryRecord>
  segmentsById?: Map<string, TerritorySegmentRecord>
  assignmentsById?: Map<string, TerritoryAssignmentRecord>
  workSessionsById?: Map<string, WorkSessionRecord>
}): string {
  const { entries, territoriesById, segmentsById, assignmentsById, workSessionsById } = params

  const headers = [
    'Data',
    'Data Fim',
    'Tipo',
    'Período',
    'Local',
    'Região',
    'Dirigente(s)',
    'Territórios',
    'Segmentos',
    'Estado',
    'Observações',
    'Registro Original (raw)',
  ]

  const rows: string[] = [headers.map(escapeCsvCell).join(',')]

  for (const entry of entries) {
    const { assignment, territoryCodes, segmentCodes, regionNames } = resolveEntryDetails({
      entry,
      territoriesById,
      segmentsById,
      assignmentsById,
      workSessionsById,
    })

    const row = [
      entry.isoDate,
      entry.dateEndIso ?? '',
      entry.kind === 'workSession' ? 'Execução' : 'Designação',
      entry.periodType ?? '',
      entry.locationName,
      [...regionNames].join(', '),
      entry.conductorNames.join(', '),
      territoryCodes.join(', '),
      segmentCodes.join(', '),
      entry.completionState ?? (assignment ? assignment.status : ''),
      entry.notes,
      entry.raw ?? '',
    ]

    rows.push(row.map(escapeCsvCell).join(','))
  }

  return `\uFEFF${rows.join('\r\n')}`
}

export function buildTerritoryHistoryTxt(params: {
  entries: TerritoryTimelineEntry[]
  territoriesById: Map<string, TerritoryRecord>
  segmentsById?: Map<string, TerritorySegmentRecord>
  assignmentsById?: Map<string, TerritoryAssignmentRecord>
  workSessionsById?: Map<string, WorkSessionRecord>
}): string {
  const { entries, territoriesById, segmentsById, assignmentsById, workSessionsById } = params
  if (entries.length === 0) return ''

  const sorted = [...entries].sort((a, b) => a.isoDate.localeCompare(b.isoDate))
  const byMonth = new Map<string, { monthLabel: string; lines: string[] }>()

  for (const entry of sorted) {
    const [, monthStr = '', dayStr = ''] = entry.isoDate.split('-')
    const monthIndex = Number(monthStr) - 1
    const monthLabel = MONTH_NAMES_PT[monthIndex] ?? monthStr
    const monthKey = entry.isoDate.slice(0, 7)

    const { territoryCodes, segmentCodes } = resolveEntryDetails({
      entry,
      territoriesById,
      segmentsById,
      assignmentsById,
      workSessionsById,
    })

    const dayMonth = dayStr && monthStr ? `${dayStr}/${monthStr}` : entry.isoDate
    const conductor =
      entry.conductorNames.length > 0
        ? entry.conductorNames.join(', ')
        : entry.conductorRaw?.trim() || '—'
    const workedLabel =
      segmentCodes.length > 0
        ? segmentCodes.join(', ')
        : entry.territoryCodeRaw?.trim() || territoryCodes.join(', ') || '—'

    const line = `${dayMonth} - ${conductor} - ${workedLabel}`
    const bucket = byMonth.get(monthKey) ?? { monthLabel, lines: [] }
    bucket.lines.push(line)
    byMonth.set(monthKey, bucket)
  }

  const sections: string[] = []
  for (const { monthLabel, lines } of byMonth.values()) {
    sections.push(`---- ${monthLabel} ----\n\n${lines.join('\n')}`)
  }

  return sections.join('\n\n')
}
