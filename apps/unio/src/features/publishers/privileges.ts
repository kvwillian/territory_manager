import type { MockPublisher } from './mock'

export function privilegeLabel(publisher: Pick<MockPublisher, 'privilege' | 'pioneer' | 'gender'>) {
  const effectivePrivilege = publisher.gender === 'feminino' ? 'publisher' : publisher.privilege
  const role =
    effectivePrivilege === 'circuitOverseer'
      ? 'Superintendente de Circuito'
      : effectivePrivilege === 'elder'
        ? 'Ancião'
        : effectivePrivilege === 'ministerialServant'
          ? 'Servo ministerial'
          : publisher.gender === 'feminino'
            ? 'Publicadora'
            : 'Publicador'

  const pioneer =
    publisher.pioneer === 'special'
      ? publisher.gender === 'feminino'
        ? 'pioneira especial'
        : 'pioneiro especial'
      : publisher.pioneer === 'auxiliary'
        ? publisher.gender === 'feminino'
          ? 'pioneira auxiliar'
          : 'pioneiro auxiliar'
        : publisher.pioneer === 'regular'
          ? publisher.gender === 'feminino'
            ? 'pioneira regular'
            : 'pioneiro regular'
          : ''

  return pioneer ? `${role} · ${pioneer}` : role
}

export const privilegeSections = [
  { id: 'circuitOverseer', title: 'Superintendente de Circuito' },
  { id: 'elder', title: 'Anciãos' },
  { id: 'ministerialServant', title: 'Servos ministeriais' },
  { id: 'special', title: 'Pioneiros especiais' },
  { id: 'regular', title: 'Pioneiros regulares' },
  { id: 'auxiliary', title: 'Pioneiros auxiliares' },
  { id: 'publisher', title: 'Publicadores' },
] as const

export function privilegeSectionId(publisher: Pick<MockPublisher, 'privilege' | 'pioneer'> & { gender?: string }) {
  if (publisher.gender !== 'feminino' && publisher.privilege === 'circuitOverseer') return 'circuitOverseer'
  if (publisher.gender !== 'feminino' && publisher.privilege === 'elder') return 'elder'
  if (publisher.gender !== 'feminino' && publisher.privilege === 'ministerialServant') return 'ministerialServant'
  if (publisher.pioneer === 'special') return 'special'
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
