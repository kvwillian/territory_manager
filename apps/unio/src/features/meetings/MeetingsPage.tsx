import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Gem,
  Leaf,
  MoreHorizontal,
  Pencil,
  Plus,
  Tv,
  UserRound,
  Users,
} from 'lucide-react'
import {
  dayLine,
  headingDate,
  kindMeta,
  monthTitle,
  shiftMonth,
  statusLabel,
  weekRangeLabel,
  type MeetingDuty,
  type MeetingSection,
  type MeetingStatus,
  type ProgramPart,
  type SectionToken,
} from '../../domain'
import { useMeetings } from '../../store'
import { useAccount } from '../../auth'
import { ImportFlow } from './ImportFlow'

const sectionMeta: Record<
  SectionToken,
  { header: string; accent: string; icon: typeof Gem }
> = {
  treasures: {  header: 'bg-[#E8EDF4]', accent: 'text-[#475569]', icon: Gem },
  ministry: { header: 'bg-[#FEF3E2]', accent: 'text-[#B45309]', icon: Leaf },
  christianLife: { header: 'bg-[#FDE8EF]', accent: 'text-[#9F1239]', icon: Users },
  neutral: {  header: 'bg-[#F8FAFC]', accent: 'text-indigo', icon: BookOpen },
}

const statusClass: Record<MeetingStatus, string> = {
  published: 'bg-[#ECFDF5] text-[#047857]',
  draft: 'bg-[#FEF3C7] text-[#B45309]',
  notStarted: 'bg-[#F1F5F9] text-[#64748B]',
  completed: 'bg-indigo-soft text-[#4338CA]',
}

const dutyIcons: Record<string, typeof UserRound> = {
  Presidente: UserRound,
  'Oração final': BookOpen,
  'Oração inicial': BookOpen,
  Indicadores: Users,
  Volantes: BookOpen,
  'Áudio e Vídeo': Tv,
}

function matchesQuery(text: string, query: string) {
  return text.toLocaleLowerCase('pt-BR').includes(query.trim().toLocaleLowerCase('pt-BR'))
}

