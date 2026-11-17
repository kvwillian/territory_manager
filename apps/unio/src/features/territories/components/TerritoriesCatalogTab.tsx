import {
  Check,
  ExternalLink,
  History,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  List,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Split,
  Trash2,
  Upload,
  X,
  ZoomIn,
} from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { isoFromDate } from '../../../domain/dates'
import type { EditableTerritorySegmentInput } from '../api'
import {
  buildTerritoryTimeline,
  compareTerritoryCodes,
  computeTerritoryStatuses,
  formatFullDateBr,
  parseTerritoryCode,
} from '../status'
import { useTerritories } from '../store'
import type {
  TerritoryRecord,
  TerritorySegmentRecord,
  TerritoryStatusSnapshot,
  TerritoryWorkStatus,
} from '../types'
import {
  TerritoryMapLightbox,
  TerritoryPill,
  TerritoryStatusLegend,
  statusLabelPt,
  territoryPillTone,
} from './SharedPieces'

/**
 * Expands a territory number input (e.g. "30", "01-08", "10, 12") into base territory codes.
 * Note: Fractions (A, B, C...) are now stored as segments inside the territory, not separate territories.
 */
function expandBaseTerritoryCodes(raw: string): string[] {
  const tokens = raw
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)

  const baseCodes: string[] = []
  for (const token of tokens) {
    const rangeMatch = token.match(/^0*(\d+)\s*-\s*0*(\d+)$/)
    if (rangeMatch) {
      const from = Number.parseInt(rangeMatch[1]!, 10)
      const to = Number.parseInt(rangeMatch[2]!, 10)
      if (Number.isFinite(from) && Number.isFinite(to) && to >= from && to - from <= 60) {
        for (let n = from; n <= to; n += 1) {
          baseCodes.push(String(n).padStart(2, '0'))
        }
        continue
      }
    }
    const parsed = parseTerritoryCode(token)
    baseCodes.push(parsed.baseNumber)
  }

  return [...new Set(baseCodes)]
}

export type UnifiedTerritoryGroup = {
  groupKey: string
  baseNumber: string
  regionId: string | null
  regionName: string
  primaryTerritory: TerritoryRecord
  memberTerritories: TerritoryRecord[]
  segments: TerritorySegmentRecord[]
  status: TerritoryWorkStatus
  primarySnapshot: TerritoryStatusSnapshot | undefined
  lastWorkedIsoDate: string | null
  lastAssignedIsoDate: string | null
  imageUrl: string
  mapsUrl: string
  address: string
  displayName: string
}

