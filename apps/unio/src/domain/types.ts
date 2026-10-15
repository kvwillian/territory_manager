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
