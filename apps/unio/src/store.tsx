import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { collection, doc, getDoc, getDocs, query as queryDocuments, where } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from './firebase'
import { meetingFromDocument } from './features/meetings/storedMeetings'
import { clearMeetingDraft, overlayMeetingDrafts, saveMeetingDraft } from './features/meetings/drafts'
import {
  alignIsoToWeekday,
  addDays,
  blankFrom,
  congregationProfile,
  congregationSchedule,
  type CongregationProfile,
  isCurrentWeek,
  meetingInStrip,
  midweekTemplate,
  monthKey,
  weekendTemplate,
  withWeekendMeetings,
  type CongregationMeeting,
  type MeetingKind,
  type MeetingStatus,
  type ProgramPart,
} from './domain'

type MeetingsContextValue = {
  kind: MeetingKind
  month: string
  query: string
  editing: boolean
  sidebarCollapsed: boolean
  meetings: CongregationMeeting[]
  congregation: CongregationProfile
  visible: CongregationMeeting[]
  selected: CongregationMeeting | undefined
  closedSections: string[]
  setKind: (kind: MeetingKind) => void
  setMonth: (month: string) => void
  goToToday: () => void
  setQuery: (query: string) => void
  setEditing: (editing: boolean) => void
  toggleSidebar: () => void
  select: (id: string) => void
  toggleSection: (sectionId: string) => void
  setStatus: (status: MeetingStatus) => void
  setNotes: (notes: string) => void
  updatePart: (sectionId: string, partId: string, patch: Partial<ProgramPart>) => void
  updatePartPerson: (sectionId: string, partId: string, roleId: string, personName: string) => void
  updateDutyPerson: (dutyId: string, index: number, personName: string) => void
  addPart: (sectionId: string) => void
  removePart: (sectionId: string, partId: string) => void
  addWeek: () => void
  startMeeting: () => void
  submit: (status: MeetingStatus) => Promise<void>
  saveError: string
  upsertImportedMeeting: (meeting: CongregationMeeting) => void
}

const MeetingsContext = createContext<MeetingsContextValue | null>(null)

function keepDraft(meetings: CongregationMeeting[], id: string) {
  const selected = meetings.find((meeting) => meeting.id === id)
  if (selected) saveMeetingDraft(selected)
  return meetings
}

function patchSelected(
  meetings: CongregationMeeting[],
  selectedId: string,
  recipe: (meeting: CongregationMeeting) => CongregationMeeting,
) {
  return meetings.map((meeting) => (meeting.id === selectedId ? recipe(meeting) : meeting))
}

