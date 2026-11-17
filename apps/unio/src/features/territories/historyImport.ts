import { parseTerritoryCode, weekdayKeyFromIso } from './status'
import type {
  ConductorOption,
  DeparturePeriodType,
  RegionRecord,
  TerritoryRecord,
  WorkSessionCompletionState,
  WorkSessionRecord,
} from './types'

export type RawHistoryEntryJson = {
  date: string
  conductor: string
  territories: string[]
  raw?: string
  dateEnd?: string
  dateNote?: string
}

export type RawHistoryRegionJson = {
  name: string
  entries: RawHistoryEntryJson[]
}

export type TerritoryHistoryImportFileJson = {
  schemaVersion: string
  title?: string
  year?: number
  dateFormat?: string
  territoryValueFormat?: string
  updatedThrough?: string
  regions: RawHistoryRegionJson[]
  importNotes?: string[]
}

export type ParsedHistoryConductor = {
  rawConductor: string
  cleanName: string
  groupHint: string | null
  periodType: DeparturePeriodType | null
  periodLabel: string | null
}

export type ParsedHistoryTerritoryToken = {
  rawToken: string
  normalizedCode: string
  baseNumber: string
  partLabel: string | null
  altCommercialCode: string | null
  completionState: WorkSessionCompletionState
  observations: string[]
  expandedFromSequence: boolean
}

export type ConductorMatchStatus = 'matched' | 'ambiguous' | 'unresolved' | 'confirmed'

export type TerritoryMatchStatus = 'matched' | 'pending' | 'resolved' | 'ignored'

export type HistoryImportItemPreview = {
  itemKey: string
  importSourceKey: string
  workSessionDocId: string
  regionNameJson: string
  matchedRegion: RegionRecord | null
  entryIndex: number
  tokenIndex: number
  isoDate: string
  dateEndIso: string | null
  dateNote: string | null
  rawLine: string
  // Conductor info
  parsedConductor: ParsedHistoryConductor
  conductorMatchStatus: ConductorMatchStatus
  matchedConductor: ConductorOption | null
  conductorCandidates: ConductorOption[]
  preserveRawConductorName: boolean
  effectiveConductorName: string
  effectiveConductorPublisherId: string | null
  effectiveConductorUserId: string | null
  // Territory info
  parsedTerritory: ParsedHistoryTerritoryToken
  territoryMatchStatus: TerritoryMatchStatus
  matchedTerritory: TerritoryRecord | null
  targetSegmentCode: string | null
  suggestedTerritories: Array<{
    territory: TerritoryRecord
    reason: string
  }>
  // Period & notes
  periodType: DeparturePeriodType | null
  completionState: WorkSessionCompletionState
  formattedNotes: string
  // Duplicate / idempotency
  isDuplicate: boolean
  duplicateReason: string | null
}

export type HistoryImportSummary = {
  totalEntries: number
  totalTerritoryItems: number
  byRegion: Array<{
    regionName: string
    regionMatched: boolean
    entryCount: number
    itemCount: number
    matchedTerritoryCount: number
    pendingTerritoryCount: number
  }>
  matchedTerritoriesCount: number
  pendingTerritoriesCount: number
  matchedConductorsCount: number
  ambiguousOrPendingConductorsCount: number
  pendingCorrespondenceCount: number
  partialOrIncompleteCount: number
  partialCount: number
  incompleteCount: number
  duplicateCount: number
  readyToImportCount: number
}

export type HistoryImportPreviewResult = {
  file: TerritoryHistoryImportFileJson
  items: HistoryImportItemPreview[]
  summary: HistoryImportSummary
}

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function canonicalRegionKey(value: string): string {
  return normalizeSearchText(value)
    .replace(
      /^(?:parque\s+d[aeo]s?\s+|parque\s+|pq\s+d[aeo]s?\s+|pq\s+|jardim\s+d[aeo]s?\s+|jardim\s+|jd\s+d[aeo]s?\s+|jd\s+|vila\s+|bairro\s+|conjunto\s+)/i,
      '',
    )
    .trim()
}

export function isSameHistoryRegion(regionA: string, regionB: string): boolean {
  const normA = normalizeSearchText(regionA)
  const normB = normalizeSearchText(regionB)
  if (!normA || !normB) return false
  if (normA === normB) return true
  const canonA = canonicalRegionKey(regionA)
  const canonB = canonicalRegionKey(regionB)
  if (canonA && canonB && canonA === canonB) return true
  if (canonA && canonB && (normA.endsWith(` ${canonB}`) || normB.endsWith(` ${canonA}`))) {
    return true
  }
  return false
}

