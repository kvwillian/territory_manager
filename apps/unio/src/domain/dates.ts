const monthsShort = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const monthsLong = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]
const weekdaysLong = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
const weekdaysShort = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function parseIso(iso: string) {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function addDays(iso: string, days: number) {
  const date = parseIso(iso)
  date.setDate(date.getDate() + days)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`
}

export function shiftMonth(key: string, delta: number) {
  const [year, month] = key.split('-').map(Number)
  const date = new Date(year, month - 1 + delta, 1)
  return monthKey(date.getFullYear(), date.getMonth() + 1)
}

export function monthTitle(key: string) {
  const date = parseIso(`${key}-01`)
  const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date)
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function weekdayLong(iso: string) {
  return weekdaysLong[parseIso(iso).getDay()] ?? ''
}

export function weekdayShort(iso: string) {
  return weekdaysShort[parseIso(iso).getDay()] ?? ''
}

export function meetingDatesInMonth(meetings: { isoDate: string }[], key: string) {
  return [...new Set(meetings.filter((meeting) => meeting.isoDate.startsWith(`${key}-`)).map((meeting) => meeting.isoDate))].sort()
}

export function meetingInStrip(isoDate: string, key: string) {
  const [year, month] = key.split('-').map(Number)
  const start = new Date(year, month - 1, 1)
  const next = new Date(year, month, 1)
  const lookahead = new Date(year, month, 7)
  const date = parseIso(isoDate)
  return (date >= start && date < next) || (date >= next && date < lookahead)
}

export function weekStart(iso: string) {
  const date = parseIso(iso)
  const weekday = date.getDay()
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday
  const monday = new Date(date)
  monday.setDate(date.getDate() + mondayOffset)
  monday.setHours(0, 0, 0, 0)
  return monday
}

export function isCurrentWeek(iso: string, today = new Date()) {
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const currentIso = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`
  return weekStart(iso).getTime() === weekStart(currentIso).getTime()
}

export function weekRangeLabel(iso: string) {
  const monday = weekStart(iso)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  if (monday.getMonth() === sunday.getMonth()) {
    return `${monday.getDate()} – ${sunday.getDate()} de ${monthsShort[monday.getMonth()]}.`
  }
  return `${monday.getDate()} de ${monthsShort[monday.getMonth()]}. – ${sunday.getDate()} de ${monthsShort[sunday.getMonth()]}.`
}

export function dayLine(iso: string, dayShort: string) {
  const date = parseIso(iso)
  return `${dayShort}, ${date.getDate()} de ${monthsLong[date.getMonth()]}`
}

export function headingDate(iso: string, dayLong: string) {
  const date = parseIso(iso)
  return `${dayLong}, ${date.getDate()} de ${monthsLong[date.getMonth()]} de ${date.getFullYear()}`
}

export function isoFromDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}
