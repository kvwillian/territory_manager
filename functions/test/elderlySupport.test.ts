import assert from "node:assert/strict"
import test from "node:test"
import {
  ElderlySupportError,
  canManageElderlySupport,
  createSchedule,
  getSchedule,
  listSchedules,
  publishSchedule,
  scheduleFromData,
  scheduleToData,
  unpublishSchedule,
  updateAssignments,
  type ElderlyCaller,
  type ElderlySchedule,
  type ElderlyScheduleStore,
  type ElderlySupportDeps,
} from "../src/elderlySupport/schedule"

const NOW = new Date("2026-10-01T12:00:00.000Z")
const LATER = new Date("2026-10-02T12:00:00.000Z")

const adminCaller: ElderlyCaller = { uid: "admin-1", role: "admin", congregationId: "default" }
const manager: ElderlyCaller = {
  uid: "manager-1",
  role: "conductor",
  congregationId: "default",
  manageFlags: ["elderlySupport"],
}
const outsider: ElderlyCaller = { uid: "user-2", role: "conductor", congregationId: "default" }
const otherCongregation: ElderlyCaller = {
  uid: "manager-2",
  role: "admin",
  congregationId: "norte",
}

function memoryStore() {
  const docs = new Map<string, Record<string, unknown>>()
  let next = 1
  const store: ElderlyScheduleStore = {
    async create(schedule) {
      docs.set(schedule.id, scheduleToData(schedule))
    },
    async save(schedule) {
      docs.set(schedule.id, scheduleToData(schedule))
    },
    async get(id) {
      const data = docs.get(id)
      return data ? scheduleFromData(id, data) : null
    },
    async listByCongregation(congregationId) {
      return [...docs.entries()]
        .filter(([, data]) => data.congregationId === congregationId)
        .map(([id, data]) => scheduleFromData(id, data))
    },
  }
  return {
    docs,
    deps(now = NOW): ElderlySupportDeps {
      return {
        store,
        now: () => now,
        newId: () => `schedule-${next++}`,
      }
    },
  }
}

const sampleAssignments = [
  { date: "2026-10-11", elderlyName: "Solange", driverName: "Kevin" },
  { date: "2026-10-11", elderlyName: "M. Socorro", driverName: "Claudemir Bessa" },
]

async function seed(store = memoryStore(), caller: ElderlyCaller = manager) {
  const created = await createSchedule(store.deps(), caller, {
    congregationId: "default",
    title: "Suporte a Idosos — Outubro/Novembro 2026",
    assignments: sampleAssignments,
  })
  return { store, created }
}

function codes(error: unknown) {
  assert.ok(error instanceof ElderlySupportError)
  return error.code
}

test("creates a draft and finds it by congregation and period", async () => {
  const { store, created } = await seed()
  assert.equal(created.status, "draft")
  assert.equal(created.congregationId, "default")
  assert.equal(created.createdBy, "manager-1")
  assert.equal(created.title, "Suporte a Idosos — Outubro/Novembro 2026")
  assert.deepEqual(created.assignments, sampleAssignments)

  const stored = store.docs.get(created.id)
  assert.equal(stored?.status, "draft")
  assert.equal("id" in (stored ?? {}), false)
  assert.deepEqual(stored?.assignments, sampleAssignments)

  const listed = await listSchedules(store.deps(), manager, { from: "2026-10-01", to: "2026-10-31" })
  assert.deepEqual(listed.map((item) => item.id), [created.id])
  const outside = await listSchedules(store.deps(), manager, { from: "2026-11-01", to: "2026-11-30" })
  assert.deepEqual(outside, [])

  const loaded = await getSchedule(store.deps(), adminCaller, { scheduleId: created.id })
  assert.equal(loaded.id, created.id)
  assert.equal(loaded.createdAt, NOW.toISOString())
})

test("updates assignments and keeps the schedule in draft", async () => {
  const { store, created } = await seed()
  const updated = await updateAssignments(store.deps(LATER), manager, {
    scheduleId: created.id,
    assignments: [
      {
        date: "2026-10-18",
        elderlyName: "Solange",
        elderlyPublisherId: "pub-solange",
        driverName: "Kevin",
        driverPublisherId: "",
      },
    ],
  })
  assert.equal(updated.status, "draft")
  assert.equal(updated.createdAt, created.createdAt)
  assert.equal(updated.updatedAt, LATER.toISOString())
  assert.equal(updated.congregationId, "default")
  assert.deepEqual(updated.assignments, [
    {
      date: "2026-10-18",
      elderlyName: "Solange",
      elderlyPublisherId: "pub-solange",
      driverName: "Kevin",
    },
  ])
  const row = (store.docs.get(created.id)?.assignments as Record<string, string>[])[0]
  assert.equal(row.driverPublisherId, undefined)
  assert.equal(row.elderlyPublisherId, "pub-solange")
})