export function defaultSegmentCodeForTerritory(
  territory: TerritoryRecord | null,
  parsedToken: ParsedHistoryTerritoryToken,
): string | null {
  if (!parsedToken.partLabel) return null
  const part = parsedToken.partLabel.toUpperCase()
  if (territory) {
    if (territory.partLabel && territory.partLabel.toUpperCase() === part) {
      return null
    }
    return `${territory.baseNumber || parsedToken.baseNumber}${part}`
  }
  return `${parsedToken.baseNumber}${part}`
}

/**
 * Deterministic 64-bit FNV-1a hash encoded in base36 (13 chars) for idempotency keys.
 */
export function deterministicHash(input: string): string {
  let h1 = 0x811c9dc5
  let h2 = 0x811c9dc5
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i)
    h1 ^= code
    h1 = Math.imul(h1, 0x01000193)
    h2 ^= code ^ (i & 0xff)
    h2 = Math.imul(h2, 0x01000193)
  }
  const p1 = (h1 >>> 0).toString(36).padStart(7, '0')
  const p2 = (h2 >>> 0).toString(36).padStart(7, '0')
  return `${p1}${p2}`
}

export function buildHistoryImportSourceKey(params: {
  congregationId: string
  regionName: string
  isoDate: string
  rawLine: string
  tokenIndex: number
  rawToken: string
}): string {
  const canonical = [
    params.congregationId.trim(),
    normalizeSearchText(params.regionName),
    params.isoDate.trim(),
    params.rawLine.trim(),
    String(params.tokenIndex),
    params.rawToken.trim().toLowerCase(),
  ].join('|')
  return `hist2026_${deterministicHash(canonical)}`
}

export function buildHistoryWorkSessionDocId(importSourceKey: string): string {
  return `ws_imp_${importSourceKey.replace(/^hist2026_/, '')}`
}

export function validateTerritoryHistoryJson(
  rawJson: unknown,
): { ok: true; data: TerritoryHistoryImportFileJson } | { ok: false; error: string } {
  if (!rawJson || typeof rawJson !== 'object') {
    return { ok: false, error: 'O arquivo JSON não contém um objeto válido.' }
  }
  const obj = rawJson as Record<string, unknown>
  const schemaVersion = typeof obj.schemaVersion === 'string' ? obj.schemaVersion.trim() : ''
  if (!schemaVersion) {
    return {
      ok: false,
      error: 'Campo obrigatório "schemaVersion" ausente no arquivo JSON.',
    }
  }
  if (!schemaVersion.startsWith('1.')) {
    return {
      ok: false,
      error: `Versão de schema "${schemaVersion}" não suportada (esperado 1.x).`,
    }
  }
  if (!Array.isArray(obj.regions) || obj.regions.length === 0) {
    return {
      ok: false,
      error: 'O arquivo não possui a lista de regiões ("regions") ou está vazia.',
    }
  }

  const regions: RawHistoryRegionJson[] = []
  for (let rIdx = 0; rIdx < obj.regions.length; rIdx += 1) {
    const rRaw = obj.regions[rIdx]
    if (!rRaw || typeof rRaw !== 'object') {
      return { ok: false, error: `Região inválida na posição ${rIdx + 1}.` }
    }
    const rObj = rRaw as Record<string, unknown>
    const name = typeof rObj.name === 'string' ? rObj.name.trim() : ''
    if (!name) {
      return { ok: false, error: `Região na posição ${rIdx + 1} está sem nome.` }
    }
    if (!Array.isArray(rObj.entries)) {
      return {
        ok: false,
        error: `A região "${name}" não possui uma lista válida de "entries".`,
      }
    }

    const entries: RawHistoryEntryJson[] = []
    for (let eIdx = 0; eIdx < rObj.entries.length; eIdx += 1) {
      const eRaw = rObj.entries[eIdx]
      if (!eRaw || typeof eRaw !== 'object') {
        return {
          ok: false,
          error: `Registro inválido na região "${name}" (item ${eIdx + 1}).`,
        }
      }
      const eObj = eRaw as Record<string, unknown>
      const date = typeof eObj.date === 'string' ? eObj.date.trim() : ''
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return {
          ok: false,
          error: `Data inválida "${date}" na região "${name}" (item ${eIdx + 1}). Esperado YYYY-MM-DD.`,
        }
      }
      const conductor = typeof eObj.conductor === 'string' ? eObj.conductor.trim() : ''
      if (!Array.isArray(eObj.territories) || eObj.territories.length === 0) {
        return {
          ok: false,
          error: `Registro em ${date} (${name}) não possui territórios informados.`,
        }
      }
      const territories = eObj.territories
        .map((t) => (typeof t === 'string' ? t.trim() : String(t ?? '').trim()))
        .filter(Boolean)
      if (territories.length === 0) {
        return {
          ok: false,
          error: `Registro em ${date} (${name}) possui lista de territórios vazia.`,
        }
      }

      entries.push({
        date,
        conductor,
        territories,
        raw: typeof eObj.raw === 'string' ? eObj.raw.trim() : undefined,
        dateEnd: typeof eObj.dateEnd === 'string' ? eObj.dateEnd.trim() : undefined,
        dateNote: typeof eObj.dateNote === 'string' ? eObj.dateNote.trim() : undefined,
      })
    }

    regions.push({ name, entries })
  }

  return {
    ok: true,
    data: {
      schemaVersion,
      title: typeof obj.title === 'string' ? obj.title : undefined,
      year: typeof obj.year === 'number' ? obj.year : undefined,
      dateFormat: typeof obj.dateFormat === 'string' ? obj.dateFormat : undefined,
      territoryValueFormat:
        typeof obj.territoryValueFormat === 'string' ? obj.territoryValueFormat : undefined,
      updatedThrough:
        typeof obj.updatedThrough === 'string' ? obj.updatedThrough.trim() : undefined,
      regions,
      importNotes: Array.isArray(obj.importNotes)
        ? obj.importNotes.filter((n): n is string => typeof n === 'string')
        : undefined,
    },
  }
}

