import { useMemo, useState, type ReactNode } from 'react'
import { usePublisherCatalog } from './catalog'
import { useLocation, useNavigate } from 'react-router-dom'
import { BarChart3, Download, LayoutList, Plus, Search, Users } from 'lucide-react'
import {
  assignmentPrivileges,
  groupTones,
  mockGroups,
  type AssignmentDuty,
  type MockGroup,
  type MockPioneer,
  type MockPrivilege,
  type MockPublisher,
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
  const { publishers, addPublisher, updatePublisher } = usePublisherCatalog()
  const [name, setName] = useState('')
  const [groupId, setGroupId] = useState('')
  const [status, setStatus] = useState('')
  const [gender, setGender] = useState('')
  const [privilege, setPrivilege] = useState('')
  const [page, setPage] = useState(1)
  const [grouped, setGrouped] = useState(false)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<MockPublisher | null>(null)

  const filtered = useMemo(() => {
    const query = name.trim().toLocaleLowerCase('pt-BR')
    return publishers.filter((publisher) => {
      if (query && !publisher.name.toLocaleLowerCase('pt-BR').includes(query)) return false
      if (groupId === 'none' && publisher.groupId) return false
      if (groupId && groupId !== 'none' && publisher.groupId !== groupId) return false
      if (status && publisher.status !== status) return false
      if (gender && publisher.gender !== gender) return false
      if (privilege === 'auxiliary' && publisher.pioneer !== 'auxiliary') return false
      if (privilege === 'regular' && publisher.pioneer !== 'regular') return false
      if (assignmentPrivileges.some((item) => item.id === privilege) && !publisher.duties.includes(privilege as AssignmentDuty)) return false
      if (privilege && privilege !== 'auxiliary' && privilege !== 'regular' && !assignmentPrivileges.some((item) => item.id === privilege) && publisher.privilege !== privilege) return false
      return true
    })
  }, [publishers, name, groupId, status, gender, privilege])

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pages)
  const slice = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const from = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const to = Math.min(currentPage * pageSize, filtered.length)

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
      mockGroups.find((group) => group.id === publisher.groupId)?.name ?? 'Sem grupo',
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
    <div className="px-6 py-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-soft text-indigo">
            <Users size={22} />
          </span>
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight">Publicadores</h1>
            <p className="mt-1 text-sm text-muted">Gerencie os publicadores da congregação, seus grupos e informações.</p>
            <p className="mt-1 text-xs text-muted">Lista de exemplo, até os dados reais serem carregados.</p>
          </div>
        </div>
        <button type="button" onClick={() => setAdding(true)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo px-4 text-sm font-medium text-white">
          <Plus size={16} />
          Adicionar publicador
        </button>
      </div>

      <div className="mt-5 flex gap-1 border-b border-line">
        <TabLink active={tab === 'lista'} onClick={() => navigate('/publicadores')} icon={<LayoutList size={16} />} label="Lista" />
        <TabLink active={tab === 'grupos'} onClick={() => navigate('/publicadores/grupos')} icon={<Users size={16} />} label="Grupos" />
        <TabLink active={tab === 'estatisticas'} onClick={() => navigate('/publicadores/estatisticas')} icon={<BarChart3 size={16} />} label="Estatísticas" />
      </div>

      {tab === 'lista' ? (
        <section className="mt-4 rounded-2xl border border-line bg-white">
          <div className="flex flex-wrap items-center gap-2 px-4 py-3">
            <label className="relative min-w-56 flex-1">
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
              {mockGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
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
              <option value="publisher">Publicador</option>
              <option value="ministerialServant">Servo ministerial</option>
              <option value="elder">Ancião</option>
              <option value="auxiliary">Pioneiro auxiliar</option>
              <option value="regular">Pioneiro regular</option>
              {assignmentPrivileges.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
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
                    <PublisherTable publishers={people} onEdit={setEditing} />
                  </section>
                )
              })}
              {assignmentPrivileges.map((section) => {
                const people = filtered.filter((publisher) => publisher.duties.includes(section.id))
                if (people.length === 0) return null
                return (
                  <section key={section.id} className="border-t border-line">
                    <h2 className="bg-[#F8FAFC] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
                      {section.label}
                      <span className="ml-2 font-medium normal-case tracking-normal">{people.length}</span>
                    </h2>
                    <PublisherTable publishers={people} onEdit={setEditing} />
                  </section>
                )
              })}
              {filtered.length === 0 ? <p className="border-t border-line px-4 py-8 text-sm text-muted">Nenhum publicador encontrado.</p> : null}
            </div>
          ) : (
            <>
              <PublisherTable publishers={slice} onEdit={setEditing} />
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
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {mockGroups.map((group) => {
              const members = publishers.filter((publisher) => publisher.groupId === group.id)
              const superintendent = members.find((publisher) => publisher.privilege === 'elder') ?? members[0]
              const tone = groupTones[group.tone]
              const shown = members.slice(0, 4)
              return (
                <article key={group.id} className="relative overflow-hidden rounded-2xl border border-line bg-white p-4 pl-5">
                  <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: tone.text }} />
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold">{group.name}</h2>
                    <span className="text-xs font-medium text-muted">{members.length} publicadores</span>
                  </div>
                  {superintendent ? (
                    <div className="mt-4 flex items-center gap-2">
                      <Avatar name={superintendent.name} />
                      <span>
                        <span className="block text-[11px] uppercase tracking-wide text-muted">Superintendente de grupo</span>
                        <span className="text-sm font-medium">{superintendent.name}</span>
                      </span>
                    </div>
                  ) : null}
                  <div className="mt-4 flex items-center">
                    {shown.map((member, index) => (
                      <span key={member.id} className="-ml-1 first:ml-0" style={{ zIndex: shown.length - index }}>
                        <Avatar name={member.name} />
                      </span>
                    ))}
                    {members.length > shown.length ? <span className="ml-2 text-xs text-muted">+{members.length - shown.length}</span> : null}
                  </div>
                  <button type="button" onClick={() => openGroup(group.id)} className="mt-4 text-sm font-medium text-indigo">
                    Ver publicadores →
                  </button>
                </article>
              )
            })}
          </div>
        </section>
      ) : null}

      {tab === 'estatisticas' ? <Statistics publishers={publishers} /> : null}
      {adding ? <AddPublisher onClose={() => setAdding(false)} onAdd={(publisher) => { addPublisher(publisher); setAdding(false); setPage(1) }} /> : null}
      {editing ? (
        <EditPrivileges
          publisher={editing}
          onClose={() => setEditing(null)}
          onSave={(privilege, pioneer, duties) => {
            updatePublisher(editing.id, { privilege, pioneer, duties })
            setEditing(null)
          }}
        />
      ) : null}
    </div>
  )
}

