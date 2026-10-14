import assert from "node:assert/strict"
import { readFileSync, existsSync } from "node:fs"
import test from "node:test"
import { linesFromPdf } from "../src/meetingWorkbook/layout"
import { parseWorkbookLines } from "../src/meetingWorkbook/parse"
import {
  acceptDecision,
  assertImportId,
  assertPdfPayload,
  callerCongregationId,
  canManageMeetings,
  evaluateReviewedProgram,
  importFilePath,
  importIsComplete,
  isExpired,
  FILE_TTL_MS,
  MAX_PDF_BYTES,
} from "../src/meetingWorkbook/policy"

const PDF = "C:/Users/kevin/Downloads/mwb_T_202609.pdf"
const NOVEMBER = "C:/Users/kevin/Downloads/mwb_T_202611.pdf"

test("parser reads a wrapped part and ignores the lesson text", () => {
  const parsed = parseWorkbookLines(
    [
      "SETEMBRO-OUTUBRO DE 2026",
      "12-18 DE OUTUBRO",
      "TESOUROS DA",
      "PALAVRA DE DEUS",
      "1. Eles perguntaram o que fazer, mas não",
      "obedeceram (10 min)",
      "Antes de fugir para o Egito, o povo pediu orientação.",
      "2. Joias espirituais (10 min)",
      "3. Leitura da Bíblia (4 min)",
      "FAÇA SEU MELHOR",
      "NO MINISTÉRIO",
      "4. Iniciando conversas (3 min)",
      "5. Cultivando o interesse (4 min)",
      "6. O que você diria? (6 min)",
      "NOSSA",
      "VIDA CRISTÃ",
      "7. Necessidades locais (15 min)",
      "8. Estudo bíblico de congregação (30 min)",
    ],
    2026,
  )
  const week = parsed.weeks[0]
  assert.equal(week.weekStart, "2026-10-12")
  assert.equal(week.weekEnd, "2026-10-18")
  assert.deepEqual(
    week.sections.map((section) => section.parts.map((part) => part.durationMinutes)),
    [[10, 10, 4], [3, 4, 6], [15, 30]],
  )
  assert.equal(week.sections[0].parts[0].title, "Eles perguntaram o que fazer, mas não obedeceram")
  assert.equal(week.alerts.length, 0)
})

test("missing duration is an alert, not an invented number", () => {
  const parsed = parseWorkbookLines(
    [
      "2026",
      "19-25 DE OUTUBRO",
      "TESOUROS DA PALAVRA DE DEUS",
      "1. Joias espirituais",
      "FAÇA SEU MELHOR NO MINISTÉRIO",
      "2. Iniciando conversas (3 min)",
      "NOSSA VIDA CRISTÃ",
      "3. Estudo bíblico de congregação (30 min)",
    ],
    2026,
  )
  assert.equal(parsed.weeks[0].sections[0].parts[0].durationMinutes, null)
  assert.match(parsed.weeks[0].alerts.join(" "), /duração/)
})

test("september-october 2026 workbook", async () => {
  assert.equal(existsSync(PDF), true, "PDF de referência ausente")
  const bytes = readFileSync(PDF)
  const lines = await linesFromPdf(new Uint8Array(bytes))
  const parsed = parseWorkbookLines(lines)
  assert.equal(parsed.year, 2026)
  const oct12 = parsed.weeks.find((week) => week.weekStart === "2026-10-12")
  const oct19 = parsed.weeks.find((week) => week.weekStart === "2026-10-19")
  assert.ok(oct12)
  assert.ok(oct19)
  assert.deepEqual(
    oct12.sections.map((section) => section.parts.length),
    [3, 3, 2],
  )
  assert.deepEqual(
    oct19.sections.map((section) => section.parts.length),
    [3, 4, 2],
  )
  assert.match(oct12.sections[0].parts[1].title, /Joias espirituais/)
  assert.equal(oct12.sections[0].parts[2].durationMinutes, 4)
  assert.match(oct12.sections[1].parts[0].title, /Iniciando conversas/)
  assert.match(oct12.sections[2].parts.at(-1)?.title ?? "", /Estudo bíblico de congregação/)
  assert.equal(oct12.sections[2].parts.at(-1)?.durationMinutes, 30)
  assert.match(oct19.sections[1].parts.at(-1)?.title ?? "", /Discurso/)
  assert.equal(oct19.sections[1].parts.length, 4)
  assert.match(oct19.sections[2].parts[0].title, /Partilhe com outros/)
  assert.equal(oct12.alerts.filter((alert) => /duração|seções|Estudo/.test(alert)).length, 0)
  assert.equal(oct19.alerts.filter((alert) => /duração|seções|Estudo/.test(alert)).length, 0)
})

