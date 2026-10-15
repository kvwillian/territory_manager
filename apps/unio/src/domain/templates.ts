import type { CongregationMeeting, MeetingStatus, PartRole, ProgramPart } from './types'

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
    '2026-10-14-p1a': 'Antônio Silva',
    '2026-10-14-p2a': 'Eduardo Souza',
    '2026-10-14-p3a': 'Ana Clara Santos',
    '2026-10-14-p4a': 'Rafael Teixeira',
    '2026-10-14-p4b': 'Bianca Martins',
    '2026-10-14-p5a': 'Beatriz Mendes',
    '2026-10-14-p5b': 'Tiago Santos',
    '2026-10-14-p6a': 'Natália Borges',
    '2026-10-14-p7a': 'Marcos Pereira',
    '2026-10-14-p8a': 'João Ferreira',
    '2026-10-14-p8b': 'Larissa Alves',
    '2026-10-14-president:0': 'Antônio Silva',
    '2026-10-14-prayer:0': 'Marina Gomes',
    '2026-10-14-attendants:0': 'Beatriz Mendes',
    '2026-10-14-attendants:1': 'Marcos Pereira',
    '2026-10-14-ushers:0': 'João Ferreira',
    '2026-10-14-ushers:1': 'Felipe Castro',
    '2026-10-14-av:0': 'Carlos Ferreira',
    '2026-10-14-av:1': 'Helena Dias',
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
      '2026-10-21-p1a': 'João Ribeiro',
      '2026-10-21-p2a': 'Carlos Ferreira',
      '2026-10-21-p4a': 'Larissa Alves',
      '2026-10-21-p4b': 'Vitor Teixeira',
      '2026-10-21-p8a': 'Sérgio Nunes',
      '2026-10-21-president:0': 'Eduardo Souza',
      '2026-10-21-attendants:0': 'Natália Borges',
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
    '2026-10-28-p1a': 'Marcos Pereira',
    '2026-10-28-president:0': 'João Ribeiro',
  })
}

function publishedWeekend() {
  const meeting = weekendTemplate('2026-10-18', 'published')
  meeting.sections[0].parts[2].title = 'Por que confiar na Bíblia?'
  return fill(meeting, {
    '2026-10-18-open-a': 'Marina Gomes',
    '2026-10-18-chair-a': 'Antônio Silva',
    '2026-10-18-talk-a': 'Eduardo Souza',
    '2026-10-18-wt-a': 'João Ferreira',
    '2026-10-18-wt-b': 'Rafael Teixeira',
    '2026-10-18-attendants:0': 'Beatriz Mendes',
    '2026-10-18-attendants:1': 'Marina Gomes',
    '2026-10-18-ushers:0': 'Tiago Santos',
    '2026-10-18-ushers:1': 'Felipe Castro',
    '2026-10-18-av:0': 'Helena Dias',
    '2026-10-18-av:1': 'Carlos Ferreira',
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
