import assert from "node:assert/strict"
import test from "node:test"
import {
  PublisherError,
  bulkDeletePublishers,
  bulkMovePublishers,
  bulkUpdatePublishers,
  canManagePublishers,
  createPublisher,
  createPublisherGroup,
  deletePublisherGroup,
  importPublisherGroups,
  listGroupMembers,
  listPublishers,
  setGroupSuperintendent,
  setPublisherGroup,
  updatePublisherGroup,
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

test("imports groups, superintendents, assistants, and publishers from JSON format", async () => {
  const store = memory()
  const result = await importPublisherGroups(store.deps(), adminCaller, {
    prefixCode: true,
    groups: [
      {
        code: "A",
        name: "Laranjeiras",
        superintendent: "Edilton Cusmão",
        assistant: "João Aristeu",
        publishers: ["Rosana Cusmão", "Ana Cláudia", "Djalma Fidêncio"],
      },
      {
        code: "C",
        name: "Guaíba",
        superintendent: "José Bessa",
        assistant: "Marcelo Nogareda",
        publishers: ["Adriana Bessa", "Ana Beatriz?"],
        notes: "Há nomes encobertos pelo reflexo entre Ana Beatriz e Zeni Ierich.",
      },
    ],
  })
  assert.equal(result.createdGroups, 2)
  assert.equal(result.createdPublishers, 9)
  assert.equal(result.groups[0]?.name, "A — Laranjeiras")
  assert.equal(result.groups[1]?.description, "Há nomes encobertos pelo reflexo entre Ana Beatriz e Zeni Ierich.")
  const djalma = result.publishers.find((item) => item.name === "Djalma Fidêncio")
  const rosana = result.publishers.find((item) => item.name === "Rosana Cusmão")
  assert.equal(djalma?.gender, "masculino")
  assert.equal(rosana?.gender, "feminino")
})

test("moves and deletes publishers in bulk", async () => {
  const store = memory()
  const imported = await importPublisherGroups(store.deps(), adminCaller, {
    prefixCode: true,
    groups: [
      {
        code: "A",
        name: "Laranjeiras",
        superintendent: "Edilton Cusmão",
        assistant: "João Aristeu",
        publishers: ["Rosana Cusmão", "Djalma Fidêncio"],
      },
      {
        code: "B",
        name: "Montevidéu",
        superintendent: "Carlos Alberto",
        assistant: "Júlio César",
        publishers: ["Juliete Silva"],
      },
    ],
  })
  const groupA = imported.groups.find((g) => g.name.startsWith("A"))!
  const groupB = imported.groups.find((g) => g.name.startsWith("B"))!
  const rosana = imported.publishers.find((p) => p.name === "Rosana Cusmão")!
  const djalma = imported.publishers.find((p) => p.name === "Djalma Fidêncio")!

  const moved = await bulkMovePublishers(store.deps(), adminCaller, {
    publisherIds: [rosana.id, djalma.id],
    groupId: groupB.id,
  })
  assert.equal(moved.movedCount, 2)
  assert.equal(moved.publishers.find((p) => p.id === rosana.id)?.groupId, groupB.id)

  const groupAMembers = moved.publishers.filter((p) => p.groupId === groupA.id).map((p) => p.id)
  const deleted = await bulkDeletePublishers(store.deps(), adminCaller, {
    publisherIds: groupAMembers,
    deleteEmptyGroups: true,
  })
  assert.equal(deleted.deletedCount, 2)
  assert.equal(deleted.deletedGroupsCount, 1)
  assert.equal(deleted.groups.length, 1)
  assert.equal(deleted.groups[0]?.id, groupB.id)
})

test("updates group name, superintendent, and assistant together", async () => {
  const store = memory()
  const sup1 = await createPublisher(store.deps(), adminCaller, { name: "Edilton Cusmão" })
  const sup2 = await createPublisher(store.deps(), adminCaller, { name: "Carlos Alberto" })
  const assist = await createPublisher(store.deps(), adminCaller, { name: "João Aristeu" })
  const group = await createPublisherGroup(store.deps(), adminCaller, {
    name: "Grupo A",
    superintendentPublisherId: sup1.id,
  })
  const updated = await updatePublisherGroup(store.deps(), adminCaller, {
    groupId: group.id,
    name: "A — Laranjeiras",
    superintendentPublisherId: sup2.id,
    assistantPublisherId: assist.id,
    description: "Observação atualizada",
  })
  assert.equal(updated.name, "A — Laranjeiras")
  assert.equal(updated.superintendentPublisherId, sup2.id)
  assert.equal(updated.assistantPublisherId, assist.id)
  assert.equal(updated.description, "Observação atualizada")
  assert.equal((await store.deps().store.getPublisher(sup2.id))?.groupId, group.id)
  assert.equal((await store.deps().store.getPublisher(assist.id))?.groupId, group.id)
})

test("updates publisher qualifications in bulk", async () => {
  const store = memory()
  const p1 = await createPublisher(store.deps(), adminCaller, { name: "Edilton Cusmão" })
  const p2 = await createPublisher(store.deps(), adminCaller, { name: "Rosana Cusmão", gender: "feminino" })

  const res = await bulkUpdatePublishers(store.deps(), adminCaller, {
    updates: [
      { publisherId: p1.id, indicador: true, microfone: true, som: true, driver: true },
      { publisherId: p2.id, estudante: true, needsElderlySupport: true },
    ],
  })
  assert.equal(res.updatedCount, 2)
  const savedP1 = res.publishers.find((p) => p.id === p1.id)!
  const savedP2 = res.publishers.find((p) => p.id === p2.id)!
  assert.equal(savedP1.indicador, true)
  assert.equal(savedP1.som, true)
  assert.equal(savedP1.driver, true)
  assert.equal(savedP2.estudante, true)
  assert.equal(savedP2.needsElderlySupport, true)
})
