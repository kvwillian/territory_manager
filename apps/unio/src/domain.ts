export type MeetingKind = 'midweek' | 'weekend'
export type MeetingStatus = 'published' | 'draft' | 'notStarted' | 'completed'
export type SectionToken = 'treasures' | 'ministry' | 'christianLife' | 'neutral'

export type PartRole = {
  id: string
  label: string
  showLabel: boolean
  personName: string
}

export type ProgramPart = {
  id: string
  title: string
  durationMinutes: number
  hint?: string
  roles: PartRole[]
  structural?: boolean
  pinned?: boolean
}

export type MeetingSection = {
  id: string
  title: string
  token: SectionToken
  parts: ProgramPart[]
}

export type MeetingDuty = {
  id: string
  label: string
  people: string[]
}

export type CongregationMeeting = {
  id: string
  kind: MeetingKind
  isoDate: string
  time: string
  status: MeetingStatus
  sections: MeetingSection[]
  duties: MeetingDuty[]
  notes: string
}

export const statusLabel: Record<MeetingStatus, string> = {
  published: 'Publicada',
  draft: 'Rascunho',
  notStarted: 'Não iniciada',
  completed: 'Concluída',
}

export const kindMeta: Record<
  MeetingKind,
  { title: string; subtitle: string; meetingLabel: string; dayLong: string; dayShort: string }
> = {
  midweek: {
    title: 'Reuniões de Meio de Semana',
    subtitle: 'Gerencie as designações das reuniões de meio de semana da congregação.',
    meetingLabel: 'Reunião de meio de semana',
    dayLong: 'Terça-feira',
    dayShort: 'Ter',
  },
  weekend: {
    title: 'Reuniões de Fim de Semana',
    subtitle: 'Gerencie o discurso público, A Sentinela e as designações da reunião.',
    meetingLabel: 'Reunião de fim de semana',
    dayLong: 'Domingo',
    dayShort: 'Dom',
  },
}

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

export function meetingInStrip(isoDate: string, key: string) {
  const [year, month] = key.split('-').map(Number)
  const start = new Date(year, month - 1, 1)
  const next = new Date(year, month, 1)
  const lookahead = new Date(year, month, 7)
  const date = parseIso(isoDate)
  const inMonth = date >= start && date < next
  const inLookahead = date >= next && date < lookahead
  return inMonth || inLookahead
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
  return weekStart(iso).getTime() === weekStart(
    `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`,
  ).getTime()
}

