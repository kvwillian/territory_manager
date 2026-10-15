import * as admin from "firebase-admin"
import * as functions from "firebase-functions"
import { linesFromPdf } from "./meetingWorkbook/layout"
import { meetingDateInWeek, parseWorkbookLines } from "./meetingWorkbook/parse"
import {
  FILE_TTL_MS,
  IMPORT_TTL_MS,
  acceptDecision,
  assertImportId,
  assertPdfPayload,
  callerCongregationId,
  canManageMeetings,
  evaluateReviewedProgram,
  importFilePath,
  importIsComplete,
  isExpired,
  meetingProgramId,
  type CallerProfile,
  type ReviewedSection,
  type WeekState,
} from "./meetingWorkbook/policy"

const IMPORTS = "meetingImports"
const MEETINGS = "meetingPrograms"
const BUCKET = process.env.STORAGE_BUCKET || "territory-manager-f3eef.firebasestorage.app"

function storage() {
  return admin.storage().bucket(BUCKET)
}

async function requireManager(context: functions.https.CallableContext) {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "É preciso entrar na conta.")
  }
  const snapshot = await admin.firestore().collection("users").doc(context.auth.uid).get()
  const profile = (snapshot.data() ?? null) as CallerProfile | null
  const congregationId = callerCongregationId(profile)
  if (!canManageMeetings(profile) || !congregationId) {
    throw new functions.https.HttpsError("permission-denied", "Você não pode gerenciar as reuniões desta congregação.")
  }
  return { uid: context.auth.uid, congregationId }
}

function readImportId(value: unknown) {
  try {
    return assertImportId(value)
  } catch (error) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      error instanceof Error ? error.message : "Identificador inválido.",
    )
  }
}

async function removeFile(path: string) {
  try {
    await storage().file(path).delete({ ignoreNotFound: true })
    return true
  } catch (error) {
    functions.logger.error("meeting import file delete failed", { path, error })
    return false
  }
}

function emptyDuties(prefix: string) {
  return [
    { id: `${prefix}-president`, label: "Presidente", people: [""] },
    { id: `${prefix}-prayer`, label: "Oração final", people: [""] },
    { id: `${prefix}-attendants`, label: "Indicadores", people: ["", ""] },
    { id: `${prefix}-ushers`, label: "Volantes", people: ["", ""] },
    { id: `${prefix}-av`, label: "Áudio e Vídeo", people: ["", ""] },
  ]
}

export const processMeetingImport = functions
  .runWith({ timeoutSeconds: 120, memory: "512MB" })
  .https.onCall(async (data: { importId?: string }, context) => {
    const manager = await requireManager(context)
    const importId = readImportId(data?.importId)
    const path = importFilePath(manager.uid, importId)
    const file = storage().file(path)
    const [exists] = await file.exists()
    if (!exists) {
      throw new functions.https.HttpsError("not-found", "O PDF temporário não foi encontrado.")
    }
    const [buffer] = await file.download()
    try {
      assertPdfPayload(buffer.length, buffer.subarray(0, 4))
    } catch (error) {
      await removeFile(path)
      throw new functions.https.HttpsError("invalid-argument", error instanceof Error ? error.message : "PDF inválido.")
    }
    let parsed: ReturnType<typeof parseWorkbookLines>
    try {
      const lines = await linesFromPdf(new Uint8Array(buffer))
      parsed = parseWorkbookLines(lines)
    } catch (error) {
      await removeFile(path)
      functions.logger.error("meeting pdf parse failed", error)
      throw new functions.https.HttpsError("invalid-argument", "Não foi possível ler este PDF.")
    }
    if (parsed.weeks.length === 0) {
      await removeFile(path)
      throw new functions.https.HttpsError(
        "invalid-argument",
        parsed.alerts[0] ?? "Nenhuma programação foi encontrada no PDF.",
      )
    }
    const congregation = await admin.firestore().collection("congregations").doc(manager.congregationId).get()
    const weekday = congregation.data()?.midweekWeekday
    const time = typeof congregation.data()?.midweekTime === "string" ? congregation.data()?.midweekTime : "19:30"
    const weeks = parsed.weeks.map((week) => {
      const alerts = [...week.alerts]
      let isoDate = week.weekStart
      if (week.weekStart && week.weekEnd && typeof weekday === "number") {
        isoDate = meetingDateInWeek(week.weekStart, week.weekEnd, weekday)
      } else if (week.weekStart) {
        alerts.push("Confirme a data da reunião. O dia de meio de semana da congregação não está definido.")
      }
      const status: WeekState = alerts.some((alert) => alert.includes("não teve partes") || alert.includes("não termina"))
        ? "error"
        : "pending"
      return {
        id: week.id,
        label: week.label,
        weekStart: week.weekStart,
        weekEnd: week.weekEnd,
        isoDate,
        time,
        alerts,
        status,
        sections: week.sections,
      }
    })
    await admin.firestore().collection(IMPORTS).doc(importId).set({
      congregationId: manager.congregationId,
      createdBy: manager.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "review",
      fileDeleted: false,
      weeks,
    })
    const fileDeleted = await removeFile(path)
    if (fileDeleted) {
      await admin.firestore().collection(IMPORTS).doc(importId).update({ fileDeleted: true })
    }
    return { importId, fileDeleted, weeks }
  })