export function parseHistoryConductorRaw(
  rawConductor: string,
  isoDate?: string,
): ParsedHistoryConductor {
  let working = rawConductor.trim()
  let periodType: DeparturePeriodType | null = null
  let periodLabel: string | null = null

  // Extract period in parentheses: e.g. "(Tarde)", "(tarde)", "(manhã)"
  const periodMatch = working.match(/\(\s*(manh[aã]|tarde|domingo)\s*\)/i)
  if (periodMatch) {
    const token = normalizeSearchText(periodMatch[1]!)
    if (token.startsWith('manh')) {
      periodType = 'morning'
      periodLabel = 'Manhã'
    } else if (token === 'tarde') {
      periodType = 'afternoon'
      periodLabel = 'Tarde'
    } else if (token === 'domingo') {
      periodType = 'sunday'
      periodLabel = 'Domingo'
    }
    working = working.replace(periodMatch[0], '').trim()
  }

  // Extract group prefix: e.g. "Gp Guaíba - Bessa", "Gp Maria A.P - Roberto", "Gp CB1 - Marcelo", "Gp Montevidéu"
  let groupHint: string | null = null
  const groupWithConductorMatch = working.match(/^(?:gp|grupo)\s+([^-–—]+?)\s*[-–—]\s*(.+)$/i)
  if (groupWithConductorMatch) {
    groupHint = groupWithConductorMatch[1]!.trim()
    working = groupWithConductorMatch[2]!.trim()
  } else {
    const groupOnlyMatch = working.match(/^(?:gp|grupo)\s+(.+)$/i)
    if (groupOnlyMatch) {
      groupHint = groupOnlyMatch[1]!.trim()
      working = ''
    }
  }

  if (!periodType && groupHint && isoDate && weekdayKeyFromIso(isoDate) === 'sunday') {
    periodType = 'sunday'
    periodLabel = 'Domingo'
  }

  return {
    rawConductor: rawConductor.trim(),
    cleanName: working.trim(),
    groupHint,
    periodType,
    periodLabel,
  }
}

