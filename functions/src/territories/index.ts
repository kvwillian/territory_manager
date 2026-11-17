import * as admin from "firebase-admin"
import * as functions from "firebase-functions"

const WORK_SESSIONS = "workSessions"

interface CallerProfile {
  role?: unknown
  congregationId?: unknown
  manageFlags?: unknown
}

export interface TerritoryHistoryImportPayloadItem {
  docId: string
  importSourceKey: string
  territoryId: string
  conductorUserId?: string | null
  conductorPublisherId?: string | null
  conductorName: string
  conductorRaw?: string
  isoDate: string
  dateEndIso?: string | null
  dateNote?: string | null
  completionState?: "completed" | "partial" | "incomplete"
  periodType?: "morning" | "afternoon" | "sunday" | null
  regionId?: string | null
  regionName?: string
  territoryCodeRaw?: string
  raw?: string
  notes: string
}

function canManageTerritories(profile: CallerProfile | null): boolean {
  if (!profile) return false
  if (profile.role === "admin") return true
  if (Array.isArray(profile.manageFlags) && profile.manageFlags.includes("territories")) {
    return true
  }
  return false
}

function parseIsoDateToTimestamp(isoDate: string): admin.firestore.Timestamp {
  const [y, m, d] = isoDate.split("-").map((v) => Number.parseInt(v, 10))
  const dateObj = new Date(
    Number.isFinite(y) ? y! : 2026,
    (Number.isFinite(m) ? m! : 1) - 1,
    Number.isFinite(d) ? d! : 1,
    12,
    0,
    0,
    0,
  )
  return admin.firestore.Timestamp.fromDate(dateObj)
}

export const importTerritoryHistory = functions.https.onCall(
  async (
    data: {
      congregationId?: unknown
      items?: unknown
      ignoredCount?: unknown
    } | null,
    context,
  ) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "É preciso entrar na conta.")
    }

    const callerUid = context.auth.uid
    const db = admin.firestore()
    const userSnap = await db.collection("users").doc(callerUid).get()
    const profile = (userSnap.data() as CallerProfile | undefined) ?? null
    const callerCongregationId =
      typeof profile?.congregationId === "string" ? profile.congregationId.trim() : ""

    if (!callerCongregationId || !canManageTerritories(profile)) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Você não tem permissão para importar o histórico de territórios desta congregação.",
      )
    }

    const requestedCongregationId =
      typeof data?.congregationId === "string" ? data.congregationId.trim() : ""
    if (requestedCongregationId && requestedCongregationId !== callerCongregationId) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "A congregação informada não corresponde ao perfil do usuário autenticado.",
      )
    }

    if (!Array.isArray(data?.items)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "A lista de registros para importação é inválida.",
      )
    }

    // Load existing workSessions for this congregation to enforce idempotency
    const existingSnap = await db
      .collection(WORK_SESSIONS)
      .where("congregationId", "==", callerCongregationId)
      .get()

    const existingDocIds = new Set<string>()
    const existingSourceKeys = new Set<string>()
    for (const docSnap of existingSnap.docs) {
      existingDocIds.add(docSnap.id)
      const docData = docSnap.data()
      if (typeof docData.importSourceKey === "string" && docData.importSourceKey.trim()) {
        existingSourceKeys.add(docData.importSourceKey.trim())
      }
    }

    const rawItems = data.items as TerritoryHistoryImportPayloadItem[]
    const toWrite: Array<{
      ref: FirebaseFirestore.DocumentReference
      payload: Record<string, unknown>
    }> = []
    let duplicatesSkipped = 0

    for (const item of rawItems) {
      if (!item || typeof item !== "object") continue
      const docId = typeof item.docId === "string" ? item.docId.trim() : ""
      const importSourceKey =
        typeof item.importSourceKey === "string" ? item.importSourceKey.trim() : ""
      const territoryId =
        typeof item.territoryId === "string" ? item.territoryId.trim() : ""
      const isoDate = typeof item.isoDate === "string" ? item.isoDate.trim() : ""

      if (!docId || !importSourceKey || !territoryId || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
        continue
      }

      if (existingDocIds.has(docId) || existingSourceKeys.has(importSourceKey)) {
        duplicatesSkipped += 1
        continue
      }

      existingDocIds.add(docId)
      existingSourceKeys.add(importSourceKey)

      const completionState =
        item.completionState === "partial" || item.completionState === "incomplete"
          ? item.completionState
          : "completed"

      const periodType =
        item.periodType === "morning" ||
        item.periodType === "afternoon" ||
        item.periodType === "sunday"
          ? item.periodType
          : null

      const conductorUserId =
        typeof item.conductorUserId === "string" && item.conductorUserId.trim()
          ? item.conductorUserId.trim()
          : callerUid

      const payload: Record<string, unknown> = {
        congregationId: callerCongregationId,
        territoryId,
        conductorId: conductorUserId,
        conductorPublisherId:
          typeof item.conductorPublisherId === "string" ? item.conductorPublisherId : null,
        conductorName: typeof item.conductorName === "string" ? item.conductorName.trim() : "",
        conductorRaw: typeof item.conductorRaw === "string" ? item.conductorRaw.trim() : "",
        date: parseIsoDateToTimestamp(isoDate),
        isoDate,
        dateEndIso: typeof item.dateEndIso === "string" ? item.dateEndIso : null,
        dateNote: typeof item.dateNote === "string" ? item.dateNote : null,
        segmentsWorked: [],
        completionState,
        periodType,
        regionId: typeof item.regionId === "string" ? item.regionId : null,
        regionName: typeof item.regionName === "string" ? item.regionName : "",
        territoryCodeRaw:
          typeof item.territoryCodeRaw === "string" ? item.territoryCodeRaw : "",
        raw: typeof item.raw === "string" ? item.raw : "",
        notes: typeof item.notes === "string" ? item.notes : "",
        importSourceKey,
        importedAt: admin.firestore.Timestamp.now(),
        importedByUid: callerUid,
      }

      toWrite.push({
        ref: db.collection(WORK_SESSIONS).doc(docId),
        payload,
      })
    }

    const chunkSize = 400
    for (let i = 0; i < toWrite.length; i += chunkSize) {
      const batch = db.batch()
      for (const op of toWrite.slice(i, i + chunkSize)) {
        batch.set(op.ref, op.payload, { merge: true })
      }
      await batch.commit()
    }

    return {
      importedCount: toWrite.length,
      duplicatesSkipped,
      ignoredCount: typeof data?.ignoredCount === "number" ? data.ignoredCount : 0,
    }
  },
)

