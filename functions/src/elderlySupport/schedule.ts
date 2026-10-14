// Elderly support schedules. Assignments stay inside the schedule document.
// Publisher ids point at publishers/{id} and are optional: names work on their own.

export const ELDERLY_SUPPORT_SCHEDULES = "elderlySupportSchedules"
export const ELDERLY_SUPPORT_FLAG = "elderlySupport"

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

export type ScheduleStatus = "draft" | "published"

export type ElderlyAssignment = {
  date: string
  elderlyName: string
  elderlyPublisherId?: string
  driverName: string
  driverPublisherId?: string
}

export type ElderlySchedule = {
  id: string
  congregationId: string
  title?: string
  note?: string
  status: ScheduleStatus
  createdAt: string
  updatedAt: string
  createdBy: string
  assignments: ElderlyAssignment[]
}

export type ElderlyCaller = {
  uid: string
  role?: string
  congregationId?: string
  manageFlags?: unknown
}

export class ElderlySupportError extends Error {
  constructor(
    readonly code: "permission-denied" | "invalid-argument" | "not-found",
    message: string,
  ) {
    super(message)
    this.name = "ElderlySupportError"
  }
}

export type ElderlyScheduleStore = {
  create(schedule: ElderlySchedule): Promise<void>
  save(schedule: ElderlySchedule): Promise<void>
  get(id: string): Promise<ElderlySchedule | null>
  listByCongregation(congregationId: string): Promise<ElderlySchedule[]>
}

export type ElderlySupportDeps = {
  store: ElderlyScheduleStore
  now: () => Date
  newId: () => string
}

export function canManageElderlySupport(profile: ElderlyCaller | null) {
  if (!profile) return false
  const congregationId = profile.congregationId
  if (typeof congregationId !== "string" || congregationId.length === 0) return false
  if (profile.role === "admin") return true
  return Array.isArray(profile.manageFlags) && profile.manageFlags.includes(ELDERLY_SUPPORT_FLAG)
}

export function scheduleToData(schedule: ElderlySchedule) {
  const data: Record<string, unknown> = {
    congregationId: schedule.congregationId,
    status: schedule.status,
    createdAt: schedule.createdAt,
    updatedAt: schedule.updatedAt,
    createdBy: schedule.createdBy,
    assignments: schedule.assignments.map(assignmentToData),
  }
  if (schedule.title) data.title = schedule.title
  if (schedule.note) data.note = schedule.note
  return data
}

export function scheduleFromData(id: string, data: Record<string, unknown>): ElderlySchedule {
  const schedule: ElderlySchedule = {
    id,
    congregationId: typeof data.congregationId === "string" ? data.congregationId : "",
    status: data.status === "published" ? "published" : "draft",
    createdAt: typeof data.createdAt === "string" ? data.createdAt : "",
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : "",
    createdBy: typeof data.createdBy === "string" ? data.createdBy : "",
    assignments: Array.isArray(data.assignments) ? data.assignments.map(assignmentFromData) : [],
  }
  if (typeof data.title === "string" && data.title.trim()) schedule.title = data.title
  if (typeof data.note === "string" && data.note.trim()) schedule.note = data.note.trim()
  return schedule
}

function assignmentToData(item: ElderlyAssignment) {
  const row: Record<string, string> = {
    date: item.date,
    elderlyName: item.elderlyName,
    driverName: item.driverName,
  }
  if (item.elderlyPublisherId) row.elderlyPublisherId = item.elderlyPublisherId
  if (item.driverPublisherId) row.driverPublisherId = item.driverPublisherId
  return row
}

function assignmentFromData(value: unknown): ElderlyAssignment {
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {}
  const assignment: ElderlyAssignment = {
    date: typeof row.date === "string" ? row.date : "",
    elderlyName: typeof row.elderlyName === "string" ? row.elderlyName : "",
    driverName: typeof row.driverName === "string" ? row.driverName : "",
  }
  if (typeof row.elderlyPublisherId === "string" && row.elderlyPublisherId) {
    assignment.elderlyPublisherId = row.elderlyPublisherId
  }
  if (typeof row.driverPublisherId === "string" && row.driverPublisherId) {
    assignment.driverPublisherId = row.driverPublisherId
  }
  return assignment
}

