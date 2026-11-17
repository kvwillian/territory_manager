import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../../firebase'
import {
  inferPublisherGender,
  type GroupsImportOptions,
  type GroupsImportResult,
  type ImportedGroupItem,
} from './importGroups'
import {
  groupTones,
  type AssignmentDuty,
  type GroupTone,
  type MockGroup,
  type MockPioneer,
  type MockPrivilege,
  type MockPublisher,
} from './mock'

export type BulkDeleteResult = {
  deletedCount: number
  deletedGroupsCount: number
}

export type BulkMoveResult = {
  movedCount: number
}

export type GroupPatch = {
  name: string
  superintendentPublisherId: string
  assistantPublisherId: string | null
  description?: string
}

export type QualificationPatch = {
  publisherId: string
  duties: AssignmentDuty[]
  needsElderlySupport: boolean
  driver: boolean
}

type Catalog = {
  publishers: MockPublisher[]
  groups: MockGroup[]
  ready: boolean
  error: string
  addPublisher: (publisher: MockPublisher) => Promise<void>
  updatePublisher: (id: string, patch: Partial<MockPublisher>) => Promise<void>
  createGroup: (
    name: string,
    superintendentPublisherId: string,
    assistantPublisherId?: string | null,
    description?: string,
  ) => Promise<void>
  updateGroup: (groupId: string, patch: GroupPatch) => Promise<void>
  deleteGroup: (groupId: string) => Promise<void>
  importGroups: (groups: ImportedGroupItem[], options?: GroupsImportOptions) => Promise<GroupsImportResult>
  bulkDeletePublishers: (publisherIds: string[], deleteEmptyGroups?: boolean) => Promise<BulkDeleteResult>
  bulkMovePublishers: (publisherIds: string[], groupId: string | null) => Promise<BulkMoveResult>
  bulkUpdateQualifications: (patches: QualificationPatch[]) => Promise<{ updatedCount: number }>
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
  assistantPublisherId?: string
  description?: string
}

function dutiesOf(publisher: RemotePublisher, isFemale: boolean): AssignmentDuty[] {
  const duties: AssignmentDuty[] = []
  if (publisher.estudante) duties.push('estudante')
  if (isFemale) return duties
  if (publisher.indicador) duties.push('indicador')
  if (publisher.microfone) duties.push('microfone')
  if (publisher.som) duties.push('audio')
  if (publisher.volante) duties.push('volante')
  return duties
}

function asPublisher(data: RemotePublisher): MockPublisher {
  const hasMaleOnlyRole =
    data.privilege === 'elder' ||
    data.privilege === 'ministerial' ||
    data.privilege === 'ministerialServant' ||
    data.indicador === true ||
    data.microfone === true ||
    data.som === true ||
    data.volante === true ||
    data.driver === true
  const inferred = inferPublisherGender(data.name ?? '')
  const gender =
    data.gender === 'feminino'
      ? 'feminino'
      : data.gender === 'masculino'
        ? 'masculino'
        : hasMaleOnlyRole
          ? 'masculino'
          : inferred === 'feminino'
            ? 'feminino'
            : 'masculino'
  const isFemale = gender === 'feminino'
  const rawPrivilege =
    data.privilege === 'ministerialServant' ? 'ministerial' : data.privilege
  return {
    id: data.id,
    name: data.name ?? '',
    age: typeof data.age === 'number' ? data.age : 0,
    gender,
    status: data.status === 'inactive' ? 'inactive' : 'active',
    privilege: isFemale ? 'publisher' : ((rawPrivilege as MockPrivilege) || 'publisher'),
    pioneer: (data.pioneer as MockPioneer) || 'none',
    duties: dutiesOf(data, isFemale),
    needsElderlySupport: data.needsElderlySupport === true,
    driver: isFemale ? false : data.driver === true,
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
    assistantPublisherId: data.assistantPublisherId,
    description: data.description,
  }
}

