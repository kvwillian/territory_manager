import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { kindMeta, monthTitle, shiftMonth, type CongregationMeeting } from '../../domain'
import { useMeetings } from '../../store'

const storageKey = 'unio-cleaning-assignments'

function loadPeople() {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, string>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function currentMonthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function shortDate(iso: string) {
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year}`
}

export function CleaningPage() {
  const { meetings } = useMeetings()
  const [monthKey, setMonthKey] = useState(currentMonthKey)
  const [people, setPeople] = useState<Record<string, string>>(loadPeople)
  const rows = useMemo(
    () =>
      meetings
        .filter((meeting) => meeting.isoDate.startsWith(`${monthKey}-`))
        .sort((a, b) => a.isoDate.localeCompare(b.isoDate) || a.kind.localeCompare(b.kind)),
    [meetings, monthKey],
  )

  function assign(meeting: CongregationMeeting, name: string) {
    setPeople((current) => {
      const next = { ...current, [meeting.id]: name }
      localStorage.setItem(storageKey, JSON.stringify(next))
      return next
    })
  }

  return (
    <div className="px-6 py-6 lg:px-8">
      <h1 className="text-[28px] font-semibold tracking-tight">Limpeza</h1>
      <p className="mt-1 text-sm text-muted">As datas são as reuniões já cadastradas.</p>
      <div className="mt-5 flex h-11 w-fit items-center rounded-xl border border-line bg-white">
        <button type="button" className="px-3 text-muted" aria-label="Mês anterior" onClick={() => setMonthKey(shiftMonth(monthKey, -1))}>
          <ChevronLeft size={16} />
        </button>
        <span className="min-w-40 text-center text-sm font-medium">{monthTitle(monthKey)}</span>
        <button type="button" className="px-3 text-muted" aria-label="Próximo mês" onClick={() => setMonthKey(shiftMonth(monthKey, 1))}>
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-[#F8FAFC] text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Reunião</th>
              <th className="px-4 py-3">Responsável</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-muted">Nenhuma reunião neste mês.</td>
              </tr>
            ) : rows.map((meeting) => (
              <tr key={meeting.id} className="border-t border-line">
                <td className="px-4 py-3 font-semibold">{shortDate(meeting.isoDate)}</td>
                <td className="px-4 py-3">{kindMeta[meeting.kind].meetingLabel}</td>
                <td className="px-4 py-3">
                  <input
                    value={people[meeting.id] ?? ''}
                    aria-label={`Responsável em ${shortDate(meeting.isoDate)}`}
                    placeholder="Nome"
                    onChange={(event) => assign(meeting, event.target.value)}
                    className="h-9 w-full max-w-sm rounded-lg border border-line px-2 text-sm text-ink"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
