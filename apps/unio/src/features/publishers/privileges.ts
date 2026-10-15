import type { MockPublisher } from './mock'

export function privilegeLabel(publisher: Pick<MockPublisher, 'privilege' | 'pioneer' | 'gender'>) {
  const role = publisher.privilege === 'elder'
    ? publisher.gender === 'feminino' ? 'Anciã' : 'Ancião'
    : publisher.privilege === 'ministerialServant'
      ? publisher.gender === 'feminino' ? 'Serva ministerial' : 'Servo ministerial'
      : publisher.gender === 'feminino' ? 'Publicadora' : 'Publicador'
  const pioneer = publisher.pioneer === 'auxiliary'
    ? publisher.gender === 'feminino' ? 'pioneira auxiliar' : 'pioneiro auxiliar'
    : publisher.pioneer === 'regular'
      ? publisher.gender === 'feminino' ? 'pioneira regular' : 'pioneiro regular'
      : ''
  return pioneer ? `${role} · ${pioneer}` : role
}

export const privilegeSections = [
  { id: 'elder', title: 'Anciãos' },
  { id: 'ministerialServant', title: 'Servos ministeriais' },
  { id: 'regular', title: 'Pioneiros regulares' },
  { id: 'auxiliary', title: 'Pioneiros auxiliares' },
  { id: 'publisher', title: 'Publicadores' },
] as const

export function privilegeSectionId(publisher: Pick<MockPublisher, 'privilege' | 'pioneer'>) {
  if (publisher.privilege === 'elder') return 'elder'
  if (publisher.privilege === 'ministerialServant') return 'ministerialServant'
  if (publisher.pioneer === 'regular') return 'regular'
  if (publisher.pioneer === 'auxiliary') return 'auxiliary'
  return 'publisher'
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0].slice(0, 2).toLocaleUpperCase('pt-BR')
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toLocaleUpperCase('pt-BR')
}
