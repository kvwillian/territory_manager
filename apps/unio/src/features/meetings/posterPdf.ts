import fontkit from '@pdf-lib/fontkit'
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from 'pdf-lib'
import { parseIso, weekStart, type CongregationMeeting, type MeetingSection } from '../../domain'
import { downloadBlob } from '../audio-video/utils'

const MONTHS_CAP = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

const ORANGE = rgb(0.722, 0.325, 0.094) // #B85318
const TEAL = rgb(0.227, 0.463, 0.522) // #3A7685
const GOLD = rgb(0.537, 0.42, 0.114) // #896B1D
const BURGUNDY = rgb(0.545, 0.149, 0.133) // #8B2622
const BLACK = rgb(0.08, 0.09, 0.11)
const MUTED = rgb(0.32, 0.35, 0.39)
const WHITE = rgb(1, 1, 1)

const PAGE_W = 595.28
const PAGE_H = 841.89
const FRAME_MARGIN = 22

async function loadPublicAsset(relativePath: string): Promise<Uint8Array> {
  if (typeof window === 'undefined') {
    const { readFile } = await import('node:fs/promises')
    const { fileURLToPath } = await import('node:url')
    const path = fileURLToPath(new URL(`../../../public/${relativePath}`, import.meta.url))
    return new Uint8Array(await readFile(path))
  }
  const response = await fetch(`/${relativePath}`)
  if (!response.ok) throw new Error(`Não foi possível carregar o recurso ${relativePath}.`)
  return new Uint8Array(await response.arrayBuffer())
}

export function formatPosterWeekRange(isoDate: string): string {
  const monday = weekStart(isoDate)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const m1 = MONTHS_CAP[monday.getMonth()] ?? ''
  const m2 = MONTHS_CAP[sunday.getMonth()] ?? ''
  if (monday.getMonth() === sunday.getMonth()) {
    return `${monday.getDate()} - ${sunday.getDate()}  ${m1}`
  }
  return `${monday.getDate()} ${m1} - ${sunday.getDate()} ${m2}`
}

function getDutyPeople(meeting: CongregationMeeting, label: string): string {
  const found = meeting.duties.find(
    (d) => d.label.trim().toLowerCase() === label.trim().toLowerCase(),
  )
  const names = (found?.people ?? []).map((p) => p.trim()).filter(Boolean)
  return names.join('  /  ')
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  const lines: string[] = []
  let current = words[0]
  for (let i = 1; i < words.length; i += 1) {
    const candidate = `${current} ${words[i]}`
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate
    } else {
      lines.push(current)
      current = words[i]
    }
  }
  lines.push(current)
  return lines
}

function drawCenteredText(
  page: PDFPage,
  text: string,
  y: number,
  font: PDFFont,
  size: number,
  color: ReturnType<typeof rgb>,
) {
  if (!text) return
  const width = font.widthOfTextAtSize(text, size)
  page.drawText(text, {
    x: (PAGE_W - width) / 2,
    y,
    size,
    font,
    color,
  })
}

function drawFrameAndCorners(page: PDFPage) {
  const x = FRAME_MARGIN
  const y = FRAME_MARGIN
  const w = PAGE_W - FRAME_MARGIN * 2
  const h = PAGE_H - FRAME_MARGIN * 2

  page.drawRectangle({
    x,
    y,
    width: w,
    height: h,
    borderColor: ORANGE,
    borderWidth: 2.2,
  })

  // Corner geometric interlocking motifs at all 4 corners
  const s = 34
  const inner = 17
  const corners = [
    { cx: x, cy: y + h - s, ox: x + inner, oy: y + h - s - inner }, // top-left
    { cx: x + w - s, cy: y + h - s, ox: x + w - s - inner, oy: y + h - s - inner }, // top-right
    { cx: x, cy: y, ox: x + inner, oy: y + inner }, // bottom-left
    { cx: x + w - s, cy: y, ox: x + w - s - inner, oy: y + inner }, // bottom-right
  ]

  for (const c of corners) {
    page.drawRectangle({
      x: c.cx,
      y: c.cy,
      width: s,
      height: s,
      color: WHITE,
      borderColor: ORANGE,
      borderWidth: 2.2,
    })
    page.drawRectangle({
      x: c.ox,
      y: c.oy,
      width: s,
      height: s,
      borderColor: ORANGE,
      borderWidth: 2.2,
    })
  }
}

