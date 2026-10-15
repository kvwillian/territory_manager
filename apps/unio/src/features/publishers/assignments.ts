import type { MockPublisher } from './mock'

export type RosterSlot = 'attendants' | 'microphones' | 'sound'

type QualifiedPublisher = {
  indicador?: boolean
  microfone?: boolean
  som?: boolean
  duties?: readonly string[]
  status?: string
  privilege?: string
}

export function candidatesForMeetingLabel(publishers: MockPublisher[], label: string) {
  const active = publishers.filter((publisher) => publisher.status === 'active')
  const key = label.trim().toLocaleLowerCase('pt-BR')
  if (key === 'estudante') return withDuty(active, 'estudante')
  if (key === 'indicador' || key === 'indicadores') return withDuty(active, 'indicador')
  if (key === 'volante' || key === 'volantes') {
    return active.filter((publisher) => publisher.duties.includes('volante') || publisher.duties.includes('microfone'))
  }
  if (key === 'áudio e vídeo' || key === 'audio e video') return withDuty(active, 'audio')
  if (key === 'presidente') {
    return active.filter((publisher) => publisher.privilege === 'elder' || publisher.privilege === 'ministerialServant')
  }
  return active
}

export function assignmentEmptyMessage(label: string) {
  const key = label.trim().toLocaleLowerCase('pt-BR')
  if (key === 'estudante') return 'Ninguém com o privilégio de estudante.'
  if (key === 'indicador' || key === 'indicadores') return 'Ninguém com o privilégio de indicador.'
  if (key === 'volante' || key === 'volantes') return 'Ninguém com o privilégio de volante ou microfone.'
  if (key === 'áudio e vídeo' || key === 'audio e video') return 'Ninguém com o privilégio de áudio.'
  if (key === 'presidente') return 'Nenhum servo ministerial ou ancião na lista.'
  return 'Nenhum publicador na lista.'
}

export function qualifiesFor(publisher: QualifiedPublisher, field: RosterSlot) {
  if (publisher.status === 'inactive') return false
  const indicador = has(publisher, 'indicador')
  const microfone = has(publisher, 'microfone') || has(publisher, 'volante')
  const audio = publisher.som === true || has(publisher, 'audio')
  if (field === 'attendants') return indicador
  if (field === 'microphones') return microfone || audio
  return audio
}

function withDuty(publishers: MockPublisher[], duty: MockPublisher['duties'][number]) {
  return publishers.filter((publisher) => publisher.duties.includes(duty))
}

function has(publisher: QualifiedPublisher, duty: string) {
  if (duty === 'indicador' && publisher.indicador) return true
  if (duty === 'microfone' && publisher.microfone) return true
  return publisher.duties?.includes(duty) === true
}
