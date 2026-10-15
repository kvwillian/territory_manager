import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../../firebase'
import {
  groupTones,
  type AssignmentDuty,
  type GroupTone,
  type MockGroup,
  type MockPioneer,
  type MockPrivilege,
  type MockPublisher,
} from './mock'

type Catalog = {
  publishers: MockPublisher[]
  groups: MockGroup[]
  ready: boolean
  error: string
  addPublisher: (publisher: MockPublisher) => Promise<void>
  updatePublisher: (id: string, patch: Partial<MockPublisher>) => Promise<void>
}

const tones = Object.keys(groupTones) as GroupTone[]
const PublishersContext = createContext<Catalog | null>(null)

type RemotePublisher = {
  id: string
  name?: string
  phone?: string
  groupId?: string
  status?: string
  privilege?: string
  pioneer?: string
  indicador?: boolean
  microfone?: boolean
  som?: boolean
  estudante?: boolean
  volante?: boolean
  needsElderlySupport?: boolean
  driver?: boolean
  gender?: string
  age?: number
}

type RemoteGroup = {
  id: string
  name?: string
  superintendentPublisherId?: string
}

function dutiesOf(publisher: RemotePublisher): AssignmentDuty[] {
  const duties: AssignmentDuty[] = []
  if (publisher.estudante) duties.push('estudante')
  if (publisher.indicador) duties.push('indicador')
  if (publisher.microfone) duties.push('microfone')
  if (publisher.som) duties.push('audio')
  if (publisher.volante) duties.push('volante')
  return duties
}

function asPublisher(data: RemotePublisher): MockPublisher {
  return {
    id: data.id,
    name: data.name ?? '',
    age: typeof data.age === 'number' ? data.age : 0,
    gender: data.gender === 'feminino' ? 'feminino' : 'masculino',
    status: data.status === 'inactive' ? 'inactive' : 'active',
    privilege: (data.privilege as MockPrivilege) || 'publisher',
    pioneer: (data.pioneer as MockPioneer) || 'none',
    duties: dutiesOf(data),
    needsElderlySupport: data.needsElderlySupport === true,
    driver: data.driver === true,
    phone: data.phone ?? '',
    groupId: data.groupId ?? null,
  }
}

function asGroup(data: RemoteGroup, index: number): MockGroup {
  return {
    id: data.id,
    name: data.name ?? 'Grupo',
    tone: tones[index % tones.length] ?? 'orange',
    superintendentPublisherId: data.superintendentPublisherId,
  }
}

function payload(publisher: Partial<MockPublisher>) {
  return {
    name: publisher.name,
    phone: publisher.phone,
    status: publisher.status,
    privilege: publisher.privilege,
    pioneer: publisher.pioneer,
    gender: publisher.gender,
    age: publisher.age && publisher.age > 0 ? publisher.age : null,
    groupId: publisher.groupId,
    indicador: publisher.duties?.includes('indicador') === true,
    microfone: publisher.duties?.includes('microfone') === true,
    som: publisher.duties?.includes('audio') === true,
    estudante: publisher.duties?.includes('estudante') === true,
    volante: publisher.duties?.includes('volante') === true,
    needsElderlySupport: publisher.needsElderlySupport === true,
    driver: publisher.driver === true,
  }
}

export function PublishersProvider({ children }: { children: ReactNode }) {
  const [publishers, setPublishers] = useState<MockPublisher[]>([])
  const [groups, setGroups] = useState<MockGroup[]>([])
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([
      httpsCallable(functions, 'listPublisherAccounts')({}),
      httpsCallable(functions, 'listCongregationGroups')({}),
    ])
      .then(([people, groupList]) => {
        if (!active) return
        const publishersData = (people.data as { publishers?: RemotePublisher[] }).publishers ?? []
        const groupsData = (groupList.data as { groups?: RemoteGroup[] }).groups ?? []
        setPublishers(publishersData.map(asPublisher))
        setGroups(groupsData.map(asGroup))
        setReady(true)
      })
      .catch(() => {
        if (!active) return
        setError('Não foi possível carregar os publicadores.')
        setReady(true)
      })
    return () => {
      active = false
    }
  }, [])

  const value = useMemo<Catalog>(() => ({
    publishers,
    groups,
    ready,
    error,
    async addPublisher(publisher) {
      setError('')
      const result = await httpsCallable(functions, 'createPublisherAccount')(payload(publisher))
      setPublishers((current) => [asPublisher(result.data as RemotePublisher), ...current])
    },
    async updatePublisher(id, patch) {
      setError('')
      const current = publishers.find((item) => item.id === id)
      if (!current) return
      const next = { ...current, ...patch }
      const result = await httpsCallable(functions, 'updatePublisherAccount')({ publisherId: id, ...payload(next) })
      const saved = asPublisher(result.data as RemotePublisher)
      setPublishers((list) => list.map((item) => (item.id === id ? saved : item)))
    },
  }), [publishers, groups, ready, error])

  return <PublishersContext.Provider value={value}>{children}</PublishersContext.Provider>
}

export function usePublisherCatalog() {
  const value = useContext(PublishersContext)
  if (!value) throw new Error('PublishersProvider is missing')
  return value
}
