import { useState } from 'react'
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { ref, uploadBytesResumable } from 'firebase/storage'
import { ChevronDown, ChevronUp, Upload } from 'lucide-react'
import { useAuth } from '../../auth'
import { db, functions, storage } from '../../firebase'
import type { CongregationMeeting } from '../../domain'

type Token = 'treasures' | 'ministry' | 'christianLife'
type WeekStatus = 'pending' | 'accepted' | 'duplicate' | 'error'

type ImportPart = { title: string; durationMinutes: number | null }
type ImportSection = { token: Token; title: string; parts: ImportPart[] }
export type ImportWeek = {
  id: string
  label: string
  weekStart: string | null
  weekEnd: string | null
  isoDate: string | null
  time: string
  alerts: string[]
  status: WeekStatus
  sections: ImportSection[]
}

const sectionClass: Record<Token, string> = {
  treasures: 'bg-[#E8EDF4]',
  ministry: 'bg-[#FEF3E2]',
  christianLife: 'bg-[#FDE8EF]',
}

const statusText: Record<WeekStatus, string> = {
  pending: 'Pendente',
  accepted: 'Aceita',
  duplicate: 'Já existia',
  error: 'Com alerta',
}

function messageFrom(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message.replace(/^Firebase: /, '')
  }
  return 'Não foi possível concluir a importação.'
}

