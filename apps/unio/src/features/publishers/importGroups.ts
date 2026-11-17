import type { MockGender } from './mock'

export type ImportedGroupItem = {
  code?: string
  name: string
  superintendent: string
  assistant?: string
  publishers: string[]
  notes?: string
}

export type GroupsImportOptions = {
  prefixCode?: boolean
  stripQuestionMarks?: boolean
}

export type GroupsImportResult = {
  groupsCreated: number
  groupsUpdated: number
  publishersCreated: number
  publishersMatched: number
}

export const DEFAULT_GROUPS_IMPORT_JSON = `{
  "groups": [
    {
      "code": "A",
      "name": "Laranjeiras",
      "superintendent": "Edilton Cusmão",
      "assistant": "João Aristeu",
      "publishers": [
        "Rosana Cusmão",
        "Ana Cláudia",
        "Antonia Gomes",
        "Kaique",
        "Leonice",
        "Lisandrela?",
        "Djalma Fidêncio",
        "Dirce Fidêncio",
        "Giovana Fidêncio",
        "Maria Fujiwara",
        "Leonildo",
        "Josel...?",
        "Matheus Esteves",
        "Sara Esteves",
        "Renivaldo",
        "Nathalina",
        "Jonathan Leite",
        "Letícia Leite",
        "Claudemir",
        "Alexandre Berbei?"
      ]
    },
    {
      "code": "B",
      "name": "Montevidéu",
      "superintendent": "Carlos Alberto",
      "assistant": "Júlio César",
      "publishers": [
        "Juliete Silva",
        "Ivanilde Muniz?",
        "Alice Padilha",
        "Maria Dias",
        "Beatriz Dias",
        "Sheila Dias",
        "Maria Vitória",
        "Júlia Helena",
        "Ondina Souza",
        "Vanessa Caroline",
        "Maria Cosme",
        "Damião Silva",
        "Jennifer Silva",
        "Marta Simões",
        "Bernadete Lima",
        "Iracema Pereira",
        "José Ferreira Lima",
        "Vilani Lima",
        "Kevin Souza",
        "Daiana Souza"
      ]
    },
    {
      "code": "C",
      "name": "Guaíba",
      "superintendent": "José Bessa",
      "assistant": "Marcelo Nogareda",
      "publishers": [
        "Adriana Bessa",
        "Luciana Nogareda",
        "Aparecida Gonçalves",
        "Ana Beatriz?",
        "Zeni Ierich",
        "Patrícia Ierich",
        "Maria Madalena",
        "Terezinha",
        "Margarida",
        "Matheus",
        "Laucy Vieira",
        "Rosemeire Vieira",
        "Ronaldo",
        "Luzeni Pereira",
        "Luzenira Conceição",
        "Maria Socorro",
        "Roseli Simões",
        "Gabriel"
      ],
      "notes": "Há nomes encobertos pelo reflexo entre Ana Beatriz e Zeni Ierich."
    },
    {
      "code": "D",
      "name": "Casa Branca 1",
      "superintendent": "Carlos Montero",
      "assistant": "Éber Camilo",
      "publishers": [
        "Edna Montero",
        "Adriana Barbosa",
        "Glória Morais",
        "Aline Morais",
        "Wilson Silva",
        "Bruno Silva",
        "Maria Eduarda",
        "Ana Laura",
        "Matheus Brisoti?",
        "Ângela Brisoti",
        "Júlio César Oliveira",
        "Agatha Rodrigues",
        "Alice Santos",
        "Leandro Santos",
        "Renata Montero",
        "Melissa Montero",
        "Fátima Morais",
        "Tatiane",
        "Karen Cecato",
        "Israel",
        "Bruna",
        "Eduardo",
        "Hamilton Morgado",
        "Silvana Morgado",
        "João Pedro Fidêncio",
        "Bruna Fidêncio",
        "Ana Cláudia"
      ]
    },
    {
      "code": "E",
      "name": "Casa Branca 2",
      "superintendent": "Vanderlei Inácio",
      "assistant": "José Soares",
      "publishers": [
        "Janete",
        "Isabely",
        "Dalva Soares",
        "Gabrieli Soares",
        "Lélia",
        "Sinésio",
        "Fábio",
        "Suelen",
        "Divanice",
        "Ricardo Trifanovas",
        "Dilela Trifanovas?",
        "Alice Trifanovas",
        "Camile Trifanovas",
        "Alan Munhoz",
        "Daniela Munhoz",
        "Nicolas Munhoz",
        "Caio Munhoz",
        "Arnaldo Amaro",
        "Lourdes Amaro",
        "Evelyn Amaro",
        "Ernestino",
        "Adelina",
        "Odair Borges",
        "Dalva Borges",
        "Sol"
      ]
    },
    {
      "code": "F",
      "name": "Maria A. Prado",
      "superintendent": "Roberto Silva",
      "assistant": "Valmir Porcino",
      "publishers": [
        "Ana Cláudia Silva",
        "João Vittor Silva",
        "Marli Porcino",
        "Marcos Fernandes",
        "Priscila Fernandes",
        "João Vitor Fernandes",
        "Rejane Lemos",
        "Mariza Lemos",
        "Claudino",
        "Leonardo Andrade",
        "Rosângela Chiarinelli",
        "Iranil Silva",
        "Carmem Silva",
        "Jonathan Pires",
        "Endruine Pires",
        "Sophia Rodrigues",
        "Sueli Sousa",
        "Wagner Bomtempo",
        "Ana Bomtempo",
        "Fernanda Bomtempo",
        "Vera Lúcia",
        "Willian Silva"
      ]
    }
  ]
}`

