import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { PDFDocument } from 'pdf-lib'
import { embedPosterFont, renderRosterPdf } from '../src/features/audio-video/poster/pdf.ts'
import { displayNames, rosterFileBase } from '../src/features/audio-video/utils.ts'
import { layoutRosterPoster, reminderRuns } from '../src/features/audio-video/poster/layout.ts'
import type { PosterLayout } from '../src/features/audio-video/poster/types.ts'
import { defaultReminders, emptyRoster, october2026Roster, type MonthlyRoster, type RosterRow } from '../src/features/audio-video/roster.ts'

async function measure() {
  const doc = await PDFDocument.create()
  const font = await embedPosterFont(doc)
  return (text: string, size: number) => font.widthOfTextAtSize(text, size)
}

function roster(partial: Partial<MonthlyRoster> & Pick<MonthlyRoster, 'rows' | 'reminders'>): MonthlyRoster {
  return { year: 2026, month: 10, ...partial }
}

function dataRows(layout: PosterLayout) {
  return layout.pages.flatMap((page) => page.rows.filter((row) => row.kind === 'data'))
}

function reminderSources(layout: PosterLayout) {
  const grouped = new Map<string, string>()
  for (const reminder of layout.pages.flatMap((page) => page.reminders)) {
    const text = reminder.lines.flat().map((glyph) => glyph.text).join('')
    grouped.set(reminder.source, `${grouped.get(reminder.source) ?? ''}${text}`)
  }
  return [...grouped.values()]
}

function compact(value: string) {
  return value.replace(/\s+/g, '')
}

test('keeps october assignments in order, one line per person', async () => {
  const layout = layoutRosterPoster(october2026Roster, undefined, await measure())
  assert.equal(layout.filename, 'indicadores-audio-video-outubro-2026')
  assert.equal(layout.pages.length, 1)
  const rows = dataRows(layout)
  assert.deepEqual(rows.map((row) => row.day), october2026Roster.rows.map((row) => row.day))
  const month = layout.pages[0].rows.find((row) => row.kind === 'month')
  const header = layout.pages[0].rows.find((row) => row.kind === 'header')
  assert.equal(month?.cells[0].fill, 'orange')
  assert.equal(month?.cells[0].glyphs[0].text, 'OUTUBRO')
  assert.equal(month?.cells[0].glyphs[0].color, 'white')
  assert.deepEqual(header?.cells.map((cell) => cell.glyphs[0].text), ['DIA', 'INDICADORES', 'MICROFONES', 'MESA DE SOM'])
  assert.ok(header?.cells.every((cell) => cell.fill === 'white' && cell.glyphs[0].color === 'orange'))
  rows.forEach((row, index) => {
    const source = october2026Roster.rows[index]
    const groups = [source.attendants, source.microphones, source.sound]
    groups.forEach((names, column) => {
      const glyphs = row.cells[column + 1].glyphs
      assert.deepEqual(glyphs.map((glyph) => glyph.text), displayNames(names))
      assert.equal(row.cells[column + 1].fill, index % 2 === 1 ? 'peach' : 'white')
    })
  })
  assert.deepEqual(layout.pages[0].title.map((glyph) => glyph.text), ['INDICADORES', '&', 'ÁUDIO e VÍDEO'])
  assert.deepEqual(reminderSources(layout), october2026Roster.reminders)
})

test('highlights reminder clauses without changing the text', () => {
  defaultReminders.forEach((reminder, index) => {
    const runs = reminderRuns(reminder, index)
    assert.equal(runs.map((run) => run.text).join(''), reminder)
  })
  const [first, second] = defaultReminders.map((reminder, index) => reminderRuns(reminder, index))
  assert.equal(first[0].color, 'ink')
  assert.equal(first[1].color, 'orange')
  assert.equal(second[0].color, 'orange')
  assert.equal(second[1].color, 'ink')
})

test('renders an empty month with headers and reminders', async () => {
  const blank = emptyRoster(2026, 3)
  const layout = layoutRosterPoster(blank, undefined, await measure())
  assert.equal(dataRows(layout).length, 0)
  assert.equal(layout.pages[0].rows.find((row) => row.kind === 'month')?.cells[0].glyphs[0].text, 'MARÇO')
  assert.deepEqual(reminderSources(layout), blank.reminders)
  assert.equal(layout.filename, rosterFileBase(blank))
})

