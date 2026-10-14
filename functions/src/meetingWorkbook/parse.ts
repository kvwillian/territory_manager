export type SectionToken = "treasures" | "ministry" | "christianLife"

export type ParsedPart = {
  title: string
  durationMinutes: number | null
  sourceNumber: number | null
}

export type ParsedSection = {
  token: SectionToken
  title: string
  parts: ParsedPart[]
}

export type ParsedWeek = {
  id: string
  label: string
  weekStart: string | null
  weekEnd: string | null
  sections: ParsedSection[]
  alerts: string[]
}

const SECTION_TITLES: Record<SectionToken, string> = {
  treasures: "Tesouros da Palavra de Deus",
  ministry: "Faça Seu Melhor no Ministério",
  christianLife: "Nossa Vida Cristã",
}

const MONTHS = [
  "janeiro",
  "fevereiro",
  "marco",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
]

function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\u0131/g, "i")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function monthIndex(name: string) {
  const folded = fold(name).replace(/marco/g, "marco")
  const index = MONTHS.indexOf(folded === "marco" ? "marco" : folded)
  return index
}

function isoDate(year: number, month: number, day: number) {
  const date = new Date(year, month, day)
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null
  const mm = String(month + 1).padStart(2, "0")
  const dd = String(day).padStart(2, "0")
  return `${year}-${mm}-${dd}`
}

function addDays(iso: string, days: number) {
  const [year, month, day] = iso.split("-").map(Number)
  const date = new Date(year, month - 1, day + days)
  return isoDate(date.getFullYear(), date.getMonth(), date.getDate())
}

export function findWorkbookYear(lines: string[]) {
  const text = lines.slice(0, 40).join("\n")
  const match = text.match(/20\s*(\d{2})/)
  if (!match) return null
  const year = Number(`20${match[1]}`)
  if (year < 2000 || year > 2100) return null
  return year
}

type WeekHit = {
  index: number
  endIndex: number
  label: string
  weekStart: string | null
  weekEnd: string | null
}

function loosenDates(folded: string) {
  return folded
    .replace(
      /de(?=janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)/g,
      "de ",
    )
    .replace(/(\d)\s+ude\s+/g, "$1 de ")
}

function weekSpan(start: string | null, endDay: number, endMonth: number, year: number) {
  if (!start) return null
  let endYear = year
  const startMonth = Number(start.slice(5, 7)) - 1
  if (endMonth < startMonth) endYear += 1
  const end = isoDate(endYear, endMonth, endDay)
  if (!end) return null
  return addDays(start, 6) === end ? end : null
}

function peelPageNumber(dayText: string) {
  const candidates = [dayText]
  if (dayText.length > 1) candidates.push(dayText.slice(1))
  if (dayText.length > 2) candidates.push(dayText.slice(2))
  return candidates
}

function weekHits(lines: string[], year: number | null): WeekHit[] {
  const hits: WeekHit[] = []
  const monthPattern = MONTHS.join("|")
  const sameMonth = new RegExp(`^(\\d{1,3})\\s+(\\d{1,2})\\s+de\\s+(${monthPattern})`, "i")
  const crossMonth = new RegExp(
    `^(\\d{1,3})\\s+de\\s+(${monthPattern})\\s+(\\d{1,2})\\s+de\\s+(${monthPattern})`,
    "i",
  )
  lines.forEach((line, index) => {
    if (!year) return
    const folded = loosenDates(fold(line))
    const cross = folded.match(crossMonth)
    if (cross) {
      const endMonth = monthIndex(cross[4])
      for (const startText of peelPageNumber(cross[1])) {
        const startMonth = monthIndex(cross[2])
        const start = isoDate(year, startMonth, Number(startText))
        const end = weekSpan(start, Number(cross[3]), endMonth, year)
        if (start && end) {
          hits.push({ index, endIndex: lines.length, label: line.trim(), weekStart: start, weekEnd: end })
          return
        }
      }
    }
    const same = folded.match(sameMonth)
    if (!same) return
    const month = monthIndex(same[3])
    for (const startText of peelPageNumber(same[1])) {
      const start = isoDate(year, month, Number(startText))
      const end = weekSpan(start, Number(same[2]), month, year)
      if (start && end) {
        hits.push({ index, endIndex: lines.length, label: line.trim(), weekStart: start, weekEnd: end })
        return
      }
    }
  })
  return hits
    .map((hit, hitIndex) => ({ ...hit, endIndex: hits[hitIndex + 1]?.index ?? lines.length }))
    .filter((hit) => bodyHasTreasures(lines.slice(hit.index + 1, hit.endIndex)))
}

function isHeaderFragment(line: string) {
  const letters = line.replace(/[^A-Za-zÀ-ÿ]/g, "")
  if (letters.length < 4 || letters.length > 48) return false
  const upper = letters.replace(/[^A-ZÁÉÍÓÚÃÕÇ]/g, "")
  return upper.length / letters.length > 0.8
}

function bodyHasTreasures(lines: string[]) {
  let header = ""
  for (const line of lines) {
    if (!isHeaderFragment(line)) {
      header = ""
      continue
    }
    header = `${header} ${line}`.trim()
    if (sectionToken(header) === "treasures") return true
    if (header.length > 80) header = ""
  }
  return false
}

function sectionToken(line: string): SectionToken | null {
  const folded = fold(line)
  const tight = folded.replace(/ /g, "")
  if (folded.includes("tesouros da palavra de deus") || tight.includes("tesourosdapalavradedeus")) return "treasures"
  if (folded.includes("faca seu melhor no ministerio") || tight.includes("facaseumelhornoministerio")) return "ministry"
  if (folded.includes("nossa vida crist") || tight.includes("nossavidacrist")) return "christianLife"
  return null
}