export function parseHistoryTerritoryTokens(
  rawTokens: string[],
): ParsedHistoryTerritoryToken[] {
  const results: ParsedHistoryTerritoryToken[] = []
  let previousBaseNumber: string | null = null

  for (const rawToken of rawTokens) {
    let working = rawToken.trim()
    let completionState: WorkSessionCompletionState = 'completed'
    const observations: string[] = []
    let altCommercialCode: string | null = null
    let expandedFromSequence = false

    // 1. Check "parte do <code...>" prefix (e.g. "parte do 10A")
    if (/^parte\s+d[eo]\s+/i.test(working)) {
      completionState = 'partial'
      observations.push('Trabalho parcial (parte)')
      working = working.replace(/^parte\s+d[eo]\s+/i, '').trim()
    }

    // 2. Check parenthetical expressions: e.g. "(parte)", "(Falta T. C Duarte)", "(Lambertti)"
    const parenMatches = [...working.matchAll(/\(([^)]+)\)/g)]
    for (const m of parenMatches) {
      const inner = m[1]!.trim()
      const normInner = normalizeSearchText(inner)
      if (normInner === 'parte' || normInner.includes('parcial')) {
        completionState = 'partial'
        if (!observations.includes('Trabalho parcial (parte)')) {
          observations.push('Trabalho parcial (parte)')
        }
      } else if (normInner.includes('incompleto') || normInner.startsWith('falta ')) {
        completionState = 'incomplete'
        observations.push(inner)
      } else if (inner) {
        observations.push(inner)
      }
      working = working.replace(m[0], ' ').trim()
    }

    // 3. Check standalone "Incompleto" word (e.g. "29 Incompleto")
    if (/\bincompleto\b/i.test(working)) {
      completionState = 'incomplete'
      if (!observations.some((o) => normalizeSearchText(o).includes('incompleto'))) {
        observations.push('Território não concluído (Incompleto)')
      }
      working = working.replace(/\bincompleto\b/gi, ' ').trim()
    }

    // 4. Check standalone "parte" word outside parens
    if (/\bparte\b/i.test(working)) {
      if (completionState === 'completed') completionState = 'partial'
      if (!observations.includes('Trabalho parcial (parte)')) {
        observations.push('Trabalho parcial (parte)')
      }
      working = working.replace(/\bparte\b/gi, ' ').trim()
    }

    // 5. Check "Comércio <code...>" prefix (e.g. "Comércio 14A")
    if (/^com[eé]rcio\s+/i.test(working)) {
      const afterComercio = working.replace(/^com[eé]rcio\s+/i, '').trim()
      const parsedAfter = parseTerritoryCode(afterComercio)
      altCommercialCode = `COMÉRCIO ${parsedAfter.code}`
      observations.push('Comércio')
      working = afterComercio
    }

    // 6. Extract non-alphanumeric trailing markers (e.g. "01 ■■")
    const symbolMatch = working.match(/^(\d+\s*[A-Za-z]?)\s+([^\w\s]+.*)$/)
    if (symbolMatch) {
      working = symbolMatch[1]!.trim()
      const sym = symbolMatch[2]!.trim()
      if (sym) observations.push(sym)
    }

    // 7. Normalize spaced part letter like "32 A" or "09 B" -> "32A", "09B"
    const spacedPartMatch = working.match(/^(\d+)\s+([A-Za-z])$/)
    if (spacedPartMatch) {
      working = `${spacedPartMatch[1]}${spacedPartMatch[2]!.toUpperCase()}`
    }

    // 8. Check sequential single-letter shorthand: e.g. ["14A", "C"] -> "14C"
    if (/^[A-Za-z]$/.test(working) && previousBaseNumber) {
      const letter = working.toUpperCase()
      working = `${previousBaseNumber}${letter}`
      expandedFromSequence = true
      observations.push(`Sequência ${previousBaseNumber}${letter}`)
    }

    const parsedCode = parseTerritoryCode(working)
    if (parsedCode.numericValue !== null) {
      previousBaseNumber = parsedCode.baseNumber
    }

    results.push({
      rawToken: rawToken.trim(),
      normalizedCode: parsedCode.code,
      baseNumber: parsedCode.baseNumber,
      partLabel: parsedCode.partLabel,
      altCommercialCode,
      completionState,
      observations,
      expandedFromSequence,
    })
  }

  return results
}

/**
 * Matches a parsed conductor against the congregation's eligible conductors (`conductorOptions`).
 * Never auto-associates ambiguous names; returns ranked candidates for user confirmation.
 */
