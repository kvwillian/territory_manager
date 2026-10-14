import type { ExportFormat, MonthlyRoster, RosterRow } from './types'
import { rosterFileBase } from './utils'

export async function exportRoster(roster: MonthlyRoster, format: ExportFormat, row?: RosterRow) {
  const rows = row ? [row] : roster.rows
  const filename = rosterFileBase(roster, row?.day)
  if (format === 'pdf') {
    const { exportRosterPdf } = await import('./poster/pdf')
    await exportRosterPdf(roster, row)
    return
  }
  if (format === 'docx') {
    const { exportRosterDocx } = await import('./poster/docx')
    await exportRosterDocx(roster, rows, filename)
    return
  }
  const { exportRosterXlsx } = await import('./poster/xlsx')
  await exportRosterXlsx(roster, rows, filename)
}
