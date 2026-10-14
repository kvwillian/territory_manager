import { monthNames } from './roster'
import type { MonthlyRoster } from './types'

export const columnHeaders = ['DIA', 'INDICADORES', 'MICROFONES', 'MESA DE SOM'] as const

export const rosterPalette = {
  orange: 'D35400',
  peach: 'F8D7C4',
  ink: '1A1A1A',
  white: 'FFFFFF',
} as const

export function displayNames(names: string[]) {
  return names.filter(Boolean).map((name) => name.toLocaleUpperCase('pt-BR'))
}

export function monthTitle(month: number) {
  return monthNames[month - 1].toLocaleUpperCase('pt-BR')
}

export function rosterFileBase(roster: MonthlyRoster, day?: number) {
  const month = monthNames[roster.month - 1]
  return day ? `designacao-${day}-${month}-${roster.year}` : `indicadores-audio-video-${month}-${roster.year}`
}

export function downloadBlob(blob: Blob, filename: string) {
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}
