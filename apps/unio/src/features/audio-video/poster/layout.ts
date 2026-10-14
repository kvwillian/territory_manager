import type { MonthlyRoster, RosterRow } from '../types'
import { columnHeaders, displayNames, monthTitle, rosterFileBase } from '../utils'
import type { PosterCell, PosterColor, PosterFrame, PosterGlyph, PosterLayout, PosterMeasure, PosterPage, PosterReminder, PosterRow } from './types'

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const FRAME = 18
const CORNER = 24
const CORNER_OFFSET = 9
const CONTENT_PAD_X = 46
const TOP_CLEARANCE = 54
const BOTTOM_CLEARANCE = 50
const TITLE_SIZE = 30
const AMP_SIZE = 16
const SUBTITLE_SIZE = 28
const TITLE_GAP = 7
const AFTER_TITLE = 26
const MONTH_H = 30
const MONTH_SIZE = 14
const HEADER_H = 26
const HEADER_SIZE = 10
const NAME_SIZE = 10
const NAME_MIN = 8
const DAY_SIZE = 13
const LINE_GAP = 3.5
const CELL_PAD_Y = 8
const CELL_PAD_X = 6
const DAY_WIDTH = 54
const REMINDER_SIZE = 12
const REMINDER_LINE = 16
const REMINDER_GAP = 32
const REMINDER_BLOCK = 16
type NameLine = { text: string; size: number; width: number }

type PreparedRow = {
  day: number
  height: number
  columns: NameLine[][]
}

type ReminderToken = { text: string; width: number; color: PosterColor }

type Block =
  | { kind: 'title'; height: number }
  | { kind: 'table-head'; height: number }
  | { kind: 'row'; height: number; row: PreparedRow; index: number }
  | { kind: 'reminder-line'; height: number; source: string; first: boolean; line: ReminderToken[] }

export function reminderRuns(reminder: string, index: number): Array<{ text: string; color: PosterColor }> {
  const colon = reminder.indexOf(':')
  if (colon < 0) return [{ text: reminder, color: 'ink' }]
  const label = reminder.slice(0, colon + 1)
  const rest = reminder.slice(colon + 1)
  if (index % 2 === 0) return [{ text: label, color: 'ink' }, { text: rest, color: 'orange' }]
  return [{ text: label, color: 'orange' }, { text: rest, color: 'ink' }]
}

export function layoutRosterPoster(roster: MonthlyRoster, row: RosterRow | undefined, measure: PosterMeasure): PosterLayout {
  const rows = row ? [row] : roster.rows
  const frame = { x: FRAME, y: FRAME, width: PAGE_WIDTH - FRAME * 2, height: PAGE_HEIGHT - FRAME * 2 }
  const tableX = frame.x + CONTENT_PAD_X
  const tableWidth = frame.width - CONTENT_PAD_X * 2
  const columns = columnWidths(tableWidth)
  const innerTop = frame.y + frame.height - TOP_CLEARANCE
  const innerBottom = frame.y + BOTTOM_CLEARANCE
  const innerHeight = innerTop - innerBottom
  const textWidth = columns.map((width, index) => width - (index === 0 ? 4 : CELL_PAD_X * 2))
  const prepared = rows.map((item) => prepareRow(item, textWidth, measure))
  const reminderWidth = tableWidth * 0.78
  const reminders = roster.reminders.map((source, index) => prepareReminder(source, index, reminderWidth, measure))
  const titleHeight = TITLE_SIZE + TITLE_GAP + AMP_SIZE + TITLE_GAP + SUBTITLE_SIZE + AFTER_TITLE
  const monthName = monthTitle(roster.month)
  const blocks = pack(prepared, reminders, titleHeight, innerHeight)
  const pages = blocks.map((pageBlocks) => placePage(pageBlocks, innerTop, tableX, columns, monthName, measure))
  return {
    filename: rosterFileBase(roster, row?.day),
    pageWidth: PAGE_WIDTH,
    pageHeight: PAGE_HEIGHT,
    frame,
    corners: cornerSquares(frame),
    pages,
  }
}

function columnWidths(tableWidth: number) {
  const rest = (tableWidth - DAY_WIDTH) / 3
  return [DAY_WIDTH, rest, rest, tableWidth - DAY_WIDTH - rest * 2]
}

function cornerSquares(frame: PosterFrame) {
  const right = frame.x + frame.width
  const top = frame.y + frame.height
  const boxes = [
    [frame.x, top - CORNER],
    [frame.x + CORNER_OFFSET, top - CORNER - CORNER_OFFSET],
    [right - CORNER, top - CORNER],
    [right - CORNER - CORNER_OFFSET, top - CORNER - CORNER_OFFSET],
    [frame.x, frame.y],
    [frame.x + CORNER_OFFSET, frame.y + CORNER_OFFSET],
    [right - CORNER, frame.y],
    [right - CORNER - CORNER_OFFSET, frame.y + CORNER_OFFSET],
  ]
  return boxes.map(([x, y]) => ({ x, y, width: CORNER, height: CORNER }))
}

