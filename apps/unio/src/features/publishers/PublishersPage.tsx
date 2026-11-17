import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Checkbox } from '../../components/Checkbox'
import { usePublisherCatalog, type GroupPatch } from './catalog'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRightLeft,
  BarChart3,
  CheckCircle2,
  CheckSquare,
  Download,
  FileJson,
  LayoutList,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react'
import {
  cleanImportedPersonName,
  DEFAULT_GROUPS_IMPORT_JSON,
  formatImportedGroupName,
  parseGroupsImportJson,
  type GroupsImportOptions,
  type ImportedGroupItem,
} from './importGroups'
import {
  groupTones,
  type MockGender,
  type MockGroup,
  type MockPioneer,
  type MockPrivilege,
  type MockPublisher,
  type MockStatus,
} from './mock'
import { initials, privilegeLabel, privilegeSectionId, privilegeSections } from './privileges'

const pageSize = 6

type Tab = 'lista' | 'grupos' | 'estatisticas'

function tabFromPath(pathname: string): Tab {
  if (pathname.endsWith('/grupos')) return 'grupos'
  if (pathname.endsWith('/estatisticas')) return 'estatisticas'
  return 'lista'
}

export function PublishersPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const tab = tabFromPath(location.pathname)
  const {
    publishers,
    groups,
    error,
    addPublisher,
    updatePublisher,
    createGroup,
    updateGroup,
    deleteGroup,
    importGroups,
    bulkDeletePublishers,
    bulkMovePublishers,
  } = usePublisherCatalog()
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [editingGroup, setEditingGroup] = useState<MockGroup | null>(null)
  const [importingJson, setImportingJson] = useState(false)
  const [bannerMessage, setBannerMessage] = useState('')
  const [name, setName] = useState('')
  const [groupId, setGroupId] = useState('')
  const [status, setStatus] = useState('')
  const [gender, setGender] = useState('')
  const [privilege, setPrivilege] = useState('')
  const [page, setPage] = useState(1)
  const [grouped, setGrouped] = useState(false)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<MockPublisher | null>(null)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [movingIds, setMovingIds] = useState<string[] | null>(null)
  const [deletingIds, setDeletingIds] = useState<string[] | null>(null)

  const filtered = useMemo(() => {
    const query = name.trim().toLocaleLowerCase('pt-BR')
    return publishers.filter((publisher) => {
      if (query && !publisher.name.toLocaleLowerCase('pt-BR').includes(query)) return false
      if (groupId === 'none' && publisher.groupId) return false
      if (groupId && groupId !== 'none' && publisher.groupId !== groupId) return false
      if (status && publisher.status !== status) return false
      if (gender && publisher.gender !== gender) return false
      if (privilege === 'special' && publisher.pioneer !== 'special') return false
      if (privilege === 'auxiliary' && publisher.pioneer !== 'auxiliary') return false
      if (privilege === 'regular' && publisher.pioneer !== 'regular') return false
      if (
        privilege &&
        privilege !== 'special' &&
        privilege !== 'auxiliary' &&
        privilege !== 'regular' &&
        publisher.privilege !== privilege
      )
        return false
      return true
    })
  }, [publishers, name, groupId, status, gender, privilege])

  const validSelectedIds = useMemo(() => {
    const existingSet = new Set(publishers.map((p) => p.id))
    return selectedIds.filter((id) => existingSet.has(id))
  }, [publishers, selectedIds])

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pages)
  const slice = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const from = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const to = Math.min(currentPage * pageSize, filtered.length)

  function toggleSelectOne(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  function toggleSelectMany(ids: string[]) {
    setSelectedIds((current) => {
      const currentSet = new Set(current)
      const allSelected = ids.length > 0 && ids.every((id) => currentSet.has(id))
      if (allSelected) {
        const removeSet = new Set(ids)
        return current.filter((id) => !removeSet.has(id))
      }
      for (const id of ids) currentSet.add(id)
      return [...currentSet]
    })
  }

  function openGroup(id: string) {
    setGroupId(id)
    setPage(1)
    navigate('/publicadores')
  }

  function exportList() {
    const header = ['Nome', 'Idade', 'Gênero', 'Grupo', 'Status', 'Privilégio', 'Telefone']
    const lines = filtered.map((publisher) => [
      publisher.name,
      String(publisher.age),
      publisher.gender === 'feminino' ? 'Feminino' : 'Masculino',
      groups.find((group) => group.id === publisher.groupId)?.name ?? 'Sem grupo',
      publisher.status === 'active' ? 'Ativo' : 'Inativo',
      privilegeLabel(publisher),
      publisher.phone,
    ])
    const csv = [header, ...lines].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    link.download = 'publicadores.csv'
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <div className="px-3.5 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-indigo-soft text-indigo sm:h-12 sm:w-12">
            <Users size={20} className="sm:h-[22px] sm:w-[22px]" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">Publicadores</h1>
            <p className="mt-1 text-sm text-muted">Gerencie os dados pessoais, privilégios congregacionais e grupos dos publicadores.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setImportingJson(true)}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-medium text-ink hover:bg-[#F8FAFC]"
          >
            <Upload size={16} />
            Importar JSON
          </button>
          {tab === 'grupos' ? (
            <button type="button" onClick={() => setCreatingGroup(true)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo px-4 text-sm font-medium text-white">
              <Plus size={16} />
              Novo grupo
            </button>
          ) : (
            <button type="button" onClick={() => setAdding(true)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo px-4 text-sm font-medium text-white">
              <Plus size={16} />
              Adicionar publicador
            </button>
          )}
        </div>
      </div>

      {error ? <p className="mt-4 rounded-xl bg-[#FDE8EF] px-3 py-2 text-sm text-[#9F1239]">{error}</p> : null}
      {bannerMessage ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-3 text-sm text-[#047857]">
          <span className="inline-flex items-center gap-2 font-medium">
            <CheckCircle2 size={16} />
            {bannerMessage}
          </span>
          <button type="button" onClick={() => setBannerMessage('')} className="text-xs font-semibold underline">
            Fechar
          </button>
        </div>
      ) : null}

      <div className="no-scrollbar mt-5 flex gap-1 overflow-x-auto border-b border-line">
        <TabLink active={tab === 'lista'} onClick={() => navigate('/publicadores')} icon={<LayoutList size={16} />} label="Lista" />
        <TabLink active={tab === 'grupos'} onClick={() => navigate('/publicadores/grupos')} icon={<Users size={16} />} label="Grupos" />
        <TabLink active={tab === 'estatisticas'} onClick={() => navigate('/publicadores/estatisticas')} icon={<BarChart3 size={16} />} label="Estatísticas" />
      </div>

      {tab === 'lista' ? (
        <section className="mt-4 rounded-2xl border border-line bg-white">
          <div className="flex flex-wrap items-center gap-2 px-4 py-3">
            <label className="relative w-full min-w-0 sm:min-w-56 sm:flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={name}
                onChange={(event) => { setName(event.target.value); setPage(1) }}
                placeholder="Buscar por nome..."
                aria-label="Buscar por nome"
                className="h-10 w-full rounded-xl border border-line bg-[#F8FAFC] pl-9 pr-3 text-sm"
              />
            </label>
            <Filter value={groupId} label="Todos os grupos" onChange={(value) => { setGroupId(value); setPage(1) }}>
              <option value="">Todos os grupos</option>
              <option value="none">Sem grupo</option>
              {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
            </Filter>
            <Filter value={status} label="Todos os status" onChange={(value) => { setStatus(value); setPage(1) }}>
              <option value="">Todos os status</option>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </Filter>
            <Filter value={gender} label="Todos os gêneros" onChange={(value) => { setGender(value); setPage(1) }}>
              <option value="">Todos os gêneros</option>
              <option value="feminino">Feminino</option>
              <option value="masculino">Masculino</option>
            </Filter>
            <Filter value={privilege} label="Todos os privilégios" onChange={(value) => { setPrivilege(value); setPage(1) }}>
              <option value="">Todos os privilégios</option>
              <option value="circuitOverseer">Superintendente de Circuito</option>
              <option value="elder">Ancião</option>
              <option value="ministerialServant">Servo ministerial</option>
              <option value="special">Pioneiro especial</option>
              <option value="regular">Pioneiro regular</option>
              <option value="auxiliary">Pioneiro auxiliar</option>
              <option value="publisher">Publicador</option>
            </Filter>
            <button
              type="button"
              onClick={() => setGrouped((current) => !current)}
              className={`h-10 rounded-xl border px-3 text-sm font-medium ${grouped ? 'border-indigo bg-indigo-soft text-indigo' : 'border-line bg-white'}`}
            >
              {grouped ? 'Lista única' : 'Separar por privilégio'}
            </button>
            <button type="button" onClick={exportList} className="inline-flex h-10 items-center gap-2 rounded-xl border border-line px-3 text-sm font-medium">
              <Download size={16} />
              Exportar
            </button>
          </div>

          {selectionMode ? (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-indigo-soft/60 px-4 py-2.5 text-sm">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-semibold text-indigo">
                  {validSelectedIds.length}{' '}
                  {validSelectedIds.length === 1 ? 'publicador selecionado' : 'publicadores selecionados'}
                </span>
                {filtered.length > validSelectedIds.length ? (
                  <button
                    type="button"
                    onClick={() => setSelectedIds(filtered.map((p) => p.id))}
                    className="text-xs font-medium text-indigo underline"
                  >
                    Selecionar todos ({filtered.length})
                  </button>
                ) : null}
                {validSelectedIds.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setSelectedIds([])}
                    className="text-xs font-medium text-muted underline"
                  >
                    Desmarcar todos
                  </button>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={validSelectedIds.length === 0}
                  onClick={() => setMovingIds(validSelectedIds)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-xs font-medium text-ink hover:bg-[#F8FAFC] disabled:opacity-40"
                >
                  <ArrowRightLeft size={14} />
                  Mover para outro grupo
                </button>
                <button
                  type="button"
                  disabled={validSelectedIds.length === 0}
                  onClick={() => setDeletingIds(validSelectedIds)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#E11D48] px-3 text-xs font-medium text-white hover:bg-[#BE123C] disabled:opacity-40"
                >
                  <Trash2 size={14} />
                  Excluir
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectionMode(false)
                    setSelectedIds([])
                  }}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-line bg-white px-2.5 text-xs font-medium text-muted hover:text-ink"
                >
                  <X size={14} />
                  Cancelar
                </button>
              </div>
            </div>
          ) : null}

          {grouped ? (
            <div>
              {privilegeSections.map((section) => {
                const people = filtered.filter((publisher) => privilegeSectionId(publisher) === section.id)
                if (people.length === 0) return null
                return (
                  <section key={section.id} className="border-t border-line">
                    <h2 className="bg-[#F8FAFC] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
                      {section.title}
                      <span className="ml-2 font-medium normal-case tracking-normal">{people.length}</span>
                    </h2>
                    <PublisherTable
                      publishers={people}
                      groups={groups}
                      selectionMode={selectionMode}
                      selectedIds={validSelectedIds}
                      onStartSelection={(publisher) => {
                        setSelectionMode(true)
                        setSelectedIds((current) =>
                          current.includes(publisher.id) ? current : [...current, publisher.id],
                        )
                      }}
                      onToggleOne={toggleSelectOne}
                      onToggleAll={() => toggleSelectMany(people.map((p) => p.id))}
                      onEdit={setEditing}
                    />
                  </section>
                )
              })}
              {filtered.length === 0 ? <p className="border-t border-line px-4 py-8 text-sm text-muted">Nenhum publicador encontrado.</p> : null}
            </div>
          ) : (
            <>
              <PublisherTable
                publishers={slice}
                groups={groups}
                selectionMode={selectionMode}
                selectedIds={validSelectedIds}
                onStartSelection={(publisher) => {
                  setSelectionMode(true)
                  setSelectedIds((current) =>
                    current.includes(publisher.id) ? current : [...current, publisher.id],
                  )
                }}
                onToggleOne={toggleSelectOne}
                onToggleAll={() => toggleSelectMany(slice.map((p) => p.id))}
                onEdit={setEditing}
              />
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-muted">
                <span>{from}-{to} de {filtered.length} publicadores</span>
                <div className="flex items-center gap-1">
                  <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="h-8 rounded-lg border border-line px-2 disabled:opacity-40">‹</button>
                  {Array.from({ length: pages }, (_, index) => index + 1).map((item) => (
                    <button key={item} type="button" onClick={() => setPage(item)} className={`h-8 min-w-8 rounded-lg px-2 ${item === currentPage ? 'bg-indigo text-white' : 'border border-line'}`}>{item}</button>
                  ))}
                  <button type="button" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)} className="h-8 rounded-lg border border-line px-2 disabled:opacity-40">›</button>
                </div>
              </div>
            </>
          )}
        </section>
      ) : null}

      {tab === 'grupos' ? (
        <section className="mt-4">
          {groups.length === 0 ? <p className="text-sm text-muted">Nenhum grupo cadastrado.</p> : null}
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {groups.map((group) => {
              const members = publishers.filter((publisher) => publisher.groupId === group.id)
              const superintendent = publishers.find((publisher) => publisher.id === group.superintendentPublisherId)
              const assistant = publishers.find((publisher) => publisher.id === group.assistantPublisherId)
              const tone = groupTones[group.tone]
              const shown = members.slice(0, 4)
              return (
                <article key={group.id} className="relative overflow-hidden rounded-2xl border border-line bg-white p-4 pl-5">
                  <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: tone.text }} />
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold">{group.name}</h2>
                      <span className="text-xs font-medium text-muted">{members.length} publicadores</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingGroup(group)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 text-xs font-medium text-ink hover:bg-[#F8FAFC]"
                    >
                      <Pencil size={13} />
                      Editar
                    </button>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    {superintendent ? (
                      <Avatar name={superintendent.name} />
                    ) : (
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-[#F1F5F9] text-[11px] font-semibold text-muted">
                        —
                      </span>
                    )}
                    <span>
                      <span className="block text-[11px] uppercase tracking-wide text-muted">Superintendente de grupo (SG)</span>
                      <span className={`text-sm ${superintendent ? 'font-medium text-ink' : 'text-muted'}`}>
                        {superintendent ? superintendent.name : 'Não definido'}
                      </span>
                    </span>
                  </div>
                  <div className="mt-2.5 flex items-center gap-2">
                    {assistant ? (
                      <Avatar name={assistant.name} />
                    ) : (
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-[#F1F5F9] text-[11px] font-semibold text-muted">
                        —
                      </span>
                    )}
                    <span>
                      <span className="block text-[11px] uppercase tracking-wide text-muted">Ajudante</span>
                      <span className={`text-sm ${assistant ? 'font-medium text-ink' : 'text-muted'}`}>
                        {assistant ? assistant.name : 'Sem ajudante'}
                      </span>
                    </span>
                  </div>
                  {group.description ? (
                    <p className="mt-3 rounded-xl bg-[#FFFBEB] px-3 py-2 text-xs text-[#92400E]">
                      {group.description}
                    </p>
                  ) : null}
                  <div className="mt-4 flex items-center">
                    {shown.map((member, index) => (
                      <span key={member.id} className="-ml-1 first:ml-0" style={{ zIndex: shown.length - index }}>
                        <Avatar name={member.name} />
                      </span>
                    ))}
                    {members.length > shown.length ? <span className="ml-2 text-xs text-muted">+{members.length - shown.length}</span> : null}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button type="button" onClick={() => openGroup(group.id)} className="text-sm font-medium text-indigo">
                      Ver publicadores →
                    </button>
                    {members.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setMovingIds(members.map((m) => m.id))}
                        className="text-xs font-medium text-muted hover:text-ink"
                      >
                        Mover membros
                      </button>
                    ) : null}
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      ) : null}

      {tab === 'estatisticas' ? <Statistics publishers={publishers} /> : null}
      {adding ? (
        <AddPublisher
          groups={groups}
          onClose={() => setAdding(false)}
          onAdd={async (publisher) => {
            await addPublisher(publisher)
            setAdding(false)
            setPage(1)
          }}
        />
      ) : null}
      {creatingGroup ? (
        <CreateGroup
          publishers={publishers.filter((publisher) => publisher.status === 'active')}
          onClose={() => setCreatingGroup(false)}
          onCreate={async (groupName, superintendentPublisherId, assistantPublisherId) => {
            await createGroup(groupName, superintendentPublisherId, assistantPublisherId)
            setCreatingGroup(false)
          }}
        />
      ) : null}
      {editingGroup ? (
        <EditGroupModal
          group={editingGroup}
          publishers={publishers.filter((publisher) => publisher.status === 'active')}
          onClose={() => setEditingGroup(null)}
          onSave={async (patch) => {
            await updateGroup(editingGroup.id, patch)
            setBannerMessage(`Grupo "${patch.name}" atualizado com sucesso.`)
            setEditingGroup(null)
          }}
          onDelete={async () => {
            const removedName = editingGroup.name
            await deleteGroup(editingGroup.id)
            setBannerMessage(`Grupo "${removedName}" excluído. Os publicadores ficaram sem grupo.`)
            setEditingGroup(null)
          }}
        />
      ) : null}
      {importingJson ? (
        <ImportGroupsModal
          onClose={() => setImportingJson(false)}
          onImport={async (parsedGroups, options) => {
            const result = await importGroups(parsedGroups, options)
            setBannerMessage(
              `Importação concluída: ${result.groupsCreated} grupos criados, ${result.groupsUpdated} atualizados, ${result.publishersCreated} novos publicadores cadastrados (${result.publishersMatched} já existentes vinculados).`,
            )
            setImportingJson(false)
            setPage(1)
          }}
        />
      ) : null}
      {movingIds !== null ? (
        <MoveToGroupModal
          publishers={publishers}
          groups={groups}
          initialSelectedIds={movingIds}
          onClose={() => setMovingIds(null)}
          onMove={async (targetPublisherIds, targetGroupId) => {
            const res = await bulkMovePublishers(targetPublisherIds, targetGroupId)
            const destinationName = targetGroupId
              ? groups.find((g) => g.id === targetGroupId)?.name ?? 'outro grupo'
              : 'Sem grupo'
            setBannerMessage(
              `${res.movedCount} ${res.movedCount === 1 ? 'publicador movido' : 'publicadores movidos'} para ${destinationName}.`,
            )
            setSelectedIds([])
            setSelectionMode(false)
            setMovingIds(null)
          }}
        />
      ) : null}
      {deletingIds !== null ? (
        <BulkDeleteModal
          publishers={publishers}
          filteredPublishers={filtered}
          groups={groups}
          initialSelectedIds={deletingIds}
          onClose={() => setDeletingIds(null)}
          onDelete={async (targetPublisherIds, deleteEmptyGroups) => {
            const res = await bulkDeletePublishers(targetPublisherIds, deleteEmptyGroups)
            const groupsNote =
              res.deletedGroupsCount > 0
                ? ` e ${res.deletedGroupsCount} ${res.deletedGroupsCount === 1 ? 'grupo vazio removido' : 'grupos vazios removidos'}`
                : ''
            setBannerMessage(
              `${res.deletedCount} ${res.deletedCount === 1 ? 'publicador excluído' : 'publicadores excluídos'} em lote${groupsNote}.`,
            )
            setSelectedIds([])
            setSelectionMode(false)
            setDeletingIds(null)
            setPage(1)
          }}
        />
      ) : null}
      {editing ? (
        <EditPublisher
          publisher={editing}
          groups={groups}
          onClose={() => setEditing(null)}
          onSave={async (patch) => {
            await updatePublisher(editing.id, patch)
            setEditing(null)
          }}
        />
      ) : null}
    </div>
  )
}

function MoveToGroupModal({
  publishers,
  groups,
  initialSelectedIds,
  onClose,
  onMove,
}: {
  publishers: MockPublisher[]
  groups: MockGroup[]
  initialSelectedIds: string[]
  onClose: () => void
  onMove: (publisherIds: string[], groupId: string | null) => Promise<void>
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    initialSelectedIds.length > 0 ? initialSelectedIds : publishers[0] ? [publishers[0].id] : [],
  )
  const firstPerson = publishers.find((p) => p.id === selectedIds[0])
  const defaultDestination =
    groups.find((g) => g.id !== firstPerson?.groupId)?.id ?? groups[0]?.id ?? ''
  const [targetGroupId, setTargetGroupId] = useState<string>(defaultDestination)
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const singleMode = initialSelectedIds.length === 1 && selectedIds.length === 1 && firstPerson
  const filteredPeople = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('pt-BR')
    if (!q) return publishers
    return publishers.filter((p) => p.name.toLocaleLowerCase('pt-BR').includes(q))
  }, [publishers, search])

  function toggleId(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-[#0B0E14]/40 p-4" onClick={onClose}>
      <form
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5"
        onClick={(event) => event.stopPropagation()}
        onSubmit={async (event) => {
          event.preventDefault()
          if (selectedIds.length === 0) return
          setBusy(true)
          setSubmitError('')
          try {
            await onMove(selectedIds, targetGroupId || null)
          } catch (err) {
            setSubmitError(err instanceof Error ? err.message : 'Não foi possível mover os publicadores.')
          } finally {
            setBusy(false)
          }
        }}
      >
        <h2 className="text-lg font-semibold">
          {singleMode ? `Mover ${firstPerson.name} de grupo` : 'Mover publicadores para outro grupo'}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {singleMode
            ? `Grupo atual: ${groups.find((g) => g.id === firstPerson.groupId)?.name ?? 'Sem grupo'}`
            : 'Selecione o grupo de destino e confirme os publicadores que serão transferidos de uma só vez.'}
        </p>

        <label className="mt-4 block text-xs font-medium text-muted">
          Grupo de destino
          <select
            value={targetGroupId}
            onChange={(event) => setTargetGroupId(event.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-line bg-white px-2 text-sm text-ink"
          >
            <option value="">Sem grupo (desvincular)</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </label>

        {!singleMode ? (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-muted">
              <span>Publicadores selecionados ({selectedIds.length})</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedIds(filteredPeople.map((p) => p.id))}
                  className="font-medium text-indigo underline"
                >
                  Marcar visíveis
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="font-medium text-muted underline"
                >
                  Desmarcar todos
                </button>
              </div>
            </div>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Filtrar publicadores pelo nome..."
              className="mt-1.5 h-9 w-full rounded-lg border border-line bg-[#F8FAFC] px-3 text-xs"
            />
            <div className="mt-2 max-h-52 divide-y divide-line overflow-y-auto rounded-xl border border-line">
              {filteredPeople.map((person) => {
                const currentGroup = groups.find((g) => g.id === person.groupId)
                const checked = selectedIds.includes(person.id)
                return (
                  <div
                    key={person.id}
                    onClick={() => toggleId(person.id)}
                    className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-xs hover:bg-[#F8FAFC]"
                  >
                    <span className="flex items-center gap-2.5 font-medium text-ink">
                      <Checkbox checked={checked} onChange={() => toggleId(person.id)} />
                      {person.name}
                    </span>
                    <span className="text-[11px] text-muted">{currentGroup?.name ?? 'Sem grupo'}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}

        {submitError ? <p className="mt-3 text-sm text-[#9F1239]">{submitError}</p> : null}

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="h-10 rounded-xl border border-line px-3 text-sm">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={busy || selectedIds.length === 0}
            className="h-10 rounded-xl bg-indigo px-4 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy
              ? 'Movendo…'
              : singleMode
                ? 'Mover publicador'
                : `Mover ${selectedIds.length} ${selectedIds.length === 1 ? 'publicador' : 'publicadores'}`}
          </button>
        </div>
      </form>
    </div>
  )
}

function BulkDeleteModal({
  publishers,
  filteredPublishers,
  groups,
  initialSelectedIds,
  onClose,
  onDelete,
}: {
  publishers: MockPublisher[]
  filteredPublishers: MockPublisher[]
  groups: MockGroup[]
  initialSelectedIds: string[]
  onClose: () => void
  onDelete: (publisherIds: string[], deleteEmptyGroups: boolean) => Promise<void>
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds)
  const [deleteEmptyGroups, setDeleteEmptyGroups] = useState(true)
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const visibleList = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('pt-BR')
    if (!q) return publishers
    return publishers.filter((p) => p.name.toLocaleLowerCase('pt-BR').includes(q))
  }, [publishers, search])

  function toggleId(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  function selectByGroup(targetGroupId: string | null) {
    const ids = publishers
      .filter((p) => (targetGroupId === null ? !p.groupId : p.groupId === targetGroupId))
      .map((p) => p.id)
    setSelectedIds((current) => {
      const next = new Set(current)
      for (const id of ids) next.add(id)
      return [...next]
    })
  }

  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-[#0B0E14]/40 p-4" onClick={onClose}>
      <form
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5"
        onClick={(event) => event.stopPropagation()}
        onSubmit={async (event) => {
          event.preventDefault()
          if (selectedIds.length === 0) return
          setBusy(true)
          setSubmitError('')
          try {
            await onDelete(selectedIds, deleteEmptyGroups)
          } catch (err) {
            setSubmitError(err instanceof Error ? err.message : 'Não foi possível excluir os publicadores selecionados.')
          } finally {
            setBusy(false)
          }
        }}
      >
        <h2 className="text-lg font-semibold text-[#BE123C]">Exclusão em lote de publicadores</h2>
        <p className="mt-1 text-sm text-muted">
          Selecione os publicadores que deseja remover de uma só vez. A operação será executada em um único lote no banco.
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedIds(publishers.map((p) => p.id))}
            className="rounded-lg border border-line bg-[#F8FAFC] px-2.5 py-1 text-xs font-medium hover:bg-[#F1F5F9]"
          >
            Selecionar todos ({publishers.length})
          </button>
          {filteredPublishers.length !== publishers.length ? (
            <button
              type="button"
              onClick={() => setSelectedIds(filteredPublishers.map((p) => p.id))}
              className="rounded-lg border border-line bg-[#F8FAFC] px-2.5 py-1 text-xs font-medium hover:bg-[#F1F5F9]"
            >
              Selecionar filtrados ({filteredPublishers.length})
            </button>
          ) : null}
          {groups.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => selectByGroup(g.id)}
              className="rounded-lg border border-line bg-white px-2.5 py-1 text-xs hover:bg-[#F8FAFC]"
            >
              + {g.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSelectedIds([])}
            className="rounded-lg border border-line bg-white px-2.5 py-1 text-xs text-muted hover:bg-[#F8FAFC]"
          >
            Limpar seleção
          </button>
        </div>

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar publicador na lista..."
          className="mt-3 h-9 w-full rounded-lg border border-line bg-[#F8FAFC] px-3 text-xs"
        />

        <div className="mt-2 max-h-56 divide-y divide-line overflow-y-auto rounded-xl border border-line">
          {visibleList.map((person) => {
            const currentGroup = groups.find((g) => g.id === person.groupId)
            const checked = selectedIds.includes(person.id)
            return (
              <div
                key={person.id}
                onClick={() => toggleId(person.id)}
                className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-xs hover:bg-[#F8FAFC]"
              >
                <span className="flex items-center gap-2.5 font-medium text-ink">
                  <Checkbox tone="danger" checked={checked} onChange={() => toggleId(person.id)} />
                  {person.name}
                </span>
                <span className="text-[11px] text-muted">{currentGroup?.name ?? 'Sem grupo'}</span>
              </div>
            )
          })}
        </div>

        <div
          onClick={() => setDeleteEmptyGroups((c) => !c)}
          className="mt-3 inline-flex cursor-pointer items-center gap-2.5 text-xs text-ink"
        >
          <Checkbox
            tone="danger"
            checked={deleteEmptyGroups}
            onChange={(next) => setDeleteEmptyGroups(next)}
          />
          <span>Excluir também os grupos que ficarem totalmente sem publicadores</span>
        </div>

        {submitError ? <p className="mt-3 text-sm text-[#9F1239]">{submitError}</p> : null}

        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-muted">
            {selectedIds.length} {selectedIds.length === 1 ? 'publicador marcado' : 'publicadores marcados'}
          </span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} disabled={busy} className="h-10 rounded-xl border border-line px-3 text-sm">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy || selectedIds.length === 0}
              className="h-10 rounded-xl bg-[#E11D48] px-4 text-sm font-medium text-white disabled:opacity-50"
            >
              {busy ? 'Excluindo em lote…' : `Excluir ${selectedIds.length} selecionados`}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

function ImportGroupsModal({
  onClose,
  onImport,
}: {
  onClose: () => void
  onImport: (groups: ImportedGroupItem[], options: GroupsImportOptions) => Promise<void>
}) {
  const [rawJson, setRawJson] = useState(DEFAULT_GROUPS_IMPORT_JSON)
  const [prefixCode, setPrefixCode] = useState(true)
  const [stripQuestionMarks, setStripQuestionMarks] = useState(false)
  const [busy, setBusy] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const preview = useMemo(() => {
    try {
      const groups = parseGroupsImportJson(rawJson)
      let totalPeople = 0
      const uncertainNames: string[] = []

      for (const g of groups) {
        const people = [g.superintendent, ...(g.assistant ? [g.assistant] : []), ...g.publishers]
        totalPeople += people.length
        for (const p of people) {
          if (p.includes('?') || p.includes('...')) {
            uncertainNames.push(`${cleanImportedPersonName(p, stripQuestionMarks)} (${g.code || g.name})`)
          }
        }
      }

      return {
        groups,
        totalPeople,
        uncertainNames,
        parseError: '',
      }
    } catch (err) {
      return {
        groups: [] as ImportedGroupItem[],
        totalPeople: 0,
        uncertainNames: [] as string[],
        parseError: err instanceof Error ? err.message : 'JSON inválido.',
      }
    }
  }, [rawJson, stripQuestionMarks])

  function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setRawJson(reader.result)
        setSubmitError('')
      }
    }
    reader.readAsText(file, 'utf-8')
  }

  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-[#0B0E14]/40 p-4" onClick={onClose}>
      <form
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5"
        onClick={(event) => event.stopPropagation()}
        onSubmit={async (event) => {
          event.preventDefault()
          if (preview.parseError || preview.groups.length === 0) return
          setBusy(true)
          setSubmitError('')
          try {
            await onImport(preview.groups, { prefixCode, stripQuestionMarks })
          } catch (err) {
            setSubmitError(err instanceof Error ? err.message : 'Não foi possível importar os grupos.')
          } finally {
            setBusy(false)
          }
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Importar grupos e publicadores (JSON)</h2>
            <p className="mt-1 text-sm text-muted">
              Lê o formato <code className="rounded bg-[#F1F5F9] px-1 py-0.5 text-xs">{"{ \"groups\": [ { code, name, superintendent, assistant, publishers, notes } ] }"}</code>.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-line px-3 text-xs font-medium hover:bg-[#F8FAFC]">
              <FileJson size={14} />
              Carregar arquivo .json
              <input type="file" accept=".json,application/json" onChange={handleFileUpload} className="hidden" />
            </label>
            <button
              type="button"
              onClick={() => {
                setRawJson(DEFAULT_GROUPS_IMPORT_JSON)
                setSubmitError('')
              }}
              className="h-9 rounded-xl border border-line px-3 text-xs font-medium hover:bg-[#F8FAFC]"
            >
              Restaurar grupos A–F
            </button>
          </div>
        </div>

        <label className="mt-4 block text-xs font-medium text-muted">
          Conteúdo JSON
          <textarea
            value={rawJson}
            onChange={(event) => {
              setRawJson(event.target.value)
              setSubmitError('')
            }}
            rows={10}
            spellCheck={false}
            className="mt-1 w-full rounded-xl border border-line bg-[#F8FAFC] p-3 font-mono text-xs text-ink"
          />
        </label>

        <div className="mt-3 flex flex-wrap gap-4">
          <div
            onClick={() => setPrefixCode((c) => !c)}
            className="inline-flex cursor-pointer items-center gap-2.5 text-xs text-ink"
          >
            <Checkbox checked={prefixCode} onChange={(next) => setPrefixCode(next)} />
            <span>
              Incluir código no nome do grupo (ex.: <strong>A — Laranjeiras</strong>)
            </span>
          </div>
          <div
            onClick={() => setStripQuestionMarks((c) => !c)}
            className="inline-flex cursor-pointer items-center gap-2.5 text-xs text-ink"
          >
            <Checkbox checked={stripQuestionMarks} onChange={(next) => setStripQuestionMarks(next)} />
            <span>
              Remover <code>?</code> do final de nomes duvidosos (ex.: <em>Lisandrela?</em> → <em>Lisandrela</em>)
            </span>
          </div>
        </div>

        {preview.parseError ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#FDE8EF] px-3 py-2 text-xs text-[#9F1239]">
            <AlertCircle size={15} />
            <span>{preview.parseError}</span>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-line bg-[#F8FAFC] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-ink">
              <span>
                Pré-visualização: <strong>{preview.groups.length} grupos</strong> · <strong>{preview.totalPeople} pessoas</strong> (incluindo superintendentes e ajudantes)
              </span>
              {preview.uncertainNames.length > 0 ? (
                <span className="rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[11px] font-medium text-[#92400E]">
                  {preview.uncertainNames.length} nomes com leitura parcial (? / ...)
                </span>
              ) : null}
            </div>
            <div className="mt-2.5 grid max-h-44 gap-2 overflow-y-auto sm:grid-cols-2">
              {preview.groups.map((item, idx) => (
                <div key={`${item.code ?? idx}-${item.name}`} className="rounded-lg border border-line bg-white p-2.5 text-xs">
                  <div className="flex items-center justify-between font-semibold text-ink">
                    <span>{formatImportedGroupName(item, prefixCode)}</span>
                    <span className="text-[11px] font-normal text-muted">
                      {item.publishers.length + 1 + (item.assistant ? 1 : 0)} membros
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted">
                    <strong>Sup.:</strong> {cleanImportedPersonName(item.superintendent, stripQuestionMarks)}
                    {item.assistant ? (
                      <>
                        {' · '}
                        <strong>Ajud.:</strong> {cleanImportedPersonName(item.assistant, stripQuestionMarks)}
                      </>
                    ) : null}
                  </p>
                  {item.notes ? (
                    <p className="mt-1 text-[11px] italic text-[#92400E]">Obs.: {item.notes}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}

        {submitError ? <p className="mt-3 text-sm text-[#9F1239]">{submitError}</p> : null}

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="h-10 rounded-xl border border-line px-3 text-sm">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={busy || Boolean(preview.parseError) || preview.groups.length === 0}
            className="h-10 rounded-xl bg-indigo px-4 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? 'Importando grupos e publicadores…' : `Importar ${preview.groups.length} grupos`}
          </button>
        </div>
      </form>
    </div>
  )
}

function PublisherTable({
  publishers,
  groups,
  selectionMode,
  selectedIds,
  onStartSelection,
  onToggleOne,
  onToggleAll,
  onEdit,
}: {
  publishers: MockPublisher[]
  groups: MockGroup[]
  selectionMode: boolean
  selectedIds: string[]
  onStartSelection: (publisher: MockPublisher) => void
  onToggleOne: (id: string) => void
  onToggleAll: () => void
  onEdit: (publisher: MockPublisher) => void
}) {
  const visibleSelectedCount = publishers.filter((publisher) => selectedIds.includes(publisher.id)).length
  const allVisibleSelected = publishers.length > 0 && visibleSelectedCount === publishers.length
  const someVisibleSelected = visibleSelectedCount > 0 && !allVisibleSelected
  const colSpan = selectionMode ? 8 : 7

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="text-[11px] uppercase tracking-wide text-muted">
          <tr className="border-t border-line">
            {selectionMode ? (
              <th className="w-10 px-4 py-3">
                <Checkbox
                  ariaLabel="Selecionar todos desta página"
                  checked={allVisibleSelected}
                  indeterminate={someVisibleSelected}
                  onChange={onToggleAll}
                />
              </th>
            ) : null}
            <th className="px-4 py-3">Nome</th>
            <th className="px-3 py-3">Grupo</th>
            <th className="px-3 py-3">Gênero</th>
            <th className="px-3 py-3">Status</th>
            <th className="px-3 py-3">Privilégio</th>
            <th className="px-3 py-3">Telefone</th>
            <th className="w-16 px-3 py-3 text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          {publishers.length === 0 ? (
            <tr className="border-t border-line">
              <td colSpan={colSpan} className="px-4 py-8 text-muted">Nenhum publicador encontrado.</td>
            </tr>
          ) : publishers.map((publisher) => {
            const group = groups.find((item) => item.id === publisher.groupId)
            const checked = selectionMode && selectedIds.includes(publisher.id)
            return (
              <tr
                key={publisher.id}
                onClick={selectionMode ? () => onToggleOne(publisher.id) : undefined}
                className={`border-t border-line ${selectionMode ? 'cursor-pointer hover:bg-[#F8FAFC]' : ''} ${checked ? 'bg-indigo-soft/30' : ''}`}
              >
                {selectionMode ? (
                  <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                    <Checkbox
                      ariaLabel={`Selecionar ${publisher.name}`}
                      checked={checked}
                      onChange={() => onToggleOne(publisher.id)}
                    />
                  </td>
                ) : null}
                <td className="px-4 py-3">
                  <span className="flex items-center gap-3">
                    <Avatar name={publisher.name} />
                    <span>
                      <span className="block font-medium">{publisher.name}</span>
                      <span className="text-xs text-muted">{publisher.age > 0 ? `${publisher.age} anos` : 'Idade não informada'}</span>
                    </span>
                  </span>
                </td>
                <td className="px-3 py-3">
                  {group ? (
                    <GroupChip group={group} />
                  ) : publisher.privilege === 'circuitOverseer' ? (
                    <span className="inline-flex items-center rounded-full border border-[#FDE68A] bg-[#FEF3C7] px-2 py-0.5 text-xs font-semibold text-[#92400E]">
                      Circuito (Especial)
                    </span>
                  ) : (
                    <span className="text-muted">Sem grupo</span>
                  )}
                </td>
                <td className="px-3 py-3">{publisher.gender === 'feminino' ? 'Feminino' : 'Masculino'}</td>
                <td className="px-3 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${publisher.status === 'active' ? 'bg-[#ECFDF5] text-[#047857]' : 'bg-[#F1F5F9] text-[#64748B]'}`}>
                    {publisher.status === 'active' ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-3 py-3">
                  {publisher.privilege === 'circuitOverseer' ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#FDE68A] bg-[#FEF3C7] px-2.5 py-0.5 text-xs font-semibold text-[#92400E]">
                      {privilegeLabel(publisher)}
                    </span>
                  ) : (
                    <span className="block">{privilegeLabel(publisher)}</span>
                  )}
                </td>
                <td className="px-3 py-3 text-muted">{publisher.phone || '—'}</td>
                <td className="px-3 py-3 text-right" onClick={(event) => event.stopPropagation()}>
                  <RowActionsMenu
                    publisherName={publisher.name}
                    selectionMode={selectionMode}
                    checked={checked}
                    onEdit={() => onEdit(publisher)}
                    onSelect={() => {
                      if (selectionMode) onToggleOne(publisher.id)
                      else onStartSelection(publisher)
                    }}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function RowActionsMenu({
  publisherName,
  selectionMode,
  checked,
  onEdit,
  onSelect,
}: {
  publisherName: string
  selectionMode: boolean
  checked: boolean
  onEdit: () => void
  onSelect: () => void
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function updatePos() {
      const btn = buttonRef.current
      if (!btn) return
      const rect = btn.getBoundingClientRect()
      const menuWidth = 176
      const left = Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8))
      setPos({ top: rect.bottom + 4, left })
    }
    function handleOutside(event: MouseEvent) {
      const target = event.target as Node
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    updatePos()
    window.addEventListener('scroll', updatePos, true)
    window.addEventListener('resize', updatePos)
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('scroll', updatePos, true)
      window.removeEventListener('resize', updatePos)
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Opções de ${publisherName}`}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="inline-grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-[#F1F5F9] hover:text-ink"
      >
        <MoreVertical size={16} />
      </button>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              style={{ top: pos.top, left: pos.left }}
              className="fixed z-40 w-44 rounded-xl border border-line bg-white py-1 shadow-lg"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  onEdit()
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-[#F8FAFC]"
              >
                <Pencil size={14} className="text-muted" />
                Editar
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  onSelect()
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-[#F8FAFC]"
              >
                <CheckSquare size={14} className="text-muted" />
                {selectionMode && checked ? 'Desmarcar' : 'Selecionar'}
              </button>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

function EditPublisher({
  publisher,
  groups,
  onClose,
  onSave,
}: {
  publisher: MockPublisher
  groups: MockGroup[]
  onClose: () => void
  onSave: (patch: Partial<MockPublisher>) => Promise<void>
}) {
  const [name, setName] = useState(publisher.name)
  const [age, setAge] = useState(publisher.age > 0 ? String(publisher.age) : '')
  const [gender, setGender] = useState<MockGender>(publisher.gender)
  const [phone, setPhone] = useState(publisher.phone)
  const [groupId, setGroupId] = useState(publisher.groupId ?? '')
  const [status, setStatus] = useState<MockStatus>(publisher.status)
  const [privilege, setPrivilege] = useState<MockPrivilege>(publisher.privilege)
  const [pioneer, setPioneer] = useState<MockPioneer>(publisher.pioneer)
  const [busy, setBusy] = useState(false)

  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-[#0B0E14]/40 p-4" onClick={onClose}>
      <form
        className="w-full max-w-md rounded-2xl bg-white p-5"
        onClick={(event) => event.stopPropagation()}
        onSubmit={async (event) => {
          event.preventDefault()
          if (!name.trim()) return
          setBusy(true)
          try {
            const parsedAge = Number(age)
            await onSave({
              name: name.trim(),
              age: Number.isFinite(parsedAge) && parsedAge > 0 ? parsedAge : 0,
              gender,
              phone: phone.trim(),
              groupId: groupId || null,
              status,
              privilege,
              pioneer,
            })
          } finally {
            setBusy(false)
          }
        }}
      >
        <h2 className="text-lg font-semibold">Editar publicador</h2>
        <p className="mt-1 text-sm text-muted">Dados pessoais e privilégio congregacional. As funções de reunião e apoio a idosos ficam em Designações → Habilitações.</p>
        <label className="mt-4 block text-xs text-muted">Nome
          <input required value={name} onChange={(event) => setName(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm text-ink" />
        </label>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="text-xs text-muted">Idade
            <input type="number" min={1} max={120} value={age} onChange={(event) => setAge(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm text-ink" />
          </label>
          <label className="text-xs text-muted">Gênero
            <select
              value={gender}
              onChange={(event) => {
                const nextGender = event.target.value as MockGender
                setGender(nextGender)
                if (nextGender === 'feminino') setPrivilege('publisher')
              }}
              className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm text-ink"
            >
              <option value="masculino">Masculino</option>
              <option value="feminino">Feminino</option>
            </select>
          </label>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="text-xs text-muted">Telefone
            <input value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm text-ink" />
          </label>
          <label className="text-xs text-muted">Status
            <select value={status} onChange={(event) => setStatus(event.target.value as MockStatus)} className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm text-ink">
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </select>
          </label>
        </div>
        <label className="mt-3 block text-xs text-muted">Grupo
          <select value={groupId} onChange={(event) => setGroupId(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm text-ink">
            <option value="">Sem grupo</option>
            {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
          </select>
        </label>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="text-xs text-muted">Privilégio / Cargo
            <select
              value={gender === 'feminino' ? 'publisher' : privilege}
              disabled={gender === 'feminino'}
              onChange={(event) => {
                const nextPriv = event.target.value as MockPrivilege
                setPrivilege(nextPriv)
                if (nextPriv === 'circuitOverseer') {
                  setGroupId('')
                }
              }}
              className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm text-ink disabled:bg-[#F8FAFC] disabled:text-muted"
            >
              <option value="publisher">{gender === 'feminino' ? 'Publicadora' : 'Publicador'}</option>
              {gender !== 'feminino' ? (
                <>
                  <option value="ministerialServant">Servo ministerial</option>
                  <option value="elder">Ancião</option>
                  <option value="circuitOverseer">Superintendente de Circuito (Especial)</option>
                </>
              ) : null}
            </select>
          </label>
          <label className="text-xs text-muted">Pioneiro / Tipo especial
            <select value={pioneer} onChange={(event) => setPioneer(event.target.value as MockPioneer)} className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm text-ink">
              <option value="none">{gender === 'feminino' ? 'Não é pioneira' : 'Não é pioneiro'}</option>
              <option value="auxiliary">{gender === 'feminino' ? 'Pioneira auxiliar' : 'Pioneiro auxiliar'}</option>
              <option value="regular">{gender === 'feminino' ? 'Pioneira regular' : 'Pioneiro regular'}</option>
              <option value="special">{gender === 'feminino' ? 'Pioneira especial' : 'Pioneiro especial'}</option>
            </select>
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-xl border border-line px-3 text-sm">Cancelar</button>
          <button type="submit" disabled={busy} className="h-10 rounded-xl bg-indigo px-4 text-sm font-medium text-white disabled:opacity-50">{busy ? 'Salvando…' : 'Salvar'}</button>
        </div>
      </form>
    </div>
  )
}

function Statistics({ publishers }: { publishers: MockPublisher[] }) {
  const { groups } = usePublisherCatalog()
  const active = publishers.filter((publisher) => publisher.status === 'active').length
  const women = publishers.filter((publisher) => publisher.gender === 'feminino').length
  const unassigned = publishers.filter(
    (publisher) => !publisher.groupId && publisher.privilege !== 'circuitOverseer',
  ).length
  return (
    <section className="mt-4 grid gap-3 sm:grid-cols-3">
      <Stat label="Publicadores" value={String(publishers.length)} />
      <Stat label="Ativos" value={String(active)} />
      <Stat label="Sem grupo" value={String(unassigned)} />
      <Stat label="Irmãs" value={String(women)} />
      <Stat label="Irmãos" value={String(publishers.length - women)} />
      <Stat label="Grupos" value={String(groups.length)} />
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-line bg-white px-4 py-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </article>
  )
}

function TabLink({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return (
    <button type="button" onClick={onClick} className={`inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium ${active ? 'border-indigo text-indigo' : 'border-transparent text-muted'}`}>
      {icon}
      {label}
    </button>
  )
}

function Filter({ value, label, onChange, children }: { value: string; label: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <select value={value} aria-label={label} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-xl border border-line bg-white px-3 text-sm">
      {children}
    </select>
  )
}

function GroupChip({ group }: { group: MockGroup }) {
  const tone = groupTones[group.tone]
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: tone.chip, color: tone.text }}>
      {group.name}
    </span>
  )
}

function Avatar({ name }: { name: string }) {
  return (
    <span className="grid h-9 w-9 place-items-center rounded-full bg-indigo-soft text-[11px] font-semibold text-indigo">
      {initials(name)}
    </span>
  )
}

function CreateGroup({
  publishers,
  onClose,
  onCreate,
}: {
  publishers: MockPublisher[]
  onClose: () => void
  onCreate: (name: string, superintendentPublisherId: string, assistantPublisherId?: string | null) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [superintendentId, setSuperintendentId] = useState(publishers[0]?.id ?? '')
  const [assistantId, setAssistantId] = useState('')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-[#0B0E14]/40 p-4" onClick={onClose}>
      <form
        className="w-full max-w-md rounded-2xl bg-white p-5"
        onClick={(event) => event.stopPropagation()}
        onSubmit={async (event) => {
          event.preventDefault()
          if (!name.trim() || !superintendentId) return
          setBusy(true)
          setFailed(false)
          try {
            await onCreate(
              name.trim(),
              superintendentId,
              assistantId && assistantId !== superintendentId ? assistantId : null,
            )
          } catch {
            setFailed(true)
          } finally {
            setBusy(false)
          }
        }}
      >
        <h2 className="text-lg font-semibold">Novo grupo</h2>
        <p className="mt-1 text-sm text-muted">O superintendente e o ajudante entram neste grupo automaticamente.</p>
        <label className="mt-4 block text-xs text-muted">Nome do grupo
          <input required value={name} onChange={(event) => setName(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm text-ink" />
        </label>
        <label className="mt-3 block text-xs text-muted">Superintendente de grupo (SG)
          <select
            required
            value={superintendentId}
            onChange={(event) => {
              const next = event.target.value
              setSuperintendentId(next)
              if (assistantId === next) setAssistantId('')
            }}
            className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm text-ink"
          >
            {publishers.length === 0 ? <option value="">Nenhum publicador ativo</option> : null}
            {publishers.map((publisher) => <option key={publisher.id} value={publisher.id}>{publisher.name}</option>)}
          </select>
        </label>
        <label className="mt-3 block text-xs text-muted">Ajudante (opcional)
          <select
            value={assistantId}
            onChange={(event) => setAssistantId(event.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm text-ink"
          >
            <option value="">Sem ajudante</option>
            {publishers
              .filter((publisher) => publisher.id !== superintendentId)
              .map((publisher) => (
                <option key={publisher.id} value={publisher.id}>
                  {publisher.name}
                </option>
              ))}
          </select>
        </label>
        {failed ? <p className="mt-3 text-sm text-[#9F1239]">Não foi possível criar o grupo.</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-xl border border-line px-3 text-sm">Cancelar</button>
          <button type="submit" disabled={busy || publishers.length === 0} className="h-10 rounded-xl bg-indigo px-4 text-sm font-medium text-white disabled:opacity-50">{busy ? 'Salvando…' : 'Criar grupo'}</button>
        </div>
      </form>
    </div>
  )
}

function EditGroupModal({
  group,
  publishers,
  onClose,
  onSave,
  onDelete,
}: {
  group: MockGroup
  publishers: MockPublisher[]
  onClose: () => void
  onSave: (patch: GroupPatch) => Promise<void>
  onDelete: () => Promise<void>
}) {
  const [name, setName] = useState(group.name)
  const [superintendentId, setSuperintendentId] = useState(group.superintendentPublisherId ?? '')
  const [assistantId, setAssistantId] = useState(group.assistantPublisherId ?? '')
  const [description, setDescription] = useState(group.description ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const groupMembers = useMemo(
    () => publishers.filter((p) => p.groupId === group.id),
    [publishers, group.id],
  )
  const otherPublishers = useMemo(
    () => publishers.filter((p) => p.groupId !== group.id),
    [publishers, group.id],
  )

  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-[#0B0E14]/40 p-4" onClick={onClose}>
      <form
        className="w-full max-w-md rounded-2xl bg-white p-5"
        onClick={(event) => event.stopPropagation()}
        onSubmit={async (event) => {
          event.preventDefault()
          if (!name.trim()) return
          setBusy(true)
          setSubmitError('')
          try {
            await onSave({
              name: name.trim(),
              superintendentPublisherId: superintendentId,
              assistantPublisherId:
                assistantId && assistantId !== superintendentId ? assistantId : null,
              description: description.trim(),
            })
          } catch (err) {
            setSubmitError(err instanceof Error ? err.message : 'Não foi possível salvar as alterações do grupo.')
          } finally {
            setBusy(false)
          }
        }}
      >
        <h2 className="text-lg font-semibold">Editar grupo</h2>
        <p className="mt-1 text-sm text-muted">
          Altere o nome do grupo, o Superintendente de Grupo (SG) e o Ajudante. Se escolher alguém de fora, ele será vinculado a este grupo.
        </p>

        <label className="mt-4 block text-xs font-medium text-muted">
          Nome do grupo
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-line px-2.5 text-sm text-ink"
          />
        </label>

        <label className="mt-3 block text-xs font-medium text-muted">
          Superintendente de grupo (SG)
          <select
            value={superintendentId}
            onChange={(event) => {
              const next = event.target.value
              setSuperintendentId(next)
              if (assistantId === next) setAssistantId('')
            }}
            className="mt-1 h-10 w-full rounded-lg border border-line bg-white px-2.5 text-sm text-ink"
          >
            <option value="">Sem superintendente definido</option>
            {groupMembers.length > 0 ? (
              <optgroup label="Membros deste grupo">
                {groupMembers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
            ) : null}
            {otherPublishers.length > 0 ? (
              <optgroup label="Outros publicadores ativos">
                {otherPublishers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
            ) : null}
          </select>
        </label>

        <label className="mt-3 block text-xs font-medium text-muted">
          Ajudante
          <select
            value={assistantId}
            onChange={(event) => setAssistantId(event.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-line bg-white px-2.5 text-sm text-ink"
          >
            <option value="">Sem ajudante</option>
            {groupMembers.filter((p) => p.id !== superintendentId).length > 0 ? (
              <optgroup label="Membros deste grupo">
                {groupMembers
                  .filter((p) => p.id !== superintendentId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </optgroup>
            ) : null}
            {otherPublishers.filter((p) => p.id !== superintendentId).length > 0 ? (
              <optgroup label="Outros publicadores ativos">
                {otherPublishers
                  .filter((p) => p.id !== superintendentId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </optgroup>
            ) : null}
          </select>
        </label>

        <label className="mt-3 block text-xs font-medium text-muted">
          Observação (opcional)
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Ex.: observação sobre o grupo..."
            className="mt-1 h-10 w-full rounded-lg border border-line px-2.5 text-sm text-ink"
          />
        </label>

        {submitError ? <p className="mt-3 text-sm text-[#9F1239]">{submitError}</p> : null}

        {confirmDelete ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#FECDD3] bg-[#FFF1F2] p-3 text-xs text-[#9F1239]">
            <span>Excluir este grupo? Os membros continuarão cadastrados (sem grupo).</span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg border border-line bg-white px-2.5 py-1 text-ink"
              >
                Não
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true)
                  setSubmitError('')
                  try {
                    await onDelete()
                  } catch (err) {
                    setSubmitError(err instanceof Error ? err.message : 'Não foi possível excluir o grupo.')
                    setBusy(false)
                  }
                }}
                className="rounded-lg bg-[#E11D48] px-2.5 py-1 font-medium text-white"
              >
                Confirmar exclusão
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirmDelete(true)}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl px-2 text-xs font-medium text-[#BE123C] hover:bg-[#FFF1F2]"
          >
            <Trash2 size={14} />
            Excluir grupo
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} disabled={busy} className="h-10 rounded-xl border border-line px-3 text-sm">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy || !name.trim()}
              className="h-10 rounded-xl bg-indigo px-4 text-sm font-medium text-white disabled:opacity-50"
            >
              {busy ? 'Salvando…' : 'Salvar alterações'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

function AddPublisher({
  groups,
  onClose,
  onAdd,
}: {
  groups: MockGroup[]
  onClose: () => void
  onAdd: (publisher: MockPublisher) => Promise<void>
}) {
  const [draft, setDraft] = useState<MockPublisher>({
    id: '',
    name: '',
    age: 30,
    gender: 'masculino',
    status: 'active',
    privilege: 'publisher',
    pioneer: 'none',
    duties: [],
    needsElderlySupport: false,
    driver: false,
    phone: '',
    groupId: null,
  })
  const [busy, setBusy] = useState(false)

  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-[#0B0E14]/40 p-4" onClick={onClose}>
      <form
        className="w-full max-w-md rounded-2xl bg-white p-5"
        onClick={(event) => event.stopPropagation()}
        onSubmit={async (event) => {
          event.preventDefault()
          if (!draft.name.trim()) return
          setBusy(true)
          try {
            await onAdd({ ...draft, id: `local-${Date.now()}`, name: draft.name.trim() })
          } finally {
            setBusy(false)
          }
        }}
      >
        <h2 className="text-lg font-semibold">Adicionar publicador</h2>
        <p className="mt-1 text-sm text-muted">Cadastre as informações pessoais e o privilégio congregacional.</p>
        <label className="mt-4 block text-xs text-muted">Nome
          <input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm text-ink" />
        </label>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="text-xs text-muted">Idade
            <input type="number" min={1} max={120} value={draft.age} onChange={(event) => setDraft({ ...draft, age: Number(event.target.value) })} className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm text-ink" />
          </label>
          <label className="text-xs text-muted">Gênero
            <select
              value={draft.gender}
              onChange={(event) => {
                const nextGender = event.target.value as MockGender
                setDraft({
                  ...draft,
                  gender: nextGender,
                  privilege: nextGender === 'feminino' ? 'publisher' : draft.privilege,
                })
              }}
              className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm text-ink"
            >
              <option value="masculino">Masculino</option>
              <option value="feminino">Feminino</option>
            </select>
          </label>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="text-xs text-muted">Telefone
            <input value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm text-ink" />
          </label>
          <label className="text-xs text-muted">Grupo
            <select value={draft.groupId ?? ''} onChange={(event) => setDraft({ ...draft, groupId: event.target.value || null })} className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm text-ink">
              <option value="">Sem grupo</option>
              {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="text-xs text-muted">Privilégio / Cargo
            <select
              value={draft.gender === 'feminino' ? 'publisher' : draft.privilege}
              disabled={draft.gender === 'feminino'}
              onChange={(event) => {
                const nextPriv = event.target.value as MockPrivilege
                setDraft({
                  ...draft,
                  privilege: nextPriv,
                  groupId: nextPriv === 'circuitOverseer' ? null : draft.groupId,
                })
              }}
              className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm text-ink disabled:bg-[#F8FAFC] disabled:text-muted"
            >
              <option value="publisher">{draft.gender === 'feminino' ? 'Publicadora' : 'Publicador'}</option>
              {draft.gender !== 'feminino' ? (
                <>
                  <option value="ministerialServant">Servo ministerial</option>
                  <option value="elder">Ancião</option>
                  <option value="circuitOverseer">Superintendente de Circuito (Especial)</option>
                </>
              ) : null}
            </select>
          </label>
          <label className="text-xs text-muted">Pioneiro / Tipo especial
            <select value={draft.pioneer} onChange={(event) => setDraft({ ...draft, pioneer: event.target.value as MockPioneer })} className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm text-ink">
              <option value="none">{draft.gender === 'feminino' ? 'Não é pioneira' : 'Não é pioneiro'}</option>
              <option value="auxiliary">{draft.gender === 'feminino' ? 'Pioneira auxiliar' : 'Pioneiro auxiliar'}</option>
              <option value="regular">{draft.gender === 'feminino' ? 'Pioneira regular' : 'Pioneiro regular'}</option>
              <option value="special">{draft.gender === 'feminino' ? 'Pioneira especial' : 'Pioneiro especial'}</option>
            </select>
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-xl border border-line px-3 text-sm">Cancelar</button>
          <button type="submit" disabled={busy} className="h-10 rounded-xl bg-indigo px-4 text-sm font-medium text-white disabled:opacity-50">{busy ? 'Salvando…' : 'Adicionar'}</button>
        </div>
      </form>
    </div>
  )
}
