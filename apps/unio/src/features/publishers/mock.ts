export type MockGender = 'feminino' | 'masculino'
export type MockStatus = 'active' | 'inactive'
export type MockPrivilege = 'publisher' | 'ministerialServant' | 'elder'
export type MockPioneer = 'none' | 'auxiliary' | 'regular'
export type GroupTone = 'orange' | 'blue' | 'violet' | 'green' | 'pink'

export type MockGroup = {
  id: string
  name: string
  tone: GroupTone
  superintendentPublisherId?: string
}

export type MockPublisher = {
  id: string
  name: string
  age: number
  gender: MockGender
  status: MockStatus
  privilege: MockPrivilege
  pioneer: MockPioneer
  duties: AssignmentDuty[]
  needsElderlySupport: boolean
  driver: boolean
  phone: string
  groupId: string | null
}

export const assignmentPrivileges = [
  { id: 'estudante', label: 'Estudante' },
  { id: 'indicador', label: 'Indicador' },
  { id: 'microfone', label: 'Microfone' },
  { id: 'audio', label: 'Áudio' },
  { id: 'volante', label: 'Volante' },
] as const

export type AssignmentDuty = (typeof assignmentPrivileges)[number]['id']

export const mockGroups: MockGroup[] = [
  { id: 'grupo-1', name: 'Grupo 1', tone: 'orange' },
  { id: 'grupo-2', name: 'Grupo 2', tone: 'blue' },
  { id: 'grupo-3', name: 'Grupo 3', tone: 'violet' },
  { id: 'grupo-4', name: 'Grupo 4', tone: 'green' },
  { id: 'grupo-5', name: 'Grupo 5', tone: 'pink' },
]

