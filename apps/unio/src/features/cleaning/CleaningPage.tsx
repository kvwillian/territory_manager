import { useEffect, useMemo, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { kindMeta, monthTitle, shiftMonth, type CongregationMeeting } from '../../domain'
import { useAccount } from '../../auth'
import { db, functions } from '../../firebase'
import { useMeetings } from '../../store'

const draftKey = 'unio-cleaning-drafts'

function loadDrafts() {
  try {
    const raw = localStorage.getItem(draftKey)
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
  const account = useAccount()
  const { meetings } = useMeetings()
  const [monthKey, setMonthKey] = useState(currentMonthKey)
  const [people, setPeople] = useState<Record<string, string>>({})
  const [drafts, setDrafts] = useState<Record<string, string>>(loadDrafts)
  const [error, setError] = useState('')
  const [sending, setSending] = useState('')
  const rows = useMemo(
    () =>
      meetings
        .filter((meeting) => meeting.isoDate.startsWith(`${monthKey}-`))
        .sort((a, b) => a.isoDate.localeCompare(b.isoDate) || a.kind.localeCompare(b.kind)),
    [meetings, monthKey],
  )

  useEffect(() => {
    if (!account?.congregationId) return
    let active = true
    getDoc(doc(db, 'cleaningAssignments', account.congregationId))
      .then((snapshot) => {
        if (!active) return
        const data = snapshot.data()?.people
        setPeople(data && typeof data === 'object' ? data as Record<string, string> : {})
      })
      .catch(() => {
        if (active) setError('Não foi possível carregar a limpeza.')
      })
    return () => {
      active = false
    }
  }, [account?.congregationId])

  function assign(meeting: CongregationMeeting, name: string) {
    const next = { ...drafts, [meeting.id]: name }
    localStorage.setItem(draftKey, JSON.stringify(next))
    setDrafts(next)
  }

  async function send(meeting: CongregationMeeting) {
    const person = drafts[meeting.id] ?? people[meeting.id] ?? ''
    setError('')
    setSending(meeting.id)
    try {
      await httpsCallable(functions, 'saveCleaningAssignment')({ meetingId: meeting.id, person })
      const next = { ...drafts }
      delete next[meeting.id]
      localStorage.setItem(draftKey, JSON.stringify(next))
      setDrafts(next)
      setPeople((current) => ({ ...current, [meeting.id]: person }))
    } catch {
      setError('Não foi possível enviar. O rascunho continua neste navegador.')
    } finally {
      setSending('')
    }
  }

  return (
    <div className="px-6 py-6 lg:px-8">
      <h1 className="text-[28px] font-semibold tracking-tight">Limpeza</h1>
      <p className="mt-1 text-sm text-muted">As datas são as reuniões já cadastradas. Envie cada responsável para gravar.</p>
      {error ? <p className="mt-3 text-sm text-[#9F1239]">{error}</p> : null}
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
              <th className="px-4 py-3"><span className="sr-only">Enviar</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-muted">Nenhuma reunião neste mês.</td>
              </tr>
            ) : rows.map((meeting) => (
              <tr key={meeting.id} className="border-t border-line">
                <td className="px-4 py-3 font-semibold">{shortDate(meeting.isoDate)}</td>
                <td className="px-4 py-3">{kindMeta[meeting.kind].meetingLabel}</td>
                <td className="px-4 py-3">
                  <input
                    value={drafts[meeting.id] ?? people[meeting.id] ?? ''}
                    aria-label={`Responsável em ${shortDate(meeting.isoDate)}`}
                    placeholder="Nome"
                    onChange={(event) => assign(meeting, event.target.value)}
                    className="h-9 w-full max-w-sm rounded-lg border border-line px-2 text-sm text-ink"
                  />
                </td>
                <td className="px-4 py-3">
                  <button type="button" disabled={sending === meeting.id} onClick={() => void send(meeting)} className="text-sm font-medium text-indigo disabled:opacity-50">
                    {sending === meeting.id ? 'Enviando…' : 'Enviar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