export const clearTerritoryHistory = functions.https.onCall(
  async (
    data: {
      congregationId?: unknown
      clearWorkSessions?: unknown
      clearAssignments?: unknown
      resetSegments?: unknown
      workSessionIds?: unknown
      assignmentIds?: unknown
    } | null,
    context,
  ) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "É preciso entrar na conta.")
    }

    const callerUid = context.auth.uid
    const db = admin.firestore()
    const userSnap = await db.collection("users").doc(callerUid).get()
    const profile = (userSnap.data() as CallerProfile | undefined) ?? null
    const callerCongregationId =
      typeof profile?.congregationId === "string" ? profile.congregationId.trim() : ""

    if (!callerCongregationId || !canManageTerritories(profile)) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Você não tem permissão para limpar o histórico de territórios desta congregação.",
      )
    }

    const requestedCongregationId =
      typeof data?.congregationId === "string" ? data.congregationId.trim() : ""
    if (requestedCongregationId && requestedCongregationId !== callerCongregationId) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "A congregação informada não corresponde ao perfil do usuário autenticado.",
      )
    }

    const clearWorkSessions = data?.clearWorkSessions !== false
    const clearAssignments = data?.clearAssignments === true
    const resetSegments = data?.resetSegments === true

    const specificWsIds = Array.isArray(data?.workSessionIds)
      ? new Set(data!.workSessionIds.filter((id): id is string => typeof id === "string"))
      : null
    const specificAssignIds = Array.isArray(data?.assignmentIds)
      ? new Set(data!.assignmentIds.filter((id): id is string => typeof id === "string"))
      : null

    const refsToDelete: FirebaseFirestore.DocumentReference[] = []
    const refsToResetSegment: FirebaseFirestore.DocumentReference[] = []

    if (clearWorkSessions) {
      const wsSnap = await db
        .collection(WORK_SESSIONS)
        .where("congregationId", "==", callerCongregationId)
        .get()
      for (const docSnap of wsSnap.docs) {
        if (!specificWsIds || specificWsIds.has(docSnap.id)) {
          refsToDelete.push(docSnap.ref)
        }
      }
    }

    if (clearAssignments) {
      const assignSnap = await db
        .collection("assignments")
        .where("congregationId", "==", callerCongregationId)
        .get()
      for (const docSnap of assignSnap.docs) {
        if (!specificAssignIds || specificAssignIds.has(docSnap.id)) {
          refsToDelete.push(docSnap.ref)
        }
      }
    }

    if (resetSegments) {
      const segSnap = await db
        .collection("segments")
        .where("congregationId", "==", callerCongregationId)
        .get()
      for (const docSnap of segSnap.docs) {
        refsToResetSegment.push(docSnap.ref)
      }
    }

    const chunkSize = 400
    for (let i = 0; i < refsToDelete.length; i += chunkSize) {
      const batch = db.batch()
      for (const ref of refsToDelete.slice(i, i + chunkSize)) {
        batch.delete(ref)
      }
      await batch.commit()
    }

    for (let i = 0; i < refsToResetSegment.length; i += chunkSize) {
      const batch = db.batch()
      for (const ref of refsToResetSegment.slice(i, i + chunkSize)) {
        batch.update(ref, {
          status: "pending",
          lastWorkedDate: admin.firestore.FieldValue.delete(),
        })
      }
      await batch.commit()
    }

    return {
      deletedCount: refsToDelete.length,
      segmentsResetCount: refsToResetSegment.length,
    }
  },
)