export function MeetingsPage() {
  const store = useMeetings()
  const account = useAccount()
  const meeting = store.selected
  const meta = kindMeta[store.kind]
  const [menuOpen, setMenuOpen] = useState(false)
  const [kindOpen, setKindOpen] = useState(false)
  const [importing, setImporting] = useState(false)

  return (
    <div className="px-6 py-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">{meta.title}</h1>
          <p className="mt-1 text-sm text-muted">{meta.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {account?.role === 'admin' ? (
            <button
              type="button"
              onClick={() => setImporting(true)}
              className="h-11 rounded-xl border border-line bg-white px-3 text-sm font-medium"
            >
              Importar programação
            </button>
          ) : null}
          <div className="flex h-11 items-center rounded-xl border border-line bg-white">
            <button
              type="button"
              className="grid h-11 w-10 place-items-center text-muted hover:text-ink"
              aria-label="Mês anterior"
              onClick={() => store.setMonth(shiftMonth(store.month, -1))}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="min-w-36 text-center text-sm font-medium">{monthTitle(store.month)}</span>
            <button
              type="button"
              className="grid h-11 w-10 place-items-center text-muted hover:text-ink"
              aria-label="Próximo mês"
              onClick={() => store.setMonth(shiftMonth(store.month, 1))}
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <Popover open={kindOpen} onClose={() => setKindOpen(false)}>
            <button
              type="button"
              onClick={() => setKindOpen((open) => !open)}
              className="flex h-11 items-center gap-2 rounded-xl border border-line bg-white px-3 text-sm font-medium"
            >
              {store.kind === 'midweek' ? 'Meio de semana' : 'Fim de semana'}
              <ChevronDown size={16} className="text-muted" />
            </button>
            {kindOpen ? (
              <div className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-line bg-white p-1 shadow-sm">
                <MenuItem
                  active={store.kind === 'midweek'}
                  onClick={() => {
                    store.setKind('midweek')
                    setKindOpen(false)
                  }}
                >
                  Meio de semana
                </MenuItem>
                <MenuItem
                  active={store.kind === 'weekend'}
                  onClick={() => {
                    store.setKind('weekend')
                    setKindOpen(false)
                  }}
                >
                  Fim de semana
                </MenuItem>
              </div>
            ) : null}
          </Popover>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {store.visible.map((item) => {
          const active = item.id === meeting?.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => store.select(item.id)}
              className={`rounded-2xl border px-4 py-3 text-left ${
                active ? 'border-indigo bg-[#F5F7FF] ring-1 ring-indigo' : 'border-line bg-white hover:border-[#C7D2FE]'
              }`}
            >
              <span className="block text-sm font-semibold">{weekRangeLabel(item.isoDate)}</span>
              <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusClass[item.status]}`}>
                {statusLabel[item.status]}
              </span>
              <span className="mt-3 block text-xs text-muted">{dayLine(item.isoDate, meta.dayShort)}</span>
            </button>
          )
        })}
        <button
          type="button"
          onClick={store.addWeek}
          className="grid min-h-28 place-items-center rounded-2xl border border-dashed border-[#D5D9E6] bg-white text-sm font-medium text-[#475569] hover:border-indigo hover:text-indigo"
        >
          <span className="flex flex-col items-center gap-1">
            <Plus size={18} />
            Nova semana
          </span>
        </button>
      </div>

      {meeting ? (
        <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-2xl border border-line bg-white">
            <header className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">{headingDate(meeting.isoDate, meta.dayLong)}</h2>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass[meeting.status]}`}>
                    {statusLabel[meeting.status]}
                  </span>
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays size={14} />
                    {meta.meetingLabel}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock size={14} />
                    {meeting.time}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Popover open={menuOpen} onClose={() => setMenuOpen(false)}>
                  <button
                    type="button"
                    aria-label="Mais ações da reunião"
                    onClick={() => setMenuOpen((open) => !open)}
                    className="grid h-10 w-10 place-items-center rounded-xl border border-line text-muted hover:bg-[#F8FAFC]"
                  >
                    <MoreHorizontal size={18} />
                  </button>
                  {menuOpen ? (
                    <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-line bg-white p-1 text-sm shadow-sm">
                      {meeting.status !== 'published' ? (
                        <MenuItem
                          onClick={() => {
                            store.setStatus('published')
                            store.setEditing(false)
                            setMenuOpen(false)
                          }}
                        >
                          Publicar
                        </MenuItem>
                      ) : null}
                      {meeting.status === 'published' ? (
                        <MenuItem
                          onClick={() => {
                            store.setStatus('completed')
                            setMenuOpen(false)
                          }}
                        >
                          Marcar como concluída
                        </MenuItem>
                      ) : null}
                      {meeting.status !== 'draft' ? (
                        <MenuItem
                          onClick={() => {
                            store.setStatus('draft')
                            setMenuOpen(false)
                          }}
                        >
                          Voltar para rascunho
                        </MenuItem>
                      ) : null}
                    </div>
                  ) : null}
                </Popover>
                {meeting.status === 'notStarted' && !store.editing ? (
                  <button
                    type="button"
                    onClick={store.startMeeting}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-white px-3 text-sm font-medium hover:bg-[#F8FAFC]"
                  >
                    <Pencil size={15} />
                    Iniciar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => store.setEditing(!store.editing)}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-white px-3 text-sm font-medium hover:bg-[#F8FAFC]"
                  >
                    <Pencil size={15} />
                    {store.editing ? 'Concluir' : 'Editar'}
                  </button>
                )}
              </div>
            </header>
            <div className="space-y-3 px-4 pb-4">
              {meeting.sections.map((section) => (
                <SectionBlock
                  key={section.id}
                  section={section}
                  startAt={partOffset(meeting.sections, section.id)}
                />
              ))}
            </div>
          </section>
          <aside className="space-y-4">
            <DutyCard duties={meeting.duties} />
            <NotesCard />
          </aside>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-line bg-white px-6 py-10 text-sm text-muted">
          Nenhuma reunião neste mês. Use Nova semana para abrir a próxima designação.
        </div>
      )}
      {importing ? (
        <ImportFlow onClose={() => setImporting(false)} onSaved={store.upsertImportedMeeting} />
      ) : null}
    </div>
  )
}

function partOffset(sections: MeetingSection[], sectionId: string) {
  let count = 1
  for (const section of sections) {
    if (section.id === sectionId) return count
    count += section.parts.length
  }
  return 1
}

