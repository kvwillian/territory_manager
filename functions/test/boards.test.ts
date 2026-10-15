import assert from "node:assert/strict"
import test from "node:test"
import { BoardError, meetingDocumentId, sanitizeCleaning, sanitizeMeeting, sanitizeRoster } from "../src/boards/records"

test("stores a meeting under the congregation id", () => {
  const meeting = sanitizeMeeting("default", {
    kind: "midweek",
    isoDate: "2026-10-15",
    status: "published",
    notes: "  Confirmar leitor  ",
    sections: [{ title: "Tesouros", token: "treasures", parts: [{ title: "Leitura", durationMinutes: 4, roles: [{ label: "Estudante", personName: "Ana" }] }] }],
    duties: [{ label: "Indicadores", people: ["Beatriz", ""] }],
  })
  assert.equal(meeting.id, meetingDocumentId("default", "midweek", "2026-10-15"))
  assert.equal(meeting.congregationId, "default")
  assert.equal(meeting.notes, "Confirmar leitor")
  assert.equal(meeting.sections[0].parts[0].roles[0].personName, "Ana")
})

test("rejects a meeting from a bad date", () => {
  assert.throws(() => sanitizeMeeting("default", { kind: "midweek", isoDate: "15/10/2026" }), (error: unknown) => error instanceof BoardError)
})

test("stores one audio roster per month and one cleaning name", () => {
  const roster = sanitizeRoster("default", { year: 2026, month: 10, rows: [{ day: 15, attendants: ["Ana"], microphones: [], sound: ["Carlos", "Helena"] }] })
  assert.equal(roster.id, "default_2026_10")
  assert.deepEqual(roster.rows[0].sound, ["Carlos", "Helena"])
  assert.deepEqual(sanitizeCleaning("midweek_default_2026-10-15", "  Ana  "), { meetingId: "midweek_default_2026-10-15", person: "Ana" })
})