export const acceptMeetingWeek = functions.https.onCall(
  async (
    data: {
      importId?: string
      weekId?: string
      acknowledgeAlerts?: boolean
      isoDate?: string
      sections?: ReviewedSection[]
    },
    context,
  ) => {
    const manager = await requireManager(context)
    const importId = readImportId(data?.importId)
    if (typeof data?.weekId !== "string" || !data.weekId) {
      throw new functions.https.HttpsError("invalid-argument", "Semana inválida.")
    }
    const ref = admin.firestore().collection(IMPORTS).doc(importId)
    const snapshot = await ref.get()
    if (!snapshot.exists) {
      throw new functions.https.HttpsError("not-found", "Esta importação não está mais disponível.")
    }
    const record = snapshot.data() ?? {}
    if (record.congregationId !== manager.congregationId) {
      throw new functions.https.HttpsError("permission-denied", "Esta importação é de outra congregação.")
    }
    const weeks = (record.weeks ?? []) as Array<Record<string, unknown>>
    const index = weeks.findIndex((week) => week.id === data.weekId)
    if (index < 0) throw new functions.https.HttpsError("not-found", "Semana não encontrada nesta importação.")
    const week = weeks[index]
    const sections = Array.isArray(data.sections) ? data.sections : []
    const isoDate = typeof data.isoDate === "string" ? data.isoDate : ""
    const review = evaluateReviewedProgram({
      isoDate,
      weekStart: typeof week.weekStart === "string" ? week.weekStart : null,
      weekEnd: typeof week.weekEnd === "string" ? week.weekEnd : null,
      sections,
    })
    const meetingId = meetingProgramId(manager.congregationId, isoDate)
    const meetingRef = admin.firestore().collection(MEETINGS).doc(meetingId)
    const existing = await meetingRef.get()
    if (existing.exists && existing.data()?.importId === importId) {
      weeks[index] = { ...week, status: "accepted", meetingId }
      await ref.update({ weeks })
      return { status: "accepted", meetingId, warnings: review.warnings }
    }
    const decision = acceptDecision({
      weekStatus: (week.status as WeekState) ?? "pending",
      meetingExists: existing.exists,
      errors: review.errors,
      warnings: review.warnings,
      acknowledgeAlerts: data.acknowledgeAlerts === true,
    })
    if (decision.action === "reject") {
      throw new functions.https.HttpsError("failed-precondition", decision.reason ?? "A programação precisa de revisão.", {
        errors: review.errors,
        warnings: review.warnings,
      })
    }
    if (decision.action === "idempotent") {
      return { status: "accepted", meetingId: week.meetingId ?? meetingId, warnings: review.warnings }
    }
    if (decision.action === "duplicate") {
      weeks[index] = { ...week, status: "duplicate", meetingId }
      await ref.update({ weeks })
      return { status: "duplicate", meetingId, warnings: ["Já existe uma reunião nesta data. Ela não foi alterada."] }
    }
    const time = typeof week.time === "string" ? week.time : "19:30"
    const savedSections = sections.map((section, sectionIndex) => ({
      id: `${meetingId}-s${sectionIndex}`,
      title: section.title,
      token: section.token,
      parts: section.parts.map((part, partIndex) => {
        const study = part.title
          .normalize("NFD")
          .replace(/\p{M}/gu, "")
          .toLowerCase()
          .includes("estudo biblico de congregacao")
        return {
          id: `${meetingId}-p${sectionIndex}-${partIndex}`,
          title: part.title.trim(),
          durationMinutes: part.durationMinutes,
          pinned: study,
          roles: study
            ? [
                { id: `${meetingId}-dir`, label: "Dirigente", showLabel: true, personName: "" },
                { id: `${meetingId}-read`, label: "Leitor", showLabel: true, personName: "" },
              ]
            : [{ id: `${meetingId}-r${sectionIndex}-${partIndex}`, label: "Participante", showLabel: false, personName: "" }],
        }
      }),
    }))
    await admin.firestore().runTransaction(async (transaction) => {
      const current = await transaction.get(meetingRef)
      if (current.exists) return
      transaction.set(meetingRef, {
        congregationId: manager.congregationId,
        kind: "midweek",
        isoDate,
        weekStart: week.weekStart ?? null,
        weekEnd: week.weekEnd ?? null,
        time,
        status: "draft",
        sections: savedSections,
        duties: emptyDuties(meetingId),
        notes: "",
        source: "workbook-import",
        importId,
      })
    })
    const after = await meetingRef.get()
    if (after.exists && after.data()?.importId !== importId && after.data()?.source === "workbook-import") {
      weeks[index] = { ...week, status: "duplicate", meetingId }
      await ref.update({ weeks })
      return { status: "duplicate", meetingId, warnings: ["Já existe uma reunião nesta data. Ela não foi alterada."] }
    }
    if (after.exists && after.data()?.importId !== importId) {
      weeks[index] = { ...week, status: "duplicate", meetingId }
      await ref.update({ weeks })
      return { status: "duplicate", meetingId, warnings: ["Já existe uma reunião nesta data. Ela não foi alterada."] }
    }
    weeks[index] = { ...week, status: "accepted", meetingId, isoDate, sections }
    const statuses = weeks.map((item) => item.status as WeekState)
    if (importIsComplete(statuses)) {
      await ref.delete()
    } else {
      await ref.update({ weeks, status: "review" })
    }
    return {
      status: "accepted",
      meetingId,
      warnings: review.warnings,
      meeting: {
        id: meetingId,
        kind: "midweek",
        isoDate,
        time,
        status: "draft",
        sections: savedSections,
        duties: emptyDuties(meetingId),
        notes: "",
      },
    }
  },
)