export function TerritoriesCatalogTab() {
  const {
    canManage,
    regions,
    territories,
    segments,
    assignments,
    workSessions,
    renameRegion,
    deleteRegion,
    createTerritories,
    updateTerritory,
    deleteTerritory,
    saveTerritorySegments,
    uploadTerritoryImage,
  } = useTerritories()

  const [search, setSearch] = useState('')
  const [regionFilter, setRegionFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<'' | TerritoryWorkStatus>('')
  const [viewMode, setViewMode] = useState<'pills' | 'cards'>('pills')
  const [lightboxTerritory, setLightboxTerritory] = useState<{
    code: string
    name: string
    regionName: string
    imageUrl: string
    mapsUrl: string
  } | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [createDefaultRegion, setCreateDefaultRegion] = useState('')
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null)
  const [drawerTab, setDrawerTab] = useState<'details' | 'history'>('details')

  const [regionMenuOpen, setRegionMenuOpen] = useState<string | null>(null)
  const [renamingRegion, setRenamingRegion] = useState<{
    id: string
    oldName: string
    newName: string
  } | null>(null)
  const [busy, setBusy] = useState(false)
  const [feedbackError, setFeedbackError] = useState('')

  const todayIso = useMemo(() => isoFromDate(new Date()), [])

  const statusesById = useMemo(
    () =>
      computeTerritoryStatuses({
        territories,
        segments,
        assignments,
        workSessions,
        referenceIsoDate: todayIso,
      }),
    [territories, segments, assignments, workSessions, todayIso],
  )

  const territoriesById = useMemo(
    () => new Map(territories.map((t) => [t.id, t])),
    [territories],
  )

  const unifiedHistory = useMemo(
    () =>
      buildTerritoryTimeline({
        assignments,
        workSessions,
        territoriesById,
      }),
    [assignments, workSessions, territoriesById],
  )

  // Consolidate split territory records (e.g. 30A, 30B) into a single base territory (30) per region
  const unifiedTerritories = useMemo<UnifiedTerritoryGroup[]>(() => {
    const segmentsByTerritoryId = new Map<string, TerritorySegmentRecord[]>()
    for (const seg of segments) {
      const bucket = segmentsByTerritoryId.get(seg.territoryId)
      if (bucket) bucket.push(seg)
      else segmentsByTerritoryId.set(seg.territoryId, [seg])
    }

    const groupsMap = new Map<string, TerritoryRecord[]>()
    for (const t of territories) {
      const key = `${t.regionName.trim().toLowerCase()}::${t.baseNumber}`
      const bucket = groupsMap.get(key)
      if (bucket) bucket.push(t)
      else groupsMap.set(key, [t])
    }

    const result: UnifiedTerritoryGroup[] = []

    for (const [groupKey, members] of groupsMap.entries()) {
      members.sort((a, b) => {
        // Prefer unsplit base record first (e.g. "30" before "30A")
        if (!a.partLabel && b.partLabel) return -1
        if (a.partLabel && !b.partLabel) return 1
        return compareTerritoryCodes(a.code, b.code)
      })

      const primary = members[0]!
      const baseNumber = primary.baseNumber

      // Collect all real segments across member records
      const collectedSegments: TerritorySegmentRecord[] = []
      for (const m of members) {
        const mSegs = segmentsByTerritoryId.get(m.id) ?? []
        collectedSegments.push(...mSegs)
      }
      collectedSegments.sort((a, b) => compareTerritoryCodes(a.description, b.description))

      // If there are multiple split member docs (e.g. 30A and 30B) and no segments in `segments` collection yet,
      // expose those parts as virtual segments so the user sees 30A and 30B inside territory 30!
      if (collectedSegments.length === 0 && members.some((m) => Boolean(m.partLabel))) {
        for (const m of members) {
          const snap = statusesById.get(m.id)
          const workedRecently =
            snap?.lastWorkedIsoDate !== null &&
            snap?.daysSinceLastWork !== null &&
            (snap?.daysSinceLastWork ?? 999) <= 30
          collectedSegments.push({
            id: `part-seg:${m.id}`,
            congregationId: m.congregationId,
            territoryId: primary.id,
            description: m.code,
            status: workedRecently ? 'completed' : 'pending',
            lastWorkedIsoDate: snap?.lastWorkedIsoDate ?? null,
          })
        }
      }

      // Compute consolidated status for the base territory
      let lastWorkedIsoDate: string | null = null
      let lastAssignedIsoDate: string | null = null
      let anyPartial = false
      let anyRecent = false
      let allRecent = members.length > 0

      for (const m of members) {
        const snap = statusesById.get(m.id)
        if (!snap) continue
        if (snap.lastWorkedIsoDate && (!lastWorkedIsoDate || snap.lastWorkedIsoDate > lastWorkedIsoDate)) {
          lastWorkedIsoDate = snap.lastWorkedIsoDate
        }
        if (snap.lastAssignedIsoDate && (!lastAssignedIsoDate || snap.lastAssignedIsoDate > lastAssignedIsoDate)) {
          lastAssignedIsoDate = snap.lastAssignedIsoDate
        }
        if (snap.status === 'partial' || snap.hasIncompleteWork || snap.hasPartialSegments) {
          anyPartial = true
        }
        if (snap.status === 'recent') {
          anyRecent = true
        } else {
          allRecent = false
        }
      }

      if (collectedSegments.length > 0) {
        const completedCount = collectedSegments.filter((s) => s.status === 'completed').length
        if (completedCount > 0 && completedCount < collectedSegments.length) {
          anyPartial = true
        }
      }

      const status: TerritoryWorkStatus = anyPartial
        ? 'partial'
        : allRecent && anyRecent
          ? 'recent'
          : 'available'

      const memberWithImage = members.find((m) => Boolean(m.imageUrl.trim())) ?? primary
      const memberWithMaps = members.find((m) => Boolean(m.mapsUrl.trim())) ?? primary
      const memberWithAddress = members.find((m) => Boolean(m.address.trim())) ?? primary

      const baseSnapshot = statusesById.get(primary.id)
      const synthesizedSnapshot: TerritoryStatusSnapshot | undefined = baseSnapshot
        ? {
            ...baseSnapshot,
            status,
            lastWorkedIsoDate,
            lastAssignedIsoDate,
            totalSegments: collectedSegments.length,
            completedSegments: collectedSegments.filter((s) => s.status === 'completed').length,
          }
        : undefined

      const rawDisplayName = primary.name.replace(/\s*[A-D]$/i, '').trim()
      const displayName =
        rawDisplayName && rawDisplayName !== `Território ${primary.code}`
          ? rawDisplayName
          : `Território ${baseNumber}`

      result.push({
        groupKey,
        baseNumber,
        regionId: primary.regionId,
        regionName: primary.regionName,
        primaryTerritory: primary,
        memberTerritories: members,
        segments: collectedSegments,
        status,
        primarySnapshot: synthesizedSnapshot,
        lastWorkedIsoDate,
        lastAssignedIsoDate,
        imageUrl: memberWithImage.imageUrl,
        mapsUrl: memberWithMaps.mapsUrl,
        address: memberWithAddress.address,
        displayName,
      })
    }

    return result
  }, [territories, segments, statusesById])

  const filteredUnifiedTerritories = useMemo(() => {
    const q = search.trim().toLowerCase()
    return unifiedTerritories.filter((u) => {
      if (regionFilter && u.regionName !== regionFilter) return false
      if (statusFilter && u.status !== statusFilter) return false
      if (!q) return true
      return (
        u.baseNumber.toLowerCase().includes(q) ||
        u.displayName.toLowerCase().includes(q) ||
        u.regionName.toLowerCase().includes(q) ||
        u.address.toLowerCase().includes(q) ||
        u.segments.some((s) => s.description.toLowerCase().includes(q)) ||
        u.memberTerritories.some(
          (m) => m.code.toLowerCase().includes(q) || m.notes.toLowerCase().includes(q),
        )
      )
    })
  }, [unifiedTerritories, search, regionFilter, statusFilter])

  const groupedByRegion = useMemo(() => {
    const map = new Map<
      string,
      { regionId: string; regionName: string; items: UnifiedTerritoryGroup[] }
    >()

    if (!search.trim() && !statusFilter) {
      for (const reg of regions) {
        if (regionFilter && reg.name !== regionFilter) continue
        map.set(reg.name.toLowerCase(), {
          regionId: reg.id,
          regionName: reg.name,
          items: [],
        })
      }
    }

    for (const item of filteredUnifiedTerritories) {
      const key = item.regionName.toLowerCase()
      const existing = map.get(key)
      if (existing) {
        existing.items.push(item)
      } else {
        const reg = regions.find((r) => r.name.toLowerCase() === key)
        map.set(key, {
          regionId: reg?.id ?? item.regionId ?? `virtual-${key}`,
          regionName: item.regionName,
          items: [item],
        })
      }
    }

    const groups = [...map.values()]
    for (const g of groups) {
      g.items.sort((a, b) => compareTerritoryCodes(a.baseNumber, b.baseNumber))
    }
    return groups.sort((a, b) => a.regionName.localeCompare(b.regionName, 'pt-BR'))
  }, [filteredUnifiedTerritories, regions, regionFilter, search, statusFilter])

  const selectedGroup = useMemo(
    () =>
      selectedGroupKey
        ? (unifiedTerritories.find((u) => u.groupKey === selectedGroupKey) ?? null)
        : null,
    [unifiedTerritories, selectedGroupKey],
  )

  async function handleRenameRegionSave() {
    if (!renamingRegion || !renamingRegion.newName.trim()) return
    setBusy(true)
    setFeedbackError('')
    try {
      await renameRegion(
        renamingRegion.id,
        renamingRegion.oldName,
        renamingRegion.newName.trim(),
      )
      setRenamingRegion(null)
    } catch (err) {
      setFeedbackError(err instanceof Error ? err.message : 'Erro ao renomear região.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDeleteRegion(regionId: string, regionName: string, count: number) {
    setRegionMenuOpen(null)
    if (count > 0) {
      setFeedbackError(
        `A região "${regionName}" ainda possui ${count} território(s). Mova ou exclua os territórios antes de remover a região.`,
      )
      return
    }
    setBusy(true)
    setFeedbackError('')
    try {
      await deleteRegion(regionId)
    } catch (err) {
      setFeedbackError(err instanceof Error ? err.message : 'Erro ao excluir região.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Filter and Action Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white p-3.5">
        <div className="relative w-full min-w-0 sm:min-w-[220px] sm:flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar território por número, segmento ou região..."
            className="h-10 w-full rounded-xl border border-line bg-[#F8FAFC] pr-3 pl-9 text-sm text-ink outline-none focus:border-indigo focus:bg-white"
          />
        </div>

        <select
          value={regionFilter}
          onChange={(e) => setRegionFilter(e.target.value)}
          className="h-10 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-indigo"
        >
          <option value="">Todas as regiões</option>
          {regions.map((r) => (
            <option key={r.id} value={r.name}>
              {r.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as '' | TerritoryWorkStatus)}
          className="h-10 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-indigo"
        >
          <option value="">Todos os status</option>
          <option value="available">Disponível</option>
          <option value="partial">Parcial</option>
          <option value="recent">Recente (até 15 dias)</option>
        </select>

        <div className="inline-flex h-10 items-center rounded-xl border border-line bg-[#F8FAFC] p-1">
          <button
            type="button"
            onClick={() => setViewMode('pills')}
            className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition ${
              viewMode === 'pills'
                ? 'bg-white text-indigo shadow-xs'
                : 'text-muted hover:text-ink'
            }`}
            title="Visualização compacta por números"
          >
            <List size={14} />
            Compacto
          </button>
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition ${
              viewMode === 'cards'
                ? 'bg-white text-indigo shadow-xs'
                : 'text-muted hover:text-ink'
            }`}
            title="Visualização com miniaturas das imagens do Firebase"
          >
            <LayoutGrid size={14} />
            Mapas
          </button>
        </div>

        {canManage ? (
          <button
            type="button"
            onClick={() => {
              setCreateDefaultRegion(regionFilter || regions[0]?.name || '')
              setCreateOpen(true)
            }}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo px-4 text-sm font-semibold text-white shadow-xs transition hover:opacity-95"
          >
            <Plus size={16} />
            Novo território
          </button>
        ) : null}
      </div>

      {/* Legend & Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <TerritoryStatusLegend />
        <span className="text-xs text-muted">
          {filteredUnifiedTerritories.length} território(s) em {groupedByRegion.length} região(ões) • clique em um número para ver segmentos, imagem e histórico
        </span>
      </div>

      {feedbackError ? (
        <div className="flex items-center justify-between rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-2.5 text-sm text-[#B91C1C]">
          <span>{feedbackError}</span>
          <button type="button" onClick={() => setFeedbackError('')}>
            <X size={15} />
          </button>
        </div>
      ) : null}

      {/* Region Rename Inline Modal */}
      {renamingRegion ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#C7D2FE] bg-[#EEF2FF] p-4">
          <span className="text-sm font-medium text-[#312E81]">
            Renomear região "{renamingRegion.oldName}":
          </span>
          <input
            type="text"
            value={renamingRegion.newName}
            onChange={(e) =>
              setRenamingRegion({ ...renamingRegion, newName: e.target.value })
            }
            className="h-9 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-indigo sm:w-auto sm:min-w-[220px]"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleRenameRegionSave()}
            className="h-9 rounded-xl bg-indigo px-3.5 text-xs font-semibold text-white"
          >
            Salvar nome
          </button>
          <button
            type="button"
            onClick={() => setRenamingRegion(null)}
            className="h-9 rounded-xl border border-line bg-white px-3 text-xs font-medium text-ink"
          >
            Cancelar
          </button>
        </div>
      ) : null}

      {/* Grouped Region Cards */}
      {groupedByRegion.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white p-10 text-center">
          <MapPin size={32} className="mx-auto mb-2 text-muted" />
          <p className="text-base font-semibold text-ink">Nenhum território encontrado</p>
          <p className="mt-1 text-sm text-muted">
            Cadastre regiões e territórios para começar o planejamento.
          </p>
          {canManage ? (
            <button
              type="button"
              onClick={() => {
                setCreateDefaultRegion('')
                setCreateOpen(true)
              }}
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-indigo px-4 text-sm font-semibold text-white"
            >
              <Plus size={16} />
              Cadastrar primeiro território
            </button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3.5">
          {groupedByRegion.map((group) => (
            <div
              key={group.regionName}
              className="rounded-2xl border border-line bg-white p-5 transition"
            >
              <div className="mb-3.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-ink">
                    {group.regionName}{' '}
                    <span className="font-medium text-muted">({group.items.length})</span>
                  </h3>
                </div>

                {canManage ? (
                  <div className="relative flex items-center gap-1">
                    <button
                      type="button"
                      title="Renomear região"
                      onClick={() =>
                        setRenamingRegion({
                          id: group.regionId,
                          oldName: group.regionName,
                          newName: group.regionName,
                        })
                      }
                      className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-[#F3F5FB] hover:text-ink"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      title="Mais ações da região"
                      onClick={() =>
                        setRegionMenuOpen((curr) =>
                          curr === group.regionName ? null : group.regionName,
                        )
                      }
                      className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-[#F3F5FB] hover:text-ink"
                    >
                      <MoreHorizontal size={16} />
                    </button>

                    {regionMenuOpen === group.regionName ? (
                      <div className="absolute top-9 right-0 z-30 w-52 rounded-xl border border-line bg-white p-1.5 shadow-lg">
                        <button
                          type="button"
                          onClick={() => {
                            setRegionMenuOpen(null)
                            setCreateDefaultRegion(group.regionName)
                            setCreateOpen(true)
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-ink hover:bg-[#F8FAFC]"
                        >
                          <Plus size={14} />
                          Adicionar território aqui
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRegionMenuOpen(null)
                            setRenamingRegion({
                              id: group.regionId,
                              oldName: group.regionName,
                              newName: group.regionName,
                            })
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-ink hover:bg-[#F8FAFC]"
                        >
                          <Pencil size={14} />
                          Renomear região
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void handleDeleteRegion(
                              group.regionId,
                              group.regionName,
                              group.items.length,
                            )
                          }
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-[#DC2626] hover:bg-[#FEF2F2]"
                        >
                          <Trash2 size={14} />
                          Excluir região
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {group.items.length === 0 ? (
                <p className="text-xs text-muted">
                  Nenhum território cadastrado nesta região ainda.
                </p>
              ) : viewMode === 'pills' ? (
                <div className="flex flex-wrap gap-2">
                  {group.items.map((item) => (
                    <TerritoryPill
                      key={item.groupKey}
                      code={item.baseNumber}
                      status={item.status}
                      snapshot={item.primarySnapshot}
                      selected={selectedGroupKey === item.groupKey}
                      onClick={() => {
                        setSelectedGroupKey(item.groupKey)
                        setDrawerTab('details')
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {group.items.map((item) => (
                    <div
                      key={item.groupKey}
                      onClick={() => {
                        setSelectedGroupKey(item.groupKey)
                        setDrawerTab('details')
                      }}
                      className="group cursor-pointer overflow-hidden rounded-xl border border-line bg-[#F8FAFC] transition hover:border-[#C7D2FE] hover:bg-white"
                    >
                      {item.imageUrl ? (
                        <div className="relative h-32 w-full overflow-hidden bg-[#E2E8F0]">
                          <img
                            src={item.imageUrl}
                            alt={item.displayName}
                            loading="lazy"
                            className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.03]"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setLightboxTerritory({
                                code: item.baseNumber,
                                name: item.displayName,
                                regionName: item.regionName,
                                imageUrl: item.imageUrl,
                                mapsUrl: item.mapsUrl,
                              })
                            }}
                            title="Ampliar imagem do mapa"
                            className="absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-lg bg-black/65 px-2 py-1 text-[11px] font-medium text-white hover:bg-black/80"
                          >
                            <ZoomIn size={12} />
                            Ampliar
                          </button>
                        </div>
                      ) : (
                        <div className="flex h-32 w-full flex-col items-center justify-center gap-1 bg-[#F1F5F9] text-muted">
                          <ImageIcon size={20} />
                          <span className="text-[11px]">Sem imagem cadastrada</span>
                        </div>
                      )}
                      <div className="p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`inline-flex h-7 min-w-[2.25rem] items-center justify-center rounded-full border px-2 text-xs font-bold ${territoryPillTone(
                                item.status,
                              )}`}
                            >
                              {item.baseNumber}
                            </span>
                            {item.segments.length > 0 ? (
                              <span className="rounded-md bg-[#EEF2FF] px-1.5 py-0.5 text-[10px] font-semibold text-indigo">
                                {item.segments.length} seg.
                              </span>
                            ) : null}
                          </div>
                          <span className="text-[11px] text-muted">
                            {item.lastWorkedIsoDate
                              ? `Trab. ${formatFullDateBr(item.lastWorkedIsoDate)}`
                              : 'Sem trabalho'}
                          </span>
                        </div>
                        <p className="mt-1.5 truncate text-xs font-semibold text-ink">
                          {item.displayName}
                        </p>
                        {item.address ? (
                          <p className="mt-0.5 truncate text-[11px] text-muted">
                            {item.address}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Territory Drawer */}
      {createOpen ? (
        <CreateTerritoryDrawer
          regions={regions.map((r) => r.name)}
          defaultRegion={createDefaultRegion}
          onClose={() => setCreateOpen(false)}
          onUploadImage={async (file) => uploadTerritoryImage('new', file)}
          onSubmit={async (payload) => {
            const matched = regions.find(
              (r) => r.name.toLowerCase() === payload.regionName.toLowerCase(),
            )
            await createTerritories({
              codes: payload.codes,
              segmentParts: payload.segmentParts,
              regionId: matched?.id ?? null,
              regionName: payload.regionName,
              address: payload.address,
              imageUrl: payload.imageUrl,
              mapsUrl: payload.mapsUrl,
              notes: payload.notes,
            })
            setCreateOpen(false)
          }}
        />
      ) : null}

      {lightboxTerritory && lightboxTerritory.imageUrl ? (
        <TerritoryMapLightbox
          imageUrl={lightboxTerritory.imageUrl}
          title={`${lightboxTerritory.code} — ${lightboxTerritory.name}`}
          subtitle={lightboxTerritory.regionName}
          mapsUrl={lightboxTerritory.mapsUrl}
          onClose={() => setLightboxTerritory(null)}
        />
      ) : null}

      {/* Edit / Inspect Unified Territory Drawer */}
      {selectedGroup ? (
        <TerritoryDetailDrawer
          key={selectedGroup.groupKey}
          group={selectedGroup}
          regions={regions}
          history={unifiedHistory.filter((h) =>
            selectedGroup.memberTerritories.some((m) => h.territoryIds.includes(m.id)),
          )}
          canManage={canManage}
          activeTab={drawerTab}
          onChangeTab={setDrawerTab}
          onClose={() => setSelectedGroupKey(null)}
          onUploadImage={async (file) => {
            const url = await uploadTerritoryImage(selectedGroup.primaryTerritory.id, file)
            // Persist imageUrl immediately on all member records of this base territory
            const matched = regions.find(
              (r) => r.name.toLowerCase() === selectedGroup.regionName.toLowerCase(),
            )
            for (const member of selectedGroup.memberTerritories) {
              await updateTerritory(member.id, {
                code: member.code,
                name: member.name,
                regionId: matched?.id ?? member.regionId ?? null,
                regionName: selectedGroup.regionName,
                address: member.address,
                imageUrl: url,
                mapsUrl: member.mapsUrl,
                notes: member.notes,
              })
            }
            return url
          }}
          onSave={async (patch) => {
            const matched = regions.find(
              (r) => r.name.toLowerCase() === patch.regionName.toLowerCase(),
            )
            await updateTerritory(selectedGroup.primaryTerritory.id, {
              code: patch.code,
              name: patch.name,
              regionId: matched?.id ?? null,
              regionName: patch.regionName,
              address: patch.address,
              imageUrl: patch.imageUrl,
              mapsUrl: patch.mapsUrl,
              notes: patch.notes,
            })
            await saveTerritorySegments(selectedGroup.primaryTerritory.id, patch.segments)
          }}
          onExpandImage={(info) => setLightboxTerritory(info)}
          onDelete={async () => {
            for (const m of selectedGroup.memberTerritories) {
              await deleteTerritory(m.id)
            }
            setSelectedGroupKey(null)
          }}
        />
      ) : null}
    </div>
  )
}

function CreateTerritoryDrawer({
  regions,
  defaultRegion,
  onClose,
  onUploadImage,
  onSubmit,
}: {
  regions: string[]
  defaultRegion: string
  onClose: () => void
  onUploadImage: (file: File) => Promise<string>
  onSubmit: (payload: {
    codes: string[]
    segmentParts: string[]
    regionName: string
    address: string
    imageUrl: string
    mapsUrl: string
    notes: string
  }) => Promise<void>
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [regionMode, setRegionMode] = useState<'existing' | 'new'>(
    regions.length > 0 ? 'existing' : 'new',
  )
  const [selectedRegion, setSelectedRegion] = useState(defaultRegion || regions[0] || '')
  const [newRegionName, setNewRegionName] = useState('')
  const [codesInput, setCodesInput] = useState('')
  const [splitEnabled, setSplitEnabled] = useState(false)
  const [splitParts, setSplitParts] = useState<string[]>(['A', 'B'])
  const [address, setAddress] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [mapsUrl, setMapsUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const previewBaseCodes = useMemo(
    () => expandBaseTerritoryCodes(codesInput),
    [codesInput],
  )

  function togglePart(part: string) {
    setSplitParts((curr) =>
      curr.includes(part) ? curr.filter((p) => p !== part) : [...curr, part].sort(),
    )
  }

  async function handleImageFileChange(file: File | undefined) {
    if (!file) return
    setUploadingImage(true)
    setError('')
    try {
      const url = await onUploadImage(file)
      setImageUrl(url)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Não foi possível enviar a imagem para o Firebase.',
      )
    } finally {
      setUploadingImage(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const regionName = (regionMode === 'new' ? newRegionName : selectedRegion).trim()
    if (!regionName) {
      setError('Informe ou selecione uma região.')
      return
    }
    if (previewBaseCodes.length === 0) {
      setError('Informe pelo menos um número de território.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSubmit({
        codes: previewBaseCodes,
        segmentParts: splitEnabled ? splitParts : [],
        regionName,
        address,
        imageUrl,
        mapsUrl,
        notes,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/25 backdrop-blur-[1px]">
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="flex h-full w-full max-w-md flex-col border-l border-line bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-ink">Novo território</h2>
            <p className="text-xs text-muted">
              Cadastre o território e, se desejar, divida seus segmentos internos (ex.: 30A e 30B).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-[#F3F5FB]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {error ? (
            <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-xs text-[#B91C1C]">
              {error}
            </div>
          ) : null}

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-semibold text-[#334155]">Região / Bairro</label>
              {regions.length > 0 ? (
                <button
                  type="button"
                  onClick={() =>
                    setRegionMode((m) => (m === 'existing' ? 'new' : 'existing'))
                  }
                  className="text-xs font-medium text-indigo hover:underline"
                >
                  {regionMode === 'existing' ? '+ Nova região' : 'Usar região existente'}
                </button>
              ) : null}
            </div>

            {regionMode === 'existing' && regions.length > 0 ? (
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-indigo"
              >
                {regions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={newRegionName}
                onChange={(e) => setNewRegionName(e.target.value)}
                placeholder="Ex.: Laranjeiras, Guaíba..."
                className="h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-indigo"
              />
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#334155]">
              Número do território
            </label>
            <input
              type="text"
              value={codesInput}
              onChange={(e) => setCodesInput(e.target.value)}
              placeholder="Ex.: 30 ou 01-08"
              className="h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-indigo"
            />
            <p className="mt-1 text-[11px] text-muted">
              Aceita número único (30), múltiplos por vírgula (01, 02, 03) ou intervalo (01-08).
            </p>
          </div>

          <div className="rounded-xl border border-line bg-[#F8FAFC] p-3.5">
            <label className="flex cursor-pointer items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-xs font-semibold text-ink">
                <Split size={14} className="text-indigo" />
                Dividir segmentos internos (A, B...)
              </span>
              <input
                type="checkbox"
                checked={splitEnabled}
                onChange={(e) => setSplitEnabled(e.target.checked)}
                className="h-4 w-4 accent-indigo"
              />
            </label>

            {splitEnabled ? (
              <div className="mt-3 flex items-center gap-2">
                {['A', 'B', 'C', 'D'].map((letter) => {
                  const active = splitParts.includes(letter)
                  return (
                    <button
                      key={letter}
                      type="button"
                      onClick={() => togglePart(letter)}
                      className={`h-8 w-9 rounded-lg border text-xs font-semibold transition ${
                        active
                          ? 'border-indigo bg-indigo text-white'
                          : 'border-line bg-white text-ink hover:bg-[#F3F5FB]'
                      }`}
                    >
                      {letter}
                    </button>
                  )
                })}
              </div>
            ) : null}

            {previewBaseCodes.length > 0 ? (
              <div className="mt-3 border-t border-line pt-2.5">
                <span className="block text-[11px] font-medium text-muted">
                  Território(s) na visualização ({previewBaseCodes.length}):
                </span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {previewBaseCodes.map((c) => (
                    <span
                      key={c}
                      className="rounded-full border border-[#C7D2FE] bg-[#EEF2FF] px-2.5 py-0.5 text-xs font-semibold text-[#4338CA]"
                    >
                      {c}
                      {splitEnabled && splitParts.length > 0
                        ? ` (${splitParts.map((p) => `${c}${p}`).join(', ')})`
                        : ''}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#334155]">
              Endereço / Ruas de referência (opcional)
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ex.: Rua das Acácias até Av. Central"
              className="h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-indigo"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-semibold text-[#334155]">
                Imagem do Mapa (Firebase)
              </label>
              <button
                type="button"
                disabled={uploadingImage}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-soft px-2.5 py-1 text-xs font-semibold text-indigo hover:bg-indigo hover:text-white disabled:opacity-50"
              >
                <Upload size={12} />
                {uploadingImage ? 'Enviando...' : 'Upload de imagem'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void handleImageFileChange(e.target.files?.[0])}
              />
            </div>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://firebasestorage.googleapis.com/..."
              className="h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-indigo"
            />
            {imageUrl.trim() ? (
              <div className="mt-2 overflow-hidden rounded-xl border border-line bg-[#0F172A]">
                <img
                  src={imageUrl.trim()}
                  alt="Prévia do mapa"
                  className="max-h-36 w-full object-cover"
                />
              </div>
            ) : null}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#334155]">
              Link do mapa (opcional)
            </label>
            <input
              type="url"
              value={mapsUrl}
              onChange={(e) => setMapsUrl(e.target.value)}
              placeholder="https://maps.google.com/..."
              className="h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-indigo"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#334155]">
              Observações (opcional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anotações úteis sobre o território..."
              className="w-full rounded-xl border border-line bg-white p-3 text-sm text-ink outline-none focus:border-indigo"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-line px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-line bg-white px-4 text-sm font-medium text-ink hover:bg-[#F8FAFC]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || uploadingImage}
            className="h-10 rounded-xl bg-indigo px-5 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar território'}
          </button>
        </div>
      </form>
    </div>
  )
}

function TerritoryDetailDrawer({
  group,
  regions,
  history,
  canManage,
  activeTab,
  onChangeTab,
  onClose,
  onUploadImage,
  onSave,
  onExpandImage,
  onDelete,
}: {
  group: UnifiedTerritoryGroup
  regions: Array<{ id: string; name: string }>
  history: ReturnType<typeof buildTerritoryTimeline>
  canManage: boolean
  activeTab: 'details' | 'history'
  onChangeTab: (tab: 'details' | 'history') => void
  onClose: () => void
  onUploadImage: (file: File) => Promise<string>
  onSave: (patch: {
    code: string
    name: string
    regionName: string
    address: string
    imageUrl: string
    mapsUrl: string
    notes: string
    segments: EditableTerritorySegmentInput[]
  }) => Promise<void>
  onExpandImage: (info: {
    code: string
    name: string
    regionName: string
    imageUrl: string
    mapsUrl: string
  }) => void
  onDelete: () => Promise<void>
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const territory = group.primaryTerritory

  const [code, setCode] = useState(group.baseNumber)
  const [name, setName] = useState(group.displayName)
  const [regionName, setRegionName] = useState(group.regionName)
  const [address, setAddress] = useState(group.address)
  const [imageUrl, setImageUrl] = useState(group.imageUrl)
  const [mapsUrl, setMapsUrl] = useState(group.mapsUrl)
  const [notes, setNotes] = useState(territory.notes)
  const [editableSegments, setEditableSegments] = useState<EditableTerritorySegmentInput[]>(() =>
    [...group.segments]
      .sort((a, b) => compareTerritoryCodes(a.description, b.description))
      .map((s) => ({
        id: s.id.startsWith('part-seg:') ? undefined : s.id,
        description: s.description,
        status: s.status,
        lastWorkedIsoDate: s.lastWorkedIsoDate,
      })),
  )
  const [splitPickerOpen, setSplitPickerOpen] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')

  const status = group.status

  function handleSplitSegments(letters: string[]) {
    const base = parseTerritoryCode(code).baseNumber || group.baseNumber
    setEditableSegments((curr) => {
      const existingByDesc = new Map(
        curr.map((s) => [s.description.trim().toUpperCase(), s]),
      )
      return letters.map((letter) => {
        const segCode = `${base}${letter}`
        const existing = existingByDesc.get(segCode) ?? existingByDesc.get(letter)
        return {
          id: existing?.id,
          description: segCode,
          status: existing?.status ?? 'pending',
          lastWorkedIsoDate: existing?.lastWorkedIsoDate ?? null,
        }
      })
    })
    setSplitPickerOpen(false)
  }

  function handleAddSegment() {
    const base = parseTerritoryCode(code).baseNumber || group.baseNumber
    const alphabet = ['A', 'B', 'C', 'D', 'E', 'F']
    const used = new Set(editableSegments.map((s) => s.description.trim().toUpperCase()))
    const nextLetter = alphabet.find((l) => !used.has(`${base}${l}`) && !used.has(l))
    const nextDesc = nextLetter ? `${base}${nextLetter}` : `Segmento ${editableSegments.length + 1}`

    setEditableSegments((curr) => [
      ...curr,
      {
        description: nextDesc,
        status: 'pending',
        lastWorkedIsoDate: null,
      },
    ])
  }

  async function handleFileUpload(file: File | undefined) {
    if (!file) return
    setUploadingImage(true)
    setUploadSuccessMsg('')
    setError('')
    try {
      const uploadedUrl = await onUploadImage(file)
      setImageUrl(uploadedUrl)
      setUploadSuccessMsg('Imagem enviada e salva no Firebase!')
      setTimeout(() => setUploadSuccessMsg(''), 3500)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível enviar a imagem para o Firebase.',
      )
    } finally {
      setUploadingImage(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim() || !regionName.trim()) {
      setError('Número e região são obrigatórios.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const parsed = parseTerritoryCode(code)
      const trimmedName = name.trim()
      const wasDefaultName =
        !trimmedName ||
        trimmedName === `Território ${group.baseNumber}` ||
        trimmedName === `Território ${territory.code}`
      await onSave({
        code: parsed.baseNumber,
        name: wasDefaultName ? `Território ${parsed.baseNumber}` : trimmedName,
        regionName: regionName.trim(),
        address,
        imageUrl,
        mapsUrl,
        notes,
        segments: editableSegments.filter((s) => Boolean(s.description.trim())),
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar território.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/25 backdrop-blur-[1px]">
      <div className="flex h-full w-full max-w-lg flex-col border-l border-line bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-line px-6 py-4">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex h-11 min-w-[2.75rem] items-center justify-center rounded-xl border px-3 text-sm font-bold ${territoryPillTone(
                status,
              )}`}
            >
              {group.baseNumber}
            </span>
            <div>
              <h2 className="text-base font-semibold text-ink">
                {group.displayName !== `Território ${group.baseNumber}`
                  ? `${group.baseNumber} — ${group.displayName}`
                  : `Território ${group.baseNumber}`}
              </h2>
              <p className="text-xs text-muted">
                {group.regionName} • {statusLabelPt(status)}
                {editableSegments.length > 0
                  ? ` • ${editableSegments.length} segmento(s)`
                  : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-[#F3F5FB]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="flex border-b border-line px-6">
          <button
            type="button"
            onClick={() => onChangeTab('details')}
            className={`border-b-2 px-3 py-2.5 text-xs font-semibold transition ${
              activeTab === 'details'
                ? 'border-indigo text-indigo'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            Dados e segmentos ({editableSegments.length})
          </button>
          <button
            type="button"
            onClick={() => onChangeTab('history')}
            className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-semibold transition ${
              activeTab === 'history'
                ? 'border-indigo text-indigo'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            <History size={13} />
            Histórico ({history.length})
          </button>
        </div>

        {activeTab === 'details' ? (
          <form onSubmit={(e) => void handleSave(e)} className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              {error ? (
                <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-xs text-[#B91C1C]">
                  {error}
                </div>
              ) : null}

              {uploadSuccessMsg ? (
                <div className="flex items-center gap-2 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-2 text-xs font-medium text-[#166534]">
                  <Check size={14} />
                  {uploadSuccessMsg}
                </div>
              ) : null}

              {/* Firebase Map Image Preview & Upload */}
              <div className="space-y-2.5 rounded-2xl border border-line bg-[#F8FAFC] p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                    <ImageIcon size={14} className="text-indigo" />
                    Mapa do território (Firebase)
                  </span>

                  <div className="flex items-center gap-2">
                    {imageUrl.trim() ? (
                      <button
                        type="button"
                        onClick={() =>
                          onExpandImage({
                            code: group.baseNumber,
                            name: name || group.displayName,
                            regionName,
                            imageUrl: imageUrl.trim(),
                            mapsUrl,
                          })
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-medium text-ink hover:bg-[#F1F5F9]"
                      >
                        <ZoomIn size={12} />
                        Ampliar
                      </button>
                    ) : null}

                    {canManage ? (
                      <>
                        <button
                          type="button"
                          disabled={uploadingImage}
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo px-3 py-1 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo/90 disabled:opacity-50"
                        >
                          <Upload size={12} />
                          {uploadingImage ? 'Enviando...' : 'Upload de imagem'}
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => void handleFileUpload(e.target.files?.[0])}
                        />
                      </>
                    ) : null}
                  </div>
                </div>

                {imageUrl.trim() ? (
                  <div className="group relative overflow-hidden rounded-xl border border-line bg-[#0F172A]">
                    <img
                      src={imageUrl.trim()}
                      alt={name || `Território ${code}`}
                      onClick={() =>
                        onExpandImage({
                          code: group.baseNumber,
                          name: name || group.displayName,
                          regionName,
                          imageUrl: imageUrl.trim(),
                          mapsUrl,
                        })
                      }
                      className="max-h-52 w-full cursor-zoom-in object-cover transition duration-200 group-hover:opacity-95"
                    />
                  </div>
                ) : (
                  <div
                    onClick={() => {
                      if (canManage) fileInputRef.current?.click()
                    }}
                    className={`flex h-28 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#CBD5E1] bg-white text-muted ${
                      canManage ? 'cursor-pointer hover:border-indigo hover:text-indigo' : ''
                    }`}
                  >
                    <Upload size={18} />
                    <span className="text-xs font-medium">
                      {canManage
                        ? 'Clique em "Upload de imagem" para enviar o mapa ao Firebase'
                        : 'Sem imagem cadastrada'}
                    </span>
                  </div>
                )}

                <input
                  type="url"
                  disabled={!canManage}
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Ou cole a URL da imagem do Firebase Storage..."
                  className="h-9 w-full rounded-xl border border-line bg-white px-3 text-xs text-ink outline-none focus:border-indigo"
                />
              </div>

              {/* Segments Section (Expanded Details + Split Button) */}
              <div className="space-y-3 rounded-2xl border border-[#C7D2FE] bg-[#EEF2FF]/45 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-ink">
                      <Layers size={14} className="text-indigo" />
                      Segmentos do território {group.baseNumber}
                    </span>
                    <span className="text-[11px] text-muted">
                      {editableSegments.length === 0
                        ? 'Território inteiro (sem subdivisão em segmentos)'
                        : `${editableSegments.length} segmento(s) cadastrado(s)`}
                    </span>
                  </div>

                  {canManage ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSplitPickerOpen((v) => !v)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#C7D2FE] bg-white px-2.5 py-1.5 text-xs font-semibold text-indigo hover:bg-indigo hover:text-white"
                      >
                        <Split size={13} />
                        Dividir segmentos
                      </button>
                      <button
                        type="button"
                        onClick={handleAddSegment}
                        className="inline-flex items-center gap-1 rounded-xl bg-indigo px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo/90"
                      >
                        <Plus size={13} />
                        Segmento
                      </button>
                    </div>
                  ) : null}
                </div>

                {/* Quick Split Picker */}
                {splitPickerOpen && canManage ? (
                  <div className="rounded-xl border border-[#C7D2FE] bg-white p-3 text-xs">
                    <span className="block font-semibold text-ink">
                      Escolha como dividir os segmentos do território {group.baseNumber}:
                    </span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleSplitSegments(['A', 'B'])}
                        className="rounded-lg border border-line bg-[#F8FAFC] px-3 py-1.5 font-semibold text-ink hover:border-indigo hover:bg-[#EEF2FF] hover:text-indigo"
                      >
                        2 partes ({group.baseNumber}A e {group.baseNumber}B)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSplitSegments(['A', 'B', 'C'])}
                        className="rounded-lg border border-line bg-[#F8FAFC] px-3 py-1.5 font-semibold text-ink hover:border-indigo hover:bg-[#EEF2FF] hover:text-indigo"
                      >
                        3 partes ({group.baseNumber}A, {group.baseNumber}B, {group.baseNumber}C)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSplitSegments(['A', 'B', 'C', 'D'])}
                        className="rounded-lg border border-line bg-[#F8FAFC] px-3 py-1.5 font-semibold text-ink hover:border-indigo hover:bg-[#EEF2FF] hover:text-indigo"
                      >
                        4 partes ({group.baseNumber}A a {group.baseNumber}D)
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* Segments List */}
                {editableSegments.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#C7D2FE] bg-white/80 p-3 text-center text-xs text-muted">
                    Nenhum segmento cadastrado. Use <strong>"Dividir segmentos"</strong> para fracionar em {group.baseNumber}A, {group.baseNumber}B, etc.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {editableSegments.map((seg, idx) => (
                      <div
                        key={seg.id ?? `new-${idx}`}
                        className="flex items-center gap-2 rounded-xl border border-line bg-white p-2.5"
                      >
                        <input
                          type="text"
                          disabled={!canManage}
                          value={seg.description}
                          onChange={(e) => {
                            const val = e.target.value
                            setEditableSegments((curr) =>
                              curr.map((item, i) =>
                                i === idx ? { ...item, description: val } : item,
                              ),
                            )
                          }}
                          placeholder={`Ex.: ${group.baseNumber}A ou Quadra 1`}
                          className="h-8 flex-1 rounded-lg border border-line bg-[#F8FAFC] px-2.5 text-xs font-semibold text-ink outline-none focus:border-indigo focus:bg-white"
                        />

                        {canManage ? (
                          <button
                            type="button"
                            onClick={() =>
                              setEditableSegments((curr) => curr.filter((_, i) => i !== idx))
                            }
                            className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-[#FEF2F2] hover:text-[#DC2626]"
                            title="Remover segmento"
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Usage Summary Box */}
              <div className="space-y-2 rounded-xl border border-line bg-[#F8FAFC] p-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted">Último trabalho realizado:</span>
                  <span className="font-semibold text-ink">
                    {group.lastWorkedIsoDate
                      ? formatFullDateBr(group.lastWorkedIsoDate)
                      : 'Nenhum trabalho registrado'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Última designação:</span>
                  <span className="font-semibold text-ink">
                    {group.lastAssignedIsoDate
                      ? formatFullDateBr(group.lastAssignedIsoDate)
                      : 'Nenhuma designação'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#334155]">
                    Número do território
                  </label>
                  <input
                    type="text"
                    disabled={!canManage}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-indigo"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#334155]">
                    Região
                  </label>
                  <input
                    type="text"
                    list="territory-regions-datalist"
                    disabled={!canManage}
                    value={regionName}
                    onChange={(e) => setRegionName(e.target.value)}
                    className="h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-indigo"
                  />
                  <datalist id="territory-regions-datalist">
                    {regions.map((r) => (
                      <option key={r.id} value={r.name} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#334155]">
                  Nome / Identificação
                </label>
                <input
                  type="text"
                  disabled={!canManage}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={`Território ${code}`}
                  className="h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-indigo"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#334155]">
                  Endereço / Referência
                </label>
                <input
                  type="text"
                  disabled={!canManage}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ruas ou limites do território"
                  className="h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-indigo"
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#334155]">Link do Mapa</label>
                  {mapsUrl ? (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-indigo hover:underline"
                    >
                      Abrir mapa <ExternalLink size={12} />
                    </a>
                  ) : null}
                </div>
                <input
                  type="url"
                  disabled={!canManage}
                  value={mapsUrl}
                  onChange={(e) => setMapsUrl(e.target.value)}
                  placeholder="https://maps.google.com/..."
                  className="h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-indigo"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#334155]">
                  Observações
                </label>
                <textarea
                  rows={2}
                  disabled={!canManage}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-line bg-white p-3 text-sm text-ink outline-none focus:border-indigo"
                />
              </div>

              {canManage ? (
                <div className="pt-2">
                  {!confirmDelete ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[#DC2626] hover:underline"
                    >
                      <Trash2 size={14} />
                      Excluir território
                    </button>
                  ) : (
                    <div className="flex items-center justify-between rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3 text-xs">
                      <span className="font-medium text-[#991B1B]">
                        Confirmar exclusão do território {group.baseNumber}?
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(false)}
                          className="rounded-lg border border-line bg-white px-2.5 py-1 font-medium text-ink"
                        >
                          Não
                        </button>
                        <button
                          type="button"
                          onClick={() => void onDelete()}
                          className="rounded-lg bg-[#DC2626] px-2.5 py-1 font-semibold text-white"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {canManage ? (
              <div className="flex items-center justify-end gap-2.5 border-t border-line px-6 py-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-10 rounded-xl border border-line bg-white px-4 text-sm font-medium text-ink hover:bg-[#F8FAFC]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || uploadingImage}
                  className="h-10 rounded-xl bg-indigo px-5 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar alterações'}
                </button>
              </div>
            ) : null}
          </form>
        ) : (
          <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
            {history.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">
                Este território ainda não possui registros no histórico.
              </p>
            ) : (
              history.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-xl border border-line bg-[#F8FAFC] p-3.5 text-xs"
                >
                  <div className="flex items-center justify-between font-semibold text-ink">
                    <span>{formatFullDateBr(entry.isoDate)}</span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          entry.kind === 'workSession'
                            ? 'bg-[#DCFCE7] text-[#166534]'
                            : 'bg-[#F1F5F9] text-[#475569]'
                        }`}
                      >
                        {entry.kind === 'workSession' ? 'Trabalho realizado' : 'Designado'}
                      </span>
                      <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[11px] font-medium text-[#4338CA]">
                        {entry.territoryCodes.join(', ')}
                      </span>
                    </div>
                  </div>
                  <p className="mt-1 text-[#475569]">{entry.locationName}</p>
                  {entry.conductorNames.length > 0 ? (
                    <p className="mt-0.5 text-muted">
                      Dirigentes: {entry.conductorNames.join(', ')}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
