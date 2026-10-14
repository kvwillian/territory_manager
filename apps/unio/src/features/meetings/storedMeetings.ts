import type { CongregationMeeting, MeetingDuty, MeetingSection, MeetingStatus, PartRole, ProgramPart, SectionToken } from '../../domain'

const statuses: MeetingStatus[] = ['published', 'draft', 'notStarted', 'completed']
const tokens: SectionToken[] = ['treasures', 'ministry', 'christianLife', 'neutral']

function text(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function record(value: unknown) {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

function mapRole(value: unknown, fallbackId: string): PartRole {
  const role = record(value)
  return {
    id: text(role?.id, fallbackId),
    label: text(role?.label, 'Participante'),
    personName: text(role?.personName),
    showLabel: role?.showLabel === true,
  }
}

function mapPart(value: unknown, fallbackId: string): ProgramPart | null {
  const part = record(value)
  if (!part) return null
  const title = text(part.title).trim()
  if (!title) return null
  const roles = Array.isArray(part.roles) ? part.roles.map((role, index) => mapRole(role, `${fallbackId}-r${index}`)) : []
  return {
    id: text(part.id, fallbackId),
    title,
    durationMinutes: typeof part.durationMinutes === 'number' ? part.durationMinutes : 0,
    roles,
    pinned: part.pinned === true,
    structural: part.structural === true,
  }
}

function mapSection(value: unknown, fallbackId: string): MeetingSection | null {
  const section = record(value)
  if (!section) return null
  const title = text(section.title).trim()
  if (!title) return null
  const token = tokens.includes(section.token as SectionToken) ? (section.token as SectionToken) : 'neutral'
  const parts = Array.isArray(section.parts)
    ? section.parts.map((part, index) => mapPart(part, `${fallbackId}-p${index}`)).filter((part): part is ProgramPart => part !== null)
    : []
  return { id: text(section.id, fallbackId), title, token, parts }
}

function mapDuty(value: unknown, fallbackId: string): MeetingDuty | null {
  const duty = record(value)
  if (!duty) return null
  const label = text(duty.label).trim()
  if (!label) return null
  const people = Array.isArray(duty.people) ? duty.people.map((person) => text(person)) : ['']
  return { id: text(duty.id, fallbackId), label, people }
}

export function meetingFromDocument(id: string, data: Record<string, unknown>): CongregationMeeting | null {
  if (data.kind !== 'midweek' && data.kind !== 'weekend') return null
  if (typeof data.isoDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.isoDate)) return null
  const status = statuses.includes(data.status as MeetingStatus) ? (data.status as MeetingStatus) : 'draft'
  const sections = Array.isArray(data.sections)
    ? data.sections.map((section, index) => mapSection(section, `${id}-s${index}`)).filter((section): section is MeetingSection => section !== null)
    : []
  const duties = Array.isArray(data.duties)
    ? data.duties.map((duty, index) => mapDuty(duty, `${id}-d${index}`)).filter((duty): duty is MeetingDuty => duty !== null)
    : []
  return {
    id,
    kind: data.kind,
    isoDate: data.isoDate,
    time: text(data.time, '19:30'),
    status,
    notes: text(data.notes),
    sections,
    duties,
  }
}

export function mergeMeetings(local: CongregationMeeting[], remote: CongregationMeeting[]) {
  const byDate = new Map(local.map((meeting) => [`${meeting.kind}:${meeting.isoDate}`, meeting]))
  for (const meeting of remote) byDate.set(`${meeting.kind}:${meeting.isoDate}`, meeting)
  return [...byDate.values()].sort((a, b) => a.isoDate.localeCompare(b.isoDate) || a.kind.localeCompare(b.kind))
}
