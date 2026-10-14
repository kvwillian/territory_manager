import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import {
  addDays,
  blankFrom,
  isCurrentWeek,
  meetingInStrip,
  monthKey,
  seedMeetings,
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
  upsertImportedMeeting: (meeting: CongregationMeeting) => void
}

const MeetingsContext = createContext<MeetingsContextValue | null>(null)

function patchSelected(
  meetings: CongregationMeeting[],
  selectedId: string,
  recipe: (meeting: CongregationMeeting) => CongregationMeeting,
) {
  return meetings.map((meeting) => (meeting.id === selectedId ? recipe(meeting) : meeting))
}

export function MeetingsProvider({ children }: { children: ReactNode }) {
  const [meetings, setMeetings] = useState(seedMeetings)
  const [kind, setKindState] = useState<MeetingKind>('midweek')
  const [month, setMonthState] = useState('2026-10')
  const [selectedId, setSelectedId] = useState('midweek-2026-10-14')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [closedSections, setClosedSections] = useState<string[]>([])

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
    setMeetings((current) => patchSelected(current, selectedId, (meeting) => ({ ...meeting, status })))
  }

  function setNotes(notes: string) {
    setMeetings((current) => patchSelected(current, selectedId, (meeting) => ({ ...meeting, notes })))
  }

  function updatePart(sectionId: string, partId: string, patch: Partial<ProgramPart>) {
    setMeetings((current) =>
      patchSelected(current, selectedId, (meeting) => ({
        ...meeting,
        sections: meeting.sections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                parts: section.parts.map((item) => (item.id === partId ? { ...item, ...patch } : item)),
              }
            : section,
        ),
      })),
    )
  }

  function updatePartPerson(sectionId: string, partId: string, roleId: string, personName: string) {
    setMeetings((current) =>
      patchSelected(current, selectedId, (meeting) => ({
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
      })),
    )
  }

  function updateDutyPerson(dutyId: string, index: number, personName: string) {
    setMeetings((current) =>
      patchSelected(current, selectedId, (meeting) => ({
        ...meeting,
        duties: meeting.duties.map((duty) =>
          duty.id === dutyId
            ? { ...duty, people: duty.people.map((person, personIndex) => (personIndex === index ? personName : person)) }
            : duty,
        ),
      })),
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
    setMeetings((current) =>
      patchSelected(current, selectedId, (meeting) => ({
        ...meeting,
        sections: meeting.sections.map((section) => {
          if (section.id !== sectionId) return section
          const pinnedIndex = section.parts.findIndex((item) => item.pinned)
          const parts = [...section.parts]
          if (pinnedIndex === -1) parts.push(created)
          else parts.splice(pinnedIndex, 0, created)
          return { ...section, parts }
        }),
      })),
    )
  }

  function removePart(sectionId: string, partId: string) {
    setMeetings((current) =>
      patchSelected(current, selectedId, (meeting) => ({
        ...meeting,
        sections: meeting.sections.map((section) =>
          section.id === sectionId
            ? { ...section, parts: section.parts.filter((item) => item.id !== partId) }
            : section,
        ),
      })),
    )
  }

  function addWeek() {
    const ofKind = meetings.filter((meeting) => meeting.kind === kind)
    const last = ofKind.reduce((current, meeting) => (meeting.isoDate > current.isoDate ? meeting : current))
    const iso = addDays(last.isoDate, 7)
    const existing = meetings.find((meeting) => meeting.kind === kind && meeting.isoDate === iso)
    if (existing) {
      select(existing.id)
      const date = existing.isoDate
      setMonthState(`${date.slice(0, 7)}`)
      return
    }
    const created = blankFrom(last, iso)
    setMeetings((current) => [...current, created])
    setSelectedId(created.id)
    setMonthState(created.isoDate.slice(0, 7))
    setEditing(true)
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
    upsertImportedMeeting,
  }

  return <MeetingsContext.Provider value={value}>{children}</MeetingsContext.Provider>
}

export function useMeetings() {
  const value = useContext(MeetingsContext)
  if (!value) throw new Error('useMeetings must be used within MeetingsProvider')
  return value
}
