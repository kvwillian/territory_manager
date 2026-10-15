import type { CongregationMeeting } from '../../domain'

const storageKey = 'unio-meeting-drafts'

function read(): Record<string, CongregationMeeting> {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, CongregationMeeting>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function write(drafts: Record<string, CongregationMeeting>) {
  localStorage.setItem(storageKey, JSON.stringify(drafts))
}

export function loadMeetingDrafts() {
  return read()
}

export function saveMeetingDraft(meeting: CongregationMeeting) {
  const drafts = read()
  drafts[meeting.id] = meeting
  write(drafts)
}

export function clearMeetingDraft(id: string) {
  const drafts = read()
  delete drafts[id]
  write(drafts)
}

export function overlayMeetingDrafts(meetings: CongregationMeeting[]) {
  const drafts = read()
  const byId = new Map(meetings.map((meeting) => [meeting.id, meeting]))
  for (const [id, draft] of Object.entries(drafts)) byId.set(id, draft)
  return [...byId.values()].sort((a, b) => a.isoDate.localeCompare(b.isoDate) || a.kind.localeCompare(b.kind))
}