function payload(publisher: Partial<MockPublisher>) {
  const isFemale = publisher.gender === 'feminino'
  return {
    name: publisher.name,
    phone: publisher.phone,
    status: publisher.status,
    privilege: isFemale ? 'publisher' : publisher.privilege,
    pioneer: publisher.pioneer,
    gender: publisher.gender,
    age: publisher.age && publisher.age > 0 ? publisher.age : null,
    groupId: publisher.groupId,
    indicador: isFemale ? false : publisher.duties?.includes('indicador') === true,
    microfone: isFemale ? false : publisher.duties?.includes('microfone') === true,
    som: isFemale ? false : publisher.duties?.includes('audio') === true,
    estudante: publisher.duties?.includes('estudante') === true,
    volante: isFemale ? false : publisher.duties?.includes('volante') === true,
    needsElderlySupport: publisher.needsElderlySupport === true,
    driver: isFemale ? false : publisher.driver === true,
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
      if ('groupId' in patch && patch.groupId !== current.groupId) {
        await httpsCallable(functions, 'setCongregationPublisherGroup')({
          publisherId: id,
          groupId: patch.groupId ?? '',
        })
      }
      const result = await httpsCallable(functions, 'updatePublisherAccount')({ publisherId: id, ...payload(next) })
      const saved = asPublisher(result.data as RemotePublisher)
      setPublishers((list) => list.map((item) => (item.id === id ? { ...saved, groupId: next.groupId } : item)))
    },
    async createGroup(name, superintendentPublisherId, assistantPublisherId, description) {
      setError('')
      const result = await httpsCallable(functions, 'createCongregationGroup')({
        name,
        superintendentPublisherId,
        assistantPublisherId: assistantPublisherId || null,
        description: description || null,
      })
      const saved = result.data as RemoteGroup
      setGroups((current) => [...current, asGroup(saved, current.length)])
      setPublishers((current) =>
        current.map((item) =>
          item.id === superintendentPublisherId || (assistantPublisherId && item.id === assistantPublisherId)
            ? { ...item, groupId: saved.id }
            : item,
        ),
      )
    },
    async updateGroup(groupId, patch) {
      setError('')
      const result = await httpsCallable(functions, 'updateCongregationGroup')({
        groupId,
        name: patch.name,
        superintendentPublisherId: patch.superintendentPublisherId,
        assistantPublisherId: patch.assistantPublisherId ?? '',
        description: patch.description ?? '',
      })
      const saved = result.data as RemoteGroup
      setGroups((current) =>
        current.map((item, idx) =>
          item.id === groupId ? { ...asGroup(saved, idx), tone: item.tone } : item,
        ),
      )
      setPublishers((current) =>
        current.map((item) => {
          if (
            (patch.superintendentPublisherId && item.id === patch.superintendentPublisherId) ||
            (patch.assistantPublisherId && item.id === patch.assistantPublisherId)
          ) {
            return { ...item, groupId }
          }
          return item
        }),
      )
    },
    async deleteGroup(groupId) {
      setError('')
      await httpsCallable(functions, 'deleteCongregationGroup')({ groupId })
      setGroups((current) => current.filter((item) => item.id !== groupId))
      setPublishers((current) =>
        current.map((item) => (item.groupId === groupId ? { ...item, groupId: null } : item)),
      )
    },
    async importGroups(rawGroups, options) {
      setError('')
      const prefixCode = options?.prefixCode === true
      const stripQuestionMarks = options?.stripQuestionMarks === true

      const result = await httpsCallable(functions, 'importCongregationGroups')({
        groups: rawGroups,
        prefixCode,
        stripQuestionMarks,
      })
      const data = result.data as GroupsImportResult & {
        createdGroups?: number
        createdPublishers?: number
        publishers?: RemotePublisher[]
        groups?: RemoteGroup[]
      }
      if (Array.isArray(data.publishers)) {
        setPublishers(data.publishers.map(asPublisher))
      }
      if (Array.isArray(data.groups)) {
        setGroups(data.groups.map(asGroup))
      }
      return {
        groupsCreated: data.groupsCreated ?? data.createdGroups ?? 0,
        groupsUpdated: data.groupsUpdated ?? 0,
        publishersCreated: data.publishersCreated ?? data.createdPublishers ?? 0,
        publishersMatched: data.publishersMatched ?? 0,
      }
    },
    async bulkDeletePublishers(publisherIds, deleteEmptyGroups = true) {
      setError('')
      const result = await httpsCallable(functions, 'bulkDeletePublisherAccounts')({
        publisherIds,
        deleteEmptyGroups,
      })
      const data = result.data as BulkDeleteResult & {
        publishers?: RemotePublisher[]
        groups?: RemoteGroup[]
      }
      if (Array.isArray(data.publishers)) {
        setPublishers(data.publishers.map(asPublisher))
      } else {
        const idSet = new Set(publisherIds)
        setPublishers((current) => current.filter((p) => !idSet.has(p.id)))
      }
      if (Array.isArray(data.groups)) {
        setGroups(data.groups.map(asGroup))
      }
      return {
        deletedCount: data.deletedCount ?? publisherIds.length,
        deletedGroupsCount: data.deletedGroupsCount ?? 0,
      }
    },
    async bulkMovePublishers(publisherIds, groupId) {
      setError('')
      const result = await httpsCallable(functions, 'bulkMovePublisherAccounts')({
        publisherIds,
        groupId: groupId ?? '',
      })
      const data = result.data as BulkMoveResult & {
        publishers?: RemotePublisher[]
        groups?: RemoteGroup[]
      }
      if (Array.isArray(data.publishers)) {
        setPublishers(data.publishers.map(asPublisher))
      } else {
        const idSet = new Set(publisherIds)
        setPublishers((current) =>
          current.map((p) => (idSet.has(p.id) ? { ...p, groupId: groupId || null } : p)),
        )
      }
      if (Array.isArray(data.groups)) {
        setGroups(data.groups.map(asGroup))
      }
      return {
        movedCount: data.movedCount ?? publisherIds.length,
      }
    },
    async bulkUpdateQualifications(patches) {
      setError('')
      const updates = patches.map((patch) => ({
        publisherId: patch.publisherId,
        indicador: patch.duties.includes('indicador'),
        microfone: patch.duties.includes('microfone'),
        som: patch.duties.includes('audio'),
        estudante: patch.duties.includes('estudante'),
        volante: patch.duties.includes('volante'),
        needsElderlySupport: patch.needsElderlySupport,
        driver: patch.driver,
      }))
      const result = await httpsCallable(functions, 'bulkUpdatePublisherAccounts')({ updates })
      const data = result.data as { updatedCount?: number; publishers?: RemotePublisher[] }
      if (Array.isArray(data.publishers)) {
        setPublishers(data.publishers.map(asPublisher))
      } else {
        const patchMap = new Map(patches.map((p) => [p.publisherId, p]))
        setPublishers((current) =>
          current.map((item) => {
            const p = patchMap.get(item.id)
            if (!p) return item
            return {
              ...item,
              duties: p.duties,
              needsElderlySupport: p.needsElderlySupport,
              driver: p.driver,
            }
          }),
        )
      }
      return {
        updatedCount: data.updatedCount ?? patches.length,
      }
    },
  }), [publishers, groups, ready, error])

  return <PublishersContext.Provider value={value}>{children}</PublishersContext.Provider>
}

export function usePublisherCatalog() {
  const value = useContext(PublishersContext)
  if (!value) throw new Error('PublishersProvider is missing')
  return value
}