function SectionBlock({ section, startAt }: { section: MeetingSection; startAt: number }) {
  const store = useMeetings()
  const meta = sectionMeta[section.token]
  const Icon = meta.icon
  const closed = store.closedSections.includes(section.id)
  const query = store.query.trim()
  const parts = section.parts.filter((item) => {
    if (!query) return true
    const people = item.roles.map((itemRole) => itemRole.personName).join(' ')
    return matchesQuery(`${item.title} ${people}`, query)
  })
  if (query && parts.length === 0) return null

  return (
    <article className="overflow-hidden rounded-xl border border-line">
      <button
        type="button"
        className={`flex w-full items-center gap-3 px-4 py-3 text-left ${meta.header}`}
        onClick={() => store.toggleSection(section.id)}
        aria-expanded={!closed}
      >
        <Icon size={16} className={meta.accent} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">
            {section.token === 'neutral' ? section.title : `${sectionOrder(section.token)}. ${section.title}`}
          </span>
          <span className="block text-xs text-muted">
            {section.parts.length} {section.parts.length === 1 ? 'parte' : 'partes'}
          </span>
        </span>
        <ChevronDown size={16} className={`text-muted transition ${closed ? '-rotate-90' : ''}`} />
      </button>
      {closed ? null : (
        <div>
          {parts.map((item) => (
            <PartRow key={item.id} sectionId={section.id} part={item} number={startAt + section.parts.indexOf(item)} />
          ))}
          {store.editing ? (
            <button
              type="button"
              onClick={() => store.addPart(section.id)}
              className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-indigo hover:bg-[#F8FAFC]"
            >
              <Plus size={15} />
              Adicionar parte
            </button>
          ) : null}
        </div>
      )}
    </article>
  )
}

function sectionOrder(token: SectionToken) {
  if (token === 'treasures') return 1
  if (token === 'ministry') return 2
  if (token === 'christianLife') return 3
  return 1
}

function PartRow({ sectionId, part, number }: { sectionId: string; part: ProgramPart; number: number }) {
  const store = useMeetings()
  const [open, setOpen] = useState(false)
  const canRemove = !part.structural && !part.pinned
  const names = part.roles.map((itemRole) => itemRole.personName.trim()).filter(Boolean)

  return (
    <div className="grid grid-cols-[28px_minmax(0,1fr)_minmax(160px,280px)_auto] items-center gap-3 border-t border-line px-4 py-3">
      <span className="text-sm text-muted">{number}.</span>
      <div className="min-w-0">
        {store.editing ? (
          <input
            value={part.title}
            onChange={(event) => store.updatePart(sectionId, part.id, { title: event.target.value })}
            className="h-8 w-full rounded-lg border border-line bg-white px-2 text-sm outline-none focus:border-indigo"
            aria-label={`Título da parte ${number}`}
          />
        ) : (
          <p className="truncate text-sm font-medium">{part.title || 'Sem título'}</p>
        )}
        {part.hint ? <p className="mt-0.5 text-xs text-muted">{part.hint}</p> : null}
      </div>
      <div className="min-w-0">
        {store.editing ? (
          <div className="space-y-1">
            {part.roles.map((itemRole) => (
              <input
                key={itemRole.id}
                value={itemRole.personName}
                onChange={(event) => store.updatePartPerson(sectionId, part.id, itemRole.id, event.target.value)}
                placeholder={itemRole.showLabel ? itemRole.label : 'Nome do publicador'}
                aria-label={`${itemRole.label} da parte ${number}`}
                className="h-8 w-full rounded-lg border border-line px-2 text-sm outline-none focus:border-indigo"
              />
            ))}
          </div>
        ) : part.roles.some((itemRole) => itemRole.showLabel) ? (
          <div className="text-sm text-muted">
            {part.roles.map((itemRole) => (
              <p key={itemRole.id}>
                {itemRole.label}: {itemRole.personName || 'A designar'}
              </p>
            ))}
          </div>
        ) : (
          <p className="flex items-center gap-1.5 truncate text-sm text-muted">
            <UserRound size={14} className="shrink-0" />
            <span className="truncate">{names.length > 0 ? names.join(', ') : 'A designar'}</span>
          </p>
        )}
      </div>
      <div className="flex items-center gap-1">
        {store.editing ? (
          <input
            type="number"
            min={1}
            max={60}
            value={part.durationMinutes}
            onChange={(event) =>
              store.updatePart(sectionId, part.id, { durationMinutes: Number(event.target.value) || 1 })
            }
            className="h-8 w-16 rounded-lg border border-line px-2 text-right text-sm outline-none focus:border-indigo"
            aria-label={`Duração da parte ${number} em minutos`}
          />
        ) : (
          <span className="text-sm text-muted">{part.durationMinutes} min</span>
        )}
        <Popover open={open} onClose={() => setOpen(false)}>
          <button
            type="button"
            aria-label={`Ações da parte ${number}`}
            onClick={() => setOpen((current) => !current)}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-[#F3F5FB]"
          >
            <MoreHorizontal size={16} />
          </button>
          {open ? (
            <div className="absolute right-0 z-20 mt-1 w-44 rounded-xl border border-line bg-white p-1 text-sm shadow-sm">
              {store.editing && canRemove ? (
                <MenuItem
                  onClick={() => {
                    store.removePart(sectionId, part.id)
                    setOpen(false)
                  }}
                >
                  Remover parte
                </MenuItem>
              ) : (
                <MenuItem
                  onClick={() => {
                    store.setEditing(true)
                    setOpen(false)
                  }}
                >
                  Editar parte
                </MenuItem>
              )}
            </div>
          ) : null}
        </Popover>
      </div>
    </div>
  )
}

function DutyCard({ duties }: { duties: MeetingDuty[] }) {
  const store = useMeetings()
  const query = store.query.trim()
  const visible = duties.filter((duty) => {
    if (!query) return true
    return matchesQuery(`${duty.label} ${duty.people.join(' ')}`, query)
  })
  if (query && visible.length === 0) return null

  return (
    <section className="rounded-2xl border border-line bg-white">
      <h2 className="border-b border-line px-4 py-3 text-sm font-semibold">Funções da reunião</h2>
      <ul>
        {visible.map((duty) => {
          const Icon = dutyIcons[duty.label] ?? UserRound
          const names = duty.people.map((person) => person.trim()).filter(Boolean)
          return (
            <li key={duty.id} className="flex items-start gap-3 border-b border-line px-4 py-3 last:border-b-0">
              <span className="mt-0.5 text-muted">
                <Icon size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted">{duty.label}</p>
                {store.editing ? (
                  <div className="mt-1 space-y-1">
                    {duty.people.map((person, index) => (
                      <input
                        key={`${duty.id}-${index}`}
                        value={person}
                        onChange={(event) => store.updateDutyPerson(duty.id, index, event.target.value)}
                        placeholder="Nome do publicador"
                        className="h-8 w-full rounded-lg border border-line px-2 text-sm outline-none focus:border-indigo"
                        aria-label={`${duty.label} ${index + 1}`}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-medium">{names.length > 0 ? names.join(', ') : 'A designar'}</p>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function NotesCard() {
  const store = useMeetings()
  const meeting = store.selected
  const [writing, setWriting] = useState(false)
  if (!meeting) return null
  const showEditor = writing || store.editing || meeting.notes.trim().length > 0

  return (
    <section className="rounded-2xl border border-line bg-white">
      <h2 className="border-b border-line px-4 py-3 text-sm font-semibold">Observações</h2>
      <div className="px-4 py-3">
        {showEditor ? (
          <textarea
            value={meeting.notes}
            onChange={(event) => store.setNotes(event.target.value)}
            onBlur={() => setWriting(false)}
            rows={4}
            placeholder="Escreva uma observação para esta reunião"
            className="w-full resize-none rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-indigo"
          />
        ) : (
          <>
            <p className="text-sm text-muted">Nenhuma observação para esta reunião.</p>
            <button
              type="button"
              onClick={() => setWriting(true)}
              className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl border border-line px-3 text-sm font-medium hover:bg-[#F8FAFC]"
            >
              <Plus size={15} />
              Adicionar observação
            </button>
          </>
        )}
      </div>
    </section>
  )
}

function Popover({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onPointer = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  return (
    <div ref={ref} className="relative">
      {children}
    </div>
  )
}

function MenuItem({
  children,
  onClick,
  active = false,
}: {
  children: ReactNode
  onClick: () => void
  active?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[#F3F5FB] ${active ? 'font-medium text-indigo' : ''}`}
    >
      {children}
    </button>
  )
}