const FEMALE_FIRST_NAMES = new Set([
  'agatha',
  'alice',
  'aline',
  'ana',
  'angela',
  'antonia',
  'aparecida',
  'beatriz',
  'bernadete',
  'bruna',
  'camile',
  'camila',
  'carmem',
  'carmen',
  'daiana',
  'dalva',
  'daniela',
  'dilela',
  'dirce',
  'divanice',
  'edna',
  'endruine',
  'evelyn',
  'fatima',
  'fernanda',
  'gabrieli',
  'gabriela',
  'giovana',
  'gloria',
  'iracema',
  'isabely',
  'isabela',
  'ivanilde',
  'janete',
  'jennifer',
  'julia',
  'juliete',
  'karen',
  'lelia',
  'leonice',
  'leticia',
  'lisandrela',
  'lourdes',
  'luciana',
  'luzeni',
  'luzenira',
  'margarida',
  'maria',
  'mariza',
  'marli',
  'marta',
  'melissa',
  'nathalina',
  'ondina',
  'patricia',
  'priscila',
  'rejane',
  'renata',
  'rosana',
  'rosangela',
  'roseli',
  'rosemeire',
  'sara',
  'sheila',
  'silvana',
  'sol',
  'sophia',
  'suelen',
  'sueli',
  'tatiane',
  'terezinha',
  'vanessa',
  'vera',
  'vilani',
  'zeni',
])

const MALE_FIRST_NAMES = new Set([
  'alan',
  'alexandre',
  'arnaldo',
  'bruno',
  'caio',
  'carlos',
  'claudemir',
  'claudino',
  'damiao',
  'djalma',
  'eber',
  'edilton',
  'eduardo',
  'ernestino',
  'fabio',
  'gabriel',
  'hamilton',
  'iranil',
  'israel',
  'joao',
  'jonathan',
  'jose',
  'josel',
  'julio',
  'kaique',
  'kevin',
  'laucy',
  'leandro',
  'leonardo',
  'leonildo',
  'marcelo',
  'marcos',
  'matheus',
  'nicolas',
  'odair',
  'renivaldo',
  'ricardo',
  'roberto',
  'ronaldo',
  'sinesio',
  'valmir',
  'vanderlei',
  'wagner',
  'willian',
  'wilson',
])

export function inferPublisherGender(rawName: string): MockGender {
  const cleaned = rawName
    .trim()
    .replace(/\?+$/g, '')
    .replace(/\.+$/g, '')
    .trim()
  const firstToken = (cleaned.split(/\s+/)[0] || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
  if (!firstToken) return 'masculino'
  if (MALE_FIRST_NAMES.has(firstToken)) return 'masculino'
  if (FEMALE_FIRST_NAMES.has(firstToken)) return 'feminino'
  if (firstToken.endsWith('a')) return 'feminino'
  return 'masculino'
}

export function cleanImportedPersonName(value: unknown, stripQuestionMarks: boolean): string {
  const raw = typeof value === 'string' ? value.trim() : ''
  if (!raw) return ''
  return stripQuestionMarks ? raw.replace(/\?+$/g, '').trim() : raw
}

export function formatImportedGroupName(group: ImportedGroupItem, prefixCode: boolean): string {
  const code = (group.code ?? '').trim()
  const baseName = group.name.trim()
  if (!prefixCode || !code) return baseName
  if (baseName.toLowerCase().startsWith(`${code.toLowerCase()} `) || baseName.toLowerCase().startsWith(`${code.toLowerCase()} -`) || baseName.toLowerCase().startsWith(`${code.toLowerCase()} —`)) {
    return baseName
  }
  return `${code} — ${baseName}`
}

export function parseGroupsImportJson(rawJson: string): ImportedGroupItem[] {
  const trimmed = rawJson.trim()
  if (!trimmed) {
    throw new Error('Cole ou selecione um arquivo JSON válido.')
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    throw new Error('JSON inválido. Verifique a formatação (chaves, aspas e vírgulas).')
  }

  const rawGroups = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as { groups?: unknown }).groups)
      ? (parsed as { groups: unknown[] }).groups
      : null

  if (!rawGroups || rawGroups.length === 0) {
    throw new Error('O JSON precisa conter uma lista não vazia em "groups".')
  }

  return rawGroups.map((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      throw new Error(`Grupo na posição ${index + 1} é inválido.`)
    }
    const obj = entry as Record<string, unknown>
    const code = typeof obj.code === 'string' ? obj.code.trim() : undefined
    const name = typeof obj.name === 'string' ? obj.name.trim() : ''
    const superintendent = typeof obj.superintendent === 'string' ? obj.superintendent.trim() : ''
    const assistant = typeof obj.assistant === 'string' ? obj.assistant.trim() : undefined
    const notes = typeof obj.notes === 'string' ? obj.notes.trim() : undefined
    const publishers = Array.isArray(obj.publishers)
      ? obj.publishers.map((p) => (typeof p === 'string' ? p.trim() : '')).filter(Boolean)
      : []

    if (!name) {
      throw new Error(`O grupo ${code || `#${index + 1}`} não possui campo "name".`)
    }
    if (!superintendent) {
      throw new Error(`O grupo "${name}" não possui campo "superintendent".`)
    }

    return {
      code,
      name,
      superintendent,
      assistant,
      publishers,
      notes,
    }
  })
}