function prepareRow(row: RosterRow, textWidth: number[], measure: PosterMeasure): PreparedRow {
  const columns = [
    fitName(String(row.day), textWidth[0], measure, DAY_SIZE),
    ...[row.attendants, row.microphones, row.sound].map((names, index) =>
      displayNames(names).flatMap((name) => fitName(name, textWidth[index + 1], measure, NAME_SIZE)),
    ),
  ]
  const tallest = Math.max(...columns.map(blockHeight))
  return { day: row.day, height: Math.max(36, CELL_PAD_Y * 2 + tallest), columns }
}

function fitName(name: string, maxWidth: number, measure: PosterMeasure, preferred: number): NameLine[] {
  let size = preferred
  const min = Math.min(preferred, NAME_MIN)
  while (size > min && measure(name, size) > maxWidth) size -= 0.25
  if (measure(name, size) <= maxWidth) return [{ text: name, size, width: measure(name, size) }]
  return wrapWords(name, maxWidth, min, measure)
}

function wrapWords(text: string, maxWidth: number, size: number, measure: PosterMeasure): NameLine[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    for (const piece of splitWord(word, maxWidth, size, measure)) {
      const next = current ? `${current} ${piece}` : piece
      if (current && measure(next, size) > maxWidth) {
        lines.push(current)
        current = piece
      } else current = next
    }
  }
  if (current) lines.push(current)
  return lines.map((line) => ({ text: line, size, width: measure(line, size) }))
}

function splitWord(word: string, maxWidth: number, size: number, measure: PosterMeasure) {
  if (measure(word, size) <= maxWidth) return [word]
  const parts: string[] = []
  let current = ''
  for (const char of word) {
    const next = current + char
    if (current && measure(next, size) > maxWidth) {
      parts.push(current)
      current = char
    } else current = next
  }
  if (current) parts.push(current)
  return parts
}

function blockHeight(lines: NameLine[]) {
  if (lines.length === 0) return NAME_SIZE
  return lines.reduce((sum, line) => sum + line.size, 0) + LINE_GAP * (lines.length - 1)
}

function prepareReminder(source: string, index: number, maxWidth: number, measure: PosterMeasure) {
  const runs = reminderRuns(source, index)
  const tokens = runs.flatMap((run) => run.text.split(/(\s+)/).filter(Boolean).map((text) => ({ text, color: run.color })))
  const lines: Array<Array<{ text: string; width: number; color: PosterColor }>> = []
  let current: Array<{ text: string; width: number; color: PosterColor }> = []
  let width = 0
  const push = () => {
    if (current.length === 0) return
    lines.push(current)
    current = []
    width = 0
  }
  for (const token of tokens) {
    const space = /^\s+$/.test(token.text)
    const pieces = space ? [token.text] : splitWord(token.text, maxWidth, REMINDER_SIZE, measure)
    for (const piece of pieces) {
      const pieceWidth = measure(piece, REMINDER_SIZE)
      if (!space && current.length > 0 && width + pieceWidth > maxWidth) push()
      if (space && current.length === 0) continue
      current.push({ text: piece, width: pieceWidth, color: token.color })
      width += pieceWidth
    }
  }
  push()
  if (lines.length === 0) lines.push([{ text: '', width: 0, color: 'ink' }])
  return { source, lines }
}

function pack(rows: PreparedRow[], reminders: ReturnType<typeof prepareReminder>[], titleHeight: number, innerHeight: number) {
  const blocks: Block[] = [{ kind: 'title', height: titleHeight }, { kind: 'table-head', height: MONTH_H + HEADER_H }]
  rows.forEach((row, index) => blocks.push({ kind: 'row', height: row.height, row, index }))
  reminders.forEach((reminder, reminderIndex) => {
    reminder.lines.forEach((line, lineIndex) => {
      blocks.push({
        kind: 'reminder-line',
        height: (lineIndex === 0 ? (reminderIndex === 0 ? REMINDER_GAP : REMINDER_BLOCK) : 0) + REMINDER_LINE,
        source: reminder.source,
        first: lineIndex === 0,
        line,
      })
    })
  })
  const pages: Block[][] = []
  let current: Block[] = []
  let used = 0
  const flush = () => {
    if (current.length === 0) return
    pages.push(current)
    current = []
    used = 0
  }
  for (const block of blocks) {
    if (current.length > 0 && used + block.height > innerHeight) flush()
    if (current.length === 0 && block.kind === 'row') {
      const head: Block = { kind: 'table-head', height: MONTH_H + HEADER_H }
      current.push(head)
      used += head.height
    }
    current.push(block)
    used += block.height
  }
  flush()
  return pages.length > 0 ? pages : [blocks]
}

