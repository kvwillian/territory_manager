import ExcelJS from 'exceljs'
import type { MonthlyRoster, RosterRow } from '../types'
import { columnHeaders, displayNames, downloadBlob, monthTitle, rosterPalette } from '../utils'

const orange = `FF${rosterPalette.orange}`
const peach = `FF${rosterPalette.peach}`

export async function exportRosterXlsx(roster: MonthlyRoster, rows: RosterRow[], filename: string) {
  const book = new ExcelJS.Workbook()
  const sheet = book.addWorksheet('Designações')
  sheet.mergeCells('A1:D1')
  sheet.mergeCells('A2:D2')
  sheet.getCell('A1').value = 'INDICADORES & ÁUDIO e VÍDEO'
  sheet.getCell('A2').value = monthTitle(roster.month)
  for (const address of ['A1', 'A2']) {
    const cell = sheet.getCell(address)
    cell.font = { bold: true, size: address === 'A1' ? 18 : 14, color: { argb: orange }, name: 'Calibri' }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  }
  sheet.getRow(1).height = 28
  sheet.getRow(2).height = 22
  columnHeaders.forEach((header, index) => {
    const cell = sheet.getCell(3, index + 1)
    cell.value = header
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Calibri' }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: orange } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })
  sheet.getRow(3).height = 22
  rows.forEach((row, index) => {
    const excelRow = sheet.getRow(index + 4)
    const values = [String(row.day), displayNames(row.attendants).join('\n'), displayNames(row.microphones).join('\n'), displayNames(row.sound).join('\n')]
    values.forEach((value, column) => {
      const cell = excelRow.getCell(column + 1)
      cell.value = value
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      cell.font = { bold: true, name: 'Calibri', size: 12 }
      if (index % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: peach } }
      cell.border = {
        top: { style: 'thin', color: { argb: orange } },
        left: { style: 'thin', color: { argb: orange } },
        bottom: { style: 'thin', color: { argb: orange } },
        right: { style: 'thin', color: { argb: orange } },
      }
    })
    excelRow.height = 36
  })
  sheet.getColumn(1).width = 14
  sheet.getColumn(2).width = 36
  sheet.getColumn(3).width = 36
  sheet.getColumn(4).width = 36
  sheet.pageSetup.orientation = 'landscape'
  sheet.pageSetup.fitToPage = true
  sheet.pageSetup.fitToWidth = 1
  sheet.pageSetup.fitToHeight = 1
  const reminderStart = rows.length + 5
  roster.reminders.forEach((reminder, index) => {
    const rowNumber = reminderStart + index
    sheet.mergeCells(`A${rowNumber}:D${rowNumber}`)
    const cell = sheet.getCell(`A${rowNumber}`)
    cell.value = reminder.toLocaleUpperCase('pt-BR')
    cell.font = { bold: true, name: 'Calibri', size: 12 }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    sheet.getRow(rowNumber).height = 32
  })
  const buffer = await book.xlsx.writeBuffer()
  downloadBlob(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${filename}.xlsx`)
}