export function matchHistoryConductor(params: {
  parsedConductor: ParsedHistoryConductor
  conductorOptions: ConductorOption[]
  groupLeaderFallback?: ConductorOption | null
}): {
  status: ConductorMatchStatus
  matched: ConductorOption | null
  candidates: ConductorOption[]
} {
  const { parsedConductor, conductorOptions, groupLeaderFallback } = params
  const clean = parsedConductor.cleanName.trim()

  // Case: only group was informed (e.g. "Gp Montevidéu")
  if (!clean) {
    if (groupLeaderFallback) {
      return {
        status: 'ambiguous',
        matched: groupLeaderFallback,
        candidates: [
          groupLeaderFallback,
          ...conductorOptions.filter((c) => c.id !== groupLeaderFallback.id),
        ],
      }
    }
    return {
      status: 'unresolved',
      matched: null,
      candidates: conductorOptions.slice(0, 8),
    }
  }

  const normQuery = normalizeSearchText(clean)
  const queryTokens = normQuery.split(' ').filter(Boolean)

  // Common phonetic/orthographic variations in Brazilian Portuguese names
  const canonicalizeToken = (t: string): string => {
    return t
      .replace(/^matheus$/, 'mateus')
      .replace(/^cusmao$/, 'gusmao')
      .replace(/^berbei$/, 'berbel')
      .replace(/^vittor$/, 'vitor')
      .replace(/^kelvin$/, 'kevin')
      .replace(/^ferreirinha$/, 'ferreira')
  }

  const indexedOptions = conductorOptions.map((opt) => {
    const normName = normalizeSearchText(opt.name)
    const tokens = normName.split(' ').filter(Boolean)
    const canonicalTokens = tokens.map(canonicalizeToken)
    return { opt, normName, tokens, canonicalTokens }
  })

  // 1. Exact full name match (accent-insensitive)
  const exactFull = indexedOptions.filter((item) => item.normName === normQuery)
  if (exactFull.length === 1) {
    return {
      status: 'matched',
      matched: exactFull[0]!.opt,
      candidates: [exactFull[0]!.opt],
    }
  }
  if (exactFull.length > 1) {
    return {
      status: 'ambiguous',
      matched: exactFull[0]!.opt,
      candidates: exactFull.map((i) => i.opt),
    }
  }

  // 2. Exact token / initial match (e.g. "Bessa" -> "José Bessa", "Carlos M" -> "Carlos Montero", "Hamilton SS" -> "Hamilton Morgado")
  const exactTokenMatches = indexedOptions.filter((item) => {
    return queryTokens.every((qt, idx) => {
      if (qt.length === 1) {
        // Initial match (e.g. "M" in "Carlos M")
        return item.tokens.some((tok, tIdx) => tIdx >= idx && tok.startsWith(qt))
      }
      if (qt === 'ss' && idx > 0) {
        // Suffix annotation like "Hamilton SS"
        return true
      }
      return item.tokens.includes(qt)
    })
  })

  if (exactTokenMatches.length === 1) {
    return {
      status: 'matched',
      matched: exactTokenMatches[0]!.opt,
      candidates: [exactTokenMatches[0]!.opt],
    }
  }
  if (exactTokenMatches.length > 1) {
    return {
      status: 'ambiguous',
      matched: exactTokenMatches[0]!.opt,
      candidates: exactTokenMatches.map((i) => i.opt),
    }
  }

  // 3. Canonical / phonetic / nickname token match (e.g. "Mateus" <-> "Matheus", "Gusmão" <-> "Edilton Cusmão", "Berbel" <-> "Alexandre Berbei", "Ferreirinha" <-> "José Ferreira Lima", "Kelvin" <-> "Kevin Souza")
  const canonicalQueryTokens = queryTokens
    .filter((qt) => qt !== 'ss')
    .map(canonicalizeToken)

  const fuzzyMatches = indexedOptions.filter((item) => {
    return canonicalQueryTokens.every((cqt) =>
      item.canonicalTokens.some((ct) => ct === cqt || ct.startsWith(cqt) || cqt.startsWith(ct)),
    )
  })

  if (fuzzyMatches.length === 1) {
    // Wait: did it require a nickname/spelling bridge (like Ferreirinha -> Ferreira, Kelvin -> Kevin, Cusmão -> Gusmão, Berbei -> Berbel)?
    // Let's check if it's a direct spelling bridge vs nickname
    const isNicknameOrVariant =
      normQuery === 'ferreirinha' ||
      normQuery === 'kelvin' ||
      canonicalQueryTokens.some((cqt, i) => cqt !== queryTokens[i])
    return {
      status: isNicknameOrVariant ? 'ambiguous' : 'matched',
      matched: fuzzyMatches[0]!.opt,
      candidates: [fuzzyMatches[0]!.opt],
    }
  }
  if (fuzzyMatches.length > 1) {
    return {
      status: 'ambiguous',
      matched: fuzzyMatches[0]!.opt,
      candidates: fuzzyMatches.map((i) => i.opt),
    }
  }

  // 4. First-token fallback (if multi-word like "João Garrido" didn't match full, check first name "João" as ambiguous candidates)
  if (canonicalQueryTokens.length > 1) {
    const firstToken = canonicalQueryTokens[0]!
    const partialCandidates = indexedOptions.filter((item) =>
      item.canonicalTokens.includes(firstToken),
    )
    if (partialCandidates.length > 0) {
      return {
        status: 'ambiguous',
        matched: null,
        candidates: partialCandidates.map((i) => i.opt),
      }
    }
  }

  return {
    status: 'unresolved',
    matched: null,
    candidates: [],
  }
}

/**
 * Matches a parsed territory token against existing territories in the congregation.
 * Strictly prioritizes the entry's region; never creates territories automatically.
 */