type PosterIcons = {
  diamond: PDFImage
  wheat: PDFImage
  sheep: PDFImage
  podium: PDFImage
}

function drawPodiumPng(page: PDFPage, icon: PDFImage, cx: number, cy: number, targetH = 26) {
  const scale = targetH / icon.height
  const w = icon.width * scale
  const h = icon.height * scale
  page.drawImage(icon, {
    x: cx - w / 2,
    y: cy - h / 2,
    width: w,
    height: h,
  })
}

function drawSectionBanner(
  page: PDFPage,
  yBottom: number,
  height: number,
  token: MeetingSection['token'],
  icons: PosterIcons,
) {
  const x = FRAME_MARGIN
  const w = PAGE_W - FRAME_MARGIN * 2
  const barColor =
    token === 'treasures' ? TEAL : token === 'ministry' ? GOLD : BURGUNDY
  page.drawRectangle({ x, y: yBottom, width: w, height, color: barColor })

  const icon =
    token === 'treasures' ? icons.diamond : token === 'ministry' ? icons.wheat : icons.sheep
  const targetH = height - 4
  const scale = targetH / icon.height
  const iw = icon.width * scale
  const ih = icon.height * scale
  page.drawImage(icon, {
    x: (PAGE_W - iw) / 2,
    y: yBottom + (height - ih) / 2,
    width: iw,
    height: ih,
  })
}

