import { useMemo, useState } from 'react'
import { Download, Flag, Loader2, Upload } from 'lucide-react'
import { useAccount } from '../../auth'
import type { ExportFormat } from './types'
import {
  emptyRoster,
  loadRosters,
  monthNames,
  parseRosterText,
  rosterKey,
  saveRosters,
  type MonthlyRoster,
  type RosterRow,
} from './roster'

export function AudioVideoPage() {
  const account = useAccount()
  const isAdmin = account?.role === 'admin'
  const [rosters, setRosters] = useState<MonthlyRoster[]>(() => loadRosters())
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

  const roster = useMemo(
    () => rosters.find((item) => rosterKey(item.year, item.month) === monthKey) ?? emptyFromKey(monthKey),
    [rosters, monthKey],
  )
  const selected = roster.rows.find((row) => row.day === selectedDay) ?? null
  const today = new Date()
  const nextMeeting = roster.year === today.getFullYear() && roster.month === today.getMonth() + 1
    ? roster.rows.find((row) => row.day >= today.getDate())
    : undefined

  function persist(next: MonthlyRoster[]) {
    setRosters(next)
    saveRosters(next)
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
    const key = rosterKey(draft.year, draft.month)
    const next = rosters.filter((item) => rosterKey(item.year, item.month) !== key)
    persist([...next, draft])
    setMonthKey(key)
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
      await exportRoster(roster, format, scope === 'meeting' ? selected ?? undefined : undefined)
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
            disabled={roster.rows.length === 0 || exporting !== null}
            onClick={() => void download('month')}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo px-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {exporting === 'month' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {exporting === 'month' ? 'Gerando…' : 'Exportar mês'}
          </button>
        </div>
      </div>
      {error ? <p className="mt-4 rounded-xl bg-[#FDE8EF] px-3 py-2 text-sm text-[#9F1239]">{error}</p> : null}

      <div className="mt-5 flex h-11 w-fit items-center rounded-xl border border-line bg-white">
        <button type="button" className="px-3 text-muted" onClick={() => shift(-1)} aria-label="Mês anterior">‹</button>
        <span className="min-w-40 text-center text-sm font-medium capitalize">{monthNames[roster.month - 1]} de {roster.year}</span>
        <button type="button" className="px-3 text-muted" onClick={() => shift(1)} aria-label="Próximo mês">›</button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-[#F8FAFC] text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Dia</th>
              <th className="px-4 py-3">Indicadores</th>
              <th className="px-4 py-3">Microfones</th>
              <th className="px-4 py-3">Mesa de som</th>
            </tr>
          </thead>
          <tbody>
            {roster.rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-muted">Nenhuma designação neste mês. Importe o cartaz mensal.</td>
              </tr>
            ) : roster.rows.map((row, index) => (
              <tr
                key={row.day}
                onClick={() => setSelectedDay(row.day)}
                className={`cursor-pointer border-t border-line ${selectedDay === row.day ? 'bg-indigo-soft' : 'hover:bg-[#F8FAFC]'}`}
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
                <td className="px-4 py-3"><NameChips names={row.attendants} dark={index % 2 === 1} /></td>
                <td className="px-4 py-3"><NameChips names={row.microphones} dark={index % 2 === 1} /></td>
                <td className="px-4 py-3"><NameChips names={row.sound} dark={index % 2 === 1} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">Selecione um dia para exportar as designações daquela reunião.</p>

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

function NameChips({ names, dark }: { names: string[]; dark: boolean }) {
  const visible = names.filter(Boolean)
  if (visible.length === 0) return <span className="text-muted">—</span>
  return (
    <span className="flex flex-wrap gap-1.5">
      {visible.map((name) => (
        <span
          key={name}
          className={`rounded-full px-2.5 py-1 text-xs font-medium text-[#0B0E14] ${dark ? 'bg-[#D5DDE8]' : 'bg-[#F1F5F9]'}`}
        >
          {name}
        </span>
      ))}
    </span>
  )
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
