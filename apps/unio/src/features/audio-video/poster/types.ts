export type PosterColor = 'orange' | 'peach' | 'white' | 'ink'

export type PosterGlyph = {
  text: string
  x: number
  y: number
  size: number
  width: number
  color: PosterColor
}

export type PosterCell = {
  x: number
  width: number
  fill: PosterColor
  glyphs: PosterGlyph[]
}

export type PosterRow = {
  kind: 'month' | 'header' | 'data'
  day?: number
  y: number
  height: number
  cells: PosterCell[]
}

export type PosterReminder = {
  source: string
  lines: PosterGlyph[][]
}

export type PosterPage = {
  rows: PosterRow[]
  title: PosterGlyph[]
  reminders: PosterReminder[]
}

export type PosterFrame = { x: number; y: number; width: number; height: number }

export type PosterLayout = {
  filename: string
  pageWidth: number
  pageHeight: number
  frame: PosterFrame
  corners: PosterFrame[]
  pages: PosterPage[]
}

export type PosterMeasure = (text: string, size: number) => number