export function matchHistoryTerritory(params: {
  parsedToken: ParsedHistoryTerritoryToken
  regionNameJson: string
  territories: TerritoryRecord[]
}): {
  status: TerritoryMatchStatus
  matched: TerritoryRecord | null
  targetSegmentCode: string | null
  suggestions: Array<{ territory: TerritoryRecord; reason: string }>
} {
  const { parsedToken, regionNameJson, territories } = params

  const inRegion = territories.filter((t) =>
    isSameHistoryRegion(t.regionName, regionNameJson),
  )
  const otherRegions = territories.filter(
    (t) => !isSameHistoryRegion(t.regionName, regionNameJson),
  )

  // 1. Exact code match in the target region (or commercial code match)
  const exactInRegion = inRegion.find((t) => {
    const tCode = parseTerritoryCode(t.code).code
    if (tCode === parsedToken.normalizedCode) return true
    if (
      parsedToken.altCommercialCode &&
      normalizeSearchText(t.code) === normalizeSearchText(parsedToken.altCommercialCode)
    ) {
      return true
    }
    if (
      parsedToken.altCommercialCode &&
      normalizeSearchText(t.name).includes('comercio') &&
      tCode === parsedToken.normalizedCode
    ) {
      return true
    }
    return false
  })

  if (exactInRegion) {
    return {
      status: 'matched',
      matched: exactInRegion,
      targetSegmentCode: defaultSegmentCodeForTerritory(exactInRegion, parsedToken),
      suggestions: [],
    }
  }

  // 1b. Base territory match in the target region when fractions (e.g. 30A, 30B, 26A, 03B) are segments of territory 30 / 26 / 03
  const baseInRegion =
    inRegion.find((t) => t.baseNumber === parsedToken.baseNumber && !t.partLabel) ??
    inRegion.find((t) => t.baseNumber === parsedToken.baseNumber)
  if (baseInRegion) {
    return {
      status: 'matched',
      matched: baseInRegion,
      targetSegmentCode: defaultSegmentCodeForTerritory(baseInRegion, parsedToken),
      suggestions: [],
    }
  }

  // Not found in the target region -> build helpful suggestions for manual resolution
  const suggestions: Array<{ territory: TerritoryRecord; reason: string }> = []

  // Suggestion A: Exact code in another region of the congregation (e.g. 24, 29, 30A, 32 in Maria A. Prado)
  for (const t of otherRegions) {
    const tCode = parseTerritoryCode(t.code).code
    if (tCode === parsedToken.normalizedCode) {
      suggestions.push({
        territory: t,
        reason: `Mesmo código (${t.code}) cadastrado na região ${t.regionName}`,
      })
    }
  }

  // Suggestion B: Same baseNumber in the target region
  for (const t of inRegion) {
    if (t.baseNumber === parsedToken.baseNumber) {
      suggestions.push({
        territory: t,
        reason: `Território de mesma numeração base (${t.code}) em ${t.regionName}`,
      })
    }
  }

  // Suggestion C: Same baseNumber in another region
  for (const t of otherRegions) {
    if (
      t.baseNumber === parsedToken.baseNumber &&
      !suggestions.some((s) => s.territory.id === t.id)
    ) {
      const segSuffix = parsedToken.partLabel
        ? ` (atribuindo segmento ${t.baseNumber}${parsedToken.partLabel.toUpperCase()})`
        : ''
      suggestions.push({
        territory: t,
        reason: `Numeração base (${t.code}) na região ${t.regionName}${segSuffix}`,
      })
    }
  }

  return {
    status: 'pending',
    matched: null,
    targetSegmentCode: defaultSegmentCodeForTerritory(null, parsedToken),
    suggestions,
  }
}

export function formatHistorySessionNotes(params: {
  parsedTerritory: ParsedHistoryTerritoryToken
  parsedConductor: ParsedHistoryConductor
  effectiveConductorName: string
  dateEndIso: string | null
  dateNote: string | null
  rawLine: string
  targetSegmentCode?: string | null
}): string {
  const parts: string[] = []

  if (params.targetSegmentCode) {
    parts.push(`Segmento: ${params.targetSegmentCode}`)
  }

  if (params.parsedTerritory.completionState === 'partial') {
    parts.push('Trabalho parcial (parte)')
  } else if (params.parsedTerritory.completionState === 'incomplete') {
    parts.push('Território não concluído (Incompleto)')
  }

  for (const obs of params.parsedTerritory.observations) {
    if (
      obs !== 'Trabalho parcial (parte)' &&
      obs !== 'Território não concluído (Incompleto)' &&
      !parts.includes(obs)
    ) {
      parts.push(`Obs: ${obs}`)
    }
  }

  if (params.parsedConductor.periodLabel) {
    parts.push(`Período: ${params.parsedConductor.periodLabel}`)
  }

  if (params.parsedConductor.groupHint) {
    parts.push(`Grupo: ${params.parsedConductor.groupHint}`)
  }

  const conductorDisplay =
    params.effectiveConductorName || params.parsedConductor.cleanName || params.parsedConductor.rawConductor
  if (conductorDisplay) {
    parts.push(`Dirigente na lista: ${conductorDisplay}`)
  }

  if (params.dateEndIso) {
    parts.push(`Intervalo: até ${params.dateEndIso}`)
  }
  if (params.dateNote) {
    parts.push(params.dateNote)
  }

  if (params.rawLine) {
    parts.push(`Raw: ${params.rawLine}`)
  }

  return parts.join(' · ')
}