function requireManager(caller: ElderlyCaller) {
  if (!canManageElderlySupport(caller) || !caller.congregationId) {
    throw new ElderlySupportError(
      "permission-denied",
      "Você não pode gerenciar o suporte a idosos desta congregação.",
    )
  }
  return { uid: caller.uid, congregationId: caller.congregationId }
}

function assertSameCongregation(congregationId: string, requested: unknown) {
  if (requested == null || requested === "") return
  if (requested !== congregationId) {
    throw new ElderlySupportError("permission-denied", "Não é possível acessar outra congregação.")
  }
}

function assertIsoDate(value: unknown, label: string) {
  if (typeof value !== "string" || !ISO_DATE.test(value)) {
    throw new ElderlySupportError("invalid-argument", `${label} deve estar no formato AAAA-MM-DD.`)
  }
  const year = Number(value.slice(0, 4))
  const month = Number(value.slice(5, 7))
  const day = Number(value.slice(8, 10))
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new ElderlySupportError("invalid-argument", `${label} não é uma data válida.`)
  }
  return value
}

function requiredName(value: unknown, label: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ElderlySupportError("invalid-argument", `${label} é obrigatório.`)
  }
  return value.trim()
}

function optionalName(value: unknown, label: string) {
  if (value == null || value === "") return ""
  if (typeof value !== "string") {
    throw new ElderlySupportError("invalid-argument", `${label} é inválido.`)
  }
  return value.trim()
}

function optionalPublisherId(value: unknown, label: string) {
  if (value == null || value === "") return undefined
  if (typeof value !== "string") {
    throw new ElderlySupportError("invalid-argument", `${label} é inválido.`)
  }
  const id = value.trim()
  return id || undefined
}

export function normalizeAssignments(value: unknown): ElderlyAssignment[] {
  if (value == null) return []
  if (!Array.isArray(value)) {
    throw new ElderlySupportError("invalid-argument", "As designações precisam ser uma lista.")
  }
  return value.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new ElderlySupportError("invalid-argument", `A designação ${index + 1} é inválida.`)
    }
    const row = item as Record<string, unknown>
    const place = index + 1
    const assignment: ElderlyAssignment = {
      date: assertIsoDate(row.date, `A data da designação ${place}`),
      elderlyName: requiredName(row.elderlyName, `O nome do idoso na designação ${place}`),
      driverName: optionalName(row.driverName, `O nome do motorista na designação ${place}`),
    }
    const elderlyPublisherId = optionalPublisherId(
      row.elderlyPublisherId,
      `O publicador do idoso na designação ${place}`,
    )
    const driverPublisherId = optionalPublisherId(
      row.driverPublisherId,
      `O publicador do motorista na designação ${place}`,
    )
    if (elderlyPublisherId) assignment.elderlyPublisherId = elderlyPublisherId
    if (assignment.driverName && driverPublisherId) assignment.driverPublisherId = driverPublisherId
    return assignment
  })
}

function normalizeTitle(value: unknown) {
  if (value == null || value === "") return undefined
  if (typeof value !== "string") {
    throw new ElderlySupportError("invalid-argument", "O título da escala é inválido.")
  }
  const title = value.trim()
  return title || undefined
}

function normalizeNote(value: unknown) {
  if (value == null || value === "") return undefined
  if (typeof value !== "string") {
    throw new ElderlySupportError("invalid-argument", "A observação é inválida.")
  }
  const note = value.trim()
  return note || undefined
}

function assertScheduleId(value: unknown) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ElderlySupportError("invalid-argument", "A escala é inválida.")
  }
  return value.trim()
}

