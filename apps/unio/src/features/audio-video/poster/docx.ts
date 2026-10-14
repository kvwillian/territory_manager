import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  PageOrientation,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'
import type { MonthlyRoster, RosterRow } from '../types'
import { columnHeaders, displayNames, downloadBlob, monthTitle, rosterPalette } from '../utils'

function docCell(lines: string[], options?: { header?: boolean; fill?: string; width?: number }) {
  return new TableCell({
    width: options?.width ? { size: options.width, type: WidthType.DXA } : undefined,
    shading: options?.fill ? { type: ShadingType.CLEAR, fill: options.fill } : undefined,
    margins: { top: 80, bottom: 80, left: 80, right: 80 },
    children: (lines.length ? lines : ['']).map(
      (line) =>
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: line,
              bold: true,
              font: 'Calibri',
              size: options?.header ? 20 : 22,
              color: options?.header ? rosterPalette.white : rosterPalette.ink,
            }),
          ],
        }),
    ),
  })
}

export async function exportRosterDocx(roster: MonthlyRoster, rows: RosterRow[], filename: string) {
  const edge = { style: BorderStyle.SINGLE, size: 8, color: rosterPalette.orange }
  const header = new TableRow({
    children: columnHeaders.map((label) =>
      docCell([label], { header: true, fill: rosterPalette.orange, width: label === 'DIA' ? 1400 : 4200 }),
    ),
  })
  const body = rows.map(
    (row, index) =>
      new TableRow({
        children: [
          docCell([String(row.day)], { fill: index % 2 ? rosterPalette.peach : rosterPalette.white, width: 1400 }),
          docCell(displayNames(row.attendants), { fill: index % 2 ? rosterPalette.peach : rosterPalette.white, width: 4200 }),
          docCell(displayNames(row.microphones), { fill: index % 2 ? rosterPalette.peach : rosterPalette.white, width: 4200 }),
          docCell(displayNames(row.sound), { fill: index % 2 ? rosterPalette.peach : rosterPalette.white, width: 4200 }),
        ],
      }),
  )
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.LANDSCAPE, width: 15840, height: 12240 },
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'INDICADORES & ÁUDIO e VÍDEO', bold: true, size: 48, color: rosterPalette.orange, font: 'Calibri' })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [new TextRun({ text: monthTitle(roster.month), bold: true, size: 32, color: rosterPalette.orange, font: 'Calibri' })],
          }),
          new Table({
            width: { size: 14000, type: WidthType.DXA },
            rows: [header, ...body],
            borders: { top: edge, bottom: edge, left: edge, right: edge },
          }),
          ...roster.reminders.map(
            (reminder) =>
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 200 },
                children: [new TextRun({ text: reminder.toLocaleUpperCase('pt-BR'), bold: true, size: 22, font: 'Calibri' })],
              }),
          ),
        ],
      },
    ],
  })
  downloadBlob(await Packer.toBlob(doc), `${filename}.docx`)
}