export function ImportFlow({
  onClose,
  onSaved,
}: {
  onClose: () => void
  onSaved: (meeting: CongregationMeeting) => void
}) {
  const authState = useAuth()
  const user = authState.status === 'signedIn' ? authState.user : null
  const [phase, setPhase] = useState<'choose' | 'work'>('choose')
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [importId, setImportId] = useState<string | null>(null)
  const [weeks, setWeeks] = useState<ImportWeek[]>([])
  const [selected, setSelected] = useState(0)
  const [confirmAlerts, setConfirmAlerts] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)

  async function congregationOf(uid: string) {
    const userSnap = await getDoc(doc(db, 'users', uid))
    const congregationId = userSnap.data()?.congregationId
    if (typeof congregationId !== 'string' || !congregationId) {
      throw new Error('Sua conta não está ligada a uma congregação.')
    }
    return congregationId
  }

  async function resume() {
    if (!user) return
    setError('')
    try {
      const congregationId = await congregationOf(user.uid)
      const open = await getDocs(query(collection(db, 'meetingImports'), where('congregationId', '==', congregationId)))
      const pending = open.docs.find((item) => item.data().status === 'review')
      if (!pending) {
        setError('Não há uma importação em andamento.')
        return
      }
      setImportId(pending.id)
      setWeeks((pending.data().weeks ?? []) as ImportWeek[])
      setSelected(0)
      setPhase('work')
    } catch (err) {
      setError(messageFrom(err))
    }
  }

  async function upload(file: File) {
    if (!user) return
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Escolha um arquivo PDF.')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('O PDF passa de 8 MB.')
      return
    }
    setError('')
    setProgress('Enviando o PDF…')
    let congregationId: string
    try {
      congregationId = await congregationOf(user.uid)
    } catch (err) {
      setProgress('')
      setError(messageFrom(err))
      return
    }
    const id = crypto.randomUUID()
    const storageRef = ref(storage, `meeting-imports/${congregationId}/${id}/source.pdf`)
    try {
      await new Promise<void>((resolve, reject) => {
        const task = uploadBytesResumable(storageRef, file, { contentType: 'application/pdf' })
        task.on(
          'state_changed',
          (snapshot) => {
            const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
            setProgress(`Enviando o PDF… ${percent}%`)
          },
          reject,
          () => resolve(),
        )
      })
    } catch (err) {
      setProgress('')
      setError(messageFrom(err))
      return
    }
    setProgress('Lendo a programação…')
    try {
      const call = httpsCallable<{ importId: string }, { importId: string; weeks: ImportWeek[] }>(
        functions,
        'processMeetingImport',
      )
      const result = await call({ importId: id })
      setImportId(result.data.importId)
      setWeeks(result.data.weeks)
      setSelected(0)
      setPhase('work')
      setProgress('')
    } catch (err) {
      setProgress('')
      setError(messageFrom(err))
    }
  }

  function updateWeek(recipe: (week: ImportWeek) => ImportWeek) {
    setWeeks((current) => current.map((week, index) => (index === selected ? recipe(week) : week)))
  }

  async function accept(acknowledgeAlerts: boolean) {
    const week = weeks[selected]
    if (!importId || !week) return
    setError('')
    setProgress('Salvando rascunho…')
    try {
      const call = httpsCallable<
        { importId: string; weekId: string; isoDate: string; acknowledgeAlerts: boolean; sections: ImportSection[] },
        { status: string; meeting?: CongregationMeeting; warnings?: string[] }
      >(functions, 'acceptMeetingWeek')
      const result = await call({
        importId,
        weekId: week.id,
        isoDate: week.isoDate ?? '',
        acknowledgeAlerts,
        sections: week.sections,
      })
      setProgress('')
      setConfirmAlerts(false)
      if (result.data.meeting) onSaved(result.data.meeting)
      updateWeek((current) => ({
        ...current,
        status: result.data.status === 'duplicate' ? 'duplicate' : 'accepted',
        alerts: result.data.warnings ?? current.alerts,
      }))
    } catch (err) {
      setProgress('')
      const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : ''
      if (code.includes('failed-precondition')) {
        setConfirmAlerts(true)
        setError(messageFrom(err))
        return
      }
      setError(messageFrom(err))
    }
  }

  async function cancel() {
    if (importId) {
      const call = httpsCallable(functions, 'cancelMeetingImport')
      await call({ importId }).catch((err) => setError(messageFrom(err)))
    }
    onClose()
  }

  const week = weeks[selected]
  const pending = weeks.filter((item) => item.status === 'pending' || item.status === 'error').length

  return (
    <div className="fixed inset-0 z-30 flex items-stretch justify-center bg-[#0B0E14]/40 p-4">
      <section className="flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-canvas">
        <header className="flex items-center justify-between border-b border-line bg-white px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">Importar programação</h2>
            <p className="text-sm text-muted">O PDF é usado só durante a leitura e depois é apagado.</p>
          </div>
          <button type="button" className="text-sm font-medium text-muted" onClick={() => setConfirmCancel(true)}>
            Cancelar
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {error ? <p className="mb-3 rounded-xl bg-[#FDE8EF] px-3 py-2 text-sm text-[#9F1239]">{error}</p> : null}
          {progress ? <p className="mb-3 text-sm font-medium text-indigo">{progress}</p> : null}
          {phase === 'choose' ? (
            <div className="mx-auto max-w-md space-y-4">
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-line bg-white px-6 py-10 text-sm">
                <Upload size={18} />
                Escolher PDF da apostila
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) void upload(file)
                  }}
                />
              </label>
              <button type="button" className="text-sm font-medium text-indigo" onClick={() => void resume()}>
                Continuar uma revisão pendente
              </button>
            </div>
          ) : week ? (
            <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
              <aside className="space-y-2">
                {weeks.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelected(index)}
                    className={`w-full rounded-xl border px-3 py-2 text-left ${
                      index === selected ? 'border-indigo bg-white' : 'border-line bg-white/70'
                    }`}
                  >
                    <span className="block text-sm font-medium">{item.label}</span>
                    <span className="text-xs text-muted">{statusText[item.status]}</span>
                  </button>
                ))}
                <p className="px-1 text-xs text-muted">{pending} semana(s) ainda sem aceite.</p>
              </aside>
              <div className="space-y-3">
                <label className="block text-sm">
                  Data da reunião
                  <input
                    type="date"
                    value={week.isoDate ?? ''}
                    onChange={(event) => updateWeek((current) => ({ ...current, isoDate: event.target.value }))}
                    className="mt-1 h-10 rounded-xl border border-line bg-white px-3"
                  />
                </label>
                {week.alerts.length > 0 ? (
                  <ul className="rounded-xl bg-[#FEF3E2] px-3 py-2 text-sm text-[#92400E]">
                    {week.alerts.map((alert) => (
                      <li key={alert}>{alert}</li>
                    ))}
                  </ul>
                ) : null}
                {week.sections.map((section, sectionIndex) => (
                  <article key={section.token} className="overflow-hidden rounded-xl border border-line bg-white">
                    <header className={`px-4 py-3 text-sm font-semibold ${sectionClass[section.token]}`}>{section.title}</header>
                    {section.parts.map((part, partIndex) => (
                      <div key={`${section.token}-${partIndex}`} className="grid grid-cols-[auto_1fr_88px] gap-2 border-t border-line px-4 py-3">
                        <div className="flex flex-col">
                          <button
                            type="button"
                            aria-label="Mover para cima"
                            disabled={partIndex === 0}
                            onClick={() =>
                              updateWeek((current) => ({
                                ...current,
                                sections: current.sections.map((item, index) =>
                                  index === sectionIndex ? movePart(item, partIndex, -1) : item,
                                ),
                              }))
                            }
                          >
                            <ChevronUp size={16} />
                          </button>
                          <button
                            type="button"
                            aria-label="Mover para baixo"
                            disabled={partIndex === section.parts.length - 1}
                            onClick={() =>
                              updateWeek((current) => ({
                                ...current,
                                sections: current.sections.map((item, index) =>
                                  index === sectionIndex ? movePart(item, partIndex, 1) : item,
                                ),
                              }))
                            }
                          >
                            <ChevronDown size={16} />
                          </button>
                        </div>
                        <input
                          value={part.title}
                          onChange={(event) =>
                            updateWeek((current) => ({
                              ...current,
                              sections: current.sections.map((item, index) =>
                                index === sectionIndex
                                  ? {
                                      ...item,
                                      parts: item.parts.map((entry, entryIndex) =>
                                        entryIndex === partIndex ? { ...entry, title: event.target.value } : entry,
                                      ),
                                    }
                                  : item,
                              ),
                            }))
                          }
                          className="h-9 rounded-lg border border-line px-2 text-sm"
                        />
                        <input
                          type="number"
                          min={1}
                          max={60}
                          value={part.durationMinutes ?? ''}
                          onChange={(event) =>
                            updateWeek((current) => ({
                              ...current,
                              sections: current.sections.map((item, index) =>
                                index === sectionIndex
                                  ? {
                                      ...item,
                                      parts: item.parts.map((entry, entryIndex) =>
                                        entryIndex === partIndex
                                          ? { ...entry, durationMinutes: Number(event.target.value) }
                                          : entry,
                                      ),
                                    }
                                  : item,
                              ),
                            }))
                          }
                          className="h-9 rounded-lg border border-line px-2 text-sm"
                          aria-label="Duração em minutos"
                        />
                      </div>
                    ))}
                  </article>
                ))}
                <button
                  type="button"
                  disabled={week.status === 'accepted'}
                  onClick={() => void accept(false)}
                  className="h-10 rounded-xl bg-indigo px-4 text-sm font-medium text-white disabled:opacity-50"
                >
                  Aceitar esta semana
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">Nenhuma semana foi encontrada.</p>
          )}
        </div>
        {confirmAlerts ? (
          <footer className="flex items-center justify-end gap-2 border-t border-line bg-white px-5 py-3">
            <span className="mr-auto text-sm">Salvar mesmo com os alertas?</span>
            <button type="button" className="h-9 rounded-xl border border-line px-3 text-sm" onClick={() => setConfirmAlerts(false)}>
              Voltar
            </button>
            <button type="button" className="h-9 rounded-xl bg-indigo px-3 text-sm text-white" onClick={() => void accept(true)}>
              Salvar rascunho
            </button>
          </footer>
        ) : null}
        {confirmCancel ? (
          <footer className="flex items-center justify-end gap-2 border-t border-line bg-white px-5 py-3">
            <span className="mr-auto text-sm">Cancelar a importação? As semanas já salvas continuam como rascunho.</span>
            <button type="button" className="h-9 rounded-xl border border-line px-3 text-sm" onClick={() => setConfirmCancel(false)}>
              Voltar
            </button>
            <button type="button" className="h-9 rounded-xl bg-[#9F1239] px-3 text-sm text-white" onClick={() => void cancel()}>
              Cancelar importação
            </button>
          </footer>
        ) : null}
      </section>
    </div>
  )
}

function movePart(section: ImportSection, index: number, delta: number): ImportSection {
  const next = index + delta
  if (next < 0 || next >= section.parts.length) return section
  const parts = [...section.parts]
  const [item] = parts.splice(index, 1)
  parts.splice(next, 0, item)
  return { ...section, parts }
}