export function weekRangeLabel(iso: string) {
  const monday = weekStart(iso)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const sameMonth = monday.getMonth() === sunday.getMonth()
  if (sameMonth) {
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

function role(id: string, label: string, personName: string, showLabel = false): PartRole {
  return { id, label, personName, showLabel }
}

function part(
  id: string,
  title: string,
  durationMinutes: number,
  roles: PartRole[],
  extra?: Partial<ProgramPart>,
): ProgramPart {
  return { id, title, durationMinutes, roles, ...extra }
}

export function midweekTemplate(iso: string, status: MeetingStatus): CongregationMeeting {
  return {
    id: `midweek-${iso}`,
    kind: 'midweek',
    isoDate: iso,
    time: '19:30',
    status,
    notes: '',
    duties: [
      { id: `${iso}-president`, label: 'Presidente', people: [''] },
      { id: `${iso}-prayer`, label: 'Oração final', people: [''] },
      { id: `${iso}-attendants`, label: 'Indicadores', people: ['', ''] },
      { id: `${iso}-ushers`, label: 'Volantes', people: ['', ''] },
      { id: `${iso}-av`, label: 'Áudio e Vídeo', people: ['', ''] },
    ],
    sections: [
      {
        id: `${iso}-treasures`,
        title: 'Tesouros da Palavra de Deus',
        token: 'treasures',
        parts: [
          part(`${iso}-p1`, 'Tesouros da Palavra de Deus', 10, [role(`${iso}-p1a`, 'Orador', '')], {
            structural: true,
          }),
          part(`${iso}-p2`, 'Joias espirituais', 10, [role(`${iso}-p2a`, 'Orador', '')], {
            structural: true,
          }),
          part(`${iso}-p3`, 'Leitura da Bíblia', 4, [role(`${iso}-p3a`, 'Estudante', '')], {
            structural: true,
          }),
        ],
      },
      {
        id: `${iso}-ministry`,
        title: 'Faça Seu Melhor no Ministério',
        token: 'ministry',
        parts: [
          part(`${iso}-p4`, 'Iniciando conversas', 10, [
            role(`${iso}-p4a`, 'Participante', ''),
            role(`${iso}-p4b`, 'Participante', ''),
          ]),
          part(`${iso}-p5`, 'Cultivando o interesse', 10, [
            role(`${iso}-p5a`, 'Participante', ''),
            role(`${iso}-p5b`, 'Participante', ''),
          ]),
          part(`${iso}-p6`, 'O que você diria?', 8, [role(`${iso}-p6a`, 'Participante', '')]),
        ],
      },
      {
        id: `${iso}-life`,
        title: 'Nossa Vida Cristã',
        token: 'christianLife',
        parts: [
          part(`${iso}-p7`, 'Necessidades locais', 10, [role(`${iso}-p7a`, 'Orador', '')]),
          part(
            `${iso}-p8`,
            'Estudo bíblico de congregação',
            30,
            [
              role(`${iso}-p8a`, 'Dirigente', '', true),
              role(`${iso}-p8b`, 'Leitor', '', true),
            ],
            { pinned: true },
          ),
        ],
      },
    ],
  }
}

export function weekendTemplate(iso: string, status: MeetingStatus): CongregationMeeting {
  return {
    id: `weekend-${iso}`,
    kind: 'weekend',
    isoDate: iso,
    time: '10:00',
    status,
    notes: '',
    duties: [
      { id: `${iso}-attendants`, label: 'Indicadores', people: ['', ''] },
      { id: `${iso}-ushers`, label: 'Volantes', people: ['', ''] },
      { id: `${iso}-av`, label: 'Áudio e Vídeo', people: ['', ''] },
    ],
    sections: [
      {
        id: `${iso}-program`,
        title: 'Programa',
        token: 'neutral',
        parts: [
          part(`${iso}-open`, 'Oração inicial', 3, [role(`${iso}-open-a`, 'Oração', '')]),
          part(`${iso}-chair`, 'Presidente', 5, [role(`${iso}-chair-a`, 'Presidente', '')], {
            hint: 'Servo ministerial ou ancião',
          }),
          part(`${iso}-talk`, 'Discurso público', 30, [role(`${iso}-talk-a`, 'Orador', '')]),
          part(
            `${iso}-wt`,
            'A Sentinela',
            30,
            [
              role(`${iso}-wt-a`, 'Dirigente', '', true),
              role(`${iso}-wt-b`, 'Leitor', '', true),
            ],
            { pinned: true },
          ),
        ],
      },
    ],
  }
}

function fill(meeting: CongregationMeeting, names: Record<string, string>, notes = '') {
  meeting.notes = notes
  for (const section of meeting.sections) {
    for (const item of section.parts) {
      for (const itemRole of item.roles) {
        if (names[itemRole.id] != null) itemRole.personName = names[itemRole.id]
      }
      if (names[item.id] != null) item.title = names[item.id]
    }
  }
  for (const duty of meeting.duties) {
    duty.people = duty.people.map((_, index) => names[`${duty.id}:${index}`] ?? '')
  }
  return meeting
}

function referenceWeek() {
  const meeting = midweekTemplate('2026-10-14', 'published')
  return fill(meeting, {
    '2026-10-14-p1a': 'André Lima',
    '2026-10-14-p2a': 'Lucas Pereira',
    '2026-10-14-p3a': 'Mateus Costa',
    '2026-10-14-p4a': 'Rafael Souza',
    '2026-10-14-p4b': 'Tiago Almeida',
    '2026-10-14-p5a': 'Gabriel Santos',
    '2026-10-14-p5b': 'Daniel Silva',
    '2026-10-14-p6a': 'Paulo Mendes',
    '2026-10-14-p7a': 'Marcos Oliveira',
    '2026-10-14-p8a': 'João Ferreira',
    '2026-10-14-p8b': 'Felipe Martins',
    '2026-10-14-president:0': 'Carlos Eduardo',
    '2026-10-14-prayer:0': 'Renato Alves',
    '2026-10-14-attendants:0': 'Bruno Costa',
    '2026-10-14-attendants:1': 'Leandro Nunes',
    '2026-10-14-ushers:0': 'Sérgio Ribeiro',
    '2026-10-14-ushers:1': 'Alex Martins',
    '2026-10-14-av:0': 'Pedro Henrique',
    '2026-10-14-av:1': 'Vinícius Ramos',
  })
}

function draftWeek() {
  const meeting = midweekTemplate('2026-10-21', 'draft')
  meeting.sections[1].parts[0].title = 'Primeira conversa'
  meeting.sections[1].parts[1].title = 'Revisita'
  meeting.sections[1].parts[2].title = 'Estudo bíblico'
  return fill(
    meeting,
    {
      '2026-10-21-p1a': 'Helena Duarte',
      '2026-10-21-p2a': 'Caio Mendes',
      '2026-10-21-p4a': 'Lara Nogueira',
      '2026-10-21-p4b': 'Igor Pacheco',
      '2026-10-21-p8a': 'João Ferreira',
      '2026-10-21-president:0': 'Carlos Eduardo',
      '2026-10-21-attendants:0': 'Bruno Costa',
    },
    'Confirmar o leitor do estudo bíblico.',
  )
}

function laterDraft() {
  const meeting = midweekTemplate('2026-10-28', 'draft')
  meeting.sections[1].parts[0].title = 'Começando uma conversa'
  meeting.sections[1].parts[1].title = 'Explicando suas crenças'
  meeting.sections[1].parts[2].title = 'Discurso'
  return fill(meeting, {
    '2026-10-28-p1a': 'André Lima',
    '2026-10-28-president:0': 'Renato Alves',
  })
}

function publishedWeekend() {
  const meeting = weekendTemplate('2026-10-18', 'published')
  meeting.sections[0].parts[2].title = 'Por que confiar na Bíblia?'
  return fill(meeting, {
    '2026-10-18-open-a': 'Lucas Pereira',
    '2026-10-18-chair-a': 'Carlos Eduardo',
    '2026-10-18-talk-a': 'Marcelo Andrade',
    '2026-10-18-wt-a': 'João Ferreira',
    '2026-10-18-wt-b': 'Felipe Martins',
    '2026-10-18-attendants:0': 'Bruno Costa',
    '2026-10-18-attendants:1': 'Leandro Nunes',
    '2026-10-18-ushers:0': 'Sérgio Ribeiro',
    '2026-10-18-ushers:1': 'Alex Martins',
    '2026-10-18-av:0': 'Pedro Henrique',
    '2026-10-18-av:1': 'Vinícius Ramos',
  })
}

export function seedMeetings(): CongregationMeeting[] {
  return [
    referenceWeek(),
    draftWeek(),
    laterDraft(),
    midweekTemplate('2026-11-04', 'notStarted'),
    weekendTemplate('2026-10-04', 'draft'),
    weekendTemplate('2026-10-11', 'draft'),
    publishedWeekend(),
    weekendTemplate('2026-10-25', 'notStarted'),
  ]
}

export function blankFrom(source: CongregationMeeting, iso: string) {
  const meeting = source.kind === 'midweek' ? midweekTemplate(iso, 'draft') : weekendTemplate(iso, 'draft')
  meeting.time = source.time
  return meeting
}
