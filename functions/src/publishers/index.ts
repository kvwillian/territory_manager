import * as admin from "firebase-admin"
import * as functions from "firebase-functions"
import {
  PUBLISHER_GROUPS,
  PUBLISHERS,
  PublisherError,
  type PublisherCaller,
  type PublisherDeps,
  type PublisherGroupRecord,
  type PublisherRecord,
  type PublisherStore,
  createPublisher,
  createPublisherGroup,
  deletePublisherGroup,
  deletePublisherRecord,
  listGroupMembers,
  listPublisherGroups,
  listPublishers,
  setGroupSuperintendent,
  setPublisherGroup,
  updatePublisher,
  updatePublisherGroup,
} from "./registry"

function iso(value: unknown) {
  if (value instanceof admin.firestore.Timestamp) return value.toDate().toISOString()
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "string") return value
  return new Date(0).toISOString()
}

function publisherFromDoc(id: string, data: FirebaseFirestore.DocumentData): PublisherRecord {
  const publisher: PublisherRecord = {
    id,
    congregationId: typeof data.congregationId === "string" ? data.congregationId : "",
    name: typeof data.name === "string" ? data.name : "",
    status: data.status === "inactive" ? "inactive" : "active",
    privilege: typeof data.privilege === "string" ? data.privilege : "publisher",
    pioneer: typeof data.pioneer === "string" ? data.pioneer : "none",
    indicador: data.indicador === true,
    microfone: data.microfone === true,
    som: data.som === true,
    estudante: data.estudante === true,
    volante: data.volante === true,
    needsElderlySupport: data.needsElderlySupport === true,
    driver: data.driver === true,
    createdAt: iso(data.createdAt),
    updatedAt: iso(data.updatedAt),
  }
  if (typeof data.phone === "string") publisher.phone = data.phone
  if (typeof data.email === "string") publisher.email = data.email
  if (typeof data.groupId === "string") publisher.groupId = data.groupId
  if (typeof data.userId === "string") publisher.userId = data.userId
  if (data.gender === "feminino" || data.gender === "masculino") publisher.gender = data.gender
  if (typeof data.age === "number") publisher.age = data.age
  return publisher
}

function groupFromDoc(id: string, data: FirebaseFirestore.DocumentData): PublisherGroupRecord {
  const group: PublisherGroupRecord = {
    id,
    congregationId: typeof data.congregationId === "string" ? data.congregationId : "",
    name: typeof data.name === "string" ? data.name : "",
    superintendentPublisherId: typeof data.superintendentPublisherId === "string" ? data.superintendentPublisherId : "",
    createdAt: iso(data.createdAt),
    updatedAt: iso(data.updatedAt),
  }
  if (typeof data.assistantPublisherId === "string") group.assistantPublisherId = data.assistantPublisherId
  if (typeof data.description === "string") group.description = data.description
  return group
}

function withoutEmpty(record: PublisherRecord | PublisherGroupRecord) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined))
}

function firestoreStore(): PublisherStore {
  const db = admin.firestore()
  return {
    async createPublisher(publisher) {
      await db.collection(PUBLISHERS).doc(publisher.id).set(withoutEmpty(publisher))
    },
    async savePublisher(publisher) {
      await db.collection(PUBLISHERS).doc(publisher.id).set(withoutEmpty(publisher))
    },
    async deletePublisher(id) {
      await db.collection(PUBLISHERS).doc(id).delete()
    },
    async getPublisher(id) {
      const snapshot = await db.collection(PUBLISHERS).doc(id).get()
      return snapshot.exists ? publisherFromDoc(snapshot.id, snapshot.data() ?? {}) : null
    },
    async listPublishers(congregationId) {
      const snapshot = await db.collection(PUBLISHERS).where("congregationId", "==", congregationId).get()
      return snapshot.docs.map((item) => publisherFromDoc(item.id, item.data()))
    },
    async createGroup(group) {
      await db.collection(PUBLISHER_GROUPS).doc(group.id).set(withoutEmpty(group))
    },
    async saveGroup(group) {
      await db.collection(PUBLISHER_GROUPS).doc(group.id).set(withoutEmpty(group))
    },
    async deleteGroup(id) {
      await db.collection(PUBLISHER_GROUPS).doc(id).delete()
    },
    async getGroup(id) {
      const snapshot = await db.collection(PUBLISHER_GROUPS).doc(id).get()
      return snapshot.exists ? groupFromDoc(snapshot.id, snapshot.data() ?? {}) : null
    },
    async listGroups(congregationId) {
      const snapshot = await db.collection(PUBLISHER_GROUPS).where("congregationId", "==", congregationId).get()
      return snapshot.docs.map((item) => groupFromDoc(item.id, item.data()))
    },
    async getUser(uid) {
      const snapshot = await db.collection("users").doc(uid).get()
      if (!snapshot.exists) return null
      const data = snapshot.data() ?? {}
      return {
        congregationId: typeof data.congregationId === "string" ? data.congregationId : undefined,
        publisherId: typeof data.publisherId === "string" ? data.publisherId : undefined,
        supervisedGroupId: typeof data.supervisedGroupId === "string" ? data.supervisedGroupId : undefined,
      }
    },
    async saveUserLink(uid, link) {
      const payload: Record<string, unknown> = {}
      if (link.publisherId) payload.publisherId = link.publisherId
      else payload.publisherId = admin.firestore.FieldValue.delete()
      if (link.supervisedGroupId) payload.supervisedGroupId = link.supervisedGroupId
      else payload.supervisedGroupId = admin.firestore.FieldValue.delete()
      await db.collection("users").doc(uid).set(payload, { merge: true })
    },
  }
}