function parseParts(lines: string[]) {
  const parts: ParsedPart[] = []
  const alerts: string[] = []
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^(\d+)\.\s+(.+)$/)
    if (!match) continue
    const sourceNumber = Number(match[1])
    let title = match[2]
    let duration: number | null = null
    const inline = title.match(/^(.*?)\((\d+)\s*min\)/i)
    if (inline) {
      title = inline[1]
      duration = Number(inline[2])
    } else {
      let extra = ""
      for (let look = 1; look <= 2 && index + look < lines.length; look += 1) {
        const next = lines[index + look]
        if (/^\d+\.\s+/.test(next) || sectionToken(next)) break
        const wrapped = next.match(/^(.*?)\((\d+)\s*min\)/i)
        if (wrapped) {
          title = `${title} ${extra} ${wrapped[1]}`
          duration = Number(wrapped[2])
          break
        }
        if (next.length > 70) break
        extra += ` ${next}`
      }
    }
    title = title.replace(/\s+/g, " ").replace(/([A-Za-zÀ-ÿ])-\s+([a-zà-ÿ])/g, "$1$2").replace(/[—–-]\s*$/, "").trim()
    if (!title) {
      alerts.push(`A parte ${sourceNumber} ficou sem título.`)
      continue
    }
    if (duration == null) alerts.push(`Não foi possível ler a duração de “${title}”.`)
    parts.push({ title, durationMinutes: duration, sourceNumber })
  }
  return { parts, alerts }
}

function emptySections(): ParsedSection[] {
  return (["treasures", "ministry", "christianLife"] as SectionToken[]).map((token) => ({
    token,
    title: SECTION_TITLES[token],
    parts: [],
  }))
}

export function parseWorkbookLines(lines: string[], knownYear?: number | null): {
  year: number | null
  weeks: ParsedWeek[]
  alerts: string[]
} {
  const year = knownYear ?? findWorkbookYear(lines)
  const alerts: string[] = []
  if (!year) alerts.push("O ano da apostila não foi identificado. Confira as datas.")
  const hits = weekHits(lines, year)
  if (hits.length === 0) {
    return {
      year,
      weeks: [],
      alerts: [...alerts, "Nenhuma semana de reunião foi encontrada no PDF."],
    }
  }
  const weeks = hits.map((hit, hitIndex) => {
    const body = lines.slice(hit.index + 1, hit.endIndex)
    const sections = emptySections()
    const weekAlerts: string[] = []
    let current: SectionToken | null = null
    let bucket: string[] = []
    let pendingHeader = ""
    const flush = () => {
      if (!current) return
      const parsed = parseParts(bucket)
      sections.find((section) => section.token === current)?.parts.push(...parsed.parts)
      weekAlerts.push(...parsed.alerts)
      bucket = []
    }
    for (const line of body) {
      if (isHeaderFragment(line)) {
        pendingHeader = `${pendingHeader} ${line}`.replace(/\s+/g, " ").trim()
        const token = sectionToken(pendingHeader)
        if (token) {
          flush()
          current = token
          pendingHeader = ""
        } else if (pendingHeader.length > 80) {
          pendingHeader = line
        }
        continue
      }
      pendingHeader = ""
      if (current) bucket.push(line)
    }
    flush()
    for (const section of sections) {
      if (section.parts.length === 0) {
        weekAlerts.push(`A seção “${section.title}” não teve partes identificadas.`)
      }
    }
    const closing = sections[2].parts[sections[2].parts.length - 1]
    const closingFold = fold(closing?.title ?? "").replace(/ /g, "")
    if (!closing || !closingFold.includes("estudobiblicodecongregacao")) {
      weekAlerts.push("A seção Nossa Vida Cristã não termina com o Estudo bíblico de congregação.")
    }
    if (!hit.weekStart || !hit.weekEnd) weekAlerts.push("A data desta semana precisa ser confirmada.")
    return {
      id: hit.weekStart ?? `week-${hitIndex + 1}`,
      label: labelFor(hit),
      weekStart: hit.weekStart,
      weekEnd: hit.weekEnd,
      sections,
      alerts: weekAlerts,
    }
  })
  return { year, weeks, alerts }
}

function labelFor(hit: WeekHit) {
  if (!hit.weekStart || !hit.weekEnd) return hit.label
  const start = new Date(hit.weekStart + "T12:00:00")
  const end = new Date(hit.weekEnd + "T12:00:00")
  const day = new Intl.DateTimeFormat("pt-BR", { day: "numeric" })
  const month = new Intl.DateTimeFormat("pt-BR", { month: "short" })
  if (start.getMonth() === end.getMonth()) {
    return `${day.format(start)}–${day.format(end)} de ${month.format(start).replace(".", "")}`
  }
  return `${day.format(start)} de ${month.format(start).replace(".", "")}–${day.format(end)} de ${month.format(end).replace(".", "")}`
}

export function meetingDateInWeek(weekStart: string, weekEnd: string, weekday: number | null) {
  if (weekday == null || weekday < 1 || weekday > 7) return null
  const [year, month, day] = weekStart.split("-").map(Number)
  const cursor = new Date(year, month - 1, day)
  const end = new Date(weekEnd + "T12:00:00")
  while (cursor <= end) {
    if (cursor.getDay() === (weekday === 7 ? 0 : weekday)) {
      return isoDate(cursor.getFullYear(), cursor.getMonth(), cursor.getDate())
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return null
}
