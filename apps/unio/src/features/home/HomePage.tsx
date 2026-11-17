import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { CalendarDays, ChevronRight, Mic, Sparkles, Users, UsersRound } from 'lucide-react'
import { useAccount } from '../../auth'
import { db } from '../../firebase'
import { kindMeta, parseIso, statusLabel, weekdayLong, type CongregationMeeting } from '../../domain'
import { useMeetings } from '../../store'
import { usePublisherCatalog } from '../publishers/catalog'
import { listSchedules } from '../elderly-support/api'
import {
  audioInWeek,
  cleaningInWeek,
  elderlyInWeek,
  firstName,
  greeting,
  isoFromDate,
  publisherSummary,
  shortMark,
  statusTone,
  upcomingMeetings,
  weekBounds,
  type CareAssignment,
} from './summary'

const shortcuts = [
  { to: '/designacoes/reunioes', label: 'Reuniões', hint: 'Ver programação', icon: CalendarDays, className: 'bg-[#EEF2FF] text-indigo' },
  { to: '/publicadores', label: 'Publicadores', hint: 'Gerenciar cadastro', icon: Users, className: 'bg-[#E0F2FE] text-[#0369A1]' },
  { to: '/publicadores/grupos', label: 'Grupos', hint: 'Ver grupos', icon: UsersRound, className: 'bg-[#ECFDF5] text-[#047857]' },
  { to: '/designacoes/idosos', label: 'Suporte a idosos', hint: 'Ver escala', icon: Users, className: 'bg-[#FEF3E2] text-[#B45309]' },
  { to: '/designacoes/audio-video', label: 'Áudio e vídeo', hint: 'Ver escala', icon: Mic, className: 'bg-[#FDE8EF] text-[#9F1239]' },
  { to: '/designacoes/limpeza', label: 'Limpeza', hint: 'Ver escala', icon: Sparkles, className: 'bg-[#F5F3FF] text-[#6D28D9]' },
]