async function loadOwned(deps: ElderlySupportDeps, congregationId: string, scheduleId: unknown) {
  const id = assertScheduleId(scheduleId)
  const schedule = await deps.store.get(id)
  if (!schedule) throw new ElderlySupportError("not-found", "Escala não encontrada.")
  if (schedule.congregationId !== congregationId) {
    throw new ElderlySupportError("permission-denied", "Esta escala é de outra congregação.")
  }
  return schedule
}

function overlapsPeriod(schedule: ElderlySchedule, from: string, to: string) {
  return schedule.assignments.some((item) => item.date >= from && item.date <= to)
}

function earliestDate(schedule: ElderlySchedule) {
  let earliest = ""
  for (const item of schedule.assignments) {
    if (!earliest || item.date < earliest) earliest = item.date
  }
  return earliest
}

export async function createSchedule(
  deps: ElderlySupportDeps,
  caller: ElderlyCaller,
  input: { title?: unknown; note?: unknown; congregationId?: unknown; assignments?: unknown },
) {
  const manager = requireManager(caller)
  assertSameCongregation(manager.congregationId, input.congregationId)
  const now = deps.now().toISOString()
  const schedule: ElderlySchedule = {
    id: deps.newId(),
    congregationId: manager.congregationId,
    status: "draft",
    createdAt: now,
    updatedAt: now,
    createdBy: manager.uid,
    assignments: normalizeAssignments(input.assignments),
  }
  const title = normalizeTitle(input.title)
  if (title) schedule.title = title
  const note = normalizeNote(input.note)
  if (note) schedule.note = note
  await deps.store.create(schedule)
  return schedule
}

export async function listSchedules(
  deps: ElderlySupportDeps,
  caller: ElderlyCaller,
  input: { congregationId?: unknown; from?: unknown; to?: unknown },
) {
  const manager = requireManager(caller)
  assertSameCongregation(manager.congregationId, input.congregationId)
  const from = assertIsoDate(input.from, "O início do período")
  const to = assertIsoDate(input.to, "O fim do período")
  if (from > to) throw new ElderlySupportError("invalid-argument", "O período informado é inválido.")
  const schedules = await deps.store.listByCongregation(manager.congregationId)
  return schedules
    .filter((schedule) => overlapsPeriod(schedule, from, to))
    .sort((a, b) => {
      const aDate = earliestDate(a)
      const bDate = earliestDate(b)
      if (aDate !== bDate) return aDate < bDate ? -1 : 1
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
    })
}

export async function getSchedule(
  deps: ElderlySupportDeps,
  caller: ElderlyCaller,
  input: { scheduleId?: unknown },
) {
  const manager = requireManager(caller)
  return loadOwned(deps, manager.congregationId, input.scheduleId)
}

export async function updateAssignments(
  deps: ElderlySupportDeps,
  caller: ElderlyCaller,
  input: { scheduleId?: unknown; assignments?: unknown; note?: unknown },
) {
  const manager = requireManager(caller)
  const current = await loadOwned(deps, manager.congregationId, input.scheduleId)
  const next: ElderlySchedule = {
    ...current,
    assignments: normalizeAssignments(input.assignments),
    updatedAt: deps.now().toISOString(),
  }
  if ("note" in input) {
    const note = normalizeNote(input.note)
    if (note) next.note = note
    else delete next.note
  }
  await deps.store.save(next)
  return next
}

async function setStatus(
  deps: ElderlySupportDeps,
  caller: ElderlyCaller,
  scheduleId: unknown,
  status: ScheduleStatus,
) {
  const manager = requireManager(caller)
  const current = await loadOwned(deps, manager.congregationId, scheduleId)
  if (current.status === status) return current
  const next: ElderlySchedule = { ...current, status, updatedAt: deps.now().toISOString() }
  await deps.store.save(next)
  return next
}

export function publishSchedule(deps: ElderlySupportDeps, caller: ElderlyCaller, input: { scheduleId?: unknown }) {
  return setStatus(deps, caller, input.scheduleId, "published")
}

export function unpublishSchedule(deps: ElderlySupportDeps, caller: ElderlyCaller, input: { scheduleId?: unknown }) {
  return setStatus(deps, caller, input.scheduleId, "draft")
}