export function recomputeImportSummary(
  file: TerritoryHistoryImportFileJson,
  items: HistoryImportItemPreview[],
  regions: RegionRecord[],
  territories: TerritoryRecord[],
): HistoryImportSummary {
  const allKnownRegionNames = [
    ...regions.map((r) => r.name),
    ...territories.map((t) => t.regionName),
  ]

  const byRegion = file.regions.map((reg) => {
    const regItems = items.filter(
      (i) => normalizeSearchText(i.regionNameJson) === normalizeSearchText(reg.name),
    )
    const matchedTerritoryCount = regItems.filter(
      (i) =>
        (i.territoryMatchStatus === 'matched' || i.territoryMatchStatus === 'resolved') &&
        Boolean(i.matchedTerritory),
    ).length
    const pendingTerritoryCount = regItems.length - matchedTerritoryCount
    const regionMatched = allKnownRegionNames.some((known) =>
      isSameHistoryRegion(known, reg.name),
    )
    return {
      regionName: reg.name,
      regionMatched,
      entryCount: reg.entries.length,
      itemCount: regItems.length,
      matchedTerritoryCount,
      pendingTerritoryCount,
    }
  })

  let matchedTerritoriesCount = 0
  let pendingTerritoriesCount = 0
  let matchedConductorsCount = 0
  let ambiguousOrPendingConductorsCount = 0
  let pendingCorrespondenceCount = 0
  let partialCount = 0
  let incompleteCount = 0
  let duplicateCount = 0
  let readyToImportCount = 0

  for (const item of items) {
    const hasTerritory =
      (item.territoryMatchStatus === 'matched' || item.territoryMatchStatus === 'resolved') &&
      Boolean(item.matchedTerritory)
    if (hasTerritory) matchedTerritoriesCount += 1
    else pendingTerritoriesCount += 1

    const hasConfirmedConductor =
      item.conductorMatchStatus === 'matched' ||
      item.conductorMatchStatus === 'confirmed' ||
      item.preserveRawConductorName
    if (hasConfirmedConductor) matchedConductorsCount += 1
    else ambiguousOrPendingConductorsCount += 1

    if (!hasTerritory || !hasConfirmedConductor) {
      pendingCorrespondenceCount += 1
    }

    if (item.completionState === 'partial') partialCount += 1
    if (item.completionState === 'incomplete') incompleteCount += 1
    if (item.isDuplicate) duplicateCount += 1

    if (hasTerritory && hasConfirmedConductor && !item.isDuplicate && item.territoryMatchStatus !== 'ignored') {
      readyToImportCount += 1
    }
  }

  const totalEntries = file.regions.reduce((acc, r) => acc + r.entries.length, 0)

  return {
    totalEntries,
    totalTerritoryItems: items.length,
    byRegion,
    matchedTerritoriesCount,
    pendingTerritoriesCount,
    matchedConductorsCount,
    ambiguousOrPendingConductorsCount,
    pendingCorrespondenceCount,
    partialOrIncompleteCount: partialCount + incompleteCount,
    partialCount,
    incompleteCount,
    duplicateCount,
    readyToImportCount,
  }
}

