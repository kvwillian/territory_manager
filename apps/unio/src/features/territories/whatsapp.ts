import { weekdayKeyFromIso, weekdayLabelLong } from './status'
import type { DeparturePeriodType } from './types'

export type WhatsappMessageInput = {
  isoDate: string
  periodType: DeparturePeriodType
  startTime: string
  locationName: string
  groupName?: string | null
  conductorNames: string[]
  territoryCodes: string[]
}

export function formatPortugueseList(items: string[], emptyFallback = 'A definir'): string {
  const clean = items.map((s) => s.trim()).filter(Boolean)
  if (clean.length === 0) return emptyFallback
  if (clean.length === 1) return clean[0]!
  if (clean.length === 2) return `${clean[0]} e ${clean[1]}`
  return `${clean.slice(0, -1).join(', ')} e ${clean[clean.length - 1]}`
}

export function buildTerritoryWhatsappMessage(input: WhatsappMessageInput): string {
  const weekday = weekdayLabelLong(weekdayKeyFromIso(input.isoDate))
  const location = input.locationName.trim() || 'A definir'
  const time = input.startTime.trim() || 'A definir'
  const conductors = formatPortugueseList(input.conductorNames, 'A definir')
  const territories = formatPortugueseList(input.territoryCodes, 'A definir')

  if (input.periodType === 'sunday') {
    const rawGroup = (input.groupName ?? '').trim()
    const cleanGroup = rawGroup.replace(/^grupo\s+/i, '').trim()
    const groupLine = cleanGroup ? `📍 Grupo ${cleanGroup}` : '📍 Grupo a definir'

    return [
      'Boa noite, irmãos! Segue a designação para amanhã:',
      '',
      '🌅 SAÍDA DE CAMPO – DOMINGO',
      groupLine,
      `🏠 ${location}`,
      `👥 Dirigentes: ${conductors}`,
      `📌 Territórios: ${territories}`,
      '',
      'Ótimo trabalho a todos! 👏',
    ].join('\n')
  }

  const headerTitle =
    input.periodType === 'afternoon'
      ? `🌙 SAÍDA DA TARDE – ${weekday}`
      : `🌅 SAÍDA DA MANHÃ – ${weekday}`

  return [
    'Boa noite, irmãos! Segue a designação para amanhã:',
    '',
    headerTitle,
    time,
    `📍 Local: ${location}`,
    `👥 Dirigentes: ${conductors}`,
    `📌 Territórios: ${territories}`,
    '',
    'Ótimo trabalho a todos! 👏',
  ].join('\n')
}

export function buildWhatsappShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`
}
