import { Fragment, useEffect, useRef, useState, type RefObject } from 'react'
import {
  CalendarDays,
  Car,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Info,
  Loader2,
  MoreHorizontal,
  Pencil,
  Upload,
  Users,
} from 'lucide-react'
import { meetingDatesInMonth, monthTitle, shiftMonth } from '../../domain'
import { useAccount } from '../../auth'
import { useMeetings } from '../../store'
import { usePublishers } from '../audio-video/publishers'
import {
  callErrorMessage,
  createSchedule,
  listSchedules,
  publishSchedule,
  unpublishSchedule,
  updateSchedule,
} from './api'
import { exportScheduleXlsx } from './exportSchedule'
import {
  assignPerson,
  blankRow,
  canManageElderlySupport,
  dayNumber,
  displayDate,
  ensureMeetingRows,
  groupByDate,
  inMonth,
  matchesQuery,
  missingNames,
  monthBounds,
  monthStats,
  rowsFromSchedule,
  toStoredAssignments,
  weekdayLabel,
  type AssignmentRow,
  type ElderlySchedule,
} from './model'
import { Avatar, PersonField } from './PersonField'

export function ElderlySupportPage() {
  const account = useAccount()
  const { meetings, query } = useMeetings()
  const allowed = account ? canManageElderlySupport(account) : false
  const { publishers, status: publisherStatus } = usePublishers(account?.congregationId ?? null)
  const [monthKey, setMonthKey] = useState(currentMonthKey)
  const [schedules, setSchedules] = useState<ElderlySchedule[]>([])
  const [schedule, setSchedule] = useState<ElderlySchedule | null>(null)
  const [rows, setRows] = useState<AssignmentRow[]>([])
  const [note, setNote] = useState('')
  const [editing, setEditing] = useState(false)
  const [snapshot, setSnapshot] = useState<{ rows: AssignmentRow[]; note: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [exportOpen, setExportOpen] = useState(false)
  const [hiddenDates, setHiddenDates] = useState<string[]>([])
  const keyRef = useRef(1)
  const exportMenu = useRef<HTMLDivElement>(null)
  useDismiss(exportOpen, exportMenu, () => setExportOpen(false))

  useEffect(() => {
    if (!account?.congregationId || !allowed) {
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    setError('')
    listSchedules(monthBounds(monthKey))
      .then((found) => {
        if (!active) return
        showSchedule(found[0] ?? null, found)
      })
      .catch((err: unknown) => {
        if (active) setError(callErrorMessage(err))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [account?.congregationId, allowed, monthKey])

  function showSchedule(current: ElderlySchedule | null, found: ElderlySchedule[]) {
    setSchedules(found)
    setSchedule(current)
    setRows(current ? rowsFromSchedule(current.assignments) : [])
    setNote(current?.note ?? '')
    setEditing(false)
    setSnapshot(null)
  }

  function nextKey() {
    keyRef.current += 1
    return `local-${keyRef.current}`
  }

  const meetingDates = meetingDatesInMonth(meetings, monthKey).filter((date) => !hiddenDates.includes(date))
  const monthRows = ensureMeetingRows(
    rows.filter((row) => meetingDates.includes(row.date)),
    meetingDates,
  )
  const namedRows = monthRows.filter((row) => row.elderlyName.trim())
  const stats = monthStats(namedRows)
  const groups = groupByDate(monthRows.filter((row) => matchesQuery(row, query)))

  function startEdit() {
    setSnapshot({ rows, note })
    setEditing(true)
    setError('')
    setNotice('')
  }

  function cancelEdit() {
    if (snapshot) {
      setRows(snapshot.rows)
      setNote(snapshot.note)
    }
    setEditing(false)
    setError('')
  }

  function chooseSchedule(id: string) {
    const next = schedules.find((item) => item.id === id) ?? null
    setSchedule(next)
    setRows(next ? rowsFromSchedule(next.assignments) : [])
    setNote(next?.note ?? '')
  }

  function updateRow(key: string, role: 'elderly' | 'driver', person: { name: string; publisherId?: string }) {
    setRows((current) => {
      const exists = current.some((row) => row.key === key)
      const source = monthRows.find((row) => row.key === key)
      const base = exists || !source ? current : [...current, source]
      return base.map((row) => (row.key === key ? assignPerson(row, role, person) : row))
    })
  }

  function moveGroup(from: string, to: string) {
    if (!to || to === from) return
    setRows((current) => current.map((row) => (row.date === from ? { ...row, date: to } : row)))
  }

  function addRow(date: string) {
    if (!date) return
    setRows((current) => [...current, blankRow(date, nextKey())])
  }

  async function save() {
    if (missingNames(monthRows.filter((row) => row.elderlyName.trim() || row.driverName.trim() || !row.key.startsWith('meeting-')))) {
      setError('Cada designação precisa do nome do idoso.')
      return false
    }
    const assignments = toStoredAssignments(rows)
    const trimmedNote = note.trim()
    const hasMonthAssignment = assignments.some((item) => inMonth(item.date, monthKey))
    if (!schedule && !hasMonthAssignment) {
      if (trimmedNote) setError('Adicione uma designação para guardar a observação.')
      else setEditing(false)
      return !trimmedNote
    }
    setBusy(true)
    setError('')
    try {
      const next = schedule
        ? await updateSchedule({ scheduleId: schedule.id, assignments, note: trimmedNote })
        : await createSchedule({
            title: `Suporte a idosos — ${monthTitle(monthKey)}`,
            note: trimmedNote,
            assignments,
          })
      setSchedule(next)
      setSchedules((current) => [next, ...current.filter((item) => item.id !== next.id)])
      setNote(next.note ?? '')
      return true
    } catch (err) {
      setError(callErrorMessage(err))
      return false
    } finally {
      setBusy(false)
    }
  }

  async function conclude() {
    const saved = await save()
    if (saved) setEditing(false)
  }

  async function toggleStatus() {
    if (!schedule) return
    setBusy(true)
    setError('')
    try {
      const next = schedule.status === 'published' ? await unpublishSchedule(schedule.id) : await publishSchedule(schedule.id)
      setSchedule(next)
    } catch (err) {
      setError(callErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function download() {
    setExportOpen(false)
    try {
      await exportScheduleXlsx(namedRows, `suporte-a-idosos-${monthKey}.xlsx`)
    } catch {
      setError('Não foi possível gerar a planilha.')
    }
  }

  return (
    <div className="px-6 py-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-indigo-soft text-indigo">
            <Users size={22} />
          </span>
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight">Suporte a idosos</h1>
            <p className="mt-1 text-sm text-muted">Organize as designações de carona para os nossos idosos.</p>
            {schedule ? (
              <div className="mt-2 flex items-center gap-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    schedule.status === 'published' ? 'bg-[#ECFDF5] text-[#047857]' : 'bg-[#FEF3C7] text-[#B45309]'
                  }`}
                >
                  {schedule.status === 'published' ? 'Publicada' : 'Rascunho'}
                </span>
                {allowed && !editing ? (
                  <button type="button" onClick={() => void toggleStatus()} disabled={busy} className="text-xs font-medium text-indigo disabled:opacity-50">
                    {schedule.status === 'published' ? 'Voltar para rascunho' : 'Publicar'}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setError('')
              setNotice('A importação do arquivo entra numa próxima etapa.')
            }}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-white px-3 text-sm font-medium"
          >
            <Upload size={16} />
            Importar
          </button>
          <div className="relative" ref={exportMenu}>
            <button
              type="button"
              disabled={namedRows.length === 0}
              onClick={() => setExportOpen((open) => !open)}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-white px-3 text-sm font-medium disabled:opacity-50"
            >
              <Download size={16} />
              Exportar
              <ChevronDown size={16} className="text-muted" />
            </button>
            {exportOpen ? (
              <div className="absolute right-0 z-20 mt-2 w-44 rounded-xl border border-line bg-white p-1 shadow-sm">
                <button type="button" onClick={() => void download()} className="block w-full rounded-lg px-3 py-2 text-left text-sm">
                  Planilha (.xlsx)
                </button>
              </div>
            ) : null}
          </div>
          {editing ? (
            <>
              <button type="button" onClick={cancelEdit} disabled={busy} className="h-11 rounded-xl border border-line bg-white px-3 text-sm font-medium disabled:opacity-50">
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void conclude()}
                disabled={busy}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo px-3 text-sm font-medium text-white disabled:opacity-50"
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Pencil size={16} />}
                {busy ? 'Salvando…' : 'Concluir'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={startEdit}
              disabled={!allowed || loading}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo px-3 text-sm font-medium text-white disabled:opacity-50"
            >
              <Pencil size={16} />
              Editar escala
            </button>
          )}
        </div>
      </div>

      {error ? <p className="mt-4 rounded-xl bg-[#FDE8EF] px-3 py-2 text-sm text-[#9F1239]">{error}</p> : null}
      {notice ? <p className="mt-4 rounded-xl bg-[#FEF3E2] px-3 py-2 text-sm text-[#92400E]">{notice}</p> : null}

      <div className="mt-5 flex flex-col gap-3 xl:flex-row xl:items-stretch">
        <div className="flex h-[72px] shrink-0 items-center rounded-2xl border border-line bg-white">
          <button
            type="button"
            className="grid h-full w-11 place-items-center text-muted disabled:opacity-40"
            aria-label="Mês anterior"
            disabled={editing}
            onClick={() => {
              setHiddenDates([])
              setMonthKey(shiftMonth(monthKey, -1))
            }}
          >
            <ChevronLeft size={18} />
          </button>
          <span className="flex min-w-44 items-center justify-center gap-2 text-sm font-medium">
            <CalendarDays size={16} className="text-indigo" />
            {monthTitle(monthKey)}
          </span>
          <button
            type="button"
            className="grid h-full w-11 place-items-center text-muted disabled:opacity-40"
            aria-label="Próximo mês"
            disabled={editing}
            onClick={() => {
              setHiddenDates([])
              setMonthKey(shiftMonth(monthKey, 1))
            }}
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat icon={CalendarDays} value={loading ? '–' : stats.meetings} label="reuniões" />
          <Stat icon={Users} value={loading ? '–' : stats.elderly} label="idosos atendidos" />
          <Stat icon={Car} value={loading ? '–' : stats.drivers} label="motoristas" />
        </div>
      </div>

      {schedules.length > 1 && !editing ? (
        <label className="mt-4 block text-xs text-muted">
          Escala do mês
          <select
            value={schedule?.id ?? ''}
            onChange={(event) => chooseSchedule(event.target.value)}
            className="mt-1 h-10 rounded-xl border border-line bg-white px-3 text-sm text-ink"
          >
            {schedules.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title || 'Escala sem título'}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {editing || note ? (
        <div className="mt-4 rounded-2xl bg-[#FEF3E2] px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#92400E]">
            <Info size={16} />
            Observação
          </div>
          {editing ? (
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              aria-label="Observação"
              placeholder="Escreva um lembrete para quem organiza as caronas."
              className="mt-2 w-full resize-none rounded-xl border border-[#F3D7B0] bg-white px-3 py-2 text-sm text-ink outline-none focus:border-indigo"
            />
          ) : (
            <p className="mt-1 text-sm text-[#92400E]">{note}</p>
          )}
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-white">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-[88px_148px_minmax(0,1fr)_minmax(0,1fr)_44px] px-2 text-[11px] font-medium uppercase tracking-wide text-muted">
            <div className="px-4 py-3">Data</div>
            <div className="py-3">Dia</div>
            <div className="py-3">Idoso</div>
            <div className="py-3">Motorista</div>
            <div />
          </div>
          {loading ? (
            <p className="border-t border-line px-6 py-8 text-sm text-muted">Carregando a escala…</p>
          ) : !allowed ? (
            <p className="border-t border-line px-6 py-8 text-sm text-muted">
              Você não pode gerenciar o suporte a idosos desta congregação.
            </p>
          ) : groups.length === 0 ? (
            <p className="border-t border-line px-6 py-8 text-sm text-muted">
              {query.trim()
                ? 'Nenhuma designação encontrada.'
                : 'Nenhuma reunião neste mês.'}
            </p>
          ) : (
            groups.map((group) => (
              <div
                key={group.date}
                className="grid grid-cols-[88px_148px_minmax(0,1fr)_minmax(0,1fr)_44px] items-start border-t border-line px-2"
              >
                <div className="px-4 py-3" style={{ gridRow: `span ${group.rows.length}` }}>
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-indigo-soft text-xl font-semibold text-indigo">
                    {dayNumber(group.date)}
                  </span>
                </div>
                <div className="py-3 pr-3" style={{ gridRow: `span ${group.rows.length}` }}>
                  <div className="text-sm font-semibold">{weekdayLabel(group.date)}</div>
                  {editing ? (
                    <input
                      type="date"
                      value={group.date}
                      aria-label={`Data de ${weekdayLabel(group.date)}`}
                      onChange={(event) => moveGroup(group.date, event.target.value)}
                      className="mt-1 h-8 rounded-lg border border-line px-2 text-xs"
                    />
                  ) : (
                    <div className="text-xs text-muted">{displayDate(group.date)}</div>
                  )}
                </div>
                {group.rows.map((row) => (
                  <Fragment key={row.key}>
                    <div className="min-w-0 py-2.5 pr-3">
                      {editing ? (
                        <PersonField
                          value={row.elderlyName}
                          label={`Idoso em ${displayDate(row.date)}`}
                          publishers={publishers}
                          publisherStatus={publisherStatus}
                          onCommit={(person) => updateRow(row.key, 'elderly', person)}
                        />
                      ) : row.elderlyName ? (
                        <span className="flex min-w-0 items-center gap-2.5">
                          <Avatar name={row.elderlyName} />
                          <span className="truncate text-sm font-medium">{row.elderlyName}</span>
                        </span>
                      ) : (
                        <span className="text-sm text-muted">—</span>
                      )}
                    </div>
                    <div className="min-w-0 py-2.5 pr-3">
                      {editing ? (
                        <PersonField
                          value={row.driverName}
                          label={`Motorista em ${displayDate(row.date)}`}
                          publishers={publishers}
                          publisherStatus={publisherStatus}
                          onCommit={(person) => updateRow(row.key, 'driver', person)}
                        />
                      ) : row.driverName ? (
                        <span className="flex min-w-0 items-center gap-2.5">
                          <Avatar name={row.driverName} />
                          <span className="truncate text-sm font-medium">{row.driverName}</span>
                        </span>
                      ) : (
                        <span className="text-sm text-muted">—</span>
                      )}
                    </div>
                    <div className="self-center py-2.5">
                      <RowMenu
                        editing={editing}
                        onEdit={startEdit}
                        onClear={() => updateRow(row.key, 'driver', { name: '' })}
                        onRemove={() => {
                          const others = monthRows.some((item) => item.date === row.date && item.key !== row.key)
                          setRows((current) => current.filter((item) => item.key !== row.key))
                          if (!others) setHiddenDates((current) => (current.includes(row.date) ? current : [...current, row.date]))
                        }}
                      />
                    </div>
                  </Fragment>
                ))}
                {editing ? (
                  <button
                    type="button"
                    onClick={() => addRow(group.date)}
                    className="col-start-3 py-2 text-left text-xs font-medium text-indigo"
                  >
                    Adicionar idoso
                  </button>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Users
  value: number | string
  label: string
}) {
  return (
    <div className="flex h-[72px] items-center gap-3 rounded-2xl border border-line bg-white px-4">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-soft text-indigo">
        <Icon size={18} />
      </span>
      <span>
        <span className="block text-2xl font-semibold leading-none">{value}</span>
        <span className="mt-1 block text-xs text-muted">{label}</span>
      </span>
    </div>
  )
}

function RowMenu({
  editing,
  onEdit,
  onClear,
  onRemove,
}: {
  editing: boolean
  onEdit: () => void
  onClear: () => void
  onRemove: () => void
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  useDismiss(open, root, () => setOpen(false))
  return (
    <div className="relative" ref={root}>
      <button
        type="button"
        aria-label="Ações da designação"
        onClick={() => setOpen((current) => !current)}
        className="grid h-8 w-8 place-items-center rounded-lg text-muted"
      >
        <MoreHorizontal size={16} />
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-1 w-48 rounded-xl border border-line bg-white p-1 text-sm shadow-sm">
          {editing ? (
            <>
              <button
                type="button"
                onClick={() => {
                  onClear()
                  setOpen(false)
                }}
                className="block w-full rounded-lg px-3 py-2 text-left"
              >
                Limpar motorista
              </button>
              <button
                type="button"
                onClick={() => {
                  onRemove()
                  setOpen(false)
                }}
                className="block w-full rounded-lg px-3 py-2 text-left text-[#9F1239]"
              >
                Remover
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                onEdit()
                setOpen(false)
              }}
              className="block w-full rounded-lg px-3 py-2 text-left"
            >
              Editar escala
            </button>
          )}
        </div>
      ) : null}
    </div>
  )
}

function useDismiss(open: boolean, root: RefObject<HTMLElement | null>, close: () => void) {
  useEffect(() => {
    if (!open) return
    function onPointer(event: MouseEvent) {
      if (!(event.target instanceof Node) || !root.current?.contains(event.target)) close()
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [open, root, close])
}

function currentMonthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}