export async function renderMeetingPosterPdf(meeting: CongregationMeeting) {
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  const [boldBytes, diamondBytes, wheatBytes, sheepBytes, podiumBytes] = await Promise.all([
    loadPublicAsset('fonts/Arimo-Bold.ttf'),
    loadPublicAsset('icons/diamond.png'),
    loadPublicAsset('icons/wheat.png'),
    loadPublicAsset('icons/sheep.png'),
    loadPublicAsset('icons/podium.png'),
  ])

  const boldFont = await doc.embedFont(boldBytes, { subset: true })
  const regularFont = await doc.embedFont(StandardFonts.Helvetica)
  const icons: PosterIcons = {
    diamond: await doc.embedPng(diamondBytes),
    wheat: await doc.embedPng(wheatBytes),
    sheep: await doc.embedPng(sheepBytes),
    podium: await doc.embedPng(podiumBytes),
  }

  const page = doc.addPage([PAGE_W, PAGE_H])
  drawFrameAndCorners(page)

  // Title
  drawCenteredText(page, 'NOSSA VIDA E', 776, boldFont, 24, ORANGE)
  drawCenteredText(page, 'MINISTÉRIO CRISTÃO', 746, boldFont, 24, ORANGE)

  // Date pill box
  const pillW = 290
  const pillH = 26
  const pillX = (PAGE_W - pillW) / 2
  const pillY = 708
  page.drawRectangle({
    x: pillX,
    y: pillY,
    width: pillW,
    height: pillH,
    borderColor: ORANGE,
    borderWidth: 1.8,
  })
  const rangeText = formatPosterWeekRange(meeting.isoDate)
  drawCenteredText(page, rangeText, pillY + 7, boldFont, 14.5, ORANGE)

  // Top Duties: Presidente (left) and Oração Inicial (right)
  const president = getDutyPeople(meeting, 'Presidente') || '—'
  const openingPrayer = getDutyPeople(meeting, 'Oração inicial') || president

  const dutyTopY = 678
  drawPodiumPng(page, icons.podium, 62, dutyTopY - 2, 26)
  page.drawText('PRESIDENTE', { x: 84, y: dutyTopY + 2, size: 8.5, font: boldFont, color: BLACK })
  page.drawText(president.toUpperCase(), {
    x: 84,
    y: dutyTopY - 11,
    size: 10.5,
    font: regularFont,
    color: MUTED,
  })

  drawPodiumPng(page, icons.podium, PAGE_W - 62, dutyTopY - 2, 26)
  const openLbl = 'ORAÇÃO INICIAL'
  const openLblW = boldFont.widthOfTextAtSize(openLbl, 8.5)
  const openNameUpper = openingPrayer.toUpperCase()
  const openNameW = regularFont.widthOfTextAtSize(openNameUpper, 10.5)
  page.drawText(openLbl, {
    x: PAGE_W - 84 - openLblW,
    y: dutyTopY + 2,
    size: 8.5,
    font: boldFont,
    color: BLACK,
  })
  page.drawText(openNameUpper, {
    x: PAGE_W - 84 - openNameW,
    y: dutyTopY - 11,
    size: 10.5,
    font: regularFont,
    color: MUTED,
  })

  // Measure sections to distribute vertical space cleanly between y=646 and y=92
  const maxTextW = PAGE_W - FRAME_MARGIN * 2 - 48
  const titleSize = 10
  const nameSize = 11.5
  const bannerH = 26

  const preparedSections = meeting.sections.map((section) => {
    const parts = section.parts.map((part) => {
      const titleLines = wrapText(part.title.toUpperCase(), boldFont, titleSize, maxTextW)
      const peopleText = part.roles
        .map((r) => r.personName.trim())
        .filter(Boolean)
        .join('  /  ')
      const nameLines = peopleText
        ? wrapText(peopleText, regularFont, nameSize, maxTextW)
        : ['—']
      const blockHeight = titleLines.length * 13 + 3 + nameLines.length * 14
      return { titleLines, nameLines, blockHeight }
    })
    return { token: section.token, parts }
  })

  const totalPartsCount = preparedSections.reduce((acc, s) => acc + s.parts.length, 0)
  const contentHeight =
    preparedSections.length * bannerH +
    preparedSections.reduce(
      (acc, s) => acc + s.parts.reduce((pAcc, p) => pAcc + p.blockHeight, 0),
      0,
    )

  const topStart = 648
  const bottomLimit = 96
  const availableSpace = Math.max(0, topStart - bottomLimit - contentHeight)
  const gapUnits = totalPartsCount + preparedSections.length * 2
  const baseGap = gapUnits > 0 ? Math.min(20, Math.max(8, availableSpace / gapUnits)) : 12

  let cursorY = topStart
  for (const section of preparedSections) {
    const bannerY = cursorY - bannerH
    drawSectionBanner(page, bannerY, bannerH, section.token, icons)
    cursorY = bannerY - baseGap * 1.15

    for (const part of section.parts) {
      for (const line of part.titleLines) {
        drawCenteredText(page, line, cursorY, boldFont, titleSize, BLACK)
        cursorY -= 13
      }
      cursorY -= 2
      for (const line of part.nameLines) {
        drawCenteredText(page, line, cursorY, regularFont, nameSize, MUTED)
        cursorY -= 14
      }
      cursorY -= baseGap
    }
    cursorY -= baseGap * 0.25
  }

  // Footer: Oração Final
  const closingPrayer = getDutyPeople(meeting, 'Oração final') || '—'
  const footerLabel = 'ORAÇÃO FINAL'
  const footerIconH = 26
  const footerIconW = (icons.podium.width * footerIconH) / icons.podium.height
  const footerGap = 10
  const footerLabelW = boldFont.widthOfTextAtSize(footerLabel, 9)
  const footerNameW = regularFont.widthOfTextAtSize(closingPrayer, 11)
  const footerTextW = Math.max(footerLabelW, footerNameW)
  const footerTotalW = footerIconW + footerGap + footerTextW
  const footerStartX = (PAGE_W - footerTotalW) / 2
  const footerTextX = footerStartX + footerIconW + footerGap

  drawPodiumPng(page, icons.podium, footerStartX + footerIconW / 2, 58, footerIconH)
  page.drawText(footerLabel, {
    x: footerTextX + (footerTextW - footerLabelW) / 2,
    y: 62,
    size: 9,
    font: boldFont,
    color: BLACK,
  })
  page.drawText(closingPrayer, {
    x: footerTextX + (footerTextW - footerNameW) / 2,
    y: 47,
    size: 11,
    font: regularFont,
    color: MUTED,
  })

  const parsedDate = parseIso(meeting.isoDate)
  const monthName = MONTHS_CAP[parsedDate.getMonth()] ?? 'Mes'
  doc.setTitle(`Nossa Vida e Ministério Cristão - ${rangeText}`)
  doc.setLanguage('pt-BR')

  const bytes = await doc.save()
  const filename = `reuniao_${meeting.isoDate}_${monthName.toLowerCase()}.pdf`
  return { bytes, filename }
}

export async function exportMeetingPosterPdf(meeting: CongregationMeeting) {
  const { bytes, filename } = await renderMeetingPosterPdf(meeting)
  const copy = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer
  downloadBlob(new Blob([copy], { type: 'application/pdf' }), filename)
}