export const mockPublishers: MockPublisher[] = [
  { id: 'p1', name: 'Ana Clara Santos', age: 23, gender: 'feminino', status: 'active', privilege: 'publisher', pioneer: 'none', duties: ['estudante'], needsElderlySupport: false, driver: false, phone: '(11) 98765-4321', groupId: 'grupo-1' },
  { id: 'p2', name: 'Antônio Silva', age: 42, gender: 'masculino', status: 'active', privilege: 'elder', pioneer: 'none', duties: ['audio', 'indicador'], needsElderlySupport: false, driver: true, phone: '(11) 91234-5678', groupId: 'grupo-1' },
  { id: 'p3', name: 'João Ferreira', age: 36, gender: 'masculino', status: 'active', privilege: 'ministerialServant', pioneer: 'none', duties: ['microfone', 'volante'], needsElderlySupport: false, driver: true, phone: '(11) 98811-2201', groupId: 'grupo-1' },
  { id: 'p4', name: 'Rafael Teixeira', age: 29, gender: 'masculino', status: 'active', privilege: 'publisher', pioneer: 'auxiliary', duties: ['estudante', 'microfone'], needsElderlySupport: false, driver: false, phone: '(11) 98710-3344', groupId: 'grupo-1' },
  { id: 'p5', name: 'Beatriz Mendes', age: 31, gender: 'feminino', status: 'active', privilege: 'publisher', pioneer: 'auxiliary', duties: ['indicador'], needsElderlySupport: false, driver: false, phone: '(11) 99876-5432', groupId: 'grupo-2' },
  { id: 'p6', name: 'Carlos Ferreira', age: 38, gender: 'masculino', status: 'active', privilege: 'ministerialServant', pioneer: 'none', duties: ['audio'], needsElderlySupport: false, driver: true, phone: '(11) 99123-4567', groupId: 'grupo-2' },
  { id: 'p7', name: 'Bianca Martins', age: 28, gender: 'feminino', status: 'active', privilege: 'publisher', pioneer: 'none', duties: ['estudante'], needsElderlySupport: false, driver: false, phone: '(11) 99660-1188', groupId: 'grupo-2' },
  { id: 'p8', name: 'Tiago Santos', age: 33, gender: 'masculino', status: 'active', privilege: 'publisher', pioneer: 'regular', duties: ['volante'], needsElderlySupport: false, driver: false, phone: '(11) 99551-7722', groupId: 'grupo-2' },
  { id: 'p9', name: 'Daniela Lima', age: 27, gender: 'feminino', status: 'inactive', privilege: 'publisher', pioneer: 'none', duties: [], needsElderlySupport: false, driver: false, phone: '(11) 98456-7890', groupId: 'grupo-3' },
  { id: 'p10', name: 'Eduardo Souza', age: 45, gender: 'masculino', status: 'active', privilege: 'elder', pioneer: 'none', duties: ['audio', 'indicador'], needsElderlySupport: true, driver: false, phone: '(11) 97654-3210', groupId: 'grupo-3' },
  { id: 'p11', name: 'Marina Gomes', age: 34, gender: 'feminino', status: 'active', privilege: 'publisher', pioneer: 'regular', duties: ['indicador'], needsElderlySupport: false, driver: false, phone: '(11) 98120-4455', groupId: 'grupo-3' },
  { id: 'p12', name: 'Sérgio Nunes', age: 40, gender: 'masculino', status: 'active', privilege: 'ministerialServant', pioneer: 'none', duties: ['microfone'], needsElderlySupport: false, driver: true, phone: '(11) 99220-6677', groupId: 'grupo-3' },
  { id: 'p13', name: 'João Ribeiro', age: 51, gender: 'masculino', status: 'active', privilege: 'elder', pioneer: 'none', duties: ['audio'], needsElderlySupport: true, driver: false, phone: '(11) 97333-2211', groupId: 'grupo-4' },
  { id: 'p14', name: 'Larissa Alves', age: 26, gender: 'feminino', status: 'active', privilege: 'publisher', pioneer: 'none', duties: ['estudante'], needsElderlySupport: false, driver: false, phone: '(11) 98840-9090', groupId: 'grupo-4' },
  { id: 'p15', name: 'Felipe Castro', age: 30, gender: 'masculino', status: 'active', privilege: 'publisher', pioneer: 'auxiliary', duties: ['volante', 'microfone'], needsElderlySupport: false, driver: true, phone: '(11) 99771-3030', groupId: 'grupo-4' },
  { id: 'p16', name: 'Camila Souza', age: 24, gender: 'feminino', status: 'inactive', privilege: 'publisher', pioneer: 'none', duties: [], needsElderlySupport: false, driver: false, phone: '(11) 98612-4545', groupId: 'grupo-4' },
  { id: 'p17', name: 'Marcos Pereira', age: 47, gender: 'masculino', status: 'active', privilege: 'elder', pioneer: 'none', duties: ['indicador'], needsElderlySupport: true, driver: true, phone: '(11) 97444-8080', groupId: 'grupo-5' },
  { id: 'p18', name: 'Natália Borges', age: 32, gender: 'feminino', status: 'active', privilege: 'publisher', pioneer: 'auxiliary', duties: ['estudante', 'indicador'], needsElderlySupport: false, driver: false, phone: '(11) 99190-1212', groupId: 'grupo-5' },
  { id: 'p19', name: 'Vitor Teixeira', age: 22, gender: 'masculino', status: 'active', privilege: 'publisher', pioneer: 'none', duties: ['microfone'], needsElderlySupport: false, driver: false, phone: '(11) 98555-6767', groupId: 'grupo-5' },
  { id: 'p20', name: 'Helena Dias', age: 29, gender: 'feminino', status: 'active', privilege: 'publisher', pioneer: 'none', duties: ['audio'], needsElderlySupport: false, driver: false, phone: '(11) 99321-8888', groupId: null },
]

export const groupTones: Record<GroupTone, { card: string; chip: string; text: string }> = {
  orange: { card: '#FFF4ED', chip: '#FFEDD5', text: '#C2410C' },
  blue: { card: '#EEF4FF', chip: '#DBEAFE', text: '#1D4ED8' },
  violet: { card: '#F5F3FF', chip: '#EDE9FE', text: '#6D28D9' },
  green: { card: '#ECFDF5', chip: '#D1FAE5', text: '#047857' },
  pink: { card: '#FDF2F8', chip: '#FCE7F3', text: '#BE185D' },
}
