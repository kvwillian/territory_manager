export const MAX_PDF_BYTES = 8 * 1024 * 1024
export const FILE_TTL_MS = 6 * 60 * 60 * 1000
export const IMPORT_TTL_MS = 48 * 60 * 60 * 1000

const IMPORT_ID = /^[A-Za-z0-9-]{8,80}$/

export type CallerProfile = {
  role?: string
  congregationId?: string
  manageFlags?: unknown
}

export function canManageMeetings(profile: CallerProfile | null) {
  if (!profile) return false
  if (profile.role === "admin" && typeof profile.congregationId === "string" && profile.congregationId.length > 0) {
    return true
  }
  return (
    Array.isArray(profile.manageFlags) &&
    profile.manageFlags.includes("meetings") &&
    typeof profile.congregationId === "string" &&
    profile.congregationId.length > 0
  )
}

export function callerCongregationId(profile: CallerProfile | null) {
  if (!canManageMeetings(profile) || !profile?.congregationId) return null
  return profile.congregationId
}

export function assertImportId(importId: unknown) {
  if (typeof importId !== "string" || !IMPORT_ID.test(importId)) {
    throw new Error("Identificador de importação inválido.")
  }
  return importId
}

export function importFilePath(congregationId: string, importId: string) {
  if (!congregationId || congregationId.includes("/") || congregationId.includes("..")) {
    throw new Error("Congregação inválida.")
  }
  return `meeting-imports/${congregationId}/${assertImportId(importId)}/source.pdf`
}

export function assertPdfPayload(bytes: number, header: Uint8Array) {
  if (bytes <= 0) throw new Error("O arquivo está vazio.")
  if (bytes > MAX_PDF_BYTES) throw new Error("O PDF passa de 8 MB.")
  const signature = String.fromCharCode(...header.slice(0, 4))
  if (signature !== "%PDF") throw new Error("O arquivo não é um PDF.")
}

export type WeekState = "pending" | "accepted" | "duplicate" | "error"

export function acceptDecision(input: {
  weekStatus: WeekState
  meetingExists: boolean
  errors: string[]
  warnings: string[]
  acknowledgeAlerts: boolean
}) {
  if (input.weekStatus === "accepted") return { action: "idempotent" as const }
  if (input.errors.length > 0) return { action: "reject" as const, reason: input.errors[0] }
  if (input.meetingExists) return { action: "duplicate" as const }
  if (input.warnings.length > 0 && !input.acknowledgeAlerts) {
    return { action: "reject" as const, reason: "Confirme os alertas antes de salvar." }
  }
  return { action: "create" as const }
}

export function importIsComplete(statuses: WeekState[]) {
  return statuses.length > 0 && statuses.every((status) => status === "accepted" || status === "duplicate")
}

export function isExpired(createdAtMs: number, nowMs: number, ttlMs: number) {
  return nowMs - createdAtMs >= ttlMs
}

export function meetingProgramId(congregationId: string, isoDate: string) {
  return `midweek_${congregationId}_${isoDate}`
}

export type ReviewedSection = {
  token: "treasures" | "ministry" | "christianLife"
  title: string
  parts: { title: string; durationMinutes: number }[]
}

export function evaluateReviewedProgram(input: {
  isoDate: string
  weekStart: string | null
  weekEnd: string | null
  sections: ReviewedSection[]
}) {
  const errors: string[] = []
  const warnings: string[] = []
  const tokens = input.sections.map((section) => section.token)
  if (tokens.join(",") !== "treasures,ministry,christianLife") {
    errors.push("A reunião precisa ter as três seções, nesta ordem.")
  }
  for (const section of input.sections) {
    if (section.parts.length === 0) errors.push(`A seção “${section.title}” está vazia.`)
    for (const part of section.parts) {
      if (!part.title.trim()) errors.push("Há uma parte sem título.")
      if (!Number.isInteger(part.durationMinutes) || part.durationMinutes < 1 || part.durationMinutes > 60) {
        errors.push(`A duração de “${part.title || "parte"}” não é válida.`)
      }
    }
  }
  const closing = input.sections[2]?.parts[input.sections[2].parts.length - 1]
    const folded = (closing?.title ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/ /g, "")
  if (!folded.includes("estudobiblicodecongregacao")) {
    errors.push("A última parte precisa ser o Estudo bíblico de congregação.")
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.isoDate) || Number.isNaN(Date.parse(input.isoDate + "T12:00:00"))) {
    errors.push("A data da reunião é inválida.")
  } else if (input.weekStart && input.weekEnd && (input.isoDate < input.weekStart || input.isoDate > input.weekEnd)) {
    warnings.push("A data escolhida está fora do intervalo desta semana da apostila.")
  }
  return { errors, warnings }
}