function PublisherTable({ publishers, onEdit }: { publishers: MockPublisher[]; onEdit: (publisher: MockPublisher) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="text-[11px] uppercase tracking-wide text-muted">
          <tr className="border-t border-line">
            <th className="px-4 py-3">Nome</th>
            <th className="px-3 py-3">Grupo</th>
            <th className="px-3 py-3">Gênero</th>
            <th className="px-3 py-3">Status</th>
            <th className="px-3 py-3">Privilégios</th>
            <th className="px-3 py-3">Telefone</th>
            <th className="px-3 py-3">Ações</th>
          </tr>
        </thead>
        <tbody>
          {publishers.length === 0 ? (
            <tr className="border-t border-line">
              <td colSpan={7} className="px-4 py-8 text-muted">Nenhum publicador encontrado.</td>
            </tr>
          ) : publishers.map((publisher) => {
            const group = mockGroups.find((item) => item.id === publisher.groupId)
            return (
              <tr key={publisher.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <span className="flex items-center gap-3">
                    <Avatar name={publisher.name} />
                    <span>
                      <span className="block font-medium">{publisher.name}</span>
                      <span className="text-xs text-muted">{publisher.age} anos</span>
                    </span>
                  </span>
                </td>
                <td className="px-3 py-3">{group ? <GroupChip group={group} /> : <span className="text-muted">Sem grupo</span>}</td>
                <td className="px-3 py-3">{publisher.gender === 'feminino' ? 'Feminino' : 'Masculino'}</td>
                <td className="px-3 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${publisher.status === 'active' ? 'bg-[#ECFDF5] text-[#047857]' : 'bg-[#F1F5F9] text-[#64748B]'}`}>
                    {publisher.status === 'active' ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <span className="block">{privilegeLabel(publisher)}</span>
                  {publisher.duties.length > 0 ? (
                    <span className="mt-1 flex flex-wrap gap-1">
                      {publisher.duties.map((duty) => (
                        <span key={duty} className="rounded-full bg-indigo-soft px-2 py-0.5 text-[11px] font-medium text-indigo">
                          {assignmentPrivileges.find((item) => item.id === duty)?.label}
                        </span>
                      ))}
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-3 text-muted">{publisher.phone}</td>
                <td className="px-3 py-3">
                  <button type="button" onClick={() => onEdit(publisher)} className="text-sm font-medium text-indigo">Editar</button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function EditPrivileges({
  publisher,
  onClose,
  onSave,
}: {
  publisher: MockPublisher
  onClose: () => void
  onSave: (privilege: MockPrivilege, pioneer: MockPioneer, duties: AssignmentDuty[]) => void
}) {
  const [privilege, setPrivilege] = useState(publisher.privilege)
  const [pioneer, setPioneer] = useState(publisher.pioneer)
  const [duties, setDuties] = useState<AssignmentDuty[]>(publisher.duties)
  function toggle(duty: AssignmentDuty) {
    setDuties((current) => current.includes(duty) ? current.filter((item) => item !== duty) : [...current, duty])
  }
  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-[#0B0E14]/40 p-4" onClick={onClose}>
      <form
        className="w-full max-w-md rounded-2xl bg-white p-5"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault()
          onSave(privilege, pioneer, duties)
        }}
      >
        <h2 className="text-lg font-semibold">Privilégios</h2>
        <p className="mt-1 text-sm text-muted">{publisher.name}</p>
        <label className="mt-4 block text-xs text-muted">Privilégio congregacional
          <select value={privilege} onChange={(event) => setPrivilege(event.target.value as MockPrivilege)} className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm text-ink">
            <option value="publisher">{publisher.gender === 'feminino' ? 'Publicadora' : 'Publicador'}</option>
            <option value="ministerialServant">{publisher.gender === 'feminino' ? 'Serva ministerial' : 'Servo ministerial'}</option>
            <option value="elder">{publisher.gender === 'feminino' ? 'Anciã' : 'Ancião'}</option>
          </select>
        </label>
        <label className="mt-3 block text-xs text-muted">Pioneiro
          <select value={pioneer} onChange={(event) => setPioneer(event.target.value as MockPioneer)} className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm text-ink">
            <option value="none">Não é pioneiro</option>
            <option value="auxiliary">{publisher.gender === 'feminino' ? 'Pioneira auxiliar' : 'Pioneiro auxiliar'}</option>
            <option value="regular">{publisher.gender === 'feminino' ? 'Pioneira regular' : 'Pioneiro regular'}</option>
          </select>
        </label>
        <fieldset className="mt-4">
          <legend className="text-xs text-muted">Designações</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {assignmentPrivileges.map((item) => (
              <label key={item.id} className="flex items-center gap-2 rounded-lg border border-line px-2 py-2 text-sm text-ink">
                <input type="checkbox" checked={duties.includes(item.id)} onChange={() => toggle(item.id)} />
                {item.label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-xl border border-line px-3 text-sm">Cancelar</button>
          <button type="submit" className="h-10 rounded-xl bg-indigo px-4 text-sm font-medium text-white">Salvar</button>
        </div>
      </form>
    </div>
  )
}

function Statistics({ publishers }: { publishers: MockPublisher[] }) {
  const active = publishers.filter((publisher) => publisher.status === 'active').length
  const women = publishers.filter((publisher) => publisher.gender === 'feminino').length
  const unassigned = publishers.filter((publisher) => !publisher.groupId).length
  return (
    <section className="mt-4 grid gap-3 sm:grid-cols-3">
      <Stat label="Publicadores" value={String(publishers.length)} />
      <Stat label="Ativos" value={String(active)} />
      <Stat label="Sem grupo" value={String(unassigned)} />
      <Stat label="Irmãs" value={String(women)} />
      <Stat label="Irmãos" value={String(publishers.length - women)} />
      <Stat label="Grupos" value={String(mockGroups.length)} />
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

function AddPublisher({ onClose, onAdd }: { onClose: () => void; onAdd: (publisher: MockPublisher) => void }) {
  const [draft, setDraft] = useState<MockPublisher>({
    id: '',
    name: '',
    age: 30,
    gender: 'masculino',
    status: 'active',
    privilege: 'publisher',
    pioneer: 'none',
    duties: [],
    phone: '',
    groupId: 'grupo-1',
  })
  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-[#0B0E14]/40 p-4" onClick={onClose}>
      <form
        className="w-full max-w-md rounded-2xl bg-white p-5"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault()
          if (!draft.name.trim()) return
          onAdd({ ...draft, id: `local-${Date.now()}`, name: draft.name.trim() })
        }}
      >
        <h2 className="text-lg font-semibold">Adicionar publicador</h2>
        <p className="mt-1 text-sm text-muted">Este cadastro fica só nesta sessão.</p>
        <label className="mt-4 block text-xs text-muted">Nome
          <input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm text-ink" />
        </label>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="text-xs text-muted">Idade
            <input type="number" min={1} value={draft.age} onChange={(event) => setDraft({ ...draft, age: Number(event.target.value) })} className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm text-ink" />
          </label>
          <label className="text-xs text-muted">Telefone
            <input value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm text-ink" />
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-xl border border-line px-3 text-sm">Cancelar</button>
          <button type="submit" className="h-10 rounded-xl bg-indigo px-4 text-sm font-medium text-white">Adicionar</button>
        </div>
      </form>
    </div>
  )
}