test("november-december 2026 workbook keeps one week per program", async () => {
  assert.equal(existsSync(NOVEMBER), true, "PDF de novembro ausente")
  const bytes = readFileSync(NOVEMBER)
  const lines = await linesFromPdf(new Uint8Array(bytes))
  const parsed = parseWorkbookLines(lines)
  const starts = parsed.weeks.map((week) => week.weekStart)
  assert.deepEqual(starts, [
    "2026-11-02",
    "2026-11-09",
    "2026-11-16",
    "2026-11-23",
    "2026-11-30",
    "2026-12-07",
    "2026-12-14",
    "2026-12-21",
    "2026-12-28",
  ])
  for (const week of parsed.weeks) {
    assert.equal(week.sections[2].parts.length > 0, true, week.label)
    assert.match(week.sections[2].parts.at(-1)?.title ?? "", /Estudo bíblico de congregação/)
    assert.equal(week.alerts.some((alert) => alert.includes("Nossa Vida Cristã")), false, week.alerts.join(" "))
  }
  assert.equal(parsed.weeks[1].weekStart, "2026-11-09")
  assert.equal(parsed.weeks[5].weekStart, "2026-12-07")
})

test("permissions and file guards", () => {
  assert.equal(canManageMeetings(null), false)
  assert.equal(canManageMeetings({ role: "conductor", congregationId: "central" }), false)
  assert.equal(
    canManageMeetings({ role: "conductor", congregationId: "central", manageFlags: ["meetings"] }),
    true,
  )
  assert.equal(canManageMeetings({ role: "admin", congregationId: "central" }), true)
  assert.equal(callerCongregationId({ role: "admin", congregationId: "central" }), "central")
  assert.throws(() => assertImportId("../other"), /inválido/)
  assert.equal(
    importFilePath("user-1", "abcd1234"),
    "meeting-imports/user-1/abcd1234/source.pdf",
  )
  assert.throws(() => assertPdfPayload(MAX_PDF_BYTES + 1, new Uint8Array([0x25, 0x50, 0x44, 0x46])), /8 MB/)
  assert.throws(() => assertPdfPayload(20, new Uint8Array([1, 2, 3, 4])), /não é um PDF/)
  assert.doesNotThrow(() => assertPdfPayload(20, new Uint8Array([0x25, 0x50, 0x44, 0x46])))
})

test("accept is idempotent and does not overwrite", () => {
  const program = {
    isoDate: "2026-10-13",
    weekStart: "2026-10-12",
    weekEnd: "2026-10-18",
    sections: [
      { token: "treasures" as const, title: "Tesouros da Palavra de Deus", parts: [{ title: "Joias espirituais", durationMinutes: 10 }] },
      { token: "ministry" as const, title: "Faça Seu Melhor no Ministério", parts: [{ title: "Iniciando conversas", durationMinutes: 3 }] },
      {
        token: "christianLife" as const,
        title: "Nossa Vida Cristã",
        parts: [{ title: "Estudo bíblico de congregação", durationMinutes: 30 }],
      },
    ],
  }
  assert.equal(acceptDecision({
    weekStatus: "accepted",
    meetingExists: true,
    errors: [],
    warnings: [],
    acknowledgeAlerts: false,
  }).action, "idempotent")
  assert.equal(acceptDecision({
    weekStatus: "pending",
    meetingExists: true,
    errors: [],
    warnings: [],
    acknowledgeAlerts: true,
  }).action, "duplicate")
  const outside = evaluateReviewedProgram({ ...program, isoDate: "2026-11-01" })
  assert.equal(acceptDecision({
    weekStatus: "pending",
    meetingExists: false,
    errors: outside.errors,
    warnings: outside.warnings,
    acknowledgeAlerts: false,
  }).action, "reject")
  assert.equal(acceptDecision({
    weekStatus: "pending",
    meetingExists: false,
    errors: outside.errors,
    warnings: outside.warnings,
    acknowledgeAlerts: true,
  }).action, "create")
  assert.equal(importIsComplete(["accepted", "duplicate"]), true)
  assert.equal(importIsComplete(["accepted", "pending"]), false)
  assert.equal(isExpired(0, FILE_TTL_MS, FILE_TTL_MS), true)
})
