import {
  ExternalLink,
  History,
  Image as ImageIcon,
  LayoutGrid,
  List,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Split,
  Trash2,
  X,
  ZoomIn,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { isoFromDate } from '../../../domain/dates'
import {
  buildTerritoryTimeline,
  compareTerritoryCodes,
  computeTerritoryStatuses,
  formatFullDateBr,
  parseTerritoryCode,
} from '../status'
import { useTerritories } from '../store'
import type { TerritoryRecord, TerritoryWorkStatus } from '../types'
import {
  TerritoryMapLightbox,
  TerritoryPill,
  TerritoryStatusLegend,
  statusLabelPt,
  territoryPillTone,
} from './SharedPieces'

function expandTerritoryCodeInput(raw: string, splitParts: string[]): string[] {
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
    baseCodes.push(parseTerritoryCode(token).code)
  }

  if (splitParts.length === 0) {
    return [...new Set(baseCodes)]
  }

  const expanded: string[] = []
  for (const code of baseCodes) {
    const parsed = parseTerritoryCode(code)
    if (parsed.partLabel) {
      expanded.push(parsed.code)
    } else {
      for (const part of splitParts) {
        expanded.push(`${parsed.baseNumber}${part}`)
      }
    }
  }
  return [...new Set(expanded)]
}

