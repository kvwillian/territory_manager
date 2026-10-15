const ISO = /^\d{4}-\d{2}-\d{2}$/
const STATUSES = ["draft", "published", "notStarted", "completed"]
const TOKENS = ["treasures", "ministry", "christianLife", "neutral"]

export class BoardError extends Error {
  constructor(
    readonly code: "permission-denied" | "invalid-argument",
    message: string,
  ) {
    super(message)
    this.name = "BoardError"
  }
}

export function meetingDocumentId(congregationId: string, kind: string, isoDate: string) {
  return `${kind}_${congregationId}_${isoDate}`
}

export function audioVideoRosterId(congregationId: string, year: number, month: number) {
  return `${congregationId}_${year}_${String(month).padStart(2, "0")}`
}

function text(value: unknown, max: number) {
  if (typeof value !== "string") return ""
  return value.trim().slice(0, max)
}

function people(value: unknown) {
  if (!Array.isArray(value)) return [""]
  const names = value.slice(0, 6).map((item) => text(item, 80))
  return names.length > 0 ? names : [""]
}

function sanitizeDuty(value: unknown, index: number) {
  const duty = value && typeof value === "object" ? (value as Record<string, unknown>) : {}
  return {
    id: text(duty.id, 80) || `d${index}`,
    label: text(duty.label, 80) || "Função",
    people: people(duty.people),
  }
}

export function sanitizeMeeting(congregationId: string, input: unknown) {
  if (!input || typeof input !== "object") throw new BoardError("invalid-argument", "Reunião inválida.")
  const meeting = input as Record<string, unknown>
  const kind = meeting.kind
  const isoDate = meeting.isoDate
  if (kind !== "midweek" && kind !== "weekend") throw new BoardError("invalid-argument", "Tipo de reunião inválido.")
  if (typeof isoDate !== "string" || !ISO.test(isoDate)) throw new BoardError("invalid-argument", "Data inválida.")
  const status = STATUSES.includes(String(meeting.status)) ? String(meeting.status) : "draft"
  const sections = Array.isArray(meeting.sections) ? meeting.sections.slice(0, 8).map(sanitizeSection) : []
  const duties = Array.isArray(meeting.duties) ? meeting.duties.slice(0, 12).map(sanitizeDuty) : []
  return {
    id: meetingDocumentId(congregationId, kind, isoDate),
    congregationId,
    kind,
    isoDate,
    time: text(meeting.time, 5) || (kind === "weekend" ? "10:00" : "19:30"),
    status,
    notes: text(meeting.notes, 2000),
    sections,
    duties,
  }
}

function sanitizeSection(value: unknown, index: number) {
  const section = value && typeof value === "object" ? (value as Record<string, unknown>) : {}
  const token = TOKENS.includes(String(section.token)) ? String(section.token) : "neutral"
  const parts = Array.isArray(section.parts) ? section.parts.slice(0, 20).map(sanitizePart) : []
  return {
    id: text(section.id, 80) || `s${index}`,
    title: text(section.title, 160) || "Parte",
    token,
    parts,
  }
}

function sanitizePart(value: unknown, index: number) {
  const part = value && typeof value === "object" ? (value as Record<string, unknown>) : {}
  const roles = Array.isArray(part.roles) ? part.roles.slice(0, 6).map(sanitizeRole) : []
  const duration = typeof part.durationMinutes === "number" ? Math.min(180, Math.max(1, Math.round(part.durationMinutes))) : 5
  const hint = text(part.hint, 160)
  return {
    id: text(part.id, 80) || `p${index}`,
    title: text(part.title, 160) || "Parte",
    durationMinutes: duration,
    ...(hint ? { hint } : {}),
    structural: part.structural === true,
    pinned: part.pinned === true,
    roles,
  }
}

function sanitizeRole(value: unknown, index: number) {
  const role = value && typeof value === "object" ? (value as Record<string, unknown>) : {}
  return {
    id: text(role.id, 80) || `r${index}`,
    label: text(role.label, 80) || "Participante",
    personName: text(role.personName, 80),
    showLabel: role.showLabel === true,
  }
}

function pair(value: unknown) {
  const names = Array.isArray(value) ? value : []
  return [text(names[0], 80), text(names[1], 80)]
}

export function sanitizeRoster(congregationId: string, input: unknown) {
  if (!input || typeof input !== "object") throw new BoardError("invalid-argument", "Escala inválida.")
  const roster = input as Record<string, unknown>
  const year = roster.year
  const month = roster.month
  if (typeof year !== "number" || year < 2000 || year > 2100) throw new BoardError("invalid-argument", "Ano inválido.")
  if (typeof month !== "number" || month < 1 || month > 12) throw new BoardError("invalid-argument", "Mês inválido.")
  const rows = Array.isArray(roster.rows)
    ? roster.rows.slice(0, 31).map((item) => {
        const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {}
        const day = row.day
        if (typeof day !== "number" || day < 1 || day > 31) throw new BoardError("invalid-argument", "Dia inválido.")
        return { day, attendants: pair(row.attendants), microphones: pair(row.microphones), sound: pair(row.sound) }
      })
    : []
  const reminders = Array.isArray(roster.reminders) ? roster.reminders.slice(0, 8).map((item) => text(item, 400)).filter(Boolean) : []
  const omittedDays = Array.isArray(roster.omittedDays)
    ? roster.omittedDays.filter((day) => typeof day === "number" && day >= 1 && day <= 31).slice(0, 31)
    : []
  return {
    id: audioVideoRosterId(congregationId, year, month),
    congregationId,
    year,
    month,
    rows,
    reminders,
    omittedDays,
  }
}

export function sanitizeCleaning(meetingId: unknown, person: unknown) {
  if (typeof meetingId !== "string" || !/^(midweek|weekend)_[^/]{1,80}_\d{4}-\d{2}-\d{2}$/.test(meetingId)) {
    throw new BoardError("invalid-argument", "Reunião inválida.")
  }
  return { meetingId, person: text(person, 120) }
}
