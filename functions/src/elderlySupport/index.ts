import * as admin from "firebase-admin"
import * as functions from "firebase-functions"
import {
  ELDERLY_SUPPORT_SCHEDULES,
  ElderlySupportError,
  scheduleFromData,
  scheduleToData,
  type ElderlyCaller,
  type ElderlySchedule,
  type ElderlyScheduleStore,
  type ElderlySupportDeps,
  createSchedule,
  getSchedule,
  listSchedules,
  publishSchedule,
  unpublishSchedule,
  updateAssignments,
} from "./schedule"

function timestampToIso(value: unknown) {
  if (value instanceof admin.firestore.Timestamp) return value.toDate().toISOString()
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "string") return value
  return ""
}

function toFirestore(schedule: ElderlySchedule) {
  const data = scheduleToData(schedule)
  return {
    ...data,
    createdAt: admin.firestore.Timestamp.fromDate(new Date(schedule.createdAt)),
    updatedAt: admin.firestore.Timestamp.fromDate(new Date(schedule.updatedAt)),
  }
}

function fromFirestore(id: string, data: FirebaseFirestore.DocumentData) {
  return scheduleFromData(id, {
    ...data,
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
  })
}

function firestoreStore(): ElderlyScheduleStore {
  const collection = () => admin.firestore().collection(ELDERLY_SUPPORT_SCHEDULES)
  return {
    async create(schedule) {
      await collection().doc(schedule.id).set(toFirestore(schedule))
    },
    async save(schedule) {
      await collection().doc(schedule.id).set(toFirestore(schedule))
    },
    async get(id) {
      const snapshot = await collection().doc(id).get()
      if (!snapshot.exists) return null
      return fromFirestore(snapshot.id, snapshot.data() ?? {})
    },
    async listByCongregation(congregationId) {
      const snapshot = await collection().where("congregationId", "==", congregationId).get()
      return snapshot.docs.map((doc) => fromFirestore(doc.id, doc.data()))
    },
  }
}

function deps(): ElderlySupportDeps {
  return {
    store: firestoreStore(),
    now: () => new Date(),
    newId: () => admin.firestore().collection(ELDERLY_SUPPORT_SCHEDULES).doc().id,
  }
}

function rethrow(error: unknown): never {
  if (error instanceof functions.https.HttpsError) throw error
  if (error instanceof ElderlySupportError) {
    throw new functions.https.HttpsError(error.code, error.message)
  }
  functions.logger.error("elderlySupport", error)
  throw new functions.https.HttpsError("internal", "Não foi possível concluir a operação.")
}

async function callerFrom(context: functions.https.CallableContext): Promise<ElderlyCaller> {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "É preciso entrar na conta.")
  }
  const snapshot = await admin.firestore().collection("users").doc(context.auth.uid).get()
  const data = snapshot.data() ?? {}
  return {
    uid: context.auth.uid,
    role: typeof data.role === "string" ? data.role : undefined,
    congregationId: typeof data.congregationId === "string" ? data.congregationId : undefined,
    manageFlags: data.manageFlags,
  }
}

async function run<T>(
  context: functions.https.CallableContext,
  action: (caller: ElderlyCaller, deps: ElderlySupportDeps) => Promise<T>,
) {
  try {
    return await action(await callerFrom(context), deps())
  } catch (error) {
    rethrow(error)
  }
}

export const createElderlySupportSchedule = functions.https.onCall(
  async (data: { title?: unknown; note?: unknown; congregationId?: unknown; assignments?: unknown } | null, context) => {
    return run(context, (caller, dependencies) => createSchedule(dependencies, caller, data ?? {}))
  },
)

export const listElderlySupportSchedules = functions.https.onCall(
  async (data: { congregationId?: unknown; from?: unknown; to?: unknown } | null, context) => {
    const schedules = await run(context, (caller, dependencies) => listSchedules(dependencies, caller, data ?? {}))
    return { schedules }
  },
)

export const getElderlySupportSchedule = functions.https.onCall(
  async (data: { scheduleId?: unknown } | null, context) => {
    return run(context, (caller, dependencies) => getSchedule(dependencies, caller, data ?? {}))
  },
)

export const updateElderlySupportAssignments = functions.https.onCall(
  async (data: { scheduleId?: unknown; assignments?: unknown; note?: unknown } | null, context) => {
    return run(context, (caller, dependencies) => updateAssignments(dependencies, caller, data ?? {}))
  },
)

export const publishElderlySupportSchedule = functions.https.onCall(
  async (data: { scheduleId?: unknown } | null, context) => {
    return run(context, (caller, dependencies) => publishSchedule(dependencies, caller, data ?? {}))
  },
)

export const unpublishElderlySupportSchedule = functions.https.onCall(
  async (data: { scheduleId?: unknown } | null, context) => {
    return run(context, (caller, dependencies) => unpublishSchedule(dependencies, caller, data ?? {}))
  },
)