test("publishes a schedule and returns it to draft", async () => {
  const { store, created } = await seed()
  const published = await publishSchedule(store.deps(LATER), manager, { scheduleId: created.id })
  assert.equal(published.status, "published")
  assert.equal(published.updatedAt, LATER.toISOString())
  const again = await publishSchedule(store.deps(new Date("2026-10-03T12:00:00.000Z")), manager, {
    scheduleId: created.id,
  })
  assert.equal(again.updatedAt, published.updatedAt)

  const draft = await unpublishSchedule(store.deps(new Date("2026-10-04T12:00:00.000Z")), adminCaller, {
    scheduleId: created.id,
  })
  assert.equal(draft.status, "draft")
  assert.deepEqual(draft.assignments, sampleAssignments)
})

test("blocks changes from users who cannot manage elderly support", async () => {
  assert.equal(canManageElderlySupport(outsider), false)
  assert.equal(canManageElderlySupport({ ...outsider, manageFlags: ["meetings"] }), false)
  assert.equal(canManageElderlySupport(manager), true)
  assert.equal(canManageElderlySupport(adminCaller), true)

  const { store, created } = await seed()
  await assert.rejects(
    () => createSchedule(store.deps(), outsider, { assignments: sampleAssignments }),
    (error: unknown) => codes(error) === "permission-denied",
  )
  await assert.rejects(
    () => updateAssignments(store.deps(), outsider, { scheduleId: created.id, assignments: [] }),
    (error: unknown) => codes(error) === "permission-denied",
  )
  await assert.rejects(
    () => publishSchedule(store.deps(), { ...outsider, manageFlags: ["meetings"] }, { scheduleId: created.id }),
    (error: unknown) => codes(error) === "permission-denied",
  )
  const stored = store.docs.get(created.id)
  assert.equal(stored?.status, "draft")
  assert.equal((stored?.assignments as ElderlySchedule["assignments"]).length, 2)
})

test("stores a note and an elderly person without a driver", async () => {
  const store = memoryStore()
  const created = await createSchedule(store.deps(), manager, {
    note: "  Sempre ligar antes.  ",
    assignments: [{ date: "2026-10-11", elderlyName: "Luzeni", driverName: "" }],
  })
  assert.equal(created.note, "Sempre ligar antes.")
  assert.equal(created.assignments[0].driverName, "")
  assert.equal(created.assignments[0].driverPublisherId, undefined)
  assert.equal(store.docs.get(created.id)?.note, "Sempre ligar antes.")

  const kept = await updateAssignments(store.deps(LATER), manager, {
    scheduleId: created.id,
    assignments: [{ date: "2026-10-15", elderlyName: "Luzenira" }],
  })
  assert.equal(kept.note, "Sempre ligar antes.")
  assert.equal(kept.assignments[0].driverName, "")

  const cleared = await updateAssignments(store.deps(LATER), manager, {
    scheduleId: created.id,
    assignments: kept.assignments,
    note: "   ",
  })
  assert.equal(cleared.note, undefined)
  assert.equal("note" in (store.docs.get(created.id) ?? {}), false)
})

test("keeps schedules inside the caller's congregation", async () => {
  const { store, created } = await seed()
  await assert.rejects(
    () => createSchedule(store.deps(), manager, { congregationId: "norte", assignments: sampleAssignments }),
    (error: unknown) => codes(error) === "permission-denied",
  )
  await assert.rejects(
    () => getSchedule(store.deps(), otherCongregation, { scheduleId: created.id }),
    (error: unknown) => codes(error) === "permission-denied",
  )
  await assert.rejects(
    () =>
      updateAssignments(store.deps(), otherCongregation, {
        scheduleId: created.id,
        assignments: [{ date: "2026-10-11", elderlyName: "Outra", driverName: "Outro" }],
      }),
    (error: unknown) => codes(error) === "permission-denied",
  )
  await assert.rejects(
    () => publishSchedule(store.deps(), otherCongregation, { scheduleId: created.id }),
    (error: unknown) => codes(error) === "permission-denied",
  )
  const visible = await listSchedules(store.deps(), otherCongregation, { from: "2026-10-01", to: "2026-10-31" })
  assert.deepEqual(visible, [])
  assert.equal(store.docs.get(created.id)?.congregationId, "default")
  assert.equal((store.docs.get(created.id)?.assignments as { elderlyName: string }[])[0].elderlyName, "Solange")
})
