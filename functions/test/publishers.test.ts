import assert from "node:assert/strict"
import test from "node:test"
import {
  PublisherError,
  canManagePublishers,
  createPublisher,
  createPublisherGroup,
  deletePublisherGroup,
  listGroupMembers,
  listPublishers,
  setGroupSuperintendent,
  setPublisherGroup,
  type PublisherCaller,
  type PublisherDeps,
  type PublisherGroupRecord,
  type PublisherRecord,
  type PublisherStore,
  type UserLink,
} from "../src/publishers/registry"

const NOW = new Date("2026-10-14T12:00:00.000Z")

const adminCaller: PublisherCaller = { uid: "admin-1", role: "admin", congregationId: "default" }
const manager: PublisherCaller = {
  uid: "manager-1",
  role: "conductor",
  congregationId: "default",
  manageFlags: ["publishers"],
}
const viewer: PublisherCaller = {
  uid: "viewer-1",
  role: "conductor",
  congregationId: "default",
  accessFlags: ["publishers"],
}
const outsider: PublisherCaller = { uid: "user-2", role: "conductor", congregationId: "default" }
const otherCongregation: PublisherCaller = { uid: "admin-2", role: "admin", congregationId: "norte" }

function memory() {
  const publishers = new Map<string, PublisherRecord>()
  const groups = new Map<string, PublisherGroupRecord>()
  const users = new Map<string, UserLink>()
  let next = 1
  const store: PublisherStore = {
    async createPublisher(publisher) {
      publishers.set(publisher.id, { ...publisher })
    },
    async savePublisher(publisher) {
      publishers.set(publisher.id, { ...publisher })
    },
    async deletePublisher(id) {
      publishers.delete(id)
    },
    async getPublisher(id) {
      const item = publishers.get(id)
      return item ? { ...item } : null
    },
    async listPublishers(congregationId) {
      return [...publishers.values()].filter((item) => item.congregationId === congregationId).map((item) => ({ ...item }))
    },
    async createGroup(group) {
      groups.set(group.id, { ...group })
    },
    async saveGroup(group) {
      groups.set(group.id, { ...group })
    },
    async deleteGroup(id) {
      groups.delete(id)
    },
    async getGroup(id) {
      const item = groups.get(id)
      return item ? { ...item } : null
    },
    async listGroups(congregationId) {
      return [...groups.values()].filter((item) => item.congregationId === congregationId).map((item) => ({ ...item }))
    },
    async getUser(uid) {
      const item = users.get(uid)
      return item ? { ...item } : null
    },
    async saveUserLink(uid, link) {
      users.set(uid, { ...link })
    },
  }
  const deps = (now = NOW): PublisherDeps => ({
    store,
    now: () => now,
    newId: () => `id-${next++}`,
  })
  return { publishers, groups, users, deps }
}

test("creates and lists publishers, including those without a group", async () => {
  const store = memory()
  const created = await createPublisher(store.deps(), manager, { name: "Ana Souza" })
  assert.equal(created.congregationId, "default")
  assert.equal(created.groupId, undefined)
  const listed = await listPublishers(store.deps(), viewer, { name: "ana" })
  assert.equal(listed.length, 1)
  assert.equal(listed[0].status, "active")
})

test("assigns and removes a publisher from a group", async () => {
  const store = memory()
  const ana = await createPublisher(store.deps(), adminCaller, { name: "Ana Souza" })
  const paulo = await createPublisher(store.deps(), adminCaller, { name: "Paulo Mendes", userId: "user-paulo" })
  store.users.set("user-paulo", { congregationId: "default", publisherId: paulo.id })
  const group = await createPublisherGroup(store.deps(), manager, { name: "Grupo 1", superintendentPublisherId: paulo.id })
  await setPublisherGroup(store.deps(), manager, { publisherId: ana.id, groupId: group.id })
  const members = await listGroupMembers(store.deps(), manager, { groupId: group.id })
  assert.deepEqual(members.map((item) => item.name).sort(), ["Ana Souza", "Paulo Mendes"])
  await setPublisherGroup(store.deps(), manager, { publisherId: ana.id, groupId: null })
  const unassigned = await listPublishers(store.deps(), manager, { unassigned: true })
  assert.equal(unassigned.some((item) => item.id === ana.id), true)
  assert.equal((await store.deps().store.getPublisher(ana.id))?.groupId, undefined)
})

test("replaces the group superintendent without creating a publisher", async () => {
  const store = memory()
  const paulo = await createPublisher(store.deps(), adminCaller, { name: "Paulo Mendes" })
  const marina = await createPublisher(store.deps(), adminCaller, { name: "Marina Alves" })
  const group = await createPublisherGroup(store.deps(), adminCaller, {
    name: "Grupo 1",
    superintendentPublisherId: paulo.id,
  })
  const before = store.publishers.size
  const updated = await setGroupSuperintendent(store.deps(), adminCaller, { groupId: group.id, publisherId: marina.id })
  assert.equal(updated.superintendentPublisherId, marina.id)
  assert.equal(store.publishers.size, before)
  assert.equal((await store.deps().store.getPublisher(marina.id))?.groupId, group.id)
})

test("rejects a superintendent from another congregation", async () => {
  const store = memory()
  const local = await createPublisher(store.deps(), adminCaller, { name: "Paulo Mendes" })
  const group = await createPublisherGroup(store.deps(), adminCaller, {
    name: "Grupo 1",
    superintendentPublisherId: local.id,
  })
  const foreign = await createPublisher(store.deps(), otherCongregation, { name: "Pessoa de outra congregação" })
  await assert.rejects(
    () => setGroupSuperintendent(store.deps(), adminCaller, { groupId: group.id, publisherId: foreign.id }),
    (error: unknown) => error instanceof PublisherError && error.code === "not-found",
  )
})

test("blocks a conductor without publisher permission", async () => {
  const store = memory()
  await assert.rejects(
    () => createPublisher(store.deps(), outsider, { name: "Ana Souza" }),
    (error: unknown) => error instanceof PublisherError && error.code === "permission-denied",
  )
  await assert.rejects(
    () => listPublishers(store.deps(), outsider, {}),
    (error: unknown) => error instanceof PublisherError && error.code === "permission-denied",
  )
  assert.equal(canManagePublishers(outsider), false)
})

test("releases members when a group is deleted and keeps the publishers", async () => {
  const store = memory()
  const paulo = await createPublisher(store.deps(), adminCaller, { name: "Paulo Mendes" })
  const group = await createPublisherGroup(store.deps(), adminCaller, {
    name: "Grupo 1",
    superintendentPublisherId: paulo.id,
  })
  const result = await deletePublisherGroup(store.deps(), adminCaller, { groupId: group.id })
  assert.equal(result.deleted, true)
  assert.equal((await store.deps().store.getPublisher(paulo.id))?.name, "Paulo Mendes")
  assert.equal((await store.deps().store.getPublisher(paulo.id))?.groupId, undefined)
  assert.equal(await store.deps().store.getGroup(group.id), null)
})
