import type { MonthlyRoster, RosterRow } from './types'

export type { MonthlyRoster, RosterRow }

export const defaultReminders = [
  'LEMBRETES PARA OS INDICADORES: CHEGAR 20 MINUTOS ANTES DO INÍCIO DAS REUNIÕES.',
  'PÓS REUNIÃO: CONFERIR SE AS PORTAS ESTÃO FECHADAS E SE O AR CONDICIONADO ESTÁ DESLIGADO',
]

export const monthNames = [
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

const monthAliases: Record<string, number> = {
  janeiro: 1,
  fevereiro: 2,
  marco: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12,
}

export function rosterKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`
}

export function emptyRoster(year: number, month: number): MonthlyRoster {
  return { year, month, rows: [], reminders: [...defaultReminders] }
}

function pair(first: string, second: string) {
  return [first, second]
}

export const october2026Roster: MonthlyRoster = {
  year: 2026,
  month: 10,
  reminders: [...defaultReminders],
  rows: [
    { day: 1, attendants: pair('José Bessa', 'Arnaldo'), microphones: pair('Claudemir', 'Fábio'), sound: pair('Kevin', 'Eber') },
    { day: 4, attendants: pair('José Soares', 'Iranil'), microphones: pair('José Carlos', 'Júlio César Oliveira'), sound: pair('Jonathas P.', 'João Vitor') },
    { day: 8, attendants: pair('Carlos Alberto', 'José Ferreira'), microphones: pair('Vicente', 'Alexandre'), sound: pair('Claudemir', 'Leo Andrade') },
    { day: 11, attendants: pair('Roberto Rivelino', 'Laucy Vieira'), microphones: pair('Vanderlei', 'Leonardo'), sound: pair('Djalma', 'Mateus F.') },
    { day: 15, attendants: pair('Leonardo Andrade', 'Carlos Montero'), microphones: pair('Laucy', 'Iranil'), sound: pair('Damião', 'Leandro') },
    { day: 18, attendants: pair('Odair Borges', 'Gusmão'), microphones: pair('Djalma', 'Ferrerinha'), sound: pair('Kaique', 'Alexandre') },
    { day: 22, attendants: pair('Marcos Fernandes', 'João Aristeu'), microphones: pair('Cesar', 'Mateus Oliveira'), sound: pair('Mateus F.', 'João Vitor') },
    { day: 25, attendants: pair('Claudino Andrade', 'José Carlos'), microphones: pair('Kevin', 'Roberto'), sound: pair('Marcelo', 'Eber') },
    { day: 29, attendants: pair('Marcelo', 'Fábio'), microphones: pair('Eber', 'Ricardo'), sound: pair('Leo Andrade', 'Roberto') },
  ],
}

function fold(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
}

function titleName(value: string) {
  return value
    .toLocaleLowerCase('pt-BR')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (word.length <= 2 && word.endsWith('.')) return word.toUpperCase()
      if (word.length <= 2) return word
      return word.charAt(0).toLocaleUpperCase('pt-BR') + word.slice(1)
    })
    .join(' ')
}

const skipLine = /indicador|microfone|mesa de som|audio|vídeo|video|lembrete|pos reuniao|porta|condicionado|dia\b/

export function parseRosterText(text: string, fallbackYear: number): { roster: MonthlyRoster; alerts: string[] } {
  const alerts: string[] = []
  const foldedText = fold(text)
  let month = 0
  for (const [name, index] of Object.entries(monthAliases)) {
    if (foldedText.includes(name)) month = index
  }
  const yearMatch = text.match(/20\d{2}/)
  const year = yearMatch ? Number(yearMatch[0]) : fallbackYear
  const rows: RosterRow[] = []
  let current: { day: number; names: string[] } | null = null

  const push = () => {
    if (!current) return
    const names = current.names.map(titleName).filter(Boolean)
    rows.push({
      day: current.day,
      attendants: names.slice(0, 2),
      microphones: names.slice(2, 4),
      sound: names.slice(4, 6),
    })
    current = null
  }

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+/g, ' ').trim()
    if (!line) continue
    const folded = fold(line)
    if (skipLine.test(folded) && !/^\d{1,2}\b/.test(line)) continue
    const dayMatch = line.match(/^(\d{1,2})\b\s*(.*)$/)
    if (dayMatch) {
      const day = Number(dayMatch[1])
      if (day >= 1 && day <= 31) {
        push()
        current = { day, names: [] }
        const rest = dayMatch[2].trim()
        if (rest) current.names.push(...rest.split(/\s{2,}|,/).map((part) => part.trim()).filter(Boolean))
        continue
      }
    }
    if (current) current.names.push(line)
  }
  push()

  if (!month) alerts.push('O mês não foi identificado. Confira antes de salvar.')
  if (rows.length === 0) alerts.push('Nenhuma data foi encontrada na imagem.')
  rows.forEach((row) => {
    if (row.attendants.length < 2 || row.microphones.length < 2 || row.sound.length < 2) {
      alerts.push(`O dia ${row.day} ficou incompleto. Revise os nomes.`)
    }
  })
  return {
    roster: {
      year,
      month: month || new Date().getMonth() + 1,
      rows: rows.sort((a, b) => a.day - b.day),
      reminders: [...defaultReminders],
    },
    alerts,
  }
}

export function loadRosters(): MonthlyRoster[] {
  try {
    const raw = localStorage.getItem('unio-av-rosters')
    if (!raw) return [october2026Roster]
    const parsed = JSON.parse(raw) as MonthlyRoster[]
    if (!Array.isArray(parsed) || parsed.length === 0) return [october2026Roster]
    return parsed
  } catch {
    return [october2026Roster]
  }
}

export function saveRosters(rosters: MonthlyRoster[]) {
  localStorage.setItem('unio-av-rosters', JSON.stringify(rosters))
}
