export type ScheduleStatus = 'draft' | 'published'

export type StoredAssignment = {
  date: string
  elderlyName: string
  elderlyPublisherId?: string
  driverName: string
  driverPublisherId?: string
}

export type ElderlySchedule = {
  id: string
  congregationId: string
  title?: string
  note?: string
  status: ScheduleStatus
  createdAt: string
  updatedAt: string
  createdBy: string
  assignments: StoredAssignment[]
}

export type AssignmentRow = {
  key: string
  date: string
  elderlyName: string
  elderlyPublisherId?: string
  driverName: string
  driverPublisherId?: string
}

const weekdays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

const tones = [
  { bg: '#EEF2FF', fg: '#4338CA' },
  { bg: '#E8EDF4', fg: '#475569' },
  { bg: '#FDE8EF', fg: '#9F1239' },
  { bg: '#FEF3E2', fg: '#B45309' },
  { bg: '#ECFDF5', fg: '#047857' },
  { bg: '#E0F2FE', fg: '#0369A1' },
]

export function canManageElderlySupport(account: {
  role: string
  congregationId: string | null
  manageFlags?: string[]
}) {
  if (!account.congregationId) return false
  if (account.role === 'admin') return true
  return (account.manageFlags ?? []).includes('elderlySupport')
}

export function monthBounds(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number)
  const last = new Date(year, month, 0).getDate()
  const mm = String(month).padStart(2, '0')
  return {
    from: `${year}-${mm}-01`,
    to: `${year}-${mm}-${String(last).padStart(2, '0')}`,
  }
}

export function inMonth(date: string, monthKey: string) {
  return date.startsWith(`${monthKey}-`)
}

export function parseIso(iso: string) {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function weekdayLabel(iso: string) {
  return weekdays[parseIso(iso).getDay()] ?? ''
}

export function displayDate(iso: string) {
  const date = parseIso(iso)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${day}/${month}/${date.getFullYear()}`
}

export function dayNumber(iso: string) {
  return parseIso(iso).getDate()
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0].slice(0, 2).toLocaleUpperCase('pt-BR')
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toLocaleUpperCase('pt-BR')
}

export function avatarTone(name: string) {
  const folded = name.trim().toLocaleLowerCase('pt-BR')
  let hash = 0
  for (const char of folded) hash = (hash + char.charCodeAt(0)) % tones.length
  return tones[hash] ?? tones[0]
}

export function rowsFromSchedule(assignments: StoredAssignment[]): AssignmentRow[] {
  return assignments.map((item, index) => ({
    key: `saved-${String(index).padStart(4, '0')}`,
    date: item.date,
    elderlyName: item.elderlyName,
    elderlyPublisherId: item.elderlyPublisherId,
    driverName: item.driverName,
    driverPublisherId: item.driverPublisherId,
  }))
}

export function ensureMeetingRows(rows: AssignmentRow[], dates: string[]): AssignmentRow[] {
  const present = new Set(rows.map((row) => row.date))
  const missing = dates.filter((date) => date && !present.has(date)).map((date) => blankRow(date, `meeting-${date}`))
  return orderedRows([...rows, ...missing])
}

export function blankRow(date: string, key: string): AssignmentRow {
  return { key, date, elderlyName: '', driverName: '' }
}

export function assignPerson(
  row: AssignmentRow,
  role: 'elderly' | 'driver',
  person: { name: string; publisherId?: string },
): AssignmentRow {
  const name = person.name.trim()
  if (role === 'elderly') {
    const next: AssignmentRow = { ...row, elderlyName: name }
    if (person.publisherId) next.elderlyPublisherId = person.publisherId
    else delete next.elderlyPublisherId
    return next
  }
  const next: AssignmentRow = { ...row, driverName: name }
  if (name && person.publisherId) next.driverPublisherId = person.publisherId
  else delete next.driverPublisherId
  return next
}

export function orderedRows(rows: AssignmentRow[]) {
  return [...rows].sort((a, b) => a.date.localeCompare(b.date))
}

export function toStoredAssignments(rows: AssignmentRow[]): StoredAssignment[] {
  return orderedRows(rows)
    .filter((row) => row.date && row.elderlyName.trim())
    .map((row) => {
      const item: StoredAssignment = {
        date: row.date,
        elderlyName: row.elderlyName.trim(),
        driverName: row.driverName.trim(),
      }
      if (row.elderlyPublisherId) item.elderlyPublisherId = row.elderlyPublisherId
      if (item.driverName && row.driverPublisherId) item.driverPublisherId = row.driverPublisherId
      return item
    })
}

export function missingNames(rows: AssignmentRow[]) {
  return rows.some((row) => row.date && !row.elderlyName.trim())
}

export function monthStats(rows: AssignmentRow[]) {
  const meetings = new Set(rows.map((row) => row.date).filter(Boolean))
  const elderly = new Set(rows.map((row) => row.elderlyName.trim()).filter(Boolean))
  const drivers = new Set(rows.map((row) => row.driverName.trim()).filter(Boolean))
  return { meetings: meetings.size, elderly: elderly.size, drivers: drivers.size }
}

export function groupByDate(rows: AssignmentRow[]) {
  const groups: { date: string; rows: AssignmentRow[] }[] = []
  for (const row of orderedRows(rows)) {
    const last = groups[groups.length - 1]
    if (last && last.date === row.date) last.rows.push(row)
    else groups.push({ date: row.date, rows: [row] })
  }
  return groups
}

export function matchesQuery(row: AssignmentRow, query: string) {
  const folded = query.trim().toLocaleLowerCase('pt-BR')
  if (!folded) return true
  return `${row.elderlyName} ${row.driverName} ${row.date}`.toLocaleLowerCase('pt-BR').includes(folded)
}