function deps(): PublisherDeps {
  return {
    store: firestoreStore(),
    now: () => new Date(),
    newId: () => admin.firestore().collection(PUBLISHERS).doc().id,
  }
}

function rethrow(error: unknown): never {
  if (error instanceof functions.https.HttpsError) throw error
  if (error instanceof PublisherError) throw new functions.https.HttpsError(error.code, error.message)
  functions.logger.error("publishers", error)
  throw new functions.https.HttpsError("internal", "Não foi possível concluir a operação.")
}

async function callerFrom(context: functions.https.CallableContext): Promise<PublisherCaller> {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "É preciso entrar na conta.")
  const snapshot = await admin.firestore().collection("users").doc(context.auth.uid).get()
  const data = snapshot.data() ?? {}
  return {
    uid: context.auth.uid,
    role: typeof data.role === "string" ? data.role : undefined,
    congregationId: typeof data.congregationId === "string" ? data.congregationId : undefined,
    manageFlags: data.manageFlags,
    accessFlags: data.accessFlags,
    supervisedGroupId: typeof data.supervisedGroupId === "string" ? data.supervisedGroupId : undefined,
  }
}

async function run<T>(context: functions.https.CallableContext, action: (caller: PublisherCaller, deps: PublisherDeps) => Promise<T>) {
  try {
    return await action(await callerFrom(context), deps())
  } catch (error) {
    rethrow(error)
  }
}

export const createPublisherAccount = functions.https.onCall(async (data: Record<string, unknown> | null, context) => {
  return run(context, (caller, dependencies) => createPublisher(dependencies, caller, data ?? {}))
})

export const updatePublisherAccount = functions.https.onCall(async (data: Record<string, unknown> | null, context) => {
  return run(context, (caller, dependencies) => updatePublisher(dependencies, caller, data ?? {}))
})

export const listPublisherAccounts = functions.https.onCall(async (data: Record<string, unknown> | null, context) => {
  const publishers = await run(context, (caller, dependencies) => listPublishers(dependencies, caller, data ?? {}))
  return { publishers }
})

export const createCongregationGroup = functions.https.onCall(async (data: Record<string, unknown> | null, context) => {
  return run(context, (caller, dependencies) => createPublisherGroup(dependencies, caller, data ?? {}))
})

export const updateCongregationGroup = functions.https.onCall(async (data: Record<string, unknown> | null, context) => {
  return run(context, (caller, dependencies) => updatePublisherGroup(dependencies, caller, data ?? {}))
})

export const listCongregationGroups = functions.https.onCall(async (_data: unknown, context) => {
  const groups = await run(context, (caller, dependencies) => listPublisherGroups(dependencies, caller))
  return { groups }
})

export const listCongregationGroupMembers = functions.https.onCall(async (data: Record<string, unknown> | null, context) => {
  const publishers = await run(context, (caller, dependencies) => listGroupMembers(dependencies, caller, data ?? {}))
  return { publishers }
})

export const setCongregationGroupSuperintendent = functions.https.onCall(async (data: Record<string, unknown> | null, context) => {
  return run(context, (caller, dependencies) => setGroupSuperintendent(dependencies, caller, data ?? {}))
})

export const setCongregationPublisherGroup = functions.https.onCall(async (data: Record<string, unknown> | null, context) => {
  return run(context, (caller, dependencies) => setPublisherGroup(dependencies, caller, data ?? {}))
})

export const deletePublisherAccount = functions.https.onCall(async (data: Record<string, unknown> | null, context) => {
  return run(context, (caller, dependencies) => deletePublisherRecord(dependencies, caller, data ?? {}))
})

export const deleteCongregationGroup = functions.https.onCall(async (data: Record<string, unknown> | null, context) => {
  return run(context, (caller, dependencies) => deletePublisherGroup(dependencies, caller, data ?? {}))
})