export const cancelMeetingImport = functions.https.onCall(async (data: { importId?: string }, context) => {
  const manager = await requireManager(context)
  const importId = readImportId(data?.importId)
  const ref = admin.firestore().collection(IMPORTS).doc(importId)
  const snapshot = await ref.get()
  if (snapshot.exists && snapshot.data()?.congregationId !== manager.congregationId) {
    throw new functions.https.HttpsError("permission-denied", "Esta importação é de outra congregação.")
  }
  const path = importFilePath(manager.uid, importId)
  const fileDeleted = await removeFile(path)
  if (snapshot.exists) await ref.delete()
    return { cancelled: true, fileDeleted }
})

function weekendIso(midweekIso: string, weekendWeekday: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(midweekIso)) return null
  const target = weekendWeekday === 7 ? 0 : weekendWeekday
  if (target < 0 || target > 6) return null
  const [year, month, day] = midweekIso.split("-").map(Number)
  const date = new Date(year, month - 1, day)
  const delta = (target - date.getDay() + 7) % 7
  date.setDate(date.getDate() + delta)
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${mm}-${dd}`
}

function weekendProgram(congregationId: string, isoDate: string, time: string) {
  const id = `weekend_${congregationId}_${isoDate}`
  return {
    id,
    data: {
      congregationId,
      kind: "weekend",
      isoDate,
      time,
      status: "draft",
      notes: "",
      source: "weekend-from-midweek",
      duties: [
        { id: `${isoDate}-attendants`, label: "Indicadores", people: ["", ""] },
        { id: `${isoDate}-ushers`, label: "Volantes", people: ["", ""] },
        { id: `${isoDate}-av`, label: "Áudio e Vídeo", people: ["", ""] },
      ],
      sections: [
        {
          id: `${isoDate}-program`,
          title: "Programa",
          token: "neutral",
          parts: [
            { id: `${isoDate}-open`, title: "Oração inicial", durationMinutes: 3, roles: [{ id: `${isoDate}-open-a`, label: "Oração", showLabel: false, personName: "" }] },
            { id: `${isoDate}-chair`, title: "Presidente", durationMinutes: 5, roles: [{ id: `${isoDate}-chair-a`, label: "Presidente", showLabel: false, personName: "" }] },
            { id: `${isoDate}-talk`, title: "Discurso público", durationMinutes: 30, roles: [{ id: `${isoDate}-talk-a`, label: "Orador", showLabel: false, personName: "" }] },
            {
              id: `${isoDate}-wt`,
              title: "A Sentinela",
              durationMinutes: 30,
              pinned: true,
              roles: [
                { id: `${isoDate}-wt-a`, label: "Dirigente", showLabel: true, personName: "" },
                { id: `${isoDate}-wt-b`, label: "Leitor", showLabel: true, personName: "" },
              ],
            },
          ],
        },
      ],
    },
  }
}

async function saveMissingWeekends(congregationId: string) {
  const congregation = await admin.firestore().collection("congregations").doc(congregationId).get()
  const data = congregation.data() ?? {}
  const weekendWeekday = typeof data.weekendWeekday === "number" ? data.weekendWeekday : 7
  const weekendTime = typeof data.weekendTime === "string" ? data.weekendTime : "10:00"
  const snapshot = await admin.firestore().collection(MEETINGS).where("congregationId", "==", congregationId).get()
  const weekends = new Set(
    snapshot.docs
      .filter((item) => item.data().kind === "weekend" && typeof item.data().isoDate === "string")
      .map((item) => item.data().isoDate as string),
  )
  const batch = admin.firestore().batch()
  let created = 0
  for (const item of snapshot.docs) {
    const meeting = item.data()
    if (meeting.kind !== "midweek" || typeof meeting.isoDate !== "string") continue
    const isoDate = weekendIso(meeting.isoDate, weekendWeekday)
    if (!isoDate || weekends.has(isoDate)) continue
    const weekend = weekendProgram(congregationId, isoDate, weekendTime)
    batch.set(admin.firestore().collection(MEETINGS).doc(weekend.id), weekend.data)
    weekends.add(isoDate)
    created += 1
  }
  if (created > 0) await batch.commit()
  return created
}

export const ensureWeekendMeetings = functions.https.onCall(async (_data: unknown, context) => {
  const manager = await requireManager(context)
  const created = await saveMissingWeekends(manager.congregationId)
  return { created }
})

export const cleanupMeetingImportFiles = functions.pubsub.schedule("every 60 minutes").onRun(async () => {
  const now = Date.now()
  const [files] = await storage().getFiles({ prefix: "meeting-imports/" })
  await Promise.all(
    files.map(async (file) => {
      const created = Date.parse(file.metadata.timeCreated ?? "")
      if (!Number.isNaN(created) && isExpired(created, now, FILE_TTL_MS)) {
        await file.delete({ ignoreNotFound: true }).catch((error) => {
          functions.logger.error("orphan pdf delete failed", { name: file.name, error })
        })
      }
    }),
  )
  const imports = await admin.firestore().collection(IMPORTS).get()
  await Promise.all(
    imports.docs.map(async (doc) => {
      const createdAt = doc.data().createdAt?.toDate?.() as Date | undefined
      if (!createdAt || !isExpired(createdAt.getTime(), now, IMPORT_TTL_MS)) return
      const createdBy = doc.data().createdBy
      if (typeof createdBy === "string") {
        await removeFile(importFilePath(createdBy, doc.id))
      }
      await doc.ref.delete()
    }),
  )
})
