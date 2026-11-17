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
