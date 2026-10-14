export type PdfTextItem = {
  str: string
  x: number
  y: number
  width: number
}

export type PdfPage = {
  width: number
  items: PdfTextItem[]
}

const MARKS: Record<string, string> = {
  "\u00b4": "acute",
  "\u0301": "acute",
  "\u02ca": "acute",
  "`": "grave",
  "\u0300": "grave",
  "\u02c6": "circ",
  "\u0302": "circ",
  "^": "circ",
  "\u02dc": "tilde",
  "\u0303": "tilde",
  "~": "tilde",
  "\u00b8": "cedilla",
  "\u0327": "cedilla",
  "\u00a8": "dia",
  "\u0308": "dia",
}

const COMPOSE: Record<string, string> = {
  "a acute": "á",
  "e acute": "é",
  "i acute": "í",
  "o acute": "ó",
  "u acute": "ú",
  "A acute": "Á",
  "E acute": "É",
  "I acute": "Í",
  "O acute": "Ó",
  "U acute": "Ú",
  "a grave": "à",
  "a circ": "â",
  "e circ": "ê",
  "o circ": "ô",
  "a tilde": "ã",
  "o tilde": "õ",
  "A tilde": "Ã",
  "O tilde": "Õ",
  "c cedilla": "ç",
  "C cedilla": "Ç",
}

function isMark(value: string) {
  const trimmed = value.trim()
  return trimmed.length === 1 && Boolean(MARKS[trimmed])
}

function visible(value: string) {
  return [...value].filter((char) => (char.codePointAt(0) ?? 0) >= 32).join("")
}

function composeItem(item: PdfTextItem, marks: PdfTextItem[]) {
  const raw = visible(item.str).replace(/\u0131/g, "i")
  if (!raw.trim()) return ""
  const chars = [...raw]
  const width = item.width || chars.length * 4
  const step = width / Math.max(chars.length, 1)
  const near = marks.filter(
    (mark) =>
      mark.y > item.y &&
      mark.y < item.y + 9 &&
      mark.x >= item.x - 1.5 &&
      mark.x <= item.x + width + 1.5,
  )
  for (const mark of near) {
    const kind = MARKS[mark.str.trim()]
    let index = 0
    let best = 99
    chars.forEach((_, charIndex) => {
      const distance = Math.abs(mark.x - (item.x + step * charIndex))
      if (distance < best) {
        best = distance
        index = charIndex
      }
    })
    const base = chars[index] === "ı" ? "i" : chars[index]
    const composed = COMPOSE[`${base} ${kind}`]
    if (composed) chars[index] = composed
  }
  return chars.join("")
}

function linesOf(items: PdfTextItem[]) {
  const groups: { y: number; items: PdfTextItem[] }[] = []
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x)
  for (const item of sorted) {
    const group = groups.find((candidate) => Math.abs(candidate.y - item.y) < 1.6)
    if (group) group.items.push(item)
    else groups.push({ y: item.y, items: [item] })
  }
  return groups
    .sort((a, b) => b.y - a.y)
    .map((group) => {
      const parts = group.items.sort((a, b) => a.x - b.x)
      let line = ""
      let cursor = -100
      for (const part of parts) {
        if (line && part.x - cursor > 1.7) line += " "
        line += part.str
        cursor = part.x + (part.width || 0)
      }
      return cleanLine(line)
    })
    .filter((line) => line.length > 0 && line.length < 400)
}

function cleanLine(value: string) {
  let text = value
    .replace(/[\u0000-\u001f]/g, "")
    .replace(/\u0131/g, "í")
    .replace(/c(?=ao\b)/gi, "ç")
    .replace(/c(?=ão\b)/gi, "ç")
    .replace(/esperanca\b/g, "esperança")
    .replace(/[ ]+/g, " ")
    .trim()
  const letters = text.replace(/[^A-Za-zÀ-ÿ]/g, "")
  const upper = text.replace(/[^A-ZÁÉÍÓÚÃÕÇ]/g, "")
  if (letters.length > 8 && upper.length / letters.length > 0.75) {
    text = text
      .replace(/([A-Za-zÀ-ÿ])\s+(?=[A-Za-zÀ-ÿ])/g, "$1")
      .replace(/(\d)\s+(?=\d)/g, "$1")
      .replace(/[ ]+/g, " ")
      .trim()
  }
  return text
}

export function linesFromPages(pages: PdfPage[]) {
  const lines: string[] = []
  for (const page of pages) {
    const marks = page.items.filter((item) => isMark(item.str))
    const bases = page.items
      .filter((item) => !isMark(item.str))
      .map((item) => ({
        ...item,
        str: composeItem(item, marks),
      }))
      .filter((item) => item.str.trim().length > 0)
    if (bases.length === 0) continue
    const top = Math.max(...bases.map((item) => item.y))
    const headerY = top - 26
    const mid = page.width / 2
    lines.push(
      ...linesOf(bases.filter((item) => item.y >= headerY)),
      ...linesOf(bases.filter((item) => item.y < headerY && item.x < mid)),
      ...linesOf(bases.filter((item) => item.y < headerY && item.x >= mid)),
    )
  }
  return lines
}

export async function linesFromPdf(data: Uint8Array) {
  const { getDocumentProxy } = await import("unpdf")
  const pdf = await getDocumentProxy(data)
  const pages: PdfPage[] = []
  for (let number = 1; number <= pdf.numPages; number += 1) {
    const page = await pdf.getPage(number)
    const viewport = page.getViewport({ scale: 1 })
    const content = await page.getTextContent()
    const items: PdfTextItem[] = []
    for (const item of content.items) {
      if (!("str" in item) || !item.str) continue
      items.push({
        str: item.str,
        x: item.transform[4] ?? 0,
        y: item.transform[5] ?? 0,
        width: item.width || 0,
      })
    }
    pages.push({ width: viewport.width, items })
  }
  return linesFromPages(pages)
}
