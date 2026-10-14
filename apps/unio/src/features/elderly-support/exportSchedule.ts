import type { AssignmentRow } from './model'
import { displayDate, weekdayLabel } from './model'

export async function exportScheduleXlsx(rows: AssignmentRow[], filename: string) {
  const ExcelJS = (await import('exceljs')).default
  const book = new ExcelJS.Workbook()
  const sheet = book.addWorksheet('Suporte a idosos')
  sheet.columns = [
    { header: 'Data', key: 'date', width: 16 },
    { header: 'Dia', key: 'day', width: 16 },
    { header: 'Idoso', key: 'elderly', width: 28 },
    { header: 'Motorista', key: 'driver', width: 28 },
  ]
  const header = sheet.getRow(1)
  header.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Calibri' }
  header.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } }
    cell.alignment = { vertical: 'middle' }
  })
  for (const row of rows) {
    sheet.addRow({
      date: displayDate(row.date),
      day: weekdayLabel(row.date),
      elderly: row.elderlyName,
      driver: row.driverName,
    })
  }
  const buffer = await book.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}