export function HomePage() {
  const account = useAccount()
  const navigate = useNavigate()
  const { meetings, congregation, select, setKind, setMonth } = useMeetings()
  const catalog = usePublisherCatalog()
  const today = new Date()
  const todayIso = isoFromDate(today)
  const week = weekBounds(today)
  const next = upcomingMeetings(meetings, todayIso)
  const counts = publisherSummary(catalog.publishers, catalog.groups.length)
  const boards = useWeekBoards(account?.congregationId ?? null, week.from, week.to)
  const cleaning = cleaningInWeek(meetings, boards.people, week.from, week.to)
  const dateLine = `${weekdayLong(todayIso)}, ${parseIso(todayIso).getDate()} de ${new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(today)} de ${today.getFullYear()}`

  function openMeeting(meeting: CongregationMeeting) {
    setKind(meeting.kind)
    setMonth(meeting.isoDate.slice(0, 7))
    select(meeting.id)
    navigate('/designacoes/reunioes')
  }

  return (
    <div className="px-6 py-6 lg:px-8">
      <p className="text-sm text-muted">{dateLine}</p>
      <h1 className="mt-1 text-[32px] font-semibold tracking-tight">
        {greeting(today.getHours())}, {firstName(account?.name ?? '')}!
      </h1>
      <p className="mt-1 text-sm text-muted">
        {congregation.name}
        {congregation.place ? ` · ${congregation.place}` : ''}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {shortcuts.map((item) => (
          <button key={item.to} type="button" onClick={() => navigate(item.to)} className={`rounded-2xl px-4 py-4 text-left ${item.className}`}>
            <item.icon size={18} />
            <span className="mt-3 block text-sm font-semibold">{item.label}</span>
            <span className="mt-1 flex items-center gap-1 text-xs opacity-80">{item.hint} <ChevronRight size={12} /></span>
          </button>
        ))}
      </div>

      <div className="mt-6 grid items-start gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-line bg-white">
          <header className="flex items-center justify-between px-5 py-4">
            <h2 className="text-sm font-semibold">Próximas reuniões</h2>
            <button type="button" onClick={() => navigate('/designacoes/reunioes')} className="text-sm font-medium text-indigo">Ver todas</button>
          </header>
          {next.length === 0 ? (
            <p className="border-t border-line px-5 py-8 text-sm text-muted">Nenhuma reunião cadastrada a partir de hoje.</p>
          ) : next.map((meeting) => {
            const date = parseIso(meeting.isoDate)
            return (
              <button key={meeting.id} type="button" onClick={() => openMeeting(meeting)} className="flex w-full items-center gap-3 border-t border-line px-5 py-3 text-left">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#FDE8EF] text-center text-[#9F1239]">
                  <span className="text-sm font-semibold leading-none">{date.getDate()}</span>
                  <span className="text-[10px] uppercase">{date.toLocaleString('pt-BR', { month: 'short' }).replace('.', '')}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{weekdayLong(meeting.isoDate)}</span>
                  <span className="block truncate text-xs text-muted">{kindMeta[meeting.kind].meetingLabel} · {meeting.time}</span>
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusTone(meeting.status)}`}>{statusLabel[meeting.status]}</span>
                <ChevronRight size={16} className="text-muted" />
              </button>
            )
          })}
        </section>

        <section className="rounded-2xl border border-line bg-white">
          <header className="flex items-center justify-between px-5 py-4">
            <h2 className="text-sm font-semibold">Escalas da semana</h2>
          </header>
          <BoardLine title="Áudio e vídeo" loading={boards.loading} error={boards.error} date={boards.audio?.iso} empty="Nenhuma designação de áudio e vídeo nesta semana." marks={boards.audio?.names.map(shortMark) ?? []} onOpen={() => navigate('/designacoes/audio-video')} />
          <BoardLine title="Suporte a idosos" loading={boards.loading} error={boards.error} date={boards.elderly?.date} empty="Nenhuma escala de idosos nesta semana." marks={(boards.elderly ? [boards.elderly.elderlyName, boards.elderly.driverName] : []).map(shortMark).filter(Boolean)} onOpen={() => navigate('/designacoes/idosos')} />
          <BoardLine title="Limpeza" loading={boards.loading} error={boards.error} date={cleaning?.iso} empty="Nenhum responsável de limpeza nesta semana." marks={cleaning ? [cleaning.name] : []} onOpen={() => navigate('/designacoes/limpeza')} />
        </section>

        <section className="rounded-2xl border border-line bg-white">
          <header className="flex items-center justify-between px-5 py-4">
            <h2 className="text-sm font-semibold">Publicadores</h2>
            <button type="button" onClick={() => navigate('/publicadores')} className="text-sm font-medium text-indigo">Ver todos</button>
          </header>
          {catalog.error ? <p className="border-t border-line px-5 py-8 text-sm text-[#9F1239]">{catalog.error}</p> : !catalog.ready ? <p className="border-t border-line px-5 py-8 text-sm text-muted">Carregando publicadores…</p> : (
            <div className="grid grid-cols-2 gap-3 border-t border-line p-5">
              <Count label="Publicadores ativos" value={counts.active} className="bg-[#E0F2FE] text-[#0369A1]" onClick={() => navigate('/publicadores')} />
              <Count label="Grupos" value={counts.groups} className="bg-[#F5F3FF] text-[#6D28D9]" onClick={() => navigate('/publicadores/grupos')} />
              <Count label="Anciãos e servos" value={counts.privileged} className="bg-[#ECFDF5] text-[#047857]" onClick={() => navigate('/publicadores')} />
              <Count label="Pioneiros" value={counts.pioneers} className="bg-[#FEF3E2] text-[#B45309]" onClick={() => navigate('/publicadores')} />
            </div>
          )}
        </section>

        <section className="grid gap-4">
          <article className="rounded-2xl border border-line bg-white px-5 py-4">
            <h2 className="text-sm font-semibold">Relatórios de campo</h2>
            <p className="mt-3 text-sm text-muted">O relatório mensal de serviço de campo ainda não é registrado aqui. Os totais não são calculados para não misturar com as sessões de território.</p>
          </article>
          <article className="rounded-2xl border border-line bg-white px-5 py-4">
            <h2 className="text-sm font-semibold">Atividades recentes</h2>
            <p className="mt-3 text-sm text-muted">Não há um histórico de ações gravado. As publicações aparecem nas próprias telas de reunião, idosos, áudio e limpeza.</p>
          </article>
        </section>
      </div>
    </div>
  )
}

function BoardLine({
  title,
  date,
  marks,
  empty,
  loading,
  error,
  onOpen,
}: {
  title: string
  date?: string
  marks: string[]
  empty: string
  loading: boolean
  error: string
  onOpen: () => void
}) {
  return (
    <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 border-t border-line px-5 py-3 text-left">
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-muted">
          {loading ? 'Carregando…' : error ? error : date ? `${weekdayLong(date)}, ${parseIso(date).getDate()}/${parseIso(date).getMonth() + 1}` : empty}
        </span>
      </span>
      <span className="flex gap-1">
        {marks.slice(0, 3).map((mark, index) => (
          <span key={`${mark}-${index}`} className="grid h-7 min-w-7 place-items-center rounded-full bg-indigo-soft px-1 text-[11px] font-semibold text-indigo">{mark}</span>
        ))}
      </span>
      <ChevronRight size={16} className="text-muted" />
    </button>
  )
}

function Count({ label, value, className, onClick }: { label: string; value: number; className: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-2xl px-4 py-4 text-left ${className}`}>
      <span className="block text-2xl font-semibold">{value}</span>
      <span className="mt-1 block text-xs">{label}</span>
    </button>
  )
}

function useWeekBoards(congregationId: string | null, from: string, to: string) {
  const [audio, setAudio] = useState<{ iso: string; names: string[] } | null>(null)
  const [elderly, setElderly] = useState<CareAssignment | null>(null)
  const [people, setPeople] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!congregationId) {
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    setError('')
    Promise.all([
      getDocs(query(collection(db, 'audioVideoRosters'), where('congregationId', '==', congregationId))),
      getDoc(doc(db, 'cleaningAssignments', congregationId)),
      listSchedules({ from, to }),
    ])
      .then(([rosters, cleaningDoc, schedules]) => {
        if (!active) return
        const months = rosters.docs.map((item) => {
          const data = item.data()
          const rows = Array.isArray(data.rows)
            ? data.rows.map((row) => {
                const record = row as Record<string, unknown>
                const names = (value: unknown) => Array.isArray(value) ? value.map(String) : []
                return { day: Number(record.day), attendants: names(record.attendants), microphones: names(record.microphones), sound: names(record.sound) }
              })
            : []
          return { year: Number(data.year), month: Number(data.month), rows }
        })
        setAudio(audioInWeek(months, from, to))
        const stored = cleaningDoc.data()?.people
        setPeople(stored && typeof stored === 'object' ? stored as Record<string, string> : {})
        setElderly(elderlyInWeek(schedules.flatMap((schedule) => schedule.assignments), from, to))
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setError('Não foi possível carregar as escalas.')
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [congregationId, from, to])

  return { audio, elderly, people, loading, error }
}