export function TerritoriesCatalogTab() {
  const {
    canManage,
    regions,
    territories,
    segments,
    assignments,
    workSessions,
    createRegion,
    renameRegion,
    deleteRegion,
    createTerritories,
    updateTerritory,
    deleteTerritory,
  } = useTerritories()

  const [search, setSearch] = useState('')
  const [regionFilter, setRegionFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<'' | TerritoryWorkStatus>('')
  const [viewMode, setViewMode] = useState<'pills' | 'cards'>('pills')
  const [lightboxTerritory, setLightboxTerritory] = useState<TerritoryRecord | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [createDefaultRegion, setCreateDefaultRegion] = useState('')
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string | null>(null)
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

  const filteredTerritories = useMemo(() => {
    const q = search.trim().toLowerCase()
    return territories.filter((t) => {
      if (regionFilter && t.regionName !== regionFilter) return false
      const snap = statusesById.get(t.id)
      if (statusFilter && snap?.status !== statusFilter) return false
      if (!q) return true
      return (
        t.code.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.regionName.toLowerCase().includes(q) ||
        t.address.toLowerCase().includes(q) ||
        t.notes.toLowerCase().includes(q)
      )
    })
  }, [territories, search, regionFilter, statusFilter, statusesById])

  const groupedByRegion = useMemo(() => {
    const map = new Map<string, { regionId: string; regionName: string; items: TerritoryRecord[] }>()

    // Include empty created regions when no search/status filter hides them
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

    for (const t of filteredTerritories) {
      const key = t.regionName.toLowerCase()
      const existing = map.get(key)
      if (existing) {
        existing.items.push(t)
      } else {
        const reg = regions.find((r) => r.name.toLowerCase() === key)
        map.set(key, {
          regionId: reg?.id ?? t.regionId ?? `virtual-${key}`,
          regionName: t.regionName,
          items: [t],
        })
      }
    }

    const groups = [...map.values()]
    for (const g of groups) {
      g.items.sort((a, b) => compareTerritoryCodes(a.code, b.code))
    }
    return groups.sort((a, b) => a.regionName.localeCompare(b.regionName, 'pt-BR'))
  }, [filteredTerritories, regions, regionFilter, search, statusFilter])

  const selectedTerritory = selectedTerritoryId
    ? (territoriesById.get(selectedTerritoryId) ?? null)
    : null

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
        <div className="relative min-w-[220px] flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar território por número, parte ou região..."
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
          <option value="partial">Parcial (A/B)</option>
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
          {filteredTerritories.length} território(s) em {groupedByRegion.length} região(ões) • clique em um número para consultar ou editar
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
            className="h-9 min-w-[220px] rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-indigo"
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
            Cadastre regiões e territórios (incluindo divisões como 17A e 17B) para começar o planejamento.
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
                  {group.items.map((territory) => {
                    const snap = statusesById.get(territory.id)
                    return (
                      <TerritoryPill
                        key={territory.id}
                        code={territory.code}
                        status={snap?.status ?? 'available'}
                        snapshot={snap}
                        selected={selectedTerritoryId === territory.id}
                        onClick={() => {
                          setSelectedTerritoryId(territory.id)
                          setDrawerTab('details')
                        }}
                      />
                    )
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {group.items.map((territory) => {
                    const snap = statusesById.get(territory.id)
                    const st = snap?.status ?? 'available'
                    return (
                      <div
                        key={territory.id}
                        onClick={() => {
                          setSelectedTerritoryId(territory.id)
                          setDrawerTab('details')
                        }}
                        className="group cursor-pointer overflow-hidden rounded-xl border border-line bg-[#F8FAFC] transition hover:border-[#C7D2FE] hover:bg-white"
                      >
                        {territory.imageUrl ? (
                          <div className="relative h-32 w-full overflow-hidden bg-[#E2E8F0]">
                            <img
                              src={territory.imageUrl}
                              alt={territory.name}
                              loading="lazy"
                              className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.03]"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setLightboxTerritory(territory)
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
                            <span
                              className={`inline-flex h-7 min-w-[2.25rem] items-center justify-center rounded-full border px-2 text-xs font-bold ${territoryPillTone(
                                st,
                              )}`}
                            >
                              {territory.code}
                            </span>
                            <span className="text-[11px] text-muted">
                              {snap?.lastWorkedIsoDate
                                ? `Trab. ${formatFullDateBr(snap.lastWorkedIsoDate)}`
                                : 'Sem trabalho'}
                            </span>
                          </div>
                          <p className="mt-1.5 truncate text-xs font-semibold text-ink">
                            {territory.name}
                          </p>
                          {territory.address ? (
                            <p className="mt-0.5 truncate text-[11px] text-muted">
                              {territory.address}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
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
          onCreateRegion={async (name) => {
            await createRegion(name)
          }}
          onSubmit={async (payload) => {
            const matched = regions.find(
              (r) => r.name.toLowerCase() === payload.regionName.toLowerCase(),
            )
            await createTerritories({
              codes: payload.codes,
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

      {/* Edit / Inspect Territory Drawer */}
      {selectedTerritory ? (
        <TerritoryDetailDrawer
          key={selectedTerritory.id}
          territory={selectedTerritory}
          snapshot={statusesById.get(selectedTerritory.id)}
          allTerritories={territories}
          regions={regions}
          history={unifiedHistory.filter((h) => h.territoryIds.includes(selectedTerritory.id))}
          canManage={canManage}
          activeTab={drawerTab}
          onChangeTab={setDrawerTab}
          onClose={() => setSelectedTerritoryId(null)}
          onSave={async (patch) => {
            const matched = regions.find(
              (r) => r.name.toLowerCase() === patch.regionName.toLowerCase(),
            )
            await updateTerritory(selectedTerritory.id, {
              ...patch,
              regionId: matched?.id ?? null,
            })
          }}
          onCreateSiblingPart={async (partCode) => {
            await createTerritories({
              codes: [partCode],
              regionId: selectedTerritory.regionId,
              regionName: selectedTerritory.regionName,
              address: selectedTerritory.address,
              imageUrl: selectedTerritory.imageUrl,
              mapsUrl: selectedTerritory.mapsUrl,
              notes: selectedTerritory.notes,
            })
          }}
          onExpandImage={(t) => setLightboxTerritory(t)}
          onDelete={async () => {
            await deleteTerritory(selectedTerritory.id)
            setSelectedTerritoryId(null)
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
  onSubmit,
}: {
  regions: string[]
  defaultRegion: string
  onClose: () => void
  onCreateRegion: (name: string) => Promise<void>
  onSubmit: (payload: {
    codes: string[]
    regionName: string
    address: string
    imageUrl: string
    mapsUrl: string
    notes: string
  }) => Promise<void>
}) {
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
  const [mapsUrl, setMapsUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const previewCodes = useMemo(
    () => expandTerritoryCodeInput(codesInput, splitEnabled ? splitParts : []),
    [codesInput, splitEnabled, splitParts],
  )

  function togglePart(part: string) {
    setSplitParts((curr) =>
      curr.includes(part) ? curr.filter((p) => p !== part) : [...curr, part].sort(),
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const regionName = (regionMode === 'new' ? newRegionName : selectedRegion).trim()
    if (!regionName) {
      setError('Informe ou selecione uma região.')
      return
    }
    if (previewCodes.length === 0) {
      setError('Informe pelo menos um número/identificação de território.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSubmit({
        codes: previewCodes,
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
              Cadastre um território único, um intervalo ou partes (ex.: 17A e 17B).
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
              Número ou identificação
            </label>
            <input
              type="text"
              value={codesInput}
              onChange={(e) => setCodesInput(e.target.value)}
              placeholder="Ex.: 17 ou 01-08 ou 17A, 17B"
              className="h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-indigo"
            />
            <p className="mt-1 text-[11px] text-muted">
              Aceita número único (17), múltiplos por vírgula (01, 02, 03) ou intervalo (01-08).
            </p>
          </div>

          <div className="rounded-xl border border-line bg-[#F8FAFC] p-3.5">
            <label className="flex cursor-pointer items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-xs font-semibold text-ink">
                <Split size={14} className="text-indigo" />
                Dividir território em partes (A, B...)
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

            {previewCodes.length > 0 ? (
              <div className="mt-3 border-t border-line pt-2.5">
                <span className="block text-[11px] font-medium text-muted">
                  Serão criados ({previewCodes.length}):
                </span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {previewCodes.map((c) => (
                    <span
                      key={c}
                      className="rounded-full border border-[#C7D2FE] bg-[#EEF2FF] px-2.5 py-0.5 text-xs font-semibold text-[#4338CA]"
                    >
                      {c}
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
            <label className="mb-1.5 block text-xs font-semibold text-[#334155]">
              URL da imagem do mapa (opcional)
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://firebasestorage.googleapis.com/..."
              className="h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-indigo"
            />
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
            disabled={saving}
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
  territory,
  snapshot,
  allTerritories,
  regions,
  history,
  canManage,
  activeTab,
  onChangeTab,
  onClose,
  onSave,
  onCreateSiblingPart,
  onExpandImage,
  onDelete,
}: {
  territory: TerritoryRecord
  snapshot: ReturnType<typeof computeTerritoryStatuses> extends Map<string, infer V>
    ? V | undefined
    : never
  allTerritories: TerritoryRecord[]
  regions: Array<{ id: string; name: string }>
  history: ReturnType<typeof buildTerritoryTimeline>
  canManage: boolean
  activeTab: 'details' | 'history'
  onChangeTab: (tab: 'details' | 'history') => void
  onClose: () => void
  onSave: (patch: {
    code: string
    name: string
    regionName: string
    address: string
    imageUrl: string
    mapsUrl: string
    notes: string
  }) => Promise<void>
  onCreateSiblingPart: (partCode: string) => Promise<void>
  onExpandImage: (territory: TerritoryRecord) => void
  onDelete: () => Promise<void>
}) {
  const [code, setCode] = useState(territory.code)
  const [name, setName] = useState(territory.name)
  const [regionName, setRegionName] = useState(territory.regionName)
  const [address, setAddress] = useState(territory.address)
  const [imageUrl, setImageUrl] = useState(territory.imageUrl)
  const [mapsUrl, setMapsUrl] = useState(territory.mapsUrl)
  const [notes, setNotes] = useState(territory.notes)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')

  const siblings = useMemo(
    () =>
      allTerritories
        .filter(
          (t) =>
            t.regionName.toLowerCase() === territory.regionName.toLowerCase() &&
            t.baseNumber === territory.baseNumber &&
            Boolean(t.partLabel),
        )
        .sort((a, b) => compareTerritoryCodes(a.code, b.code)),
    [allTerritories, territory],
  )

  const nextSuggestedSibling = useMemo(() => {
    const existingLetters = new Set(siblings.map((s) => s.partLabel).filter(Boolean))
    if (!territory.partLabel) return null
    for (const letter of ['A', 'B', 'C', 'D']) {
      if (!existingLetters.has(letter)) {
        return `${territory.baseNumber}${letter}`
      }
    }
    return null
  }, [siblings, territory])

  const status = snapshot?.status ?? 'available'

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim() || !regionName.trim()) {
      setError('Código e região são obrigatórios.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const parsed = parseTerritoryCode(code)
      const trimmedName = name.trim()
      const wasDefaultName =
        !trimmedName || trimmedName === `Território ${territory.code}`
      await onSave({
        code: parsed.code,
        name: wasDefaultName ? `Território ${parsed.code}` : trimmedName,
        regionName: regionName.trim(),
        address,
        imageUrl,
        mapsUrl,
        notes,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar território.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/25 backdrop-blur-[1px]">
      <div className="flex h-full w-full max-w-md flex-col border-l border-line bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-line px-6 py-4">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex h-11 min-w-[2.75rem] items-center justify-center rounded-xl border px-3 text-sm font-bold ${territoryPillTone(
                status,
              )}`}
            >
              {territory.code}
            </span>
            <div>
              <h2 className="text-base font-semibold text-ink">
                {territory.name && territory.name !== `Território ${territory.code}`
                  ? `${territory.code} — ${territory.name}`
                  : `Território ${territory.code}`}
              </h2>
              <p className="text-xs text-muted">
                {territory.regionName} • {statusLabelPt(status)}
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
            Dados e partes
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

              {/* Firebase Map Image Preview */}
              {imageUrl.trim() ? (
                <div className="group relative overflow-hidden rounded-xl border border-line bg-[#0F172A]">
                  <img
                    src={imageUrl.trim()}
                    alt={name || `Território ${code}`}
                    onClick={() =>
                      onExpandImage({
                        ...territory,
                        code,
                        name: name || territory.name,
                        imageUrl: imageUrl.trim(),
                        mapsUrl,
                      })
                    }
                    className="max-h-52 w-full cursor-zoom-in object-cover transition duration-200 group-hover:opacity-95"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      onExpandImage({
                        ...territory,
                        code,
                        name: name || territory.name,
                        imageUrl: imageUrl.trim(),
                        mapsUrl,
                      })
                    }
                    className="absolute right-2.5 bottom-2.5 inline-flex items-center gap-1.5 rounded-lg bg-black/70 px-2.5 py-1 text-xs font-medium text-white hover:bg-black/85"
                  >
                    <ZoomIn size={13} />
                    Ampliar mapa
                  </button>
                </div>
              ) : null}

              {/* Usage & Parts Summary Box */}
              <div className="space-y-2 rounded-xl border border-line bg-[#F8FAFC] p-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted">Último trabalho realizado:</span>
                  <span className="font-semibold text-ink">
                    {snapshot?.lastWorkedIsoDate
                      ? `${formatFullDateBr(snapshot.lastWorkedIsoDate)} (${snapshot.daysSinceLastWork}d atrás)`
                      : 'Nenhum trabalho registrado'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Última designação:</span>
                  <span className="font-semibold text-ink">
                    {snapshot?.lastAssignedIsoDate
                      ? formatFullDateBr(snapshot.lastAssignedIsoDate)
                      : 'Nenhuma designação'}
                  </span>
                </div>
                {snapshot && snapshot.totalSegments > 0 ? (
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Progresso de trechos (App):</span>
                    <span className="font-semibold text-ink">
                      {snapshot.completedSegments}/{snapshot.totalSegments} concluídos
                    </span>
                  </div>
                ) : null}
                {siblings.length > 0 ? (
                  <div className="border-t border-line pt-2">
                    <span className="text-muted">Partes do território {territory.baseNumber}: </span>
                    <span className="font-semibold text-ink">
                      {siblings.map((s) => s.code).join(', ')}
                    </span>
                  </div>
                ) : null}

                {canManage && !territory.partLabel ? (
                  <div className="border-t border-line pt-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={async () => {
                        setSaving(true)
                        try {
                          const base = territory.baseNumber
                          await onSave({
                            code: `${base}A`,
                            name: `Território ${base}A`,
                            regionName,
                            address,
                            imageUrl,
                            mapsUrl,
                            notes,
                          })
                          await onCreateSiblingPart(`${base}B`)
                        } finally {
                          setSaving(false)
                        }
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo hover:underline"
                    >
                      <Split size={13} />
                      Dividir em {territory.baseNumber}A e {territory.baseNumber}B
                    </button>
                  </div>
                ) : null}

                {canManage && nextSuggestedSibling ? (
                  <div className="border-t border-line pt-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={async () => {
                        setSaving(true)
                        try {
                          await onCreateSiblingPart(nextSuggestedSibling)
                        } finally {
                          setSaving(false)
                        }
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo hover:underline"
                    >
                      <Plus size={13} />
                      Criar parte irmã {nextSuggestedSibling}
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#334155]">
                    Número / Parte
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
                  <label className="text-xs font-semibold text-[#334155]">
                    Imagem do Mapa (Firebase)
                  </label>
                  {imageUrl.trim() ? (
                    <button
                      type="button"
                      onClick={() =>
                        onExpandImage({
                          ...territory,
                          code,
                          name: name || territory.name,
                          imageUrl: imageUrl.trim(),
                          mapsUrl,
                        })
                      }
                      className="inline-flex items-center gap-1 text-xs font-medium text-indigo hover:underline"
                    >
                      Ver imagem <ZoomIn size={12} />
                    </button>
                  ) : null}
                </div>
                <input
                  type="url"
                  disabled={!canManage}
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://firebasestorage.googleapis.com/..."
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
                  rows={3}
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
                        Confirmar exclusão do território {territory.code}?
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
                  disabled={saving}
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
