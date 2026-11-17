import {
  AlertTriangle,
  Check,
  CheckCircle2,
  FileJson,
  Filter,
  HelpCircle,
  Layers,
  MapPin,
  Search,
  Upload,
  Users,
  X,
} from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import type { ImportHistoryBatchResult, ImportHistoryWorkSessionWriteItem } from '../api'
import {
  buildHistoryImportPreview,
  defaultSegmentCodeForTerritory,
  formatHistorySessionNotes,
  normalizeSearchText,
  recomputeImportSummary,
  validateTerritoryHistoryJson,
  type HistoryImportItemPreview,
  type TerritoryHistoryImportFileJson,
} from '../historyImport'
import { compareTerritoryCodes, formatFullDateBr, formatShortDayMonth, periodTypeLabel } from '../status'
import { useTerritories } from '../store'
import type { WorkSessionCompletionState } from '../types'

type PreviewSubTab = 'overview' | 'conductors' | 'territories' | 'records'
type RecordFilterMode = 'all' | 'ready' | 'partial' | 'pending' | 'duplicate'

export function HistoryImportModal({
  onClose,
  onImportedSuccess,
}: {
  onClose: () => void
  onImportedSuccess?: () => void
}) {
  const {
    congregationId,
    regions,
    territories,
    segments,
    conductorOptions,
    workSessions,
    importHistoryBatch,
  } = useTerritories()

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

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [fileName, setFileName] = useState('')
  const [validationError, setValidationError] = useState('')
  const [parsedFile, setParsedFile] = useState<TerritoryHistoryImportFileJson | null>(null)
  const [items, setItems] = useState<HistoryImportItemPreview[]>([])
  const [subTab, setSubTab] = useState<PreviewSubTab>('overview')
  const [recordFilter, setRecordFilter] = useState<RecordFilterMode>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')
  const [importResult, setImportResult] = useState<ImportHistoryBatchResult | null>(null)

  const summary = useMemo(() => {
    if (!parsedFile) return null
    return recomputeImportSummary(parsedFile, items, regions, territories)
  }, [parsedFile, items, regions, territories])

  function loadJsonPayload(rawJson: unknown, sourceLabel: string) {
    setValidationError('')
    setImportError('')
    setImportResult(null)

    const validation = validateTerritoryHistoryJson(rawJson)
    if (!validation.ok) {
      setValidationError(validation.error)
      setParsedFile(null)
      setItems([])
      return
    }

    const preview = buildHistoryImportPreview({
      congregationId: congregationId || 'default',
      file: validation.data,
      regions,
      territories,
      conductorOptions,
      existingWorkSessions: workSessions,
    })

    setFileName(sourceLabel)
    setParsedFile(preview.file)
    setItems(preview.items)
    setSubTab('overview')
  }

  async function handleFileSelect(file: File | undefined) {
    if (!file) return
    try {
      const text = (await file.text()).replace(/^\uFEFF/, '')
      const parsed = JSON.parse(text) as unknown
      loadJsonPayload(parsed, file.name)
    } catch (err) {
      setValidationError(
        err instanceof Error
          ? `Não foi possível ler o JSON: ${err.message}`
          : 'Arquivo JSON inválido ou corrompido.',
      )
    }
  }

  // Group conductors by normalized cleanName (or rawConductor when cleanName is empty)
  const conductorGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string
        displayRaw: string
        cleanName: string
        groupHint: string | null
        count: number
        status: HistoryImportItemPreview['conductorMatchStatus']
        matchedConductor: HistoryImportItemPreview['matchedConductor']
        preserveRawConductorName: boolean
        candidates: HistoryImportItemPreview['conductorCandidates']
      }
    >()

    for (const item of items) {
      const key = normalizeSearchText(
        item.parsedConductor.cleanName || item.parsedConductor.rawConductor,
      )
      const existing = map.get(key)
      if (existing) {
        existing.count += 1
      } else {
        map.set(key, {
          key,
          displayRaw:
            item.parsedConductor.cleanName || item.parsedConductor.rawConductor || 'Não informado',
          cleanName: item.parsedConductor.cleanName,
          groupHint: item.parsedConductor.groupHint,
          count: 1,
          status: item.conductorMatchStatus,
          matchedConductor: item.matchedConductor,
          preserveRawConductorName: item.preserveRawConductorName,
          candidates: item.conductorCandidates,
        })
      }
    }

    return [...map.values()].sort((a, b) => {
      const aPending = a.status === 'ambiguous' || (a.status === 'unresolved' && !a.preserveRawConductorName)
      const bPending = b.status === 'ambiguous' || (b.status === 'unresolved' && !b.preserveRawConductorName)
      if (aPending !== bPending) return aPending ? -1 : 1
      return a.displayRaw.localeCompare(b.displayRaw, 'pt-BR')
    })
  }, [items])

  // Group territories that are not automatically matched by (regionNameJson + normalizedCode)
  const unresolvedTerritoryGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string
        regionNameJson: string
        normalizedCode: string
        rawTokenSample: string
        count: number
        status: HistoryImportItemPreview['territoryMatchStatus']
        matchedTerritory: HistoryImportItemPreview['matchedTerritory']
        targetSegmentCode: string | null
        suggestions: HistoryImportItemPreview['suggestedTerritories']
      }
    >()

    for (const item of items) {
      const key = `${normalizeSearchText(item.regionNameJson)}::${item.parsedTerritory.normalizedCode}`
      const existing = map.get(key)
      if (existing) {
        existing.count += 1
      } else {
        map.set(key, {
          key,
          regionNameJson: item.regionNameJson,
          normalizedCode: item.parsedTerritory.normalizedCode,
          rawTokenSample: item.parsedTerritory.rawToken,
          count: 1,
          status: item.territoryMatchStatus,
          matchedTerritory: item.matchedTerritory,
          targetSegmentCode: item.targetSegmentCode,
          suggestions: item.suggestedTerritories,
        })
      }
    }

    return [...map.values()]
      .filter((g) => g.status !== 'matched')
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === 'pending' ? -1 : 1
        return (
          a.regionNameJson.localeCompare(b.regionNameJson, 'pt-BR') ||
          a.normalizedCode.localeCompare(b.normalizedCode, 'pt-BR', { numeric: true })
        )
      })
  }, [items])

  function applyConductorResolutionByGroup(
    groupKey: string,
    resolution:
      | { mode: 'publisher'; conductorOptionId: string }
      | { mode: 'preserveRaw' }
      | { mode: 'clear' },
  ) {
    const selectedOption =
      resolution.mode === 'publisher'
        ? (conductorOptions.find((c) => c.id === resolution.conductorOptionId) ?? null)
        : null

    setItems((curr) =>
      curr.map((item) => {
        const key = normalizeSearchText(
          item.parsedConductor.cleanName || item.parsedConductor.rawConductor,
        )
        if (key !== groupKey) return item

        if (resolution.mode === 'publisher' && selectedOption) {
          const effectiveConductorName = selectedOption.name
          return {
            ...item,
            conductorMatchStatus: 'confirmed',
            matchedConductor: selectedOption,
            preserveRawConductorName: false,
            effectiveConductorName,
            effectiveConductorPublisherId: selectedOption.publisherId,
            effectiveConductorUserId: selectedOption.userId,
            formattedNotes: formatHistorySessionNotes({
              parsedTerritory: item.parsedTerritory,
              parsedConductor: item.parsedConductor,
              effectiveConductorName,
              dateEndIso: item.dateEndIso,
              dateNote: item.dateNote,
              rawLine: item.rawLine,
            }),
          }
        }

        if (resolution.mode === 'preserveRaw') {
          const effectiveConductorName =
            item.parsedConductor.cleanName || item.parsedConductor.rawConductor
          return {
            ...item,
            conductorMatchStatus: 'confirmed',
            matchedConductor: null,
            preserveRawConductorName: true,
            effectiveConductorName,
            effectiveConductorPublisherId: null,
            effectiveConductorUserId: null,
            formattedNotes: formatHistorySessionNotes({
              parsedTerritory: item.parsedTerritory,
              parsedConductor: item.parsedConductor,
              effectiveConductorName,
              dateEndIso: item.dateEndIso,
              dateNote: item.dateNote,
              rawLine: item.rawLine,
            }),
          }
        }

        return {
          ...item,
          conductorMatchStatus: item.conductorCandidates.length > 0 ? 'ambiguous' : 'unresolved',
          matchedConductor: null,
          preserveRawConductorName: false,
        }
      }),
    )
  }

  function applyAllTopConductorSuggestions() {
    setItems((curr) =>
      curr.map((item) => {
        if (item.conductorMatchStatus === 'matched' || item.conductorMatchStatus === 'confirmed') {
          return item
        }
        const topCandidate = item.matchedConductor ?? item.conductorCandidates[0] ?? null
        if (topCandidate) {
          const effectiveConductorName = topCandidate.name
          return {
            ...item,
            conductorMatchStatus: 'confirmed',
            matchedConductor: topCandidate,
            preserveRawConductorName: false,
            effectiveConductorName,
            effectiveConductorPublisherId: topCandidate.publisherId,
            effectiveConductorUserId: topCandidate.userId,
            formattedNotes: formatHistorySessionNotes({
              parsedTerritory: item.parsedTerritory,
              parsedConductor: item.parsedConductor,
              effectiveConductorName,
              dateEndIso: item.dateEndIso,
              dateNote: item.dateNote,
              rawLine: item.rawLine,
            }),
          }
        }
        const effectiveConductorName =
          item.parsedConductor.cleanName || item.parsedConductor.rawConductor
        return {
          ...item,
          conductorMatchStatus: 'confirmed',
          matchedConductor: null,
          preserveRawConductorName: true,
          effectiveConductorName,
          effectiveConductorPublisherId: null,
          effectiveConductorUserId: null,
          formattedNotes: formatHistorySessionNotes({
            parsedTerritory: item.parsedTerritory,
            parsedConductor: item.parsedConductor,
            effectiveConductorName,
            dateEndIso: item.dateEndIso,
            dateNote: item.dateNote,
            rawLine: item.rawLine,
          }),
        }
      }),
    )
  }

  function applyTerritoryResolutionByGroup(
    groupKey: string,
    territoryId: string | 'pending' | 'ignored',
  ) {
    const selectedTerritory =
      territoryId !== 'pending' && territoryId !== 'ignored'
        ? (territories.find((t) => t.id === territoryId) ?? null)
        : null

    setItems((curr) =>
      curr.map((item) => {
        const key = `${normalizeSearchText(item.regionNameJson)}::${item.parsedTerritory.normalizedCode}`
        if (key !== groupKey) return item
        if (territoryId === 'pending') {
          return {
            ...item,
            territoryMatchStatus: 'pending',
            matchedTerritory: null,
            targetSegmentCode: defaultSegmentCodeForTerritory(null, item.parsedTerritory),
          }
        }
        if (territoryId === 'ignored') {
          return {
            ...item,
            territoryMatchStatus: 'ignored',
            matchedTerritory: null,
          }
        }
        if (selectedTerritory) {
          const nextSegCode = defaultSegmentCodeForTerritory(
            selectedTerritory,
            item.parsedTerritory,
          )
          return {
            ...item,
            territoryMatchStatus: 'resolved',
            matchedTerritory: selectedTerritory,
            targetSegmentCode: nextSegCode,
            formattedNotes: formatHistorySessionNotes({
              parsedTerritory: item.parsedTerritory,
              parsedConductor: item.parsedConductor,
              effectiveConductorName: item.effectiveConductorName,
              dateEndIso: item.dateEndIso,
              dateNote: item.dateNote,
              rawLine: item.rawLine,
              targetSegmentCode: nextSegCode,
            }),
          }
        }
        return item
      }),
    )
  }

  function applyTerritorySegmentByGroup(groupKey: string, segmentCode: string) {
    const normalized = segmentCode.trim().toUpperCase() || null
    setItems((curr) =>
      curr.map((item) => {
        const key = `${normalizeSearchText(item.regionNameJson)}::${item.parsedTerritory.normalizedCode}`
        if (key !== groupKey) return item
        return {
          ...item,
          targetSegmentCode: normalized,
          formattedNotes: formatHistorySessionNotes({
            parsedTerritory: item.parsedTerritory,
            parsedConductor: item.parsedConductor,
            effectiveConductorName: item.effectiveConductorName,
            dateEndIso: item.dateEndIso,
            dateNote: item.dateNote,
            rawLine: item.rawLine,
            targetSegmentCode: normalized,
          }),
        }
      }),
    )
  }

  function applyAllTopTerritorySuggestions() {
    setItems((curr) =>
      curr.map((item) => {
        if (item.territoryMatchStatus !== 'pending') return item
        const topSuggestion = item.suggestedTerritories[0]?.territory ?? null
        if (!topSuggestion) return item
        const nextSegCode = defaultSegmentCodeForTerritory(
          topSuggestion,
          item.parsedTerritory,
        )
        return {
          ...item,
          territoryMatchStatus: 'resolved',
          matchedTerritory: topSuggestion,
          targetSegmentCode: nextSegCode,
          formattedNotes: formatHistorySessionNotes({
            parsedTerritory: item.parsedTerritory,
            parsedConductor: item.parsedConductor,
            effectiveConductorName: item.effectiveConductorName,
            dateEndIso: item.dateEndIso,
            dateNote: item.dateNote,
            rawLine: item.rawLine,
            targetSegmentCode: nextSegCode,
          }),
        }
      }),
    )
  }

  function updateSingleItem(
    itemKey: string,
    patch: {
      territoryId?: string
      segmentCode?: string | null
      conductorOptionId?: string
      completionState?: WorkSessionCompletionState
    },
  ) {
    setItems((curr) =>
      curr.map((item) => {
        if (item.itemKey !== itemKey) return item
        let next = { ...item }

        if (patch.territoryId !== undefined) {
          if (patch.territoryId === 'pending') {
            next.territoryMatchStatus = 'pending'
            next.matchedTerritory = null
            next.targetSegmentCode = defaultSegmentCodeForTerritory(null, next.parsedTerritory)
          } else if (patch.territoryId === 'ignored') {
            next.territoryMatchStatus = 'ignored'
            next.matchedTerritory = null
          } else {
            const found = territories.find((t) => t.id === patch.territoryId) ?? null
            if (found) {
              next.territoryMatchStatus = 'resolved'
              next.matchedTerritory = found
              next.targetSegmentCode = defaultSegmentCodeForTerritory(found, next.parsedTerritory)
            }
          }
        }

        if (patch.segmentCode !== undefined) {
          next.targetSegmentCode = patch.segmentCode?.trim().toUpperCase() || null
        }

        if (patch.conductorOptionId !== undefined) {
          if (patch.conductorOptionId === '__raw__') {
            const effectiveConductorName =
              item.parsedConductor.cleanName || item.parsedConductor.rawConductor
            next = {
              ...next,
              conductorMatchStatus: 'confirmed',
              matchedConductor: null,
              preserveRawConductorName: true,
              effectiveConductorName,
              effectiveConductorPublisherId: null,
              effectiveConductorUserId: null,
            }
          } else {
            const foundCond =
              conductorOptions.find((c) => c.id === patch.conductorOptionId) ?? null
            if (foundCond) {
              next = {
                ...next,
                conductorMatchStatus: 'confirmed',
                matchedConductor: foundCond,
                preserveRawConductorName: false,
                effectiveConductorName: foundCond.name,
                effectiveConductorPublisherId: foundCond.publisherId,
                effectiveConductorUserId: foundCond.userId,
              }
            }
          }
        }

        if (patch.completionState !== undefined) {
          next = {
            ...next,
            completionState: patch.completionState,
            parsedTerritory: {
              ...next.parsedTerritory,
              completionState: patch.completionState,
            },
          }
        }

        next.formattedNotes = formatHistorySessionNotes({
          parsedTerritory: next.parsedTerritory,
          parsedConductor: next.parsedConductor,
          effectiveConductorName: next.effectiveConductorName,
          dateEndIso: next.dateEndIso,
          dateNote: next.dateNote,
          rawLine: next.rawLine,
          targetSegmentCode: next.targetSegmentCode,
        })

        return next
      }),
    )
  }

  const filteredItems = useMemo(() => {
    const normSearch = normalizeSearchText(searchQuery)
    return items.filter((item) => {
      const hasTerritory =
        (item.territoryMatchStatus === 'matched' || item.territoryMatchStatus === 'resolved') &&
        Boolean(item.matchedTerritory)
      const hasConductor =
        item.conductorMatchStatus === 'matched' ||
        item.conductorMatchStatus === 'confirmed' ||
        item.preserveRawConductorName
      const isReady =
        hasTerritory && hasConductor && !item.isDuplicate && item.territoryMatchStatus !== 'ignored'

      if (recordFilter === 'ready' && !isReady) return false
      if (recordFilter === 'partial' && item.completionState === 'completed') return false
      if (recordFilter === 'pending' && (hasTerritory && hasConductor)) return false
      if (recordFilter === 'duplicate' && !item.isDuplicate) return false

      if (normSearch) {
        const haystack = normalizeSearchText(
          `${item.isoDate} ${item.regionNameJson} ${item.parsedConductor.rawConductor} ${item.effectiveConductorName} ${item.parsedTerritory.rawToken} ${item.rawLine}`,
        )
        if (!haystack.includes(normSearch)) return false
      }
      return true
    })
  }, [items, recordFilter, searchQuery])

  async function handleConfirmImport() {
    if (!parsedFile || !summary) return
    setImporting(true)
    setImportError('')

    try {
      const validItemsToWrite: ImportHistoryWorkSessionWriteItem[] = []
      let ignoredCount = 0

      for (const item of items) {
        const hasTerritory =
          (item.territoryMatchStatus === 'matched' || item.territoryMatchStatus === 'resolved') &&
          Boolean(item.matchedTerritory)
        const hasConductor =
          item.conductorMatchStatus === 'matched' ||
          item.conductorMatchStatus === 'confirmed' ||
          item.preserveRawConductorName

        if (!hasTerritory || !hasConductor || item.territoryMatchStatus === 'ignored') {
          ignoredCount += 1
          continue
        }
        if (item.isDuplicate) {
          continue
        }

        const matchedTerr = item.matchedTerritory!
        validItemsToWrite.push({
          docId: item.workSessionDocId,
          importSourceKey: item.importSourceKey,
          territoryId: matchedTerr.id,
          territoryBaseNumber: matchedTerr.baseNumber,
          targetSegmentCode: item.targetSegmentCode,
          conductorUserId: item.effectiveConductorUserId,
          conductorPublisherId: item.effectiveConductorPublisherId,
          conductorName: item.effectiveConductorName,
          conductorRaw: item.parsedConductor.rawConductor,
          isoDate: item.isoDate,
          dateEndIso: item.dateEndIso,
          dateNote: item.dateNote,
          completionState: item.completionState,
          periodType: item.periodType,
          regionId: matchedTerr.regionId ?? item.matchedRegion?.id ?? null,
          regionName: matchedTerr.regionName || item.regionNameJson,
          territoryCodeRaw: item.targetSegmentCode || item.parsedTerritory.rawToken,
          raw: item.rawLine,
          notes: item.formattedNotes,
        })
      }

      const result = await importHistoryBatch({
        items: validItemsToWrite,
        ignoredCount,
      })

      setImportResult(result)
      onImportedSuccess?.()
    } catch (err) {
      setImportError(
        err instanceof Error && err.message
          ? err.message
          : 'Não foi possível concluir a importação do histórico.',
      )
    } finally {
      setImporting(false)
    }
  }

  const pendingConductorGroupsCount = conductorGroups.filter(
    (g) => g.status === 'ambiguous' || (g.status === 'unresolved' && !g.preserveRawConductorName),
  ).length

  const pendingTerritoryGroupsCount = unresolvedTerritoryGroups.filter(
    (g) => g.status === 'pending',
  ).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px]">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-soft text-indigo">
              <FileJson size={20} />
            </span>
            <div>
              <h2 className="text-base font-bold text-ink">
                Importar histórico de territórios (JSON)
              </h2>
              <p className="text-xs text-muted">
                Valide regiões, associe territórios e dirigentes e confira a prévia antes de gravar em workSessions.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-xl text-muted hover:bg-[#F3F5FB]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {/* Step 1: File Picker when no file is loaded yet (or allow switching file) */}
          {!parsedFile ? (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const file = e.dataTransfer.files?.[0]
                  void handleFileSelect(file)
                }}
                className="cursor-pointer rounded-2xl border-2 border-dashed border-[#C7D2FE] bg-[#F8FAFC] p-8 text-center transition hover:border-indigo hover:bg-[#EEF2FF]/50"
              >
                <Upload size={32} className="mx-auto mb-3 text-indigo" />
                <p className="text-sm font-semibold text-ink">
                  Clique para selecionar ou arraste o arquivo JSON aqui
                </p>
                <p className="mt-1 text-xs text-muted">
                  Formato suportado: <code className="font-mono">historico_territorios_2026.json</code> (schemaVersion 1.0)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => void handleFileSelect(e.target.files?.[0])}
                />
              </div>

              {validationError ? (
                <div className="flex items-start gap-2.5 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-4 text-xs text-[#991B1B]">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">Erro de validação do arquivo JSON</p>
                    <p className="mt-0.5">{validationError}</p>
                  </div>
                </div>
              ) : null}
            </div>
          ) : importResult ? (
            /* Step 4: Final Import Result Screen */
            <div className="space-y-5 py-4">
              <div className="rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] p-6 text-center">
                <CheckCircle2 size={40} className="mx-auto mb-3 text-[#16A34A]" />
                <h3 className="text-lg font-bold text-[#14532D]">
                  Importação concluída com sucesso!
                </h3>
                <p className="mt-1 text-xs text-[#166534]">
                  O histórico de execução (<code className="font-mono">workSessions</code>) e o motor de sugestões foram atualizados imediatamente.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-line bg-[#F8FAFC] p-4 text-center">
                  <span className="block text-2xl font-bold text-[#16A34A]">
                    {importResult.importedCount}
                  </span>
                  <span className="mt-1 block text-xs font-medium text-muted">
                    Registros de execução importados
                  </span>
                </div>
                <div className="rounded-2xl border border-line bg-[#F8FAFC] p-4 text-center">
                  <span className="block text-2xl font-bold text-[#D97706]">
                    {importResult.ignoredCount}
                  </span>
                  <span className="mt-1 block text-xs font-medium text-muted">
                    Registros pendentes / ignorados
                  </span>
                </div>
                <div className="rounded-2xl border border-line bg-[#F8FAFC] p-4 text-center">
                  <span className="block text-2xl font-bold text-[#475569]">
                    {importResult.duplicatesSkipped}
                  </span>
                  <span className="mt-1 block text-xs font-medium text-muted">
                    Duplicatas evitadas (idempotência)
                  </span>
                </div>
              </div>
            </div>
          ) : summary ? (
            /* Step 2 & 3: Preview Summary + Interactive Correspondence Resolution */
            <div className="space-y-5">
              {/* Loaded File Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-[#F8FAFC] px-4 py-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-[#DCFCE7] px-2 py-0.5 font-semibold text-[#166534]">
                    Schema v{parsedFile.schemaVersion} válido
                  </span>
                  <span className="font-semibold text-ink">{fileName}</span>
                  {parsedFile.year ? (
                    <span className="text-muted">· Ano {parsedFile.year}</span>
                  ) : null}
                  {parsedFile.updatedThrough ? (
                    <span className="rounded-md bg-[#EEF2FF] px-2 py-0.5 font-medium text-indigo">
                      Atualizado até {formatFullDateBr(parsedFile.updatedThrough)}
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setParsedFile(null)
                    setItems([])
                    setFileName('')
                  }}
                  className="font-semibold text-indigo hover:underline"
                >
                  Trocar arquivo
                </button>
              </div>

              {/* Summary Metric Cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <div className="rounded-2xl border border-line bg-white p-3.5">
                  <span className="block text-[11px] font-medium text-muted">
                    Total de registros
                  </span>
                  <span className="mt-1 block text-lg font-bold text-ink">
                    {summary.totalTerritoryItems}
                  </span>
                  <span className="text-[11px] text-muted">
                    em {summary.totalEntries} saídas
                  </span>
                </div>

                <div className="rounded-2xl border border-line bg-white p-3.5">
                  <span className="block text-[11px] font-medium text-muted">
                    Territórios encontrados
                  </span>
                  <span className="mt-1 block text-lg font-bold text-[#16A34A]">
                    {summary.matchedTerritoriesCount}
                  </span>
                  <span className="text-[11px] text-muted">
                    {summary.pendingTerritoriesCount} pendente(s)
                  </span>
                </div>

                <div className="rounded-2xl border border-line bg-white p-3.5">
                  <span className="block text-[11px] font-medium text-muted">
                    Dirigentes associados
                  </span>
                  <span className="mt-1 block text-lg font-bold text-indigo">
                    {summary.matchedConductorsCount}
                  </span>
                  <span className="text-[11px] text-muted">
                    {summary.ambiguousOrPendingConductorsCount} p/ confirmar
                  </span>
                </div>

                <div className="rounded-2xl border border-line bg-white p-3.5">
                  <span className="block text-[11px] font-medium text-muted">
                    Pendências totais
                  </span>
                  <span
                    className={`mt-1 block text-lg font-bold ${
                      summary.pendingCorrespondenceCount > 0 ? 'text-[#D97706]' : 'text-[#16A34A]'
                    }`}
                  >
                    {summary.pendingCorrespondenceCount}
                  </span>
                  <span className="text-[11px] text-muted">
                    aguardando revisão
                  </span>
                </div>

                <div className="rounded-2xl border border-line bg-white p-3.5">
                  <span className="block text-[11px] font-medium text-muted">
                    Parciais / Incompletos
                  </span>
                  <span className="mt-1 block text-lg font-bold text-[#2563EB]">
                    {summary.partialOrIncompleteCount}
                  </span>
                  <span className="text-[11px] text-muted">
                    {summary.partialCount} parte · {summary.incompleteCount} incompl.
                  </span>
                </div>

                <div className="rounded-2xl border border-line bg-white p-3.5">
                  <span className="block text-[11px] font-medium text-muted">
                    Possíveis duplicatas
                  </span>
                  <span className="mt-1 block text-lg font-bold text-[#475569]">
                    {summary.duplicateCount}
                  </span>
                  <span className="text-[11px] text-muted">
                    chave idempotente
                  </span>
                </div>
              </div>

              {/* Sub-Navigation Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 border-b border-line pb-2">
                <button
                  type="button"
                  onClick={() => setSubTab('overview')}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                    subTab === 'overview'
                      ? 'bg-indigo text-white'
                      : 'bg-[#F8FAFC] text-[#475569] hover:bg-[#EEF2FF]'
                  }`}
                >
                  <Layers size={14} />
                  Resumo por região
                </button>

                <button
                  type="button"
                  onClick={() => setSubTab('conductors')}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                    subTab === 'conductors'
                      ? 'bg-indigo text-white'
                      : 'bg-[#F8FAFC] text-[#475569] hover:bg-[#EEF2FF]'
                  }`}
                >
                  <Users size={14} />
                  Dirigentes ({conductorGroups.length})
                  {pendingConductorGroupsCount > 0 ? (
                    <span className="rounded-full bg-[#FEF3C7] px-1.5 py-0.2 text-[10px] font-bold text-[#92400E]">
                      {pendingConductorGroupsCount}
                    </span>
                  ) : null}
                </button>

                <button
                  type="button"
                  onClick={() => setSubTab('territories')}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                    subTab === 'territories'
                      ? 'bg-indigo text-white'
                      : 'bg-[#F8FAFC] text-[#475569] hover:bg-[#EEF2FF]'
                  }`}
                >
                  <MapPin size={14} />
                  Territórios pendentes ({unresolvedTerritoryGroups.length})
                  {pendingTerritoryGroupsCount > 0 ? (
                    <span className="rounded-full bg-[#FEF3C7] px-1.5 py-0.2 text-[10px] font-bold text-[#92400E]">
                      {pendingTerritoryGroupsCount}
                    </span>
                  ) : null}
                </button>

                <button
                  type="button"
                  onClick={() => setSubTab('records')}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                    subTab === 'records'
                      ? 'bg-indigo text-white'
                      : 'bg-[#F8FAFC] text-[#475569] hover:bg-[#EEF2FF]'
                  }`}
                >
                  <Filter size={14} />
                  Prévia dos registros ({items.length})
                </button>
              </div>

              {/* Sub-Tab 1: Overview by Region & Notes */}
              {subTab === 'overview' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {summary.byRegion.map((reg) => (
                      <div
                        key={reg.regionName}
                        className="rounded-2xl border border-line bg-[#F8FAFC] p-4"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-ink">{reg.regionName}</span>
                          {reg.regionMatched ? (
                            <span className="rounded-full bg-[#DCFCE7] px-2.5 py-0.5 text-[11px] font-semibold text-[#166534]">
                              Região localizada
                            </span>
                          ) : (
                            <span className="rounded-full bg-[#FEF3C7] px-2.5 py-0.5 text-[11px] font-semibold text-[#92400E]">
                              Região não cadastrada
                            </span>
                          )}
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                          <div className="rounded-xl bg-white p-2.5">
                            <span className="block text-[11px] text-muted">Saídas (linhas)</span>
                            <span className="font-bold text-ink">{reg.entryCount}</span>
                          </div>
                          <div className="rounded-xl bg-white p-2.5">
                            <span className="block text-[11px] text-muted">Encontrados</span>
                            <span className="font-bold text-[#16A34A]">
                              {reg.matchedTerritoryCount}
                            </span>
                          </div>
                          <div className="rounded-xl bg-white p-2.5">
                            <span className="block text-[11px] text-muted">Pendentes</span>
                            <span className="font-bold text-[#D97706]">
                              {reg.pendingTerritoryCount}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {(pendingConductorGroupsCount > 0 || pendingTerritoryGroupsCount > 0) ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] p-4 text-xs text-[#92400E]">
                      <div className="flex items-start gap-2.5">
                        <HelpCircle size={16} className="mt-0.5 shrink-0" />
                        <div>
                          <p className="font-semibold">
                            Existem correspondências que requerem sua confirmação
                          </p>
                          <p className="mt-0.5">
                            Nomes ambíguos (ex.: Mateus, João, Júlio) ou apelidos não são associados automaticamente sem revisão, e territórios fora da região aguardam confirmação.
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {pendingConductorGroupsCount > 0 ? (
                          <button
                            type="button"
                            onClick={() => setSubTab('conductors')}
                            className="rounded-xl bg-[#D97706] px-3 py-1.5 font-semibold text-white hover:bg-[#B45309]"
                          >
                            Revisar dirigentes ({pendingConductorGroupsCount})
                          </button>
                        ) : null}
                        {pendingTerritoryGroupsCount > 0 ? (
                          <button
                            type="button"
                            onClick={() => setSubTab('territories')}
                            className="rounded-xl border border-[#D97706] bg-white px-3 py-1.5 font-semibold text-[#92400E] hover:bg-[#FEF3C7]"
                          >
                            Revisar territórios ({pendingTerritoryGroupsCount})
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {parsedFile.importNotes && parsedFile.importNotes.length > 0 ? (
                    <div className="rounded-2xl border border-line bg-[#F8FAFC] p-4 text-xs">
                      <span className="block font-semibold text-ink">
                        Notas do arquivo original:
                      </span>
                      <ul className="mt-1.5 list-disc space-y-1 pl-4 text-muted">
                        {parsedFile.importNotes.map((note, idx) => (
                          <li key={idx}>{note}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* Sub-Tab 2: Conductor Correspondence */}
              {subTab === 'conductors' ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-[#F8FAFC] px-4 py-3 text-xs">
                    <span className="text-muted">
                      Associe os nomes da planilha aos publicadores cadastrados ou confirme as sugestões.
                    </span>
                    {pendingConductorGroupsCount > 0 ? (
                      <button
                        type="button"
                        onClick={applyAllTopConductorSuggestions}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-indigo px-3 py-1.5 font-semibold text-white hover:bg-indigo/90"
                      >
                        <Check size={13} />
                        Confirmar sugestões para todos ({pendingConductorGroupsCount})
                      </button>
                    ) : null}
                  </div>

                  <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
                    {conductorGroups.map((grp) => {
                      const isResolved =
                        grp.status === 'matched' ||
                        grp.status === 'confirmed' ||
                        grp.preserveRawConductorName
                      return (
                        <div
                          key={grp.key}
                          className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-bold text-ink">{grp.displayRaw}</span>
                              {grp.groupHint ? (
                                <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-semibold text-indigo">
                                  Grupo: {grp.groupHint}
                                </span>
                              ) : null}
                              <span className="text-xs text-muted">
                                ({grp.count} {grp.count === 1 ? 'registro' : 'registros'})
                              </span>
                              {isResolved ? (
                                <span className="rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[10px] font-semibold text-[#166534]">
                                  {grp.preserveRawConductorName
                                    ? 'Nome original mantido'
                                    : `Associado: ${grp.matchedConductor?.name}`}
                                </span>
                              ) : grp.status === 'ambiguous' ? (
                                <span className="rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-semibold text-[#92400E]">
                                  Ambíguo — confirmar opção
                                </span>
                              ) : (
                                <span className="rounded-full bg-[#FEE2E2] px-2 py-0.5 text-[10px] font-semibold text-[#991B1B]">
                                  Não localizado em publicadores
                                </span>
                              )}
                            </div>

                            {grp.candidates.length > 0 && !isResolved ? (
                              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                <span className="text-[11px] text-muted">Opções sugeridas:</span>
                                {grp.candidates.slice(0, 4).map((cand) => (
                                  <button
                                    key={cand.id}
                                    type="button"
                                    onClick={() =>
                                      applyConductorResolutionByGroup(grp.key, {
                                        mode: 'publisher',
                                        conductorOptionId: cand.id,
                                      })
                                    }
                                    className="rounded-lg border border-[#C7D2FE] bg-[#EEF2FF] px-2.5 py-1 text-xs font-semibold text-[#4338CA] hover:bg-indigo hover:text-white"
                                  >
                                    Confirmar {cand.name}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              value={
                                grp.preserveRawConductorName
                                  ? '__raw__'
                                  : (grp.matchedConductor?.id ?? '')
                              }
                              onChange={(e) => {
                                const val = e.target.value
                                if (!val) {
                                  applyConductorResolutionByGroup(grp.key, { mode: 'clear' })
                                } else if (val === '__raw__') {
                                  applyConductorResolutionByGroup(grp.key, { mode: 'preserveRaw' })
                                } else {
                                  applyConductorResolutionByGroup(grp.key, {
                                    mode: 'publisher',
                                    conductorOptionId: val,
                                  })
                                }
                              }}
                              className="h-9 w-full rounded-xl border border-line bg-white px-3 text-xs text-ink outline-none focus:border-indigo sm:w-auto sm:min-w-[230px]"
                            >
                              <option value="">Selecionar publicador...</option>
                              <option value="__raw__">
                                Manter nome original ({grp.displayRaw})
                              </option>
                              {conductorOptions.map((opt) => (
                                <option key={opt.id} value={opt.id}>
                                  {opt.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : null}

              {/* Sub-Tab 3: Unresolved Territories */}
              {subTab === 'territories' ? (
                <div className="space-y-3">
                  {unresolvedTerritoryGroups.length === 0 ? (
                    <div className="rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] p-6 text-center text-xs text-[#166534]">
                      Todos os códigos de territórios do arquivo foram encontrados diretamente nas suas respectivas regiões!
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-[#F8FAFC] px-4 py-3 text-xs">
                        <span className="text-muted">
                          Territórios não encontrados na região informada não são criados automaticamente. Escolha um território existente ou deixe pendente.
                        </span>
                        {unresolvedTerritoryGroups.some((g) => g.suggestions.length > 0 && g.status === 'pending') ? (
                          <button
                            type="button"
                            onClick={applyAllTopTerritorySuggestions}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo px-3 py-1.5 font-semibold text-white hover:bg-indigo/90"
                          >
                            <Check size={13} />
                            Aceitar todas as sugestões de correspondência
                          </button>
                        ) : null}
                      </div>

                      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
                        {unresolvedTerritoryGroups.map((grp) => (
                          <div
                            key={grp.key}
                            className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-lg bg-[#EEF2FF] px-2.5 py-0.5 text-xs font-bold text-[#4338CA]">
                                  {grp.normalizedCode}
                                </span>
                                <span className="text-xs font-semibold text-ink">
                                  na planilha de {grp.regionNameJson}
                                </span>
                                <span className="text-xs text-muted">
                                  ({grp.count} {grp.count === 1 ? 'ocorrência' : 'ocorrências'})
                                </span>
                                {grp.status === 'resolved' && grp.matchedTerritory ? (
                                  <span className="rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[10px] font-semibold text-[#166534]">
                                    Associado a {grp.matchedTerritory.code} ({grp.matchedTerritory.regionName})
                                  </span>
                                ) : grp.status === 'ignored' ? (
                                  <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-semibold text-[#475569]">
                                    Ignorado
                                  </span>
                                ) : (
                                  <span className="rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-semibold text-[#92400E]">
                                    Pendente
                                  </span>
                                )}
                              </div>

                              {grp.suggestions.length > 0 && grp.status === 'pending' ? (
                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                  {grp.suggestions.slice(0, 3).map((sug) => (
                                    <button
                                      key={sug.territory.id}
                                      type="button"
                                      onClick={() =>
                                        applyTerritoryResolutionByGroup(grp.key, sug.territory.id)
                                      }
                                      className="rounded-lg border border-[#C7D2FE] bg-[#EEF2FF] px-2.5 py-1 text-xs font-semibold text-[#4338CA] hover:bg-indigo hover:text-white"
                                      title={sug.reason}
                                    >
                                      Usar {sug.territory.code} ({sug.territory.regionName})
                                    </button>
                                  ))}
                                </div>
                              ) : null}
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <select
                                value={
                                  grp.status === 'resolved' && grp.matchedTerritory
                                    ? grp.matchedTerritory.id
                                    : grp.status
                                }
                                onChange={(e) =>
                                  applyTerritoryResolutionByGroup(grp.key, e.target.value)
                                }
                                className="h-9 w-full rounded-xl border border-line bg-white px-3 text-xs text-ink outline-none focus:border-indigo sm:w-auto sm:min-w-[240px]"
                              >
                                <option value="pending">Deixar pendente (não importar)</option>
                                <option value="ignored">Ignorar registro</option>
                                {territories.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.code} — {t.regionName}
                                  </option>
                                ))}
                              </select>

                              {grp.status === 'resolved' && grp.matchedTerritory ? (() => {
                                const baseNum = grp.matchedTerritory.baseNumber || grp.matchedTerritory.code
                                const existingSegs = segmentsByTerritoryId.get(grp.matchedTerritory.id) ?? []
                                const candidateCodes = Array.from(
                                  new Set([
                                    ...existingSegs.map((s) => s.description.trim().toUpperCase()),
                                    ...(grp.targetSegmentCode ? [grp.targetSegmentCode] : []),
                                    `${baseNum}A`,
                                    `${baseNum}B`,
                                    `${baseNum}C`,
                                  ]),
                                ).sort(compareTerritoryCodes)
                                return (
                                  <select
                                    value={grp.targetSegmentCode ?? ''}
                                    onChange={(e) =>
                                      applyTerritorySegmentByGroup(grp.key, e.target.value)
                                    }
                                    aria-label={`Segmento para ${grp.normalizedCode}`}
                                    className="h-9 rounded-xl border border-[#C7D2FE] bg-[#EEF2FF] px-2.5 text-xs font-semibold text-[#4338CA] outline-none focus:border-indigo"
                                  >
                                    <option value="">Território inteiro ({grp.matchedTerritory.code})</option>
                                    {candidateCodes.map((code) => (
                                      <option key={code} value={code}>
                                        Segmento {code}
                                      </option>
                                    ))}
                                  </select>
                                )
                              })() : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : null}

              {/* Sub-Tab 4: Detailed Records Table */}
              {subTab === 'records' ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {(
                        [
                          ['all', `Todos (${items.length})`],
                          ['ready', `Prontos (${summary.readyToImportCount})`],
                          ['partial', `Parciais/Incompl. (${summary.partialOrIncompleteCount})`],
                          ['pending', `Pendentes (${summary.pendingCorrespondenceCount})`],
                          ['duplicate', `Duplicatas (${summary.duplicateCount})`],
                        ] as const
                      ).map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setRecordFilter(key)}
                          className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                            recordFilter === key
                              ? 'bg-ink text-white'
                              : 'bg-[#F8FAFC] text-[#475569] hover:bg-[#E2E8F0]'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    <div className="relative w-full sm:w-auto sm:min-w-[220px]">
                      <Search
                        size={14}
                        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
                      />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Filtrar por data, dirigente, código..."
                        className="h-9 w-full rounded-xl border border-line bg-white pr-3 pl-8 text-xs text-ink outline-none focus:border-indigo"
                      />
                    </div>
                  </div>

                  <div className="max-h-[380px] overflow-auto rounded-2xl border border-line bg-white">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead className="sticky top-0 z-10 border-b border-line bg-[#F8FAFC] font-semibold text-muted">
                        <tr>
                          <th className="px-3.5 py-2.5">Data</th>
                          <th className="px-3 py-2.5">Região</th>
                          <th className="px-3 py-2.5">Token original</th>
                          <th className="px-3 py-2.5">Território associado</th>
                          <th className="px-3 py-2.5">Dirigente associado</th>
                          <th className="px-3 py-2.5">Estado</th>
                          <th className="px-3.5 py-2.5">Texto original (raw)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {filteredItems.map((item) => (
                          <tr key={item.itemKey} className="hover:bg-[#F8FAFC]">
                            <td className="px-3.5 py-2.5 whitespace-nowrap font-medium text-ink">
                              <span title={formatFullDateBr(item.isoDate)}>
                                {formatShortDayMonth(item.isoDate)}/{item.isoDate.slice(0, 4)}
                              </span>
                              {item.dateEndIso ? (
                                <span
                                  className="ml-1 rounded bg-[#EEF2FF] px-1.5 py-0.5 text-[10px] font-semibold text-indigo"
                                  title={item.dateNote ?? ''}
                                >
                                  até {formatShortDayMonth(item.dateEndIso)}
                                </span>
                              ) : null}
                              {item.periodType ? (
                                <span className="block text-[10px] text-muted">
                                  {periodTypeLabel(item.periodType)}
                                </span>
                              ) : null}
                            </td>

                            <td className="px-3 py-2.5 font-medium text-[#334155]">
                              {item.regionNameJson}
                            </td>

                            <td className="px-3 py-2.5">
                              <span className="font-mono font-semibold text-ink">
                                {item.parsedTerritory.rawToken}
                              </span>
                              {item.parsedTerritory.observations.length > 0 ? (
                                <span className="block text-[10px] text-muted">
                                  {item.parsedTerritory.observations.join(' · ')}
                                </span>
                              ) : null}
                            </td>

                            <td className="px-3 py-2.5">
                              <div className="flex flex-col gap-1">
                                <select
                                  value={
                                    item.matchedTerritory
                                      ? item.matchedTerritory.id
                                      : item.territoryMatchStatus
                                  }
                                  onChange={(e) =>
                                    updateSingleItem(item.itemKey, { territoryId: e.target.value })
                                  }
                                  className={`h-8 max-w-[180px] rounded-lg border px-2 text-xs outline-none ${
                                    item.matchedTerritory
                                      ? 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]'
                                      : 'border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]'
                                  }`}
                                >
                                  <option value="pending">Pendente (não encontrado)</option>
                                  <option value="ignored">Ignorar</option>
                                  {territories.map((t) => (
                                    <option key={t.id} value={t.id}>
                                      {t.code} ({t.regionName})
                                    </option>
                                  ))}
                                </select>

                                {item.matchedTerritory ? (() => {
                                  const baseNum =
                                    item.matchedTerritory.baseNumber || item.matchedTerritory.code
                                  const existingSegs =
                                    segmentsByTerritoryId.get(item.matchedTerritory.id) ?? []
                                  const candidateCodes = Array.from(
                                    new Set([
                                      ...existingSegs.map((s) => s.description.trim().toUpperCase()),
                                      ...(item.targetSegmentCode ? [item.targetSegmentCode] : []),
                                      `${baseNum}A`,
                                      `${baseNum}B`,
                                      `${baseNum}C`,
                                    ]),
                                  ).sort(compareTerritoryCodes)
                                  return (
                                    <select
                                      value={item.targetSegmentCode ?? ''}
                                      onChange={(e) =>
                                        updateSingleItem(item.itemKey, {
                                          segmentCode: e.target.value || null,
                                        })
                                      }
                                      className="h-7 max-w-[180px] rounded-lg border border-[#C7D2FE] bg-[#EEF2FF] px-2 text-[11px] font-semibold text-[#4338CA] outline-none"
                                    >
                                      <option value="">
                                        Inteiro ({item.matchedTerritory.code})
                                      </option>
                                      {candidateCodes.map((code) => (
                                        <option key={code} value={code}>
                                          Seg. {code}
                                        </option>
                                      ))}
                                    </select>
                                  )
                                })() : null}
                              </div>
                            </td>

                            <td className="px-3 py-2.5">
                              <select
                                value={
                                  item.preserveRawConductorName
                                    ? '__raw__'
                                    : (item.matchedConductor?.id ?? '')
                                }
                                onChange={(e) =>
                                  updateSingleItem(item.itemKey, {
                                    conductorOptionId: e.target.value,
                                  })
                                }
                                className={`h-8 max-w-[190px] rounded-lg border px-2 text-xs outline-none ${
                                  item.conductorMatchStatus === 'matched' ||
                                  item.conductorMatchStatus === 'confirmed' ||
                                  item.preserveRawConductorName
                                    ? 'border-line bg-white text-ink'
                                    : 'border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]'
                                }`}
                              >
                                <option value="">
                                  Confirmar: {item.parsedConductor.rawConductor}
                                </option>
                                <option value="__raw__">
                                  Manter "{item.parsedConductor.cleanName || item.parsedConductor.rawConductor}"
                                </option>
                                {conductorOptions.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                            </td>

                            <td className="px-3 py-2.5">
                              <select
                                value={item.completionState}
                                onChange={(e) =>
                                  updateSingleItem(item.itemKey, {
                                    completionState: e.target.value as WorkSessionCompletionState,
                                  })
                                }
                                className={`h-8 rounded-lg border px-2 text-[11px] font-semibold outline-none ${
                                  item.completionState === 'completed'
                                    ? 'border-[#BBF7D0] bg-[#DCFCE7] text-[#166534]'
                                    : item.completionState === 'partial'
                                      ? 'border-[#BFDBFE] bg-[#DBEAFE] text-[#1E40AF]'
                                      : 'border-[#FDE68A] bg-[#FEF3C7] text-[#92400E]'
                                }`}
                              >
                                <option value="completed">Concluído</option>
                                <option value="partial">Parcial (parte)</option>
                                <option value="incomplete">Incompleto</option>
                              </select>
                            </td>

                            <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#475569]">
                              {item.rawLine}
                              {item.isDuplicate ? (
                                <span className="ml-1.5 rounded bg-[#E2E8F0] px-1.5 py-0.5 font-sans text-[10px] font-semibold text-[#475569]">
                                  Duplicata
                                </span>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {importError ? (
                <div className="flex items-start gap-2 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-3.5 text-xs text-[#991B1B]">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <span>{importError}</span>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-[#F8FAFC] px-6 py-4">
          {importResult ? (
            <>
              <span className="text-xs text-muted">
                Os registros já estão disponíveis para consulta e sugestões.
              </span>
              <button
                type="button"
                onClick={onClose}
                className="h-10 rounded-xl bg-indigo px-5 text-xs font-semibold text-white hover:bg-indigo/90"
              >
                Ver registros no Histórico
              </button>
            </>
          ) : parsedFile && summary ? (
            <>
              <div className="text-xs text-muted">
                <strong className="text-ink">{summary.readyToImportCount}</strong> registro(s) prontos para gravar ·{' '}
                <strong className="text-[#D97706]">{summary.pendingCorrespondenceCount}</strong> pendente(s) ·{' '}
                <strong className="text-[#475569]">{summary.duplicateCount}</strong> duplicata(s) ignorada(s)
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={importing}
                  className="h-10 rounded-xl border border-line bg-white px-4 text-xs font-semibold text-ink hover:bg-[#F1F5F9]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={importing || summary.readyToImportCount === 0}
                  onClick={() => void handleConfirmImport()}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo px-5 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Check size={15} />
                  {importing
                    ? 'Importando em lotes...'
                    : `Confirmar e importar (${summary.readyToImportCount})`}
                </button>
              </div>
            </>
          ) : (
            <>
              <span className="text-xs text-muted">
                Apenas registros válidos e confirmados serão importados.
              </span>
              <button
                type="button"
                onClick={onClose}
                className="h-9 rounded-xl border border-line bg-white px-4 text-xs font-semibold text-ink hover:bg-[#F1F5F9]"
              >
                Fechar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
