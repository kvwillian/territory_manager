import type { CongregationMeeting, MeetingStatus } from '../../domain'

export type PublisherCount = {
  status: string
  privilege: string
  pioneer: string
}

export type RosterRow = {
  day: number
  attendants: string[]
  microphones: string[]
  sound: string[]
}

export type MonthRoster = {
  year: number
  month: number
  rows: RosterRow[]
}

export type CareAssignment = {
  date: string
  elderlyName: string
  driverName: string
}

export function isoFromDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function greeting(hour: number) {
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

export function firstName(name: string) {
  const part = name.trim().split(/\s+/).filter(Boolean)[0]
  return part || 'aí'
}

export function weekBounds(today: Date) {
  const mondayOffset = today.getDay() === 0 ? -6 : 1 - today.getDay()
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + mondayOffset)
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6)
  return { from: isoFromDate(monday), to: isoFromDate(sunday) }
}

export function upcomingMeetings(meetings: CongregationMeeting[], todayIso: string, limit = 4) {
  return meetings
    .filter((meeting) => meeting.isoDate >= todayIso)
    .sort((a, b) => a.isoDate.localeCompare(b.isoDate) || a.kind.localeCompare(b.kind))
    .slice(0, limit)
}

export function publisherSummary(publishers: PublisherCount[], groupCount: number) {
  const active = publishers.filter((publisher) => publisher.status === 'active')
  return {
    active: active.length,
    groups: groupCount,
    privileged: active.filter(
      (publisher) =>
        publisher.privilege === 'circuitOverseer' ||
        publisher.privilege === 'elder' ||
        publisher.privilege === 'ministerialServant',
    ).length,
    pioneers: active.filter(
      (publisher) =>
        publisher.pioneer === 'special' ||
        publisher.pioneer === 'auxiliary' ||
        publisher.pioneer === 'regular',
    ).length,
  }
}

export function shortMark(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0].slice(0, 2).toLocaleUpperCase('pt-BR')
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toLocaleUpperCase('pt-BR')
}

function inWeek(iso: string, from: string, to: string) {
  return iso >= from && iso <= to
}

export function audioInWeek(rosters: MonthRoster[], from: string, to: string) {
  const hits: { iso: string; names: string[] }[] = []
  for (const roster of rosters) {
    for (const row of roster.rows) {
      const iso = `${roster.year}-${String(roster.month).padStart(2, '0')}-${String(row.day).padStart(2, '0')}`
      if (!inWeek(iso, from, to)) continue
      const names = [...row.attendants, ...row.microphones, ...row.sound].map((name) => name.trim()).filter(Boolean)
      if (names.length > 0) hits.push({ iso, names })
    }
  }
  hits.sort((a, b) => a.iso.localeCompare(b.iso))
  return hits[0] ?? null
}

export function elderlyInWeek(assignments: CareAssignment[], from: string, to: string) {
  const hits = assignments
    .filter((item) => inWeek(item.date, from, to) && (item.elderlyName.trim() || item.driverName.trim()))
    .sort((a, b) => a.date.localeCompare(b.date))
  return hits[0] ?? null
}

export function cleaningInWeek(meetings: Pick<CongregationMeeting, 'id' | 'isoDate'>[], people: Record<string, string>, from: string, to: string) {
  const hits = meetings
    .filter((meeting) => inWeek(meeting.isoDate, from, to) && (people[meeting.id] ?? '').trim())
    .sort((a, b) => a.isoDate.localeCompare(b.isoDate))
  if (hits.length === 0) return null
  return { iso: hits[0].isoDate, name: people[hits[0].id].trim() }
}

export function statusTone(status: MeetingStatus) {
  if (status === 'published') return 'bg-[#ECFDF5] text-[#047857]'
  if (status === 'draft') return 'bg-[#FEF3C7] text-[#B45309]'
  if (status === 'completed') return 'bg-indigo-soft text-indigo'
  return 'bg-[#F1F5F9] text-[#64748B]'
}
