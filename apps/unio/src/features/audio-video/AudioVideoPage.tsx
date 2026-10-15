import { useEffect, useMemo, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { Download, Flag, Loader2, Trash2, Upload } from 'lucide-react'
import { useAccount } from '../../auth'
import { db, functions } from '../../firebase'
import { meetingDatesInMonth } from '../../domain'
import { useMeetings } from '../../store'
import { AssigneeField } from './AssigneeField'
import { usePublisherCatalog } from '../publishers/catalog'
import type { MockPublisher } from '../publishers/mock'
import type { ExportFormat } from './types'
import {
  addRosterDay,
  assignSlot,
  emptyRoster,
  loadRosterDrafts,
  monthNames,
  parseRosterText,
  removeRosterDay,
  rosterKey,
  rosterRowsForMeetings,
  clearRosterDraft,
  saveRosterDraft,
  type MonthlyRoster,
  type RosterField,
  type RosterRow,
} from './roster'

export function AudioVideoPage() {
  const account = useAccount()
  const isAdmin = account?.role === 'admin'
  const [rosters, setRosters] = useState<MonthlyRoster[]>([])
  const [drafts, setDrafts] = useState<Record<string, MonthlyRoster>>(() => loadRosterDrafts())
  const [sending, setSending] = useState(false)
  const [monthKey, setMonthKey] = useState(() => {
    const now = new Date()
    return rosterKey(now.getFullYear(), now.getMonth() + 1)
  })
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [importing, setImporting] = useState(false)
  const [reading, setReading] = useState('')
  const [error, setError] = useState('')
  const [draft, setDraft] = useState<MonthlyRoster | null>(null)
  const [alerts, setAlerts] = useState<string[]>([])
  const [format, setFormat] = useState<ExportFormat>('xlsx')
  const [exporting, setExporting] = useState<'meeting' | 'month' | null>(null)
  const [newDay, setNewDay] = useState('')
  const { publishers } = usePublisherCatalog()
  const publisherStatus = 'ready' as const
  const { meetings } = useMeetings()

  useEffect(() => {
    if (!account?.congregationId) return
    let active = true
    getDocs(query(collection(db, 'audioVideoRosters'), where('congregationId', '==', account.congregationId)))
      .then((snapshot) => {
        if (!active) return
        setRosters(snapshot.docs.map((item) => item.data() as MonthlyRoster))
      })
      .catch(() => {
        if (active) setError('Não foi possível carregar a escala.')
      })
    return () => {
      active = false
    }
  }, [account?.congregationId])

  const stored = useMemo(
    () => rosters.find((item) => rosterKey(item.year, item.month) === monthKey) ?? emptyFromKey(monthKey),
    [rosters, monthKey],
  )
  const roster = drafts[monthKey] ?? stored
  const displayRoster = useMemo(
    () => ({ ...roster, rows: rosterRowsForMeetings(roster, meetingDatesInMonth(meetings, monthKey)) }),
    [roster, meetings, monthKey],
  )
  const selected = displayRoster.rows.find((row) => row.day === selectedDay) ?? null
  const today = new Date()
  const nextMeeting = displayRoster.year === today.getFullYear() && displayRoster.month === today.getMonth() + 1
    ? displayRoster.rows.find((row) => row.day >= today.getDate())
    : undefined

  function saveRoster(next: MonthlyRoster) {
    saveRosterDraft(next)
    setDrafts(loadRosterDrafts())
  }

  async function sendRoster() {
    setError('')
    setSending(true)
    try {
      const result = await httpsCallable(functions, 'saveAudioVideoRoster')({ roster: displayRoster })
      const saved = result.data as MonthlyRoster
      clearRosterDraft(saved.year, saved.month)
      setDrafts(loadRosterDrafts())
      setRosters((current) => [...current.filter((item) => rosterKey(item.year, item.month) !== rosterKey(saved.year, saved.month)), saved])
    } catch {
      setError('Não foi possível enviar a escala. O rascunho continua neste navegador.')
    } finally {
      setSending(false)
    }
  }

  function shift(delta: number) {
    const [year, month] = monthKey.split('-').map(Number)
    const date = new Date(year, month - 1 + delta, 1)
    setMonthKey(rosterKey(date.getFullYear(), date.getMonth() + 1))
    setSelectedDay(null)
  }

  async function onFile(file: File) {
    setError('')
    setReading('Lendo a imagem…')
    setImporting(true)
    try {
      const { createWorker } = await import('tesseract.js')
      const worker = await createWorker('por')
      const result = await worker.recognize(file)
      await worker.terminate()
      const year = Number(monthKey.slice(0, 4))
      const parsed = parseRosterText(result.data.text, year)
      setDraft(parsed.roster)
      setAlerts(parsed.alerts)
      setReading('')
    } catch {
      setReading('')
      setError('Não foi possível ler esta imagem. Tente outra foto, mais nítida.')
      setImporting(false)
    }
  }

  function saveDraft() {
    if (!draft) return
    saveRoster(draft)
    setMonthKey(rosterKey(draft.year, draft.month))
    setDraft(null)
    setAlerts([])
    setImporting(false)
    setSelectedDay(null)
  }

  async function download(scope: 'meeting' | 'month') {
    if (scope === 'meeting' && !selected) return
    setError('')
    setExporting(scope)
    try {
      const { exportRoster } = await import('./exportRoster')
      await exportRoster(displayRoster, format, scope === 'meeting' ? selected ?? undefined : undefined)
    } catch {
      const file = format === 'pdf' ? 'o PDF' : format === 'docx' ? 'o documento' : 'a planilha'
      setError(`Não foi possível gerar ${file}. Tente novamente.`)
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="px-6 py-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">Áudio e vídeo</h1>
          <p className="mt-1 text-sm text-muted">Indicadores, microfones e mesa de som de cada reunião.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin ? (
            <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-line bg-white px-3 text-sm font-medium">
              <Upload size={16} />
              Importar mês
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void onFile(file)
                }}
              />
            </label>
          ) : null}
          <select
            value={format}
            onChange={(event) => setFormat(event.target.value as ExportFormat)}
            aria-label="Formato da exportação"
            disabled={exporting !== null}
            className="h-11 rounded-xl border border-line bg-white px-3 text-sm font-medium disabled:opacity-50"
          >
            <option value="xlsx">XLSX</option>
            <option value="docx">DOC</option>
            <option value="pdf">PDF</option>
          </select>
          <button
            type="button"
            disabled={!selected || exporting !== null}
            onClick={() => void download('meeting')}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-white px-3 text-sm font-medium disabled:opacity-50"
          >
            {exporting === 'meeting' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {exporting === 'meeting' ? 'Gerando…' : 'Exportar reunião'}
          </button>
          <button
            type="button"
            disabled={displayRoster.rows.length === 0 || exporting !== null}
            onClick={() => void download('month')}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo px-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {exporting === 'month' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {exporting === 'month' ? 'Gerando…' : 'Exportar mês'}
          </button>
          <button
            type="button"
            disabled={sending || displayRoster.rows.length === 0}
            onClick={() => void sendRoster()}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo px-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : null}
            {sending ? 'Enviando…' : 'Enviar mês'}
          </button>
        </div>
      </div>
      {error ? <p className="mt-4 rounded-xl bg-[#FDE8EF] px-3 py-2 text-sm text-[#9F1239]">{error}</p> : null}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="flex h-11 w-fit items-center rounded-xl border border-line bg-white">
          <button type="button" className="px-3 text-muted" onClick={() => shift(-1)} aria-label="Mês anterior">‹</button>
          <span className="min-w-40 text-center text-sm font-medium capitalize">{monthNames[roster.month - 1]} de {roster.year}</span>
          <button type="button" className="px-3 text-muted" onClick={() => shift(1)} aria-label="Próximo mês">›</button>
        </div>
        <form
          className="flex h-11 items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            const day = Number(newDay)
            const next = addRosterDay(roster, day)
            if (next !== roster) saveRoster(next)
            if (next.rows.some((row) => row.day === day)) {
              setSelectedDay(day)
              setNewDay('')
            }
          }}
        >
          <input
            type="number"
            min={1}
            max={31}
            value={newDay}
            aria-label="Dia da reunião"
            placeholder="Dia"
            onChange={(event) => setNewDay(event.target.value)}
            className="h-11 w-20 rounded-xl border border-line bg-white px-3 text-sm"
          />
          <button type="submit" className="h-11 rounded-xl border border-line bg-white px-3 text-sm font-medium">
            Adicionar dia
          </button>
        </form>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-[#F8FAFC] text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Dia</th>
              <th className="px-4 py-3">Indicadores</th>
              <th className="px-4 py-3">Microfones</th>
              <th className="px-4 py-3">Mesa de som</th>
              <th className="w-12 px-2 py-3"><span className="sr-only">Excluir</span></th>
            </tr>
          </thead>
          <tbody>
            {displayRoster.rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-muted">Nenhuma reunião neste mês.</td>
              </tr>
            ) : displayRoster.rows.map((row, index) => (
              <tr
                key={row.day}
                onClick={() => setSelectedDay(row.day)}
                className={`border-t border-line ${selectedDay === row.day ? 'bg-indigo-soft' : ''}`}
              >
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-2">
                    <span className="font-semibold">{row.day}</span>
                    {row.day === nextMeeting?.day ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-soft px-2 py-0.5 text-[11px] font-medium text-indigo">
                        <Flag size={11} />
                        {row.day === today.getDate() ? 'Hoje' : 'Próxima'}
                      </span>
                    ) : null}
                  </span>
                </td>
                <AssignmentCell
                  row={row}
                  field="attendants"
                  dark={index % 2 === 1}
                  publishers={publishers}
                  publisherStatus={publisherStatus}
                  onAssign={(index, name) => {
                    setSelectedDay(row.day)
                    saveRoster(assignSlot(addRosterDay(roster, row.day), row.day, 'attendants', index, name))
                  }}
                />
                <AssignmentCell
                  row={row}
                  field="microphones"
                  dark={index % 2 === 1}
                  publishers={publishers}
                  publisherStatus={publisherStatus}
                  onAssign={(index, name) => {
                    setSelectedDay(row.day)
                    saveRoster(assignSlot(addRosterDay(roster, row.day), row.day, 'microphones', index, name))
                  }}
                />
                <AssignmentCell
                  row={row}
                  field="sound"
                  dark={index % 2 === 1}
                  publishers={publishers}
                  publisherStatus={publisherStatus}
                  onAssign={(index, name) => {
                    setSelectedDay(row.day)
                    saveRoster(assignSlot(addRosterDay(roster, row.day), row.day, 'sound', index, name))
                  }}
                />
                <td className="px-2 py-2 text-right">
                  <button
                    type="button"
                    aria-label={`Excluir dia ${row.day}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      saveRoster(removeRosterDay(roster, row.day))
                      if (selectedDay === row.day) setSelectedDay(null)
                    }}
                    className="rounded-lg p-2 text-muted"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">Clique em um nome para buscar um publicador habilitado. Selecione o dia para exportar aquela reunião.</p>

      {importing ? (
        <div className="fixed inset-0 z-30 grid place-items-center bg-[#0B0E14]/40 p-4">
          <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5">
            <h2 className="text-lg font-semibold">Importar cartaz do mês</h2>
            {reading ? (
              <p className="mt-4 flex items-center gap-2 text-sm text-indigo">
                <Loader2 size={16} className="animate-spin" />
                {reading}
              </p>
            ) : draft ? (
              <>
                {alerts.length > 0 ? (
                  <ul className="mt-3 rounded-xl bg-[#FEF3E2] px-3 py-2 text-sm text-[#92400E]">
                    {alerts.map((alert) => <li key={alert}>{alert}</li>)}
                  </ul>
                ) : null}
                <p className="mt-3 text-sm text-muted capitalize">{monthNames[draft.month - 1]} de {draft.year}. Ajuste os nomes antes de salvar.</p>
                <div className="mt-3 space-y-3">
                  {draft.rows.map((row, rowIndex) => (
                    <div key={`${row.day}-${rowIndex}`} className="grid gap-2 rounded-xl border border-line p-3 md:grid-cols-[72px_1fr_1fr_1fr]">
                      <input
                        type="number"
                        value={row.day}
                        aria-label="Dia"
                        className="h-10 rounded-lg border border-line px-2 text-sm"
                        onChange={(event) => setDraft(editRow(draft, rowIndex, { day: Number(event.target.value) }))}
                      />
                      <NamePair label="Indicadores" values={row.attendants} onChange={(attendants) => setDraft(editRow(draft, rowIndex, { attendants }))} />
                      <NamePair label="Microfones" values={row.microphones} onChange={(microphones) => setDraft(editRow(draft, rowIndex, { microphones }))} />
                      <NamePair label="Mesa de som" values={row.sound} onChange={(sound) => setDraft(editRow(draft, rowIndex, { sound }))} />
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button type="button" className="h-10 rounded-xl border border-line px-3 text-sm" onClick={() => { setImporting(false); setDraft(null) }}>
                    Cancelar
                  </button>
                  <button type="button" className="h-10 rounded-xl bg-indigo px-4 text-sm font-medium text-white" onClick={saveDraft}>
                    Salvar mês
                  </button>
                </div>
              </>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  )
}

function AssignmentCell({
  row,
  field,
  dark,
  publishers,
  publisherStatus,
  onAssign,
}: {
  row: RosterRow
  field: RosterField
  dark: boolean
  publishers: MockPublisher[]
  publisherStatus: 'loading' | 'ready' | 'error'
  onAssign: (index: number, name: string) => void
}) {
  const slots = [row[field][0] ?? '', row[field][1] ?? '']
  return (
    <td className="px-3 py-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {slots.map((name, index) => (
          <AssigneeField
            key={index}
            value={name}
            field={field}
            publishers={publishers}
            publisherStatus={publisherStatus}
            dark={dark}
            label={`${fieldLabels[field]} ${index + 1} do dia ${row.day}`}
            onCommit={(next) => onAssign(index, next)}
          />
        ))}
      </div>
    </td>
  )
}

const fieldLabels: Record<RosterField, string> = {
  attendants: 'indicadores',
  microphones: 'microfones',
  sound: 'mesa de som',
}

function emptyFromKey(key: string): MonthlyRoster {
  const [year, month] = key.split('-').map(Number)
  return emptyRoster(year, month)
}

function editRow(roster: MonthlyRoster, index: number, patch: Partial<RosterRow>): MonthlyRoster {
  return {
    ...roster,
    rows: roster.rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)),
  }
}

function NamePair({
  label,
  values,
  onChange,
}: {
  label: string
  values: string[]
  onChange: (values: string[]) => void
}) {
  const first = values[0] ?? ''
  const second = values[1] ?? ''
  return (
    <label className="text-xs text-muted">
      {label}
      <input value={first} onChange={(event) => onChange([event.target.value, second])} className="mt-1 h-9 w-full rounded-lg border border-line px-2 text-sm text-ink" />
      <input value={second} onChange={(event) => onChange([first, event.target.value])} className="mt-1 h-9 w-full rounded-lg border border-line px-2 text-sm text-ink" />
    </label>
  )
}