test('keeps a long accented name intact inside the cell', async () => {
  const name = 'Maria Aparecida dos Santos Oliveira Ferreira da Conceição'
  const row: RosterRow = { day: 4, attendants: [name, ''], microphones: ['José João Áurea'], sound: ['Ação'] }
  const layout = layoutRosterPoster(roster({ rows: [row], reminders: [] }), undefined, await measure())
  const cells = dataRows(layout)[0].cells
  assert.equal(compact(cells[1].glyphs.map((glyph) => glyph.text).join('')), compact(displayNames([name])[0]))
  assert.equal(cells[2].glyphs[0].text, 'JOSÉ JOÃO ÁUREA')
  assert.equal(cells[3].glyphs[0].text, 'AÇÃO')
  for (const cell of cells) {
    for (const glyph of cell.glyphs) {
      assert.ok(glyph.x >= cell.x - 0.2)
      assert.ok(glyph.x + glyph.width <= cell.x + cell.width + 0.2)
    }
  }
})

test('puts each of several people on a separate line', async () => {
  const names = ['Ana', 'Bruno', 'Carla', 'Diego']
  const row: RosterRow = { day: 2, attendants: names, microphones: [], sound: [] }
  const layout = layoutRosterPoster(roster({ rows: [row], reminders: defaultReminders }), undefined, await measure())
  assert.deepEqual(dataRows(layout)[0].cells[1].glyphs.map((glyph) => glyph.text), names.map((name) => name.toLocaleUpperCase('pt-BR')))
})

test('keeps a long reminder exact, on an extra page when needed', async () => {
  const reminder = `LEMBRETES: ${'CHEGAR CEDO, CONFERIR ÁUDIO, VÍDEO E AÇÃO. '.repeat(40)}`
  const rows = Array.from({ length: 18 }, (_, index) => ({
    day: index + 1,
    attendants: ['Nome Um', 'Nome Dois'],
    microphones: ['Nome Três', 'Nome Quatro'],
    sound: ['Nome Cinco', 'Nome Seis'],
  }))
  const layout = layoutRosterPoster(roster({ rows, reminders: [reminder, defaultReminders[1]] }), undefined, await measure())
  assert.ok(layout.pages.length >= 2)
  assert.deepEqual(dataRows(layout).map((row) => row.day), rows.map((row) => row.day))
  assert.deepEqual(reminderSources(layout), [reminder, defaultReminders[1]])
  for (const page of layout.pages) {
    for (const glyph of [...page.title, ...page.rows.flatMap((row) => row.cells.flatMap((cell) => cell.glyphs)), ...page.reminders.flatMap((item) => item.lines.flat())]) {
      assert.ok(glyph.y >= layout.frame.y, glyph.text)
      assert.ok(glyph.y + glyph.size <= layout.frame.y + layout.frame.height, glyph.text)
      assert.ok(glyph.x >= layout.frame.x - 1, glyph.text)
      assert.ok(glyph.x + glyph.width <= layout.frame.x + layout.frame.width + 1, glyph.text)
    }
  }
})

test('exports one meeting with the same poster and filename', async () => {
  const row = october2026Roster.rows[4]
  const layout = layoutRosterPoster(october2026Roster, row, await measure())
  assert.equal(layout.filename, 'designacao-15-outubro-2026')
  assert.deepEqual(dataRows(layout).map((item) => item.day), [15])
  assert.deepEqual(reminderSources(layout), october2026Roster.reminders)
})

test('renders a searchable october pdf on one page', async () => {
  const { bytes, filename, layout } = await renderRosterPdf(october2026Roster)
  assert.equal(filename, 'indicadores-audio-video-outubro-2026.pdf')
  assert.equal(layout.pages.length, 1)
  assert.equal(Buffer.from(bytes).subarray(0, 5).toString(), '%PDF-')
  const loaded = await PDFDocument.load(bytes)
  assert.equal(loaded.getPageCount(), 1)
  const directory = await mkdtemp(path.join(tmpdir(), 'unio-pdf-'))
  const file = path.join(directory, filename)
  await writeFile(file, bytes)
  const stored = await readFile(file)
  assert.equal(stored.subarray(0, 5).toString(), '%PDF-')
  await rm(directory, { recursive: true, force: true })
})
