export type RosterRow = {
  day: number
  attendants: string[]
  microphones: string[]
  sound: string[]
}

export type MonthlyRoster = {
  year: number
  month: number
  rows: RosterRow[]
  reminders: string[]
  omittedDays?: number[]
}

export type ExportFormat = 'docx' | 'xlsx' | 'pdf'
