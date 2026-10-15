import { isoFromDate, parseIso } from './dates'
import { weekendTemplate } from './templates'
import type { CongregationMeeting } from './types'

export type CongregationSchedule = {
  midweekWeekday: number
  weekendWeekday: number
  weekendTime?: string
}

export type CongregationProfile = {
  name: string
  place: string
}

export function congregationProfile(data: Record<string, unknown> | undefined): CongregationProfile {
  const name = storedText(data?.name) || 'Congregação'
  const city = storedText(data?.city)
  const state = storedText(data?.state) || storedText(data?.estado) || storedText(data?.uf)
  const country = storedText(data?.country)
  return { name, place: [city, state, country].filter(Boolean).join(', ') }
}

export function congregationSchedule(data: Record<string, unknown> | undefined): CongregationSchedule {
  return {
    midweekWeekday: storedWeekday(data?.midweekWeekday, 4),
    weekendWeekday: storedWeekday(data?.weekendWeekday, 7),
    weekendTime: typeof data?.weekendTime === 'string' ? data.weekendTime : '10:00',
  }
}

export function alignIsoToWeekday(iso: string, dartWeekday: number) {
  const target = dartWeekday === 7 ? 0 : dartWeekday
  const date = parseIso(iso)
  date.setDate(date.getDate() + (target - date.getDay()))
  return isoFromDate(date)
}

export function alignMeeting(meeting: CongregationMeeting, schedule: CongregationSchedule) {
  const weekday = meeting.kind === 'midweek' ? schedule.midweekWeekday : schedule.weekendWeekday
  const isoDate = alignIsoToWeekday(meeting.isoDate, weekday)
  return isoDate === meeting.isoDate ? meeting : { ...meeting, isoDate }
}

export function alignMeetings(meetings: CongregationMeeting[], schedule: CongregationSchedule) {
  return mergeByDate(meetings.map((meeting) => alignMeeting(meeting, schedule)))
}

export function weekendDateFor(midweekIso: string, weekendWeekday: number) {
  const target = weekendWeekday === 7 ? 0 : weekendWeekday
  const date = parseIso(midweekIso)
  date.setDate(date.getDate() + ((target - date.getDay() + 7) % 7))
  return isoFromDate(date)
}

export function withWeekendMeetings(meetings: CongregationMeeting[], schedule: CongregationSchedule) {
  const aligned = alignMeetings(meetings, schedule)
  const weekends = new Set(aligned.filter((meeting) => meeting.kind === 'weekend').map((meeting) => meeting.isoDate))
  const created: CongregationMeeting[] = []
  for (const meeting of aligned) {
    if (meeting.kind !== 'midweek') continue
    const isoDate = weekendDateFor(meeting.isoDate, schedule.weekendWeekday)
    if (weekends.has(isoDate)) continue
    const weekend = weekendTemplate(isoDate, 'draft')
    if (schedule.weekendTime) weekend.time = schedule.weekendTime
    created.push(weekend)
    weekends.add(isoDate)
  }
  return created.length === 0 ? aligned : mergeByDate([...aligned, ...created])
}

function storedText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function storedWeekday(value: unknown, fallback: number) {
  return typeof value === 'number' && value >= 1 && value <= 7 ? value : fallback
}

function mergeByDate(meetings: CongregationMeeting[]) {
  const byDate = new Map<string, CongregationMeeting>()
  for (const meeting of meetings) byDate.set(`${meeting.kind}:${meeting.isoDate}`, meeting)
  return [...byDate.values()].sort((a, b) => a.isoDate.localeCompare(b.isoDate) || a.kind.localeCompare(b.kind))
}