export function buildHistoryImportPreview(params: {
  congregationId: string
  file: TerritoryHistoryImportFileJson
  regions: RegionRecord[]
  territories: TerritoryRecord[]
  conductorOptions: ConductorOption[]
  existingWorkSessions: WorkSessionRecord[]
}): HistoryImportPreviewResult {
  const {
    congregationId,
    file,
    regions,
    territories,
    conductorOptions,
    existingWorkSessions,
  } = params

  const existingSourceKeys = new Set<string>()
  const existingDocIds = new Set<string>()
  const existingSemanticKeys = new Set<string>()

  for (const ws of existingWorkSessions) {
    if (ws.importSourceKey) existingSourceKeys.add(ws.importSourceKey)
    existingDocIds.add(ws.id)
    const rawFromNotes = ws.raw || ws.notes.match(/Raw:\s*(.+)$/i)?.[1]?.trim() || ''
    if (rawFromNotes) {
      existingSemanticKeys.add(`${ws.territoryId}|${ws.isoDate}|${rawFromNotes}`)
    }
  }

  const seenInFileKeys = new Set<string>()
  const items: HistoryImportItemPreview[] = []

  for (const reg of file.regions) {
    const matchedRegion =
      regions.find((r) => isSameHistoryRegion(r.name, reg.name)) ?? null

    for (let eIdx = 0; eIdx < reg.entries.length; eIdx += 1) {
      const entry = reg.entries[eIdx]!
      const rawLine =
        entry.raw?.trim() ||
        `${entry.date} - ${entry.conductor} - ${entry.territories.join(';')}`
      const parsedConductor = parseHistoryConductorRaw(entry.conductor, entry.date)
      const conductorMatch = matchHistoryConductor({
        parsedConductor,
        conductorOptions,
      })

      const parsedTokens = parseHistoryTerritoryTokens(entry.territories)

      for (let tIdx = 0; tIdx < parsedTokens.length; tIdx += 1) {
        const parsedTerritory = parsedTokens[tIdx]!
        const importSourceKey = buildHistoryImportSourceKey({
          congregationId,
          regionName: reg.name,
          isoDate: entry.date,
          rawLine,
          tokenIndex: tIdx,
          rawToken: parsedTerritory.rawToken,
        })
        const workSessionDocId = buildHistoryWorkSessionDocId(importSourceKey)

        const territoryMatch = matchHistoryTerritory({
          parsedToken: parsedTerritory,
          regionNameJson: reg.name,
          territories,
        })

        const matchedTerritory = territoryMatch.matched
        const targetSegmentCode = territoryMatch.targetSegmentCode
        const matchedConductor =
          conductorMatch.status === 'matched' ? conductorMatch.matched : null
        const effectiveConductorName =
          matchedConductor?.name ??
          conductorMatch.matched?.name ??
          parsedConductor.cleanName ??
          parsedConductor.rawConductor

        // Check duplicate
        let isDuplicate = false
        let duplicateReason: string | null = null
        if (
          existingSourceKeys.has(importSourceKey) ||
          existingDocIds.has(workSessionDocId)
        ) {
          isDuplicate = true
          duplicateReason = 'Já importado anteriormente (mesma chave de origem)'
        } else if (
          matchedTerritory &&
          existingSemanticKeys.has(`${matchedTerritory.id}|${entry.date}|${rawLine}`)
        ) {
          isDuplicate = true
          duplicateReason = 'Sessão já existente para este território, data e registro original'
        } else if (seenInFileKeys.has(importSourceKey)) {
          isDuplicate = true
          duplicateReason = 'Registro repetido dentro do próprio arquivo JSON'
        }
        seenInFileKeys.add(importSourceKey)

        const formattedNotes = formatHistorySessionNotes({
          parsedTerritory,
          parsedConductor,
          effectiveConductorName,
          dateEndIso: entry.dateEnd ?? null,
          dateNote: entry.dateNote ?? null,
          rawLine,
          targetSegmentCode,
        })

        items.push({
          itemKey: `${reg.name}:${eIdx}:${tIdx}`,
          importSourceKey,
          workSessionDocId,
          regionNameJson: reg.name,
          matchedRegion,
          entryIndex: eIdx,
          tokenIndex: tIdx,
          isoDate: entry.date,
          dateEndIso: entry.dateEnd ?? null,
          dateNote: entry.dateNote ?? null,
          rawLine,
          parsedConductor,
          conductorMatchStatus: conductorMatch.status,
          matchedConductor,
          conductorCandidates: conductorMatch.candidates,
          preserveRawConductorName: false,
          effectiveConductorName,
          effectiveConductorPublisherId: matchedConductor?.publisherId ?? null,
          effectiveConductorUserId: matchedConductor?.userId ?? null,
          parsedTerritory,
          territoryMatchStatus: territoryMatch.status,
          matchedTerritory,
          targetSegmentCode,
          suggestedTerritories: territoryMatch.suggestions,
          periodType: parsedConductor.periodType,
          completionState: parsedTerritory.completionState,
          formattedNotes,
          isDuplicate,
          duplicateReason,
        })
      }
    }
  }

  const summary = recomputeImportSummary(file, items, regions, territories)
  return {
    file,
    items,
    summary,
  }
}