function placePage(blocks: Block[], innerTop: number, tableX: number, columns: number[], monthName: string, measure: PosterMeasure): PosterPage {
  let cursor = innerTop
  const title: PosterGlyph[] = []
  const rows: PosterRow[] = []
  const reminders: PosterReminder[] = []
  for (const block of blocks) {
    if (block.kind === 'title') {
      const lines = [
        { text: 'INDICADORES', size: TITLE_SIZE },
        { text: '&', size: AMP_SIZE },
        { text: 'ÁUDIO e VÍDEO', size: SUBTITLE_SIZE },
      ]
      for (const line of lines) {
        const width = measure(line.text, line.size)
        const baseline = cursor - line.size
        title.push({
          text: line.text,
          x: (PAGE_WIDTH - width) / 2,
          y: baseline,
          size: line.size,
          width,
          color: 'orange',
        })
        cursor = baseline - TITLE_GAP
      }
      cursor -= AFTER_TITLE - TITLE_GAP
    } else if (block.kind === 'table-head') {
      cursor -= MONTH_H
      rows.push(spanRow('month', cursor, MONTH_H, tableX, columns, 'orange', centerGlyph(monthName, MONTH_SIZE, 'white', tableX, sum(columns), cursor, MONTH_H, measure)))
      cursor -= HEADER_H
      rows.push({
        kind: 'header',
        y: cursor,
        height: HEADER_H,
        cells: columnHeaders.map((label, index) => cell(tableX, columns, index, 'white', [centerGlyph(label, HEADER_SIZE, 'orange', columnX(tableX, columns, index), columns[index], cursor, HEADER_H, measure)])),
      })
    } else if (block.kind === 'row') {
      cursor -= block.height
      rows.push({
        kind: 'data',
        day: block.row.day,
        y: cursor,
        height: block.height,
        cells: block.row.columns.map((lines, index) =>
          cell(
            tableX,
            columns,
            index,
            block.index % 2 === 1 ? 'peach' : 'white',
            placeBlock(lines, columnX(tableX, columns, index), columns[index], cursor, block.height, 'ink'),
          ),
        ),
      })
    } else {
      cursor -= block.height - REMINDER_LINE
      const lineWidth = block.line.reduce((total, token) => total + token.width, 0)
      let x = (PAGE_WIDTH - lineWidth) / 2
      const baseline = cursor - REMINDER_SIZE
      const glyphs = block.line.map((token) => {
        const glyph: PosterGlyph = {
          text: token.text,
          x,
          y: baseline,
          size: REMINDER_SIZE,
          width: token.width,
          color: token.color,
        }
        x += token.width
        return glyph
      })
      cursor -= REMINDER_LINE
      const current = reminders[reminders.length - 1]
      if (block.first || !current || current.source !== block.source) reminders.push({ source: block.source, lines: [glyphs] })
      else current.lines.push(glyphs)
    }
  }
  return { title, rows, reminders }
}

function spanRow(kind: PosterRow['kind'], y: number, height: number, tableX: number, columns: number[], fill: PosterColor, glyph: PosterGlyph): PosterRow {
  return { kind, y, height, cells: [{ x: tableX, width: sum(columns), fill, glyphs: glyph.text ? [glyph] : [] }] }
}

function cell(tableX: number, columns: number[], index: number, fill: PosterColor, glyphs: PosterGlyph[]): PosterCell {
  return { x: columnX(tableX, columns, index), width: columns[index], fill, glyphs }
}

function columnX(tableX: number, columns: number[], index: number) {
  return tableX + columns.slice(0, index).reduce((total, width) => total + width, 0)
}

function centerGlyph(text: string, size: number, color: PosterColor, x: number, width: number, rowY: number, rowHeight: number, measure: PosterMeasure): PosterGlyph {
  const textWidth = measure(text, size)
  const baseline = rowY + (rowHeight - size) / 2
  return { text, x: x + (width - textWidth) / 2, y: baseline, size, width: textWidth, color }
}

function placeBlock(lines: NameLine[], x: number, width: number, rowY: number, rowHeight: number, color: PosterColor): PosterGlyph[] {
  if (lines.length === 0) return []
  const block = blockHeight(lines)
  let top = rowY + rowHeight - (rowHeight - block) / 2
  return lines.map((line) => {
    const baseline = top - line.size
    top = baseline - LINE_GAP
    return { text: line.text, x: x + (width - line.width) / 2, y: baseline, size: line.size, width: line.width, color }
  })
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}