export function MeetingsProvider({ congregationId, children }: { congregationId: string | null; children: ReactNode }) {
  const [meetings, setMeetings] = useState<CongregationMeeting[]>([])
  const [congregation, setCongregation] = useState<CongregationProfile>({ name: 'Congregação', place: '' })
  const [schedule, setSchedule] = useState(() => congregationSchedule(undefined))
  const [kind, setKindState] = useState<MeetingKind>('midweek')
  const [month, setMonthState] = useState(() => monthKey(new Date().getFullYear(), new Date().getMonth() + 1))
  const [selectedId, setSelectedId] = useState('')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [closedSections, setClosedSections] = useState<string[]>([])
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    if (!congregationId) return
    let active = true
    Promise.all([
      getDoc(doc(db, 'congregations', congregationId)),
      getDocs(queryDocuments(collection(db, 'meetingPrograms'), where('congregationId', '==', congregationId))),
    ])
      .then(([congregation, snapshot]) => {
        if (!active) return
        const record = congregation.data() as Record<string, unknown> | undefined
        const nextSchedule = congregationSchedule(record)
        setSchedule(nextSchedule)
        setCongregation(congregationProfile(record))
        const loaded = snapshot.docs
          .map((item) => meetingFromDocument(item.id, item.data() as Record<string, unknown>))
          .filter((meeting): meeting is NonNullable<typeof meeting> => meeting !== null)
        const merged = withWeekendMeetings(overlayMeetingDrafts(loaded), nextSchedule)
        setMeetings(merged)
        setSelectedId((selected) => {
          if (merged.some((meeting) => meeting.id === selected)) return selected
          return merged[0]?.id ?? ''
        })
        if (loaded.length === 0) return
        const months = [...new Set(loaded.map((meeting) => meeting.isoDate.slice(0, 7)))].sort()
        setMonthState((current) => (months.includes(current) ? current : months[0] ?? current))
        void httpsCallable(functions, 'ensureWeekendMeetings')({}).catch(() => undefined)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [congregationId])

  const visible = useMemo(
    () =>
      meetings
        .filter((meeting) => meeting.kind === kind && meetingInStrip(meeting.isoDate, month))
        .sort((a, b) => a.isoDate.localeCompare(b.isoDate)),
    [meetings, kind, month],
  )

  const selected = meetings.find((meeting) => meeting.id === selectedId)

  function select(id: string) {
    setSelectedId(id)
    setEditing(false)
  }

  function chooseVisible(nextKind: MeetingKind, nextMonth: string, list = meetings) {
    const next = list
      .filter((meeting) => meeting.kind === nextKind && meetingInStrip(meeting.isoDate, nextMonth))
      .sort((a, b) => a.isoDate.localeCompare(b.isoDate))
    const preferred = next.find((meeting) => meeting.status === 'published') ?? next[0]
    if (preferred) setSelectedId(preferred.id)
    setEditing(false)
  }

  function setKind(next: MeetingKind) {
    setKindState(next)
    chooseVisible(next, month)
  }

  function setMonth(next: string) {
    setMonthState(next)
    chooseVisible(kind, next)
  }

  function goToToday() {
    const today = new Date()
    const ofKind = meetings
      .filter((meeting) => meeting.kind === kind)
      .sort((a, b) => a.isoDate.localeCompare(b.isoDate))
    const inThisWeek = ofKind.find((meeting) => isCurrentWeek(meeting.isoDate, today))
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const upcoming = ofKind.find((meeting) => meeting.isoDate >= todayIso)
    const target = inThisWeek ?? upcoming ?? ofKind[ofKind.length - 1]
    if (target) {
      setMonthState(target.isoDate.slice(0, 7))
      setSelectedId(target.id)
    } else {
      setMonthState(monthKey(today.getFullYear(), today.getMonth() + 1))
    }
    setEditing(false)
  }

  function toggleSection(sectionId: string) {
    setClosedSections((current) =>
      current.includes(sectionId) ? current.filter((id) => id !== sectionId) : [...current, sectionId],
    )
  }

  function setStatus(status: MeetingStatus) {
    setMeetings((current) => keepDraft(patchSelected(current, selectedId, (meeting) => ({ ...meeting, status })), selectedId))
  }

  function setNotes(notes: string) {
    setMeetings((current) => keepDraft(patchSelected(current, selectedId, (meeting) => ({ ...meeting, notes })), selectedId))
  }

  function updatePart(sectionId: string, partId: string, patch: Partial<ProgramPart>) {
    setMeetings((current) => keepDraft(patchSelected(current, selectedId, (meeting) => ({
        ...meeting,
        sections: meeting.sections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                parts: section.parts.map((item) => (item.id === partId ? { ...item, ...patch } : item)),
              }
            : section,
        ),
      })), selectedId)
    )
  }

  function updatePartPerson(sectionId: string, partId: string, roleId: string, personName: string) {
    setMeetings((current) => keepDraft(patchSelected(current, selectedId, (meeting) => ({
        ...meeting,
        sections: meeting.sections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                parts: section.parts.map((item) =>
                  item.id === partId
                    ? {
                        ...item,
                        roles: item.roles.map((itemRole) =>
                          itemRole.id === roleId ? { ...itemRole, personName } : itemRole,
                        ),
                      }
                    : item,
                ),
              }
            : section,
        ),
      })), selectedId)
    )
  }

  function updateDutyPerson(dutyId: string, index: number, personName: string) {
    setMeetings((current) => keepDraft(patchSelected(current, selectedId, (meeting) => ({
        ...meeting,
        duties: meeting.duties.map((duty) =>
          duty.id === dutyId
            ? { ...duty, people: duty.people.map((person, personIndex) => (personIndex === index ? personName : person)) }
            : duty,
        ),
      })), selectedId)
    )
  }

  function addPart(sectionId: string) {
    const id = crypto.randomUUID()
    const created: ProgramPart = {
      id,
      title: 'Nova parte',
      durationMinutes: 5,
      roles: [{ id: `${id}-role`, label: 'Participante', showLabel: false, personName: '' }],
    }
    setMeetings((current) => keepDraft(patchSelected(current, selectedId, (meeting) => ({
        ...meeting,
        sections: meeting.sections.map((section) => {
          if (section.id !== sectionId) return section
          const pinnedIndex = section.parts.findIndex((item) => item.pinned)
          const parts = [...section.parts]
          if (pinnedIndex === -1) parts.push(created)
          else parts.splice(pinnedIndex, 0, created)
          return { ...section, parts }
        }),
      })), selectedId)
    )
  }

  function removePart(sectionId: string, partId: string) {
    setMeetings((current) => keepDraft(patchSelected(current, selectedId, (meeting) => ({
        ...meeting,
        sections: meeting.sections.map((section) =>
          section.id === sectionId
            ? { ...section, parts: section.parts.filter((item) => item.id !== partId) }
            : section,
        ),
      })), selectedId)
    )
  }

  function addWeek() {
    if (!congregationId) return
    const ofKind = meetings.filter((meeting) => meeting.kind === kind)
    const today = new Date()
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const latest = ofKind.length === 0 ? undefined : ofKind.reduce((current, meeting) => (meeting.isoDate > current.isoDate ? meeting : current))
    const iso = latest
      ? addDays(latest.isoDate, 7)
      : alignIsoToWeekday(todayIso, kind === 'midweek' ? schedule.midweekWeekday : schedule.weekendWeekday)
    const existing = meetings.find((meeting) => meeting.kind === kind && meeting.isoDate === iso)
    if (existing) {
      select(existing.id)
      setMonthState(existing.isoDate.slice(0, 7))
      return
    }
    const created = !latest
      ? (kind === 'midweek' ? midweekTemplate(iso, 'draft') : weekendTemplate(iso, 'draft'))
      : blankFrom(latest, iso)
    created.id = `${created.kind}_${congregationId}_${iso}`
    saveMeetingDraft(created)
    setMeetings((current) => [...current, created])
    setSelectedId(created.id)
    setMonthState(created.isoDate.slice(0, 7))
    setEditing(true)
  }

  async function submit(status: MeetingStatus) {
    if (!congregationId) return
    const meeting = meetings.find((item) => item.id === selectedId)
    if (!meeting) return
    const payload = { ...meeting, status, id: `${meeting.kind}_${congregationId}_${meeting.isoDate}` }
    setSaveError('')
    try {
      const result = await httpsCallable(functions, 'saveMeetingProgram')({ meeting: payload })
      const data = result.data as Record<string, unknown>
      const saved = meetingFromDocument(String(data.id), data)
      if (!saved) return
      clearMeetingDraft(meeting.id)
      clearMeetingDraft(saved.id)
      setMeetings((current) => current.map((item) => (item.id === meeting.id || item.id === saved.id ? saved : item)))
      setSelectedId(saved.id)
      setEditing(false)
    } catch {
      setSaveError('Não foi possível enviar a reunião. O rascunho continua neste navegador.')
    }
  }

  function startMeeting() {
    setStatus('draft')
    setEditing(true)
  }

  function upsertImportedMeeting(meeting: CongregationMeeting) {
    setMeetings((current) => {
      const exists = current.some((item) => item.kind === meeting.kind && item.isoDate === meeting.isoDate)
      if (exists) return current
      return [...current, meeting]
    })
    setKindState(meeting.kind)
    setMonthState(meeting.isoDate.slice(0, 7))
    setSelectedId(meeting.id)
    setEditing(false)
  }

  const value: MeetingsContextValue = {
    kind,
    month,
    query,
    editing,
    sidebarCollapsed,
    meetings,
    congregation,
    visible,
    selected,
    closedSections,
    setKind,
    setMonth,
    goToToday,
    setQuery,
    setEditing,
    toggleSidebar: () => setSidebarCollapsed((current) => !current),
    select,
    toggleSection,
    setStatus,
    setNotes,
    updatePart,
    updatePartPerson,
    updateDutyPerson,
    addPart,
    removePart,
    addWeek,
    startMeeting,
    submit,
    saveError,
    upsertImportedMeeting,
  }

  return <MeetingsContext.Provider value={value}>{children}</MeetingsContext.Provider>
}

export function useMeetings() {
  const value = useContext(MeetingsContext)
  if (!value) throw new Error('useMeetings must be used within MeetingsProvider')
  return value
}
