import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import type { MonthlyRoster, RosterRow } from '../types'
import { downloadBlob, rosterPalette } from '../utils'
import { layoutRosterPoster } from './layout'
import type { PosterColor, PosterGlyph, PosterLayout, PosterMeasure, PosterPage, PosterRow } from './types'

const colors: Record<PosterColor, ReturnType<typeof rgb>> = {
  orange: rgbOf(rosterPalette.orange),
  peach: rgbOf(rosterPalette.peach),
  white: rgbOf(rosterPalette.white),
  ink: rgbOf(rosterPalette.ink),
}

function rgbOf(hex: string) {
  const value = Number.parseInt(hex, 16)
  return rgb(((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255)
}

async function loadPosterFont() {
  if (typeof window === 'undefined') {
    const { readFile } = await import('node:fs/promises')
    const { fileURLToPath } = await import('node:url')
    const path = fileURLToPath(new URL('../../../../public/fonts/Arimo-Bold.ttf', import.meta.url))
    return new Uint8Array(await readFile(path))
  }
  const response = await fetch('/fonts/Arimo-Bold.ttf')
  if (!response.ok) throw new Error('Não foi possível carregar a fonte do cartaz.')
  return new Uint8Array(await response.arrayBuffer())
}

export async function embedPosterFont(doc: PDFDocument) {
  doc.registerFontkit(fontkit)
  return doc.embedFont(await loadPosterFont(), { subset: true })
}

export async function renderRosterPdf(roster: MonthlyRoster, row?: RosterRow) {
  const doc = await PDFDocument.create()
  const font = await embedPosterFont(doc)
  const measure: PosterMeasure = (text, size) => font.widthOfTextAtSize(text, size)
  const layout = layoutRosterPoster(roster, row, measure)
  for (const posterPage of layout.pages) {
    const page = doc.addPage([layout.pageWidth, layout.pageHeight])
    drawPosterPage(page, layout, posterPage, font)
  }
  doc.setTitle('Indicadores & Áudio e Vídeo')
  doc.setLanguage('pt-BR')
  const bytes = await doc.save()
  return { bytes, filename: `${layout.filename}.pdf`, layout }
}

export async function exportRosterPdf(roster: MonthlyRoster, row?: RosterRow) {
  const { bytes, filename } = await renderRosterPdf(roster, row)
  const copy = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  downloadBlob(new Blob([copy], { type: 'application/pdf' }), filename)
}

function drawPosterPage(page: PDFPage, layout: PosterLayout, posterPage: PosterPage, font: PDFFont) {
  for (const row of posterPage.rows) {
    for (const cell of row.cells) {
      page.drawRectangle({ x: cell.x, y: row.y, width: cell.width, height: row.height, color: colors[cell.fill] })
    }
  }
  drawGrid(page, posterPage.rows)
  drawGlyphs(page, posterPage.title, font)
  for (const row of posterPage.rows) {
    for (const cell of row.cells) drawGlyphs(page, cell.glyphs, font)
  }
  for (const reminder of posterPage.reminders) {
    for (const line of reminder.lines) drawGlyphs(page, line, font)
  }
  page.drawRectangle({
    x: layout.frame.x,
    y: layout.frame.y,
    width: layout.frame.width,
    height: layout.frame.height,
    borderColor: colors.orange,
    borderWidth: 2,
  })
  for (const corner of layout.corners) {
    page.drawRectangle({
      x: corner.x,
      y: corner.y,
      width: corner.width,
      height: corner.height,
      borderColor: colors.orange,
      borderWidth: 1.6,
    })
  }
}

function drawGrid(page: PDFPage, rows: PosterRow[]) {
  if (rows.length === 0) return
  const left = rows[0].cells[0].x
  const width = rows[0].cells.reduce((total, cell) => total + cell.width, 0)
  const line = (x1: number, y1: number, x2: number, y2: number) => {
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 1.5, color: colors.orange })
  }
  line(left, rows[0].y + rows[0].height, left + width, rows[0].y + rows[0].height)
  for (const row of rows) {
    line(left, row.y, left + width, row.y)
    let x = left
    line(x, row.y, x, row.y + row.height)
    for (const cell of row.cells) {
      x += cell.width
      line(x, row.y, x, row.y + row.height)
    }
  }
}

function drawGlyphs(page: PDFPage, glyphs: PosterGlyph[], font: PDFFont) {
  for (const glyph of glyphs) {
    if (!glyph.text) continue
    page.drawText(glyph.text, { x: glyph.x, y: glyph.y, size: glyph.size, font, color: colors[glyph.color] })
  }
}
