import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowLeft,
  ArrowRight,
  Car,
  CheckCircle2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Heart,
  LayoutGrid,
  Mic,
  Navigation,
  Pencil,
  RotateCcw,
  Search,
  Star,
  UserCheck,
  Users,
  Volume2,
  X,
} from 'lucide-react'
import { usePublisherCatalog, type QualificationPatch } from './catalog'
import {
  assignmentPrivileges,
  groupTones,
  type AssignmentDuty,
  type MockGender,
  type MockGroup,
  type MockPioneer,
  type MockPrivilege,
  type MockPublisher,
  type MockStatus,
} from './mock'
import { initials, privilegeLabel } from './privileges'

type MainTab = 'publicadores' | 'grupos' | 'funcoes'
type DrawerTab = 'funcoes' | 'dados' | 'grupo'
type FunctionKey = AssignmentDuty | 'needsElderlySupport' | 'driver'
type FunctionFilter = '' | FunctionKey | 'none'

type PublisherDraft = {
  name: string
  phone: string
  gender: MockGender
  age: number
  privilege: MockPrivilege
  pioneer: MockPioneer
  status: MockStatus
  groupId: string | null
  duties: AssignmentDuty[]
  needsElderlySupport: boolean
  driver: boolean
}

type FunctionMeta = {
  key: FunctionKey
  label: string
  shortLabel: string
  category: 'Participação' | 'Reuniões' | 'Apoio e transporte'
  description: string
  icon: ComponentType<{ size?: number; className?: string }>
  badgeClass: string
  iconBoxClass: string
}

const FUNCTIONS_META: FunctionMeta[] = [
  {
    key: 'estudante',
    label: 'Estudante',
    shortLabel: 'Estudante',
    category: 'Participação',
    description: 'Designações de leitura, demonstrações e discursos estudantis.',
    icon: GraduationCap,
    badgeClass: 'border-[#A7F3D0] bg-[#ECFDF5] text-[#047857]',
    iconBoxClass: 'bg-[#ECFDF5] text-[#047857]',
  },
  {
    key: 'volante',
    label: 'Volante',
    shortLabel: 'Volante',
    category: 'Participação',
    description: 'Apoio volante nos comentários e assistência durante as partes.',
    icon: Navigation,
    badgeClass: 'border-[#FDE68A] bg-[#FEF3C7] text-[#92400E]',
    iconBoxClass: 'bg-[#FEF3C7] text-[#92400E]',
  },
  {
    key: 'indicador',
    label: 'Indicador',
    shortLabel: 'Indicador',
    category: 'Reuniões',
    description: 'Recepção, contagem de assistência e organização do auditório.',
    icon: UserCheck,
    badgeClass: 'border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]',
    iconBoxClass: 'bg-[#EFF6FF] text-[#1D4ED8]',
  },
  {
    key: 'microfone',
    label: 'Microfone',
    shortLabel: 'Microfone',
    category: 'Reuniões',
    description: 'Passagem de microfones durante partes com participação da assistência.',
    icon: Mic,
    badgeClass: 'border-[#A5F3FC] bg-[#ECFEFF] text-[#0E7490]',
    iconBoxClass: 'bg-[#ECFEFF] text-[#0E7490]',
  },
  {
    key: 'audio',
    label: 'Áudio',
    shortLabel: 'Áudio',
    category: 'Reuniões',
    description: 'Operação de som, mídia e transmissão das reuniões.',
    icon: Volume2,
    badgeClass: 'border-[#DDD6FE] bg-[#F5F3FF] text-[#6D28D9]',
    iconBoxClass: 'bg-[#F5F3FF] text-[#6D28D9]',
  },
  {
    key: 'needsElderlySupport',
    label: 'Precisa de apoio',
    shortLabel: 'Apoio',
    category: 'Apoio e transporte',
    description: 'Publicadores que necessitam de carona ou acompanhamento.',
    icon: Heart,
    badgeClass: 'border-[#FECDD3] bg-[#FDE8EF] text-[#9F1239]',
    iconBoxClass: 'bg-[#FDE8EF] text-[#9F1239]',
  },
  {
    key: 'driver',
    label: 'Motorista',
    shortLabel: 'Motorista',
    category: 'Apoio e transporte',
    description: 'Disponíveis para oferecer transporte e suporte a idosos.',
    icon: Car,
    badgeClass: 'border-[#F3D7B0] bg-[#FEF3E2] text-[#B45309]',
    iconBoxClass: 'bg-[#FEF3E2] text-[#B45309]',
  },
]

const FUNCTION_MAP: Record<FunctionKey, FunctionMeta> = Object.fromEntries(
  FUNCTIONS_META.map((item) => [item.key, item]),
) as Record<FunctionKey, FunctionMeta>

const DRAWER_SECTIONS: Array<{
  title: 'Participação' | 'Reuniões' | 'Apoio e transporte'
  items: FunctionKey[]
}> = [
  { title: 'Participação', items: ['estudante', 'volante'] },
  { title: 'Reuniões', items: ['indicador', 'microfone', 'audio'] },
  { title: 'Apoio e transporte', items: ['needsElderlySupport', 'driver'] },
]

const PAGE_SIZE = 8

function isFunctionAllowedForGender(gender: MockGender, key: FunctionKey): boolean {
  if (gender === 'feminino') {
    return key === 'estudante' || key === 'needsElderlySupport'
  }
  return true
}

function draftFromPublisher(publisher: MockPublisher): PublisherDraft {
  const isFemale = publisher.gender === 'feminino'
  return {
    name: publisher.name,
    phone: publisher.phone,
    gender: publisher.gender,
    age: publisher.age,
    privilege: isFemale ? 'publisher' : publisher.privilege,
    pioneer: publisher.pioneer,
    status: publisher.status,
    groupId: publisher.groupId ?? null,
    duties: isFemale ? publisher.duties.filter((d) => d === 'estudante') : [...publisher.duties],
    needsElderlySupport: publisher.needsElderlySupport,
    driver: isFemale ? false : publisher.driver,
  }
}

function cloneDraft(draft: PublisherDraft): PublisherDraft {
  return {
    ...draft,
    duties: [...draft.duties],
  }
}

function hasFunctionEnabled(
  state: Pick<PublisherDraft, 'duties' | 'needsElderlySupport' | 'driver'> & { gender?: MockGender },
  key: FunctionKey,
): boolean {
  if (state.gender && !isFunctionAllowedForGender(state.gender, key)) return false
  if (key === 'needsElderlySupport') return state.needsElderlySupport
  if (key === 'driver') return state.driver
  return state.duties.includes(key)
}

function enabledFunctionsOf(
  state: Pick<PublisherDraft, 'duties' | 'needsElderlySupport' | 'driver'> & { gender?: MockGender },
): FunctionMeta[] {
  return FUNCTIONS_META.filter((item) => hasFunctionEnabled(state, item.key))
}

function hasPersonalDiff(publisher: MockPublisher, draft: PublisherDraft): boolean {
  return (
    publisher.name.trim() !== draft.name.trim() ||
    publisher.phone.trim() !== draft.phone.trim() ||
    publisher.gender !== draft.gender ||
    (publisher.age || 0) !== (draft.age || 0) ||
    publisher.privilege !== draft.privilege ||
    publisher.pioneer !== draft.pioneer ||
    publisher.status !== draft.status
  )
}

function hasQualificationDiff(publisher: MockPublisher, draft: PublisherDraft): boolean {
  for (const item of assignmentPrivileges) {
    if (publisher.duties.includes(item.id) !== draft.duties.includes(item.id)) return true
  }
  return (
    publisher.needsElderlySupport !== draft.needsElderlySupport ||
    publisher.driver !== draft.driver
  )
}

function hasGroupDiff(publisher: MockPublisher, draft: PublisherDraft): boolean {
  return (publisher.groupId ?? null) !== (draft.groupId ?? null)
}

function countPublisherChanges(publisher: MockPublisher, draft: PublisherDraft): number {
  let count = 0
  for (const item of assignmentPrivileges) {
    if (publisher.duties.includes(item.id) !== draft.duties.includes(item.id)) count += 1
  }
  if (publisher.needsElderlySupport !== draft.needsElderlySupport) count += 1
  if (publisher.driver !== draft.driver) count += 1
  if (publisher.name.trim() !== draft.name.trim()) count += 1
  if (publisher.phone.trim() !== draft.phone.trim()) count += 1
  if (publisher.gender !== draft.gender) count += 1
  if ((publisher.age || 0) !== (draft.age || 0)) count += 1
  if (publisher.privilege !== draft.privilege) count += 1
  if (publisher.pioneer !== draft.pioneer) count += 1
  if (publisher.status !== draft.status) count += 1
  if ((publisher.groupId ?? null) !== (draft.groupId ?? null)) count += 1
  return count
}

function privilegeBadgeClass(publisher: Pick<MockPublisher, 'privilege' | 'pioneer' | 'gender'>): string {
  if (publisher.gender !== 'feminino' && publisher.privilege === 'circuitOverseer') {
    return 'border-[#FDE68A] bg-[#FEF3C7] text-[#92400E]'
  }
  if (publisher.gender !== 'feminino' && publisher.privilege === 'elder') {
    return 'border-[#C7D2FE] bg-indigo-soft text-[#4338CA]'
  }
  if (publisher.gender !== 'feminino' && publisher.privilege === 'ministerialServant') {
    return 'border-[#DDD6FE] bg-[#F5F3FF] text-[#6D28D9]'
  }
  if (publisher.pioneer === 'special') {
    return 'border-[#FDE68A] bg-[#FEF3C7] text-[#92400E]'
  }
  if (publisher.pioneer === 'regular' || publisher.pioneer === 'auxiliary') {
    return 'border-[#A5F3FC] bg-[#ECFEFF] text-[#0E7490]'
  }
  return 'border-line bg-[#F1F5F9] text-[#475569]'
}

function buildPaginationItems(currentPage: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, idx) => idx + 1)
  }
  const pages = new Set<number>([1, totalPages, currentPage, currentPage - 1, currentPage + 1])
  if (currentPage <= 3) {
    pages.add(2)
    pages.add(3)
    pages.add(4)
  }
  if (currentPage >= totalPages - 2) {
    pages.add(totalPages - 1)
    pages.add(totalPages - 2)
    pages.add(totalPages - 3)
  }
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b)
  const items: Array<number | 'ellipsis'> = []
  for (let i = 0; i < sorted.length; i++) {
    const page = sorted[i]!
    const prev = sorted[i - 1]
    if (prev !== undefined && page - prev > 1) {
      items.push('ellipsis')
    }
    items.push(page)
  }
  return items
}

export function QualificationsPage() {
  const {
    publishers,
    groups,
    error,
    updatePublisher,
    bulkMovePublishers,
    bulkUpdateQualifications,
  } = usePublisherCatalog()

  // Main navigation & preserved view states
  const [activeTab, setActiveTab] = useState<MainTab>('publicadores')
  const [selectedGroupViewId, setSelectedGroupViewId] = useState<string | null>(null)
  const [selectedFunctionKey, setSelectedFunctionKey] = useState<FunctionKey>('estudante')
  const [functionViewSearch, setFunctionViewSearch] = useState('')
  const [functionViewGroupId, setFunctionViewGroupId] = useState('')

  // Publishers tab filters & pagination
  const [search, setSearch] = useState('')
  const [groupIdFilter, setGroupIdFilter] = useState('')
  const [privilegeFilter, setPrivilegeFilter] = useState('')
  const [genderFilter, setGenderFilter] = useState('')
  const [functionFilter, setFunctionFilter] = useState<FunctionFilter>('')
  const [page, setPage] = useState(1)

  // Local pending drafts & right-side drawer state
  const [drafts, setDrafts] = useState<Record<string, PublisherDraft>>({})
  const [selectedPublisherId, setSelectedPublisherId] = useState<string | null>(null)
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('funcoes')
  const [drawerBaseline, setDrawerBaseline] = useState<PublisherDraft | null>(null)

  // Save feedback
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [bannerMessage, setBannerMessage] = useState('')

  function effectiveOf(publisher: MockPublisher): MockPublisher {
    const draft = drafts[publisher.id]
    if (!draft) return publisher
    return {
      ...publisher,
      name: draft.name,
      phone: draft.phone,
      gender: draft.gender,
      age: draft.age,
      privilege: draft.privilege,
      pioneer: draft.pioneer,
      status: draft.status,
      groupId: draft.groupId,
      duties: draft.duties,
      needsElderlySupport: draft.needsElderlySupport,
      driver: draft.driver,
    }
  }

  const effectivePublishers = useMemo(
    () =>
      publishers
        .map((publisher) => effectiveOf(publisher))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [publishers, drafts],
  )

  const dirtyEntries = useMemo(() => {
    const list: Array<{ publisher: MockPublisher; draft: PublisherDraft; changes: number }> = []
    for (const publisher of publishers) {
      const draft = drafts[publisher.id]
      if (!draft) continue
      const changes = countPublisherChanges(publisher, draft)
      if (changes > 0) {
        list.push({ publisher, draft, changes })
      }
    }
    return list
  }, [publishers, drafts])

  const dirtyPublisherIds = useMemo(
    () => new Set(dirtyEntries.map((entry) => entry.publisher.id)),
    [dirtyEntries],
  )

  const totalPendingChanges = useMemo(
    () => dirtyEntries.reduce((sum, entry) => sum + entry.changes, 0),
    [dirtyEntries],
  )

  // Close drawer automatically if the selected publisher was removed externally
  useEffect(() => {
    if (selectedPublisherId && !publishers.some((p) => p.id === selectedPublisherId)) {
      setSelectedPublisherId(null)
      setDrawerBaseline(null)
    }
  }, [publishers, selectedPublisherId])

  // KPI metrics (reflecting effective state including pending local edits)
  const stats = useMemo(() => {
    const active = effectivePublishers.filter((p) => p.status === 'active')
    return {
      total: effectivePublishers.length,
      estudantes: active.filter((p) => p.duties.includes('estudante')).length,
      indicadores: active.filter((p) => p.duties.includes('indicador')).length,
      audio: active.filter((p) => p.duties.includes('audio')).length,
      motoristas: active.filter((p) => p.driver).length,
    }
  }, [effectivePublishers])

  const hasActiveFilters = Boolean(
    search.trim() || groupIdFilter || privilegeFilter || genderFilter || functionFilter,
  )

  const filteredPublishers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR')
    return effectivePublishers.filter((publisher) => {
      if (query && !publisher.name.toLocaleLowerCase('pt-BR').includes(query)) return false
      if (groupIdFilter === 'none' && publisher.groupId) return false
      if (groupIdFilter && groupIdFilter !== 'none' && publisher.groupId !== groupIdFilter) return false
      if (genderFilter && publisher.gender !== genderFilter) return false
      if (privilegeFilter === 'special' && publisher.pioneer !== 'special') return false
      if (privilegeFilter === 'auxiliary' && publisher.pioneer !== 'auxiliary') return false
      if (privilegeFilter === 'regular' && publisher.pioneer !== 'regular') return false
      if (
        privilegeFilter &&
        privilegeFilter !== 'special' &&
        privilegeFilter !== 'auxiliary' &&
        privilegeFilter !== 'regular' &&
        publisher.privilege !== privilegeFilter
      ) {
        return false
      }
      if (functionFilter === 'none') {
        if (enabledFunctionsOf(publisher).length > 0) return false
      } else if (functionFilter) {
        if (!hasFunctionEnabled(publisher, functionFilter)) return false
      }
      return true
    })
  }, [
    effectivePublishers,
    search,
    groupIdFilter,
    genderFilter,
    privilegeFilter,
    functionFilter,
  ])

  const totalPages = Math.max(1, Math.ceil(filteredPublishers.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginatedPublishers = useMemo(
    () => filteredPublishers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredPublishers, currentPage],
  )
  const rangeFrom = filteredPublishers.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const rangeTo = Math.min(currentPage * PAGE_SIZE, filteredPublishers.length)

  function clearFilters() {
    setSearch('')
    setGroupIdFilter('')
    setPrivilegeFilter('')
    setGenderFilter('')
    setFunctionFilter('')
    setPage(1)
  }

  function openDrawerFor(publisher: MockPublisher) {
    setBannerMessage('')
    setSaveError('')
    const existingDraft = drafts[publisher.id]
    setDrawerBaseline(existingDraft ? cloneDraft(existingDraft) : null)
    setSelectedPublisherId(publisher.id)
  }

  function closeDrawerKeepPending() {
    setSelectedPublisherId(null)
    setDrawerBaseline(null)
  }

  function cancelDrawerChanges() {
    if (selectedPublisherId) {
      setDrafts((current) => {
        const next = { ...current }
        if (drawerBaseline) {
          next[selectedPublisherId] = cloneDraft(drawerBaseline)
        } else {
          delete next[selectedPublisherId]
        }
        return next
      })
    }
    setSelectedPublisherId(null)
    setDrawerBaseline(null)
  }

  function updateDraft(publisherId: string, updater: (prev: PublisherDraft) => PublisherDraft) {
    const basePublisher = publishers.find((item) => item.id === publisherId)
    if (!basePublisher) return
    setBannerMessage('')
    setSaveError('')
    setDrafts((current) => {
      const prev = current[publisherId] ? cloneDraft(current[publisherId]!) : draftFromPublisher(basePublisher)
      const updated = updater(prev)
      if (countPublisherChanges(basePublisher, updated) === 0) {
        const cleaned = { ...current }
        delete cleaned[publisherId]
        return cleaned
      }
      return {
        ...current,
        [publisherId]: updated,
      }
    })
  }

  function togglePublisherFunction(publisherId: string, key: FunctionKey) {
    updateDraft(publisherId, (prev) => {
      if (!isFunctionAllowedForGender(prev.gender, key)) return prev
      if (key === 'needsElderlySupport') {
        return { ...prev, needsElderlySupport: !prev.needsElderlySupport }
      }
      if (key === 'driver') {
        return { ...prev, driver: !prev.driver }
      }
      const nextDuties = prev.duties.includes(key)
        ? prev.duties.filter((item) => item !== key)
        : [...prev.duties, key]
      return { ...prev, duties: nextDuties }
    })
  }

  async function handleSaveAll(closeAfterSave = false) {
    if (dirtyEntries.length === 0 || saving) return

    for (const entry of dirtyEntries) {
      if (!entry.draft.name.trim()) {
        setSaveError('O nome do publicador não pode ficar em branco.')
        setSelectedPublisherId(entry.publisher.id)
        setDrawerTab('dados')
        return
      }
    }

    setSaving(true)
    setSaveError('')
    setBannerMessage('')

    try {
      const personalEntries = dirtyEntries.filter((e) => hasPersonalDiff(e.publisher, e.draft))
      const nonPersonalEntries = dirtyEntries.filter((e) => !hasPersonalDiff(e.publisher, e.draft))

      const qualificationPatches: QualificationPatch[] = nonPersonalEntries
        .filter((e) => hasQualificationDiff(e.publisher, e.draft))
        .map((e) => ({
          publisherId: e.publisher.id,
          duties: e.draft.duties,
          needsElderlySupport: e.draft.needsElderlySupport,
          driver: e.draft.driver,
        }))

      const movesByTargetGroup = new Map<string | null, string[]>()
      for (const entry of nonPersonalEntries) {
        if (hasGroupDiff(entry.publisher, entry.draft)) {
          const target = entry.draft.groupId ?? null
          const bucket = movesByTargetGroup.get(target) ?? []
          bucket.push(entry.publisher.id)
          movesByTargetGroup.set(target, bucket)
        }
      }

      const savedChangesCount = totalPendingChanges
      const savedPublishersCount = dirtyEntries.length

      if (qualificationPatches.length > 0) {
        await bulkUpdateQualifications(qualificationPatches)
      }

      for (const [targetGroupId, ids] of movesByTargetGroup.entries()) {
        await bulkMovePublishers(ids, targetGroupId)
      }

      for (const entry of personalEntries) {
        await updatePublisher(entry.publisher.id, {
          name: entry.draft.name.trim(),
          phone: entry.draft.phone.trim(),
          gender: entry.draft.gender,
          age: entry.draft.age,
          privilege: entry.draft.privilege,
          pioneer: entry.draft.pioneer,
          status: entry.draft.status,
          groupId: entry.draft.groupId,
          duties: entry.draft.duties,
          needsElderlySupport: entry.draft.needsElderlySupport,
          driver: entry.draft.driver,
        })
      }

      setDrafts({})
      setDrawerBaseline(null)
      if (closeAfterSave) {
        setSelectedPublisherId(null)
      }
      setBannerMessage(
        `${savedChangesCount} ${savedChangesCount === 1 ? 'alteração salva' : 'alterações salvas'} em ${savedPublishersCount} ${savedPublishersCount === 1 ? 'publicador' : 'publicadores'}.`,
      )
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'Não foi possível salvar as alterações no servidor.',
      )
    } finally {
      setSaving(false)
    }
  }

  const selectedBasePublisher = useMemo(
    () => (selectedPublisherId ? publishers.find((p) => p.id === selectedPublisherId) ?? null : null),
    [publishers, selectedPublisherId],
  )

  const selectedEffectivePublisher = selectedBasePublisher
    ? effectiveOf(selectedBasePublisher)
    : null

  return (
    <div className="px-3.5 py-4 pb-16 sm:px-6 sm:py-6 lg:px-8">
      {/* 1. Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3 sm:gap-3.5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-indigo text-white shadow-[0_6px_16px_rgba(79,70,229,0.22)] sm:h-12 sm:w-12">
            <Users size={20} className="sm:h-[22px] sm:w-[22px]" />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-[26px]">
              Funções e habilitações
            </h1>
            <p className="mt-0.5 text-sm text-muted">
              Gerencie as funções e responsabilidades dos publicadores.
            </p>
          </div>
        </div>

        {totalPendingChanges > 0 ? (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setDrafts({})
                setDrawerBaseline(null)
                setSaveError('')
              }}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-white px-3.5 text-sm font-medium text-muted hover:text-ink disabled:opacity-50"
            >
              <RotateCcw size={15} />
              Descartar
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSaveAll(false)}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo px-4 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(79,70,229,0.28)] tabular-nums disabled:opacity-50"
            >
              <CheckSquare size={16} />
              {saving ? 'Salvando…' : `Salvar alterações (${totalPendingChanges})`}
            </button>
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-[#FECDD3] bg-[#FDE8EF] px-4 py-2.5 text-sm text-[#9F1239]">
          {error}
        </p>
      ) : null}
      {saveError ? (
        <p className="mt-4 rounded-xl border border-[#FECDD3] bg-[#FDE8EF] px-4 py-2.5 text-sm text-[#9F1239]">
          {saveError}
        </p>
      ) : null}
      {bannerMessage ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-2.5 text-sm text-[#047857]">
          <span className="inline-flex items-center gap-2 font-medium">
            <CheckCircle2 size={16} />
            {bannerMessage}
          </span>
          <button
            type="button"
            onClick={() => setBannerMessage('')}
            className="text-xs font-semibold underline"
          >
            Fechar
          </button>
        </div>
      ) : null}

      {/* 2. Indicadores (Cards horizontais) */}
      <div className="mt-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          label="Total de publicadores"
          value={stats.total}
          icon={Users}
          iconBoxClass="bg-indigo-soft text-indigo"
          valueClass="text-ink"
          active={activeTab === 'publicadores' && functionFilter === ''}
          onClick={() => {
            setActiveTab('publicadores')
            setFunctionFilter('')
            setPage(1)
          }}
        />
        <KpiCard
          label="Estudantes"
          value={stats.estudantes}
          icon={GraduationCap}
          iconBoxClass="bg-[#ECFDF5] text-[#047857]"
          valueClass="text-[#047857]"
          active={activeTab === 'publicadores' && functionFilter === 'estudante'}
          onClick={() => {
            setActiveTab('publicadores')
            setFunctionFilter((curr) => (curr === 'estudante' ? '' : 'estudante'))
            setPage(1)
          }}
        />
        <KpiCard
          label="Indicadores"
          value={stats.indicadores}
          icon={UserCheck}
          iconBoxClass="bg-[#EFF6FF] text-[#1D4ED8]"
          valueClass="text-[#1D4ED8]"
          active={activeTab === 'publicadores' && functionFilter === 'indicador'}
          onClick={() => {
            setActiveTab('publicadores')
            setFunctionFilter((curr) => (curr === 'indicador' ? '' : 'indicador'))
            setPage(1)
          }}
        />
        <KpiCard
          label="Áudio"
          value={stats.audio}
          icon={Volume2}
          iconBoxClass="bg-[#F5F3FF] text-[#6D28D9]"
          valueClass="text-[#6D28D9]"
          active={activeTab === 'publicadores' && functionFilter === 'audio'}
          onClick={() => {
            setActiveTab('publicadores')
            setFunctionFilter((curr) => (curr === 'audio' ? '' : 'audio'))
            setPage(1)
          }}
        />
        <KpiCard
          label="Motoristas"
          value={stats.motoristas}
          icon={Car}
          iconBoxClass="bg-[#FEF3E2] text-[#B45309]"
          valueClass="text-[#B45309]"
          active={activeTab === 'publicadores' && functionFilter === 'driver'}
          onClick={() => {
            setActiveTab('publicadores')
            setFunctionFilter((curr) => (curr === 'driver' ? '' : 'driver'))
            setPage(1)
          }}
        />
      </div>

      {/* 3. Navegação em Abas */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Visualizações de funções e habilitações"
          className="no-scrollbar inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl border border-line bg-white p-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
        >
          <TabButton
            active={activeTab === 'publicadores'}
            icon={Users}
            label="Publicadores"
            onClick={() => setActiveTab('publicadores')}
          />
          <TabButton
            active={activeTab === 'grupos'}
            icon={LayoutGrid}
            label="Grupos"
            onClick={() => setActiveTab('grupos')}
          />
          <TabButton
            active={activeTab === 'funcoes'}
            icon={Star}
            label="Funções"
            onClick={() => setActiveTab('funcoes')}
          />
        </div>
      </div>

      {/* Área principal + Drawer lateral à direita */}
      <div
        className={`mt-4 grid grid-cols-1 items-start gap-5 ${
          selectedEffectivePublisher ? 'min-[1360px]:grid-cols-[minmax(0,1fr)_390px]' : ''
        }`}
      >
        <div className="min-w-0">
          {activeTab === 'publicadores' ? (
            <PublishersTabView
              publishers={paginatedPublishers}
              totalFiltered={filteredPublishers.length}
              rangeFrom={rangeFrom}
              rangeTo={rangeTo}
              currentPage={currentPage}
              totalPages={totalPages}
              groups={groups}
              dirtyPublisherIds={dirtyPublisherIds}
              selectedPublisherId={selectedPublisherId}
              search={search}
              groupIdFilter={groupIdFilter}
              privilegeFilter={privilegeFilter}
              genderFilter={genderFilter}
              functionFilter={functionFilter}
              hasActiveFilters={hasActiveFilters}
              onSearchChange={(val) => {
                setSearch(val)
                setPage(1)
              }}
              onGroupFilterChange={(val) => {
                setGroupIdFilter(val)
                setPage(1)
              }}
              onPrivilegeFilterChange={(val) => {
                setPrivilegeFilter(val)
                setPage(1)
              }}
              onGenderFilterChange={(val) => {
                setGenderFilter(val)
                if (val === 'feminino') {
                  if (
                    privilegeFilter === 'circuitOverseer' ||
                    privilegeFilter === 'elder' ||
                    privilegeFilter === 'ministerialServant'
                  ) {
                    setPrivilegeFilter('')
                  }
                  if (
                    functionFilter &&
                    functionFilter !== 'none' &&
                    !isFunctionAllowedForGender('feminino', functionFilter)
                  ) {
                    setFunctionFilter('')
                  }
                }
                setPage(1)
              }}
              onFunctionFilterChange={(val) => {
                setFunctionFilter(val)
                setPage(1)
              }}
              onClearFilters={clearFilters}
              onPageChange={setPage}
              onSelectPublisher={openDrawerFor}
            />
          ) : null}

          {activeTab === 'grupos' ? (
            <GroupsTabView
              groups={groups}
              publishers={effectivePublishers}
              dirtyPublisherIds={dirtyPublisherIds}
              selectedGroupId={selectedGroupViewId}
              selectedPublisherId={selectedPublisherId}
              onSelectGroup={setSelectedGroupViewId}
              onOpenInPublishersTab={(targetGroupId) => {
                setGroupIdFilter(targetGroupId)
                setPage(1)
                setActiveTab('publicadores')
              }}
              onSelectPublisher={openDrawerFor}
            />
          ) : null}

          {activeTab === 'funcoes' ? (
            <FunctionsTabView
              publishers={effectivePublishers}
              groups={groups}
              dirtyPublisherIds={dirtyPublisherIds}
              selectedFunctionKey={selectedFunctionKey}
              search={functionViewSearch}
              groupIdFilter={functionViewGroupId}
              selectedPublisherId={selectedPublisherId}
              onSelectFunction={setSelectedFunctionKey}
              onSearchChange={setFunctionViewSearch}
              onGroupFilterChange={setFunctionViewGroupId}
              onSelectPublisher={openDrawerFor}
            />
          ) : null}
        </div>

        {/* 5. Painel lateral de edição (Desktop inline + Slide-over em telas menores) */}
        {selectedEffectivePublisher && selectedBasePublisher ? (
          <>
            <div
              className="fixed inset-0 z-30 bg-[#0B0E14]/30 backdrop-blur-[1px] min-[1360px]:hidden"
              onClick={closeDrawerKeepPending}
            />
            <aside
              aria-label={`Editar ${selectedEffectivePublisher.name}`}
              className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[400px] flex-col border-l border-line bg-white shadow-2xl min-[1360px]:sticky min-[1360px]:top-6 min-[1360px]:z-10 min-[1360px]:max-h-[calc(100vh-3rem)] min-[1360px]:max-w-none min-[1360px]:rounded-2xl min-[1360px]:border min-[1360px]:shadow-[0_4px_20px_rgba(15,23,42,0.05)]"
            >
              <PublisherEditDrawer
                basePublisher={selectedBasePublisher}
                publisher={selectedEffectivePublisher}
                groups={groups}
                allPublishers={effectivePublishers}
                drawerTab={drawerTab}
                saving={saving}
                totalPendingChanges={totalPendingChanges}
                onTabChange={setDrawerTab}
                onClose={closeDrawerKeepPending}
                onCancel={cancelDrawerChanges}
                onSave={() => void handleSaveAll(true)}
                onToggleFunction={(key) => togglePublisherFunction(selectedBasePublisher.id, key)}
                onUpdateDraft={(updater) => updateDraft(selectedBasePublisher.id, updater)}
              />
            </aside>
          </>
        ) : null}
      </div>
    </div>
  )
}

function KpiCard({
  label,
  value,
  icon: Icon,
  iconBoxClass,
  valueClass,
  active,
  onClick,
}: {
  label: string
  value: number
  icon: ComponentType<{ size?: number; className?: string }>
  iconBoxClass: string
  valueClass: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3.5 rounded-2xl border bg-white p-4 text-left transition ${
        active
          ? 'border-indigo ring-2 ring-indigo/15'
          : 'border-line shadow-[0_1px_2px_rgba(15,23,42,0.03)] hover:border-[#C7D2FE]'
      }`}
    >
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${iconBoxClass}`}>
        <Icon size={20} />
      </span>
      <span className="min-w-0">
        <span className={`block text-2xl font-bold leading-tight tabular-nums ${valueClass}`}>
          {value}
        </span>
        <span className="mt-0.5 block truncate text-xs font-medium text-muted">{label}</span>
      </span>
    </button>
  )
}

function TabButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean
  icon: ComponentType<{ size?: number; className?: string }>
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
        active
          ? 'bg-indigo text-white shadow-sm'
          : 'text-muted hover:bg-[#F8FAFC] hover:text-ink'
      }`}
    >
      <Icon size={16} />
      {label}
    </button>
  )
}

function PublishersTabView({
  publishers,
  totalFiltered,
  rangeFrom,
  rangeTo,
  currentPage,
  totalPages,
  groups,
  dirtyPublisherIds,
  selectedPublisherId,
  search,
  groupIdFilter,
  privilegeFilter,
  genderFilter,
  functionFilter,
  hasActiveFilters,
  onSearchChange,
  onGroupFilterChange,
  onPrivilegeFilterChange,
  onGenderFilterChange,
  onFunctionFilterChange,
  onClearFilters,
  onPageChange,
  onSelectPublisher,
}: {
  publishers: MockPublisher[]
  totalFiltered: number
  rangeFrom: number
  rangeTo: number
  currentPage: number
  totalPages: number
  groups: MockGroup[]
  dirtyPublisherIds: Set<string>
  selectedPublisherId: string | null
  search: string
  groupIdFilter: string
  privilegeFilter: string
  genderFilter: string
  functionFilter: FunctionFilter
  hasActiveFilters: boolean
  onSearchChange: (val: string) => void
  onGroupFilterChange: (val: string) => void
  onPrivilegeFilterChange: (val: string) => void
  onGenderFilterChange: (val: string) => void
  onFunctionFilterChange: (val: FunctionFilter) => void
  onClearFilters: () => void
  onPageChange: (page: number) => void
  onSelectPublisher: (publisher: MockPublisher) => void
}) {
  const pageItems = useMemo(
    () => buildPaginationItems(currentPage, totalPages),
    [currentPage, totalPages],
  )

  return (
    <section className="rounded-2xl border border-line bg-white shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
      {/* Barra de busca e filtros */}
      <div className="flex flex-wrap items-center gap-2.5 p-4">
        <label className="relative min-w-52 flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar por nome..."
            aria-label="Buscar por nome"
            className="h-10 w-full rounded-xl border border-line bg-[#F8FAFC] pl-9 pr-3 text-sm outline-none placeholder:text-[#94A3B8] focus:border-indigo focus:bg-white"
          />
        </label>

        <select
          value={groupIdFilter}
          aria-label="Filtrar por grupo"
          onChange={(event) => onGroupFilterChange(event.target.value)}
          className="h-10 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-indigo"
        >
          <option value="">Todos os grupos</option>
          <option value="none">Sem grupo</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>

        <select
          value={privilegeFilter}
          aria-label="Filtrar por privilégio"
          onChange={(event) => onPrivilegeFilterChange(event.target.value)}
          className="h-10 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-indigo"
        >
          <option value="">Todos os privilégios</option>
          {genderFilter !== 'feminino' ? (
            <>
              <option value="circuitOverseer">Superintendente de Circuito</option>
              <option value="elder">Ancião</option>
              <option value="ministerialServant">Servo ministerial</option>
            </>
          ) : null}
          <option value="special">
            {genderFilter === 'feminino' ? 'Pioneira especial' : 'Pioneiro especial'}
          </option>
          <option value="regular">
            {genderFilter === 'feminino' ? 'Pioneira regular' : 'Pioneiro regular'}
          </option>
          <option value="auxiliary">
            {genderFilter === 'feminino' ? 'Pioneira auxiliar' : 'Pioneiro auxiliar'}
          </option>
          <option value="publisher">
            {genderFilter === 'feminino' ? 'Publicadora' : 'Publicador'}
          </option>
        </select>

        <select
          value={genderFilter}
          aria-label="Filtrar por gênero"
          onChange={(event) => onGenderFilterChange(event.target.value)}
          className="h-10 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-indigo"
        >
          <option value="">Todos os gêneros</option>
          <option value="feminino">Feminino</option>
          <option value="masculino">Masculino</option>
        </select>

        <select
          value={functionFilter}
          aria-label="Filtrar por função"
          onChange={(event) => onFunctionFilterChange(event.target.value as FunctionFilter)}
          className="h-10 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-indigo"
        >
          <option value="">Todas as funções</option>
          {FUNCTIONS_META.filter(
            (fn) => genderFilter !== 'feminino' || isFunctionAllowedForGender('feminino', fn.key),
          ).map((fn) => (
            <option key={fn.key} value={fn.key}>
              {fn.label}
            </option>
          ))}
          <option value="none">Sem funções</option>
        </select>

        <button
          type="button"
          disabled={!hasActiveFilters}
          onClick={onClearFilters}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-line bg-white px-3 text-xs font-medium text-muted hover:text-ink disabled:pointer-events-none disabled:opacity-45"
        >
          <RotateCcw size={14} />
          Limpar filtros
        </button>
      </div>

      {/* Mobile card list (< md) */}
      <div className="divide-y divide-line border-t border-line md:hidden">
        {publishers.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">
            Nenhum publicador encontrado para os filtros selecionados.
          </p>
        ) : (
          publishers.map((publisher) => {
            const group = groups.find((item) => item.id === publisher.groupId)
            const tone = group ? groupTones[group.tone] : null
            const functions = enabledFunctionsOf(publisher)
            const isSelected = selectedPublisherId === publisher.id
            const isDirty = dirtyPublisherIds.has(publisher.id)

            return (
              <div
                key={publisher.id}
                onClick={() => onSelectPublisher(publisher)}
                className={`cursor-pointer space-y-2.5 p-4 transition-colors ${
                  isDirty ? 'shadow-[inset_3px_0_0_var(--color-indigo)]' : ''
                } ${
                  isSelected
                    ? 'bg-indigo-soft/45'
                    : isDirty
                      ? 'bg-indigo-soft/20 active:bg-[#F8FAFC]'
                      : 'active:bg-[#F8FAFC]'
                }`}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-indigo-soft text-xs font-semibold text-indigo">
                      {initials(publisher.name)}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium text-ink">{publisher.name}</span>
                        {publisher.status === 'inactive' ? (
                          <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-medium text-muted">
                            Inativo
                          </span>
                        ) : null}
                        {isDirty ? (
                          <span
                            title="Alterações pendentes"
                            className="h-2 w-2 shrink-0 rounded-full bg-[#F59E0B]"
                          />
                        ) : null}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {group && tone ? (
                          <span
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap"
                            style={{ background: tone.chip, color: tone.text }}
                          >
                            {group.name}
                          </span>
                        ) : publisher.privilege === 'circuitOverseer' ? (
                          <span className="inline-flex items-center rounded-full border border-[#FDE68A] bg-[#FEF3C7] px-2 py-0.5 text-[11px] font-semibold text-[#92400E]">
                            Circuito (Especial)
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted">Sem grupo</span>
                        )}
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${privilegeBadgeClass(publisher)}`}
                        >
                          {privilegeLabel(publisher)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      onSelectPublisher(publisher)
                    }}
                    className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-medium transition ${
                      isSelected
                        ? 'border-indigo bg-indigo text-white'
                        : 'border-line bg-white text-[#334155]'
                    }`}
                  >
                    <Pencil size={13} />
                    Editar
                  </button>
                </div>
                <div className="pl-12">
                  <FunctionsSummaryBadge functions={functions} />
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Tabela de publicadores (md+) */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            <tr className="border-t border-line bg-[#F8FAFC]">
              <th className="px-4 py-3">Publicador</th>
              <th className="px-3 py-3">Grupo</th>
              <th className="px-3 py-3">Privilégio</th>
              <th className="px-3 py-3">Funções</th>
              <th className="w-28 px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {publishers.length === 0 ? (
              <tr className="border-t border-line">
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted">
                  Nenhum publicador encontrado para os filtros selecionados.
                </td>
              </tr>
            ) : (
              publishers.map((publisher) => {
                const group = groups.find((item) => item.id === publisher.groupId)
                const tone = group ? groupTones[group.tone] : null
                const functions = enabledFunctionsOf(publisher)
                const isSelected = selectedPublisherId === publisher.id
                const isDirty = dirtyPublisherIds.has(publisher.id)

                return (
                  <tr
                    key={publisher.id}
                    onClick={() => onSelectPublisher(publisher)}
                    className={`cursor-pointer border-t border-line transition-colors ${
                      isSelected
                        ? 'bg-indigo-soft/45'
                        : isDirty
                          ? 'bg-indigo-soft/20 hover:bg-[#F8FAFC]'
                          : 'hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <td
                      className={`px-4 py-3.5 ${
                        isDirty ? 'shadow-[inset_3px_0_0_var(--color-indigo)]' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-indigo-soft text-xs font-semibold text-indigo">
                          {initials(publisher.name)}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium text-ink">{publisher.name}</span>
                            {publisher.status === 'inactive' ? (
                              <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-medium text-muted">
                                Inativo
                              </span>
                            ) : null}
                            {isDirty ? (
                              <span
                                title="Alterações pendentes"
                                className="h-2 w-2 shrink-0 rounded-full bg-[#F59E0B]"
                              />
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-3.5">
                      {group && tone ? (
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap"
                          style={{ background: tone.chip, color: tone.text }}
                        >
                          {group.name}
                        </span>
                      ) : publisher.privilege === 'circuitOverseer' ? (
                        <span className="inline-flex items-center rounded-full border border-[#FDE68A] bg-[#FEF3C7] px-2.5 py-1 text-xs font-semibold text-[#92400E]">
                          Circuito (Especial)
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-[#F1F5F9] px-2.5 py-1 text-xs font-medium text-muted">
                          Sem grupo
                        </span>
                      )}
                    </td>

                    <td className="px-3 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap ${privilegeBadgeClass(publisher)}`}
                      >
                        {privilegeLabel(publisher)}
                      </span>
                    </td>

                    <td className="px-3 py-3.5">
                      <FunctionsSummaryBadge functions={functions} />
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          onSelectPublisher(publisher)
                        }}
                        className={`inline-flex h-8 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition ${
                          isSelected
                            ? 'border-indigo bg-indigo text-white'
                            : 'border-line bg-white text-[#334155] hover:border-[#C7D2FE] hover:text-indigo'
                        }`}
                      >
                        <Pencil size={13} />
                        Editar
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Rodapé de paginação */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3.5 text-xs text-muted">
        <span className="tabular-nums">
          {totalFiltered === 0
            ? '0 publicadores'
            : `${rangeFrom}–${rangeTo} de ${totalFiltered} ${totalFiltered === 1 ? 'publicador' : 'publicadores'}`}
        </span>

        {totalPages > 1 ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
              aria-label="Página anterior"
              className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-white text-muted hover:text-ink disabled:pointer-events-none disabled:opacity-40"
            >
              <ChevronLeft size={15} />
            </button>

            {pageItems.map((item, idx) =>
              item === 'ellipsis' ? (
                <span key={`ellipsis-${idx}`} className="px-1.5 text-muted">
                  …
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => onPageChange(item)}
                  className={`h-8 min-w-8 rounded-lg px-2 text-xs font-semibold tabular-nums transition ${
                    currentPage === item
                      ? 'bg-indigo text-white shadow-sm'
                      : 'border border-line bg-white text-[#475569] hover:text-ink'
                  }`}
                >
                  {item}
                </button>
              ),
            )}

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              aria-label="Próxima página"
              className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-white text-muted hover:text-ink disabled:pointer-events-none disabled:opacity-40"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        ) : null}
      </div>
    </section>
  )
}

function GroupsTabView({
  groups,
  publishers,
  dirtyPublisherIds,
  selectedGroupId,
  selectedPublisherId,
  onSelectGroup,
  onOpenInPublishersTab,
  onSelectPublisher,
}: {
  groups: MockGroup[]
  publishers: MockPublisher[]
  dirtyPublisherIds: Set<string>
  selectedGroupId: string | null
  selectedPublisherId: string | null
  onSelectGroup: (groupId: string | null) => void
  onOpenInPublishersTab: (groupId: string) => void
  onSelectPublisher: (publisher: MockPublisher) => void
}) {
  const unassignedMembers = useMemo(
    () => publishers.filter((p) => !p.groupId),
    [publishers],
  )

  if (selectedGroupId) {
    const isUnassigned = selectedGroupId === 'none'
    const group = isUnassigned ? null : groups.find((g) => g.id === selectedGroupId) ?? null
    const tone = group ? groupTones[group.tone] : null
    const members = isUnassigned
      ? unassignedMembers
      : publishers.filter((p) => p.groupId === selectedGroupId)
    const sg = group?.superintendentPublisherId
      ? publishers.find((p) => p.id === group.superintendentPublisherId)
      : undefined
    const assistant = group?.assistantPublisherId
      ? publishers.find((p) => p.id === group.assistantPublisherId)
      : undefined

    return (
      <section className="rounded-2xl border border-line bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onSelectGroup(null)}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-white px-3 text-xs font-medium text-muted hover:text-ink"
            >
              <ArrowLeft size={14} />
              Todos os grupos
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-ink">
                  {isUnassigned ? 'Publicadores sem grupo' : group?.name ?? 'Grupo'}
                </h2>
                {tone ? (
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={{ background: tone.chip, color: tone.text }}
                  >
                    {members.length} {members.length === 1 ? 'integrante' : 'integrantes'}
                  </span>
                ) : null}
              </div>
              {!isUnassigned ? (
                <p className="mt-0.5 text-xs text-muted">
                  SG: <strong className="text-ink">{sg?.name ?? 'Não definido'}</strong> · Ajudante:{' '}
                  <strong className="text-ink">{assistant?.name ?? 'Não definido'}</strong>
                </p>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenInPublishersTab(selectedGroupId)}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-indigo-soft px-3.5 text-xs font-semibold text-indigo"
          >
            Filtrar na aba Publicadores
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Mobile card list (< md) */}
        <div className="mt-4 divide-y divide-line rounded-2xl border border-line md:hidden">
          {members.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">
              Nenhum integrante neste grupo.
            </p>
          ) : (
            members.map((member) => {
              const functions = enabledFunctionsOf(member)
              const isSg = group?.superintendentPublisherId === member.id
              const isAssistant = group?.assistantPublisherId === member.id
              const isSelected = selectedPublisherId === member.id
              const isDirty = dirtyPublisherIds.has(member.id)
              return (
                <div
                  key={member.id}
                  onClick={() => onSelectPublisher(member)}
                  className={`cursor-pointer space-y-2.5 p-3.5 ${
                    isSelected ? 'bg-indigo-soft/45' : 'active:bg-[#F8FAFC]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-indigo-soft text-xs font-semibold text-indigo">
                        {initials(member.name)}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-medium text-ink">{member.name}</span>
                          {isDirty ? (
                            <span className="h-2 w-2 shrink-0 rounded-full bg-[#F59E0B]" title="Alterações pendentes" />
                          ) : null}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {isSg ? (
                            <span className="rounded-full bg-indigo px-2 py-0.5 text-[10px] font-semibold text-white">
                              SG
                            </span>
                          ) : null}
                          {isAssistant ? (
                            <span className="rounded-full bg-indigo-soft px-2 py-0.5 text-[10px] font-semibold text-indigo">
                              Ajudante
                            </span>
                          ) : null}
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${privilegeBadgeClass(member)}`}
                          >
                            {privilegeLabel(member)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        onSelectPublisher(member)
                      }}
                      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xl border border-line bg-white px-2.5 text-xs font-medium text-[#334155]"
                    >
                      <Pencil size={13} />
                      Editar
                    </button>
                  </div>
                  <div className="pl-11">
                    <FunctionsSummaryBadge functions={functions} />
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="mt-4 hidden overflow-x-auto md:block">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              <tr className="bg-[#F8FAFC]">
                <th className="rounded-l-xl px-4 py-2.5">Publicador</th>
                <th className="px-3 py-2.5">Papel / Privilégio</th>
                <th className="px-3 py-2.5">Funções</th>
                <th className="w-28 rounded-r-xl px-4 py-2.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted">
                    Nenhum integrante neste grupo.
                  </td>
                </tr>
              ) : (
                members.map((member) => {
                  const functions = enabledFunctionsOf(member)
                  const isSg = group?.superintendentPublisherId === member.id
                  const isAssistant = group?.assistantPublisherId === member.id
                  const isSelected = selectedPublisherId === member.id
                  const isDirty = dirtyPublisherIds.has(member.id)
                  return (
                    <tr
                      key={member.id}
                      onClick={() => onSelectPublisher(member)}
                      className={`cursor-pointer border-t border-line ${
                        isSelected ? 'bg-indigo-soft/45' : 'hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-indigo-soft text-xs font-semibold text-indigo">
                            {initials(member.name)}
                          </span>
                          <span className="font-medium text-ink">{member.name}</span>
                          {isDirty ? (
                            <span className="h-2 w-2 rounded-full bg-[#F59E0B]" title="Alterações pendentes" />
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {isSg ? (
                            <span className="rounded-full bg-indigo px-2 py-0.5 text-[11px] font-semibold text-white">
                              SG
                            </span>
                          ) : null}
                          {isAssistant ? (
                            <span className="rounded-full bg-indigo-soft px-2 py-0.5 text-[11px] font-semibold text-indigo">
                              Ajudante
                            </span>
                          ) : null}
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${privilegeBadgeClass(member)}`}
                          >
                            {privilegeLabel(member)}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <FunctionsSummaryBadge functions={functions} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            onSelectPublisher(member)
                          }}
                          className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-line bg-white px-3 text-xs font-medium text-[#334155] hover:border-[#C7D2FE] hover:text-indigo"
                        >
                          <Pencil size={13} />
                          Editar
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {groups.map((group) => {
        const tone = groupTones[group.tone]
        const members = publishers.filter((p) => p.groupId === group.id)
        const sg = group.superintendentPublisherId
          ? publishers.find((p) => p.id === group.superintendentPublisherId)
          : undefined
        const assistant = group.assistantPublisherId
          ? publishers.find((p) => p.id === group.assistantPublisherId)
          : undefined

        const groupEstudantes = members.filter((m) => m.duties.includes('estudante')).length
        const groupIndicadores = members.filter((m) => m.duties.includes('indicador')).length
        const groupAudio = members.filter((m) => m.duties.includes('audio')).length
        const groupDrivers = members.filter((m) => m.driver).length

        return (
          <article
            key={group.id}
            className="flex flex-col justify-between rounded-2xl border border-line bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] transition hover:border-[#C7D2FE]"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-bold"
                    style={{ background: tone.chip, color: tone.text }}
                  >
                    {initials(group.name)}
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-ink">{group.name}</h3>
                    <span className="text-xs text-muted tabular-nums">
                      {members.length} {members.length === 1 ? 'integrante' : 'integrantes'}
                    </span>
                  </div>
                </div>
                <span
                  className="rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums"
                  style={{ background: tone.chip, color: tone.text }}
                >
                  {members.length}
                </span>
              </div>

              <div className="mt-4 space-y-2 rounded-xl bg-[#F8FAFC] p-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted">Superintendente (SG)</span>
                  <span className="truncate font-semibold text-ink">
                    {sg?.name ?? 'Não definido'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted">Ajudante</span>
                  <span className="truncate font-semibold text-ink">
                    {assistant?.name ?? 'Não definido'}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="rounded-full border border-[#A7F3D0] bg-[#ECFDF5] px-2 py-0.5 text-[11px] font-medium text-[#047857] tabular-nums">
                  {groupEstudantes} estudantes
                </span>
                <span className="rounded-full border border-[#BFDBFE] bg-[#EFF6FF] px-2 py-0.5 text-[11px] font-medium text-[#1D4ED8] tabular-nums">
                  {groupIndicadores} indicadores
                </span>
                <span className="rounded-full border border-[#DDD6FE] bg-[#F5F3FF] px-2 py-0.5 text-[11px] font-medium text-[#6D28D9] tabular-nums">
                  {groupAudio} áudio
                </span>
                <span className="rounded-full border border-[#F3D7B0] bg-[#FEF3E2] px-2 py-0.5 text-[11px] font-medium text-[#B45309] tabular-nums">
                  {groupDrivers} motoristas
                </span>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 border-t border-line pt-3.5">
              <button
                type="button"
                onClick={() => onSelectGroup(group.id)}
                className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-soft px-3 text-xs font-semibold text-indigo"
              >
                <Users size={14} />
                Ver publicadores do grupo
              </button>
              <button
                type="button"
                title="Filtrar na tabela de publicadores"
                onClick={() => onOpenInPublishersTab(group.id)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line bg-white text-muted hover:text-ink"
              >
                <ArrowRight size={15} />
              </button>
            </div>
          </article>
        )
      })}

      {unassignedMembers.length > 0 ? (
        <article className="flex flex-col justify-between rounded-2xl border border-dashed border-line bg-white p-5">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-ink">Sem grupo</h3>
                <p className="mt-0.5 text-xs text-muted">
                  Publicadores ainda não vinculados a um grupo de campo.
                </p>
              </div>
              <span className="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-xs font-semibold text-[#475569] tabular-nums">
                {unassignedMembers.length}
              </span>
            </div>
          </div>
          <div className="mt-4 border-t border-line pt-3.5">
            <button
              type="button"
              onClick={() => onSelectGroup('none')}
              className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-line bg-[#F8FAFC] px-3 text-xs font-semibold text-ink"
            >
              Ver publicadores sem grupo
            </button>
          </div>
        </article>
      ) : null}
    </div>
  )
}

function FunctionsTabView({
  publishers,
  groups,
  dirtyPublisherIds,
  selectedFunctionKey,
  search,
  groupIdFilter,
  selectedPublisherId,
  onSelectFunction,
  onSearchChange,
  onGroupFilterChange,
  onSelectPublisher,
}: {
  publishers: MockPublisher[]
  groups: MockGroup[]
  dirtyPublisherIds: Set<string>
  selectedFunctionKey: FunctionKey
  search: string
  groupIdFilter: string
  selectedPublisherId: string | null
  onSelectFunction: (key: FunctionKey) => void
  onSearchChange: (val: string) => void
  onGroupFilterChange: (val: string) => void
  onSelectPublisher: (publisher: MockPublisher) => void
}) {
  const activeMeta = FUNCTION_MAP[selectedFunctionKey]
  const ActiveIcon = activeMeta.icon

  const enabledInFunction = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR')
    return publishers.filter((publisher) => {
      if (!hasFunctionEnabled(publisher, selectedFunctionKey)) return false
      if (query && !publisher.name.toLocaleLowerCase('pt-BR').includes(query)) return false
      if (groupIdFilter === 'none' && publisher.groupId) return false
      if (groupIdFilter && groupIdFilter !== 'none' && publisher.groupId !== groupIdFilter) return false
      return true
    })
  }, [publishers, selectedFunctionKey, search, groupIdFilter])

  return (
    <div className="space-y-4">
      {/* Seletor de funções */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {FUNCTIONS_META.map((meta) => {
          const Icon = meta.icon
          const count = publishers.filter((p) => hasFunctionEnabled(p, meta.key)).length
          const isSelected = selectedFunctionKey === meta.key
          return (
            <button
              key={meta.key}
              type="button"
              onClick={() => onSelectFunction(meta.key)}
              className={`flex flex-col justify-between rounded-2xl border bg-white p-3.5 text-left transition ${
                isSelected
                  ? 'border-indigo ring-2 ring-indigo/15'
                  : 'border-line hover:border-[#C7D2FE]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`grid h-9 w-9 place-items-center rounded-xl ${meta.iconBoxClass}`}>
                  <Icon size={17} />
                </span>
                <span className="text-xl font-bold text-ink tabular-nums">{count}</span>
              </div>
              <div className="mt-3">
                <span className="block text-sm font-semibold text-ink">{meta.label}</span>
                <span className="block truncate text-[11px] text-muted">{meta.category}</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Lista de publicadores habilitados na função selecionada */}
      <section className="rounded-2xl border border-line bg-white shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
          <div className="flex items-center gap-3">
            <span className={`grid h-10 w-10 place-items-center rounded-xl ${activeMeta.iconBoxClass}`}>
              <ActiveIcon size={19} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-ink">{activeMeta.label}</h2>
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold tabular-nums ${activeMeta.badgeClass}`}>
                  {enabledInFunction.length}{' '}
                  {enabledInFunction.length === 1 ? 'habilitado' : 'habilitados'}
                </span>
              </div>
              <p className="text-xs text-muted">{activeMeta.description}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="relative min-w-48">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Buscar habilitado..."
                aria-label="Buscar habilitado"
                className="h-9 w-full rounded-xl border border-line bg-[#F8FAFC] pl-8 pr-3 text-xs outline-none focus:border-indigo focus:bg-white"
              />
            </label>
            <select
              value={groupIdFilter}
              aria-label="Filtrar habilitados por grupo"
              onChange={(event) => onGroupFilterChange(event.target.value)}
              className="h-9 rounded-xl border border-line bg-white px-3 text-xs text-ink outline-none focus:border-indigo"
            >
              <option value="">Todos os grupos</option>
              <option value="none">Sem grupo</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Mobile card list (< md) */}
        <div className="divide-y divide-line border-t border-line md:hidden">
          {enabledInFunction.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted">
              Nenhum publicador habilitado em <strong>{activeMeta.label}</strong> com os filtros atuais.
            </p>
          ) : (
            enabledInFunction.map((publisher) => {
              const group = groups.find((item) => item.id === publisher.groupId)
              const tone = group ? groupTones[group.tone] : null
              const otherFunctions = enabledFunctionsOf(publisher).filter(
                (fn) => fn.key !== selectedFunctionKey,
              )
              const isSelected = selectedPublisherId === publisher.id
              const isDirty = dirtyPublisherIds.has(publisher.id)

              return (
                <div
                  key={publisher.id}
                  onClick={() => onSelectPublisher(publisher)}
                  className={`cursor-pointer space-y-2.5 p-4 ${
                    isSelected ? 'bg-indigo-soft/45' : 'active:bg-[#F8FAFC]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-indigo-soft text-xs font-semibold text-indigo">
                        {initials(publisher.name)}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-medium text-ink">{publisher.name}</span>
                          {isDirty ? (
                            <span className="h-2 w-2 shrink-0 rounded-full bg-[#F59E0B]" title="Alterações pendentes" />
                          ) : null}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {group && tone ? (
                            <span
                              className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium"
                              style={{ background: tone.chip, color: tone.text }}
                            >
                              {group.name}
                            </span>
                          ) : publisher.privilege === 'circuitOverseer' ? (
                            <span className="inline-flex rounded-full border border-[#FDE68A] bg-[#FEF3C7] px-2 py-0.5 text-[11px] font-semibold text-[#92400E]">
                              Circuito (Especial)
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[11px] font-medium text-muted">
                              Sem grupo
                            </span>
                          )}
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${privilegeBadgeClass(publisher)}`}
                          >
                            {privilegeLabel(publisher)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        onSelectPublisher(publisher)
                      }}
                      className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-medium ${
                        isSelected
                          ? 'border-indigo bg-indigo text-white'
                          : 'border-line bg-white text-[#334155]'
                      }`}
                    >
                      <Pencil size={13} />
                      Editar
                    </button>
                  </div>
                  <div className="pl-12">
                    <FunctionsSummaryBadge functions={otherFunctions} />
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              <tr className="bg-[#F8FAFC]">
                <th className="px-4 py-3">Publicador</th>
                <th className="px-3 py-3">Grupo</th>
                <th className="px-3 py-3">Privilégio</th>
                <th className="px-3 py-3">Outras funções</th>
                <th className="w-28 px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {enabledInFunction.length === 0 ? (
                <tr className="border-t border-line">
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted">
                    Nenhum publicador habilitado em <strong>{activeMeta.label}</strong> com os filtros atuais.
                  </td>
                </tr>
              ) : (
                enabledInFunction.map((publisher) => {
                  const group = groups.find((item) => item.id === publisher.groupId)
                  const tone = group ? groupTones[group.tone] : null
                  const otherFunctions = enabledFunctionsOf(publisher).filter(
                    (fn) => fn.key !== selectedFunctionKey,
                  )
                  const isSelected = selectedPublisherId === publisher.id
                  const isDirty = dirtyPublisherIds.has(publisher.id)

                  return (
                    <tr
                      key={publisher.id}
                      onClick={() => onSelectPublisher(publisher)}
                      className={`cursor-pointer border-t border-line ${
                        isSelected ? 'bg-indigo-soft/45' : 'hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-indigo-soft text-xs font-semibold text-indigo">
                            {initials(publisher.name)}
                          </span>
                          <span className="font-medium text-ink">{publisher.name}</span>
                          {isDirty ? (
                            <span className="h-2 w-2 rounded-full bg-[#F59E0B]" title="Alterações pendentes" />
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {group && tone ? (
                          <span
                            className="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
                            style={{ background: tone.chip, color: tone.text }}
                          >
                            {group.name}
                          </span>
                        ) : publisher.privilege === 'circuitOverseer' ? (
                          <span className="inline-flex rounded-full border border-[#FDE68A] bg-[#FEF3C7] px-2.5 py-1 text-xs font-semibold text-[#92400E]">
                            Circuito (Especial)
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-[#F1F5F9] px-2.5 py-1 text-xs font-medium text-muted">
                            Sem grupo
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${privilegeBadgeClass(publisher)}`}
                        >
                          {privilegeLabel(publisher)}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <FunctionsSummaryBadge functions={otherFunctions} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            onSelectPublisher(publisher)
                          }}
                          className={`inline-flex h-8 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium ${
                            isSelected
                              ? 'border-indigo bg-indigo text-white'
                              : 'border-line bg-white text-[#334155] hover:border-[#C7D2FE] hover:text-indigo'
                          }`}
                        >
                          <Pencil size={13} />
                          Editar
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function PublisherEditDrawer({
  basePublisher,
  publisher,
  groups,
  allPublishers,
  drawerTab,
  saving,
  totalPendingChanges,
  onTabChange,
  onClose,
  onCancel,
  onSave,
  onToggleFunction,
  onUpdateDraft,
}: {
  basePublisher: MockPublisher
  publisher: MockPublisher
  groups: MockGroup[]
  allPublishers: MockPublisher[]
  drawerTab: DrawerTab
  saving: boolean
  totalPendingChanges: number
  onTabChange: (tab: DrawerTab) => void
  onClose: () => void
  onCancel: () => void
  onSave: () => void
  onToggleFunction: (key: FunctionKey) => void
  onUpdateDraft: (updater: (prev: PublisherDraft) => PublisherDraft) => void
}) {
  const currentGroup = groups.find((item) => item.id === publisher.groupId) ?? null
  const sg = currentGroup?.superintendentPublisherId
    ? allPublishers.find((p) => p.id === currentGroup.superintendentPublisherId)
    : undefined
  const assistant = currentGroup?.assistantPublisherId
    ? allPublishers.find((p) => p.id === currentGroup.assistantPublisherId)
    : undefined

  return (
    <div className="flex h-full max-h-[inherit] flex-col">
      {/* Cabeçalho do Drawer */}
      <div className="flex items-start justify-between gap-3 border-b border-line p-5">
        <div className="flex min-w-0 items-center gap-3.5">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-indigo text-sm font-semibold text-white shadow-sm">
            {initials(publisher.name || basePublisher.name)}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-ink">
              {publisher.name || basePublisher.name}
            </h2>
            <p className="mt-0.5 truncate text-xs text-muted">
              {currentGroup ? currentGroup.name : 'Sem grupo'} • {privilegeLabel(publisher)}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar painel de edição"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-[#F8FAFC] hover:text-ink"
        >
          <X size={17} />
        </button>
      </div>

      {/* Abas internas do Drawer */}
      <div className="px-5 pt-4">
        <div
          role="tablist"
          aria-label="Seções de edição do publicador"
          className="grid grid-cols-3 gap-1 rounded-xl bg-[#F3F5FB] p-1 text-xs font-medium"
        >
          <button
            type="button"
            role="tab"
            aria-selected={drawerTab === 'funcoes'}
            onClick={() => onTabChange('funcoes')}
            className={`rounded-lg py-2 transition ${
              drawerTab === 'funcoes'
                ? 'bg-white font-semibold text-indigo shadow-xs'
                : 'text-muted hover:text-ink'
            }`}
          >
            Funções
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={drawerTab === 'dados'}
            onClick={() => onTabChange('dados')}
            className={`rounded-lg py-2 transition ${
              drawerTab === 'dados'
                ? 'bg-white font-semibold text-indigo shadow-xs'
                : 'text-muted hover:text-ink'
            }`}
          >
            Dados pessoais
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={drawerTab === 'grupo'}
            onClick={() => onTabChange('grupo')}
            className={`rounded-lg py-2 transition ${
              drawerTab === 'grupo'
                ? 'bg-white font-semibold text-indigo shadow-xs'
                : 'text-muted hover:text-ink'
            }`}
          >
            Grupo
          </button>
        </div>
      </div>

      {/* Conteúdo rolável do Drawer */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {drawerTab === 'funcoes' ? (
          <div className="space-y-5">
            {DRAWER_SECTIONS.map((section) => {
              const allowedItems = section.items.filter((key) =>
                isFunctionAllowedForGender(publisher.gender, key),
              )
              if (allowedItems.length === 0) return null
              const sectionTitle =
                publisher.gender === 'feminino' && section.title === 'Apoio e transporte'
                  ? 'Apoio'
                  : section.title
              return (
                <div key={section.title}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                    {sectionTitle}
                  </h3>
                  <div className="mt-2 divide-y divide-line rounded-xl border border-line bg-[#F8FAFC]/60">
                    {allowedItems.map((key) => {
                      const meta = FUNCTION_MAP[key]
                      const Icon = meta.icon
                      const checked = hasFunctionEnabled(publisher, key)
                      const changed = checked !== hasFunctionEnabled(basePublisher, key)
                      return (
                        <div
                          key={key}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            if (!saving) onToggleFunction(key)
                          }}
                          className="flex cursor-pointer select-none items-center justify-between gap-3 px-3.5 py-3"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span
                              className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${meta.iconBoxClass}`}
                            >
                              <Icon size={16} />
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-ink">{meta.label}</span>
                              {changed ? (
                                <span
                                  title="Alterado localmente"
                                  className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]"
                                />
                              ) : null}
                            </div>
                          </div>

                          <ToggleSwitch
                            ariaLabel={`${meta.label} — ${publisher.name}`}
                            checked={checked}
                            disabled={saving}
                            onChange={() => onToggleFunction(key)}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        ) : null}

        {drawerTab === 'dados' ? (
          <div className="space-y-3.5">
            <label className="block">
              <span className="text-xs font-medium text-muted">Nome completo</span>
              <input
                value={publisher.name}
                disabled={saving}
                onChange={(event) =>
                  onUpdateDraft((prev) => ({ ...prev, name: event.target.value }))
                }
                className="mt-1 h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-indigo"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-medium text-muted">Gênero</span>
                <select
                  value={publisher.gender}
                  disabled={saving}
                  onChange={(event) => {
                    const nextGender = event.target.value as MockGender
                    onUpdateDraft((prev) => ({
                      ...prev,
                      gender: nextGender,
                      privilege: nextGender === 'feminino' ? 'publisher' : prev.privilege,
                      duties:
                        nextGender === 'feminino'
                          ? prev.duties.filter((d) => d === 'estudante')
                          : prev.duties,
                      driver: nextGender === 'feminino' ? false : prev.driver,
                    }))
                  }}
                  className="mt-1 h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-indigo"
                >
                  <option value="feminino">Feminino</option>
                  <option value="masculino">Masculino</option>
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-medium text-muted">Idade</span>
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={publisher.age > 0 ? publisher.age : ''}
                  placeholder="—"
                  disabled={saving}
                  onChange={(event) =>
                    onUpdateDraft((prev) => ({
                      ...prev,
                      age: event.target.value ? Math.max(0, Number(event.target.value)) : 0,
                    }))
                  }
                  className="mt-1 h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-indigo"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-xs font-medium text-muted">Telefone</span>
              <input
                value={publisher.phone}
                placeholder="(00) 00000-0000"
                disabled={saving}
                onChange={(event) =>
                  onUpdateDraft((prev) => ({ ...prev, phone: event.target.value }))
                }
                className="mt-1 h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-indigo"
              />
            </label>

            {publisher.gender !== 'feminino' ? (
              <label className="block">
                <span className="text-xs font-medium text-muted">Privilégio / Cargo</span>
                <select
                  value={publisher.privilege}
                  disabled={saving}
                  onChange={(event) => {
                    const nextPrivilege = event.target.value as MockPrivilege
                    onUpdateDraft((prev) => ({
                      ...prev,
                      privilege: nextPrivilege,
                      groupId: nextPrivilege === 'circuitOverseer' ? null : prev.groupId,
                    }))
                  }}
                  className="mt-1 h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-indigo"
                >
                  <option value="publisher">Publicador</option>
                  <option value="ministerialServant">Servo ministerial</option>
                  <option value="elder">Ancião</option>
                  <option value="circuitOverseer">Superintendente de Circuito (Especial)</option>
                </select>
              </label>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-medium text-muted">
                  {publisher.gender === 'feminino'
                    ? 'Pioneira / Tipo especial'
                    : 'Pioneiro / Tipo especial'}
                </span>
                <select
                  value={publisher.pioneer}
                  disabled={saving}
                  onChange={(event) =>
                    onUpdateDraft((prev) => ({
                      ...prev,
                      pioneer: event.target.value as MockPioneer,
                    }))
                  }
                  className="mt-1 h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-indigo"
                >
                  <option value="none">
                    {publisher.gender === 'feminino' ? 'Não é pioneira' : 'Nenhum'}
                  </option>
                  <option value="auxiliary">
                    {publisher.gender === 'feminino' ? 'Pioneira auxiliar' : 'Pioneiro auxiliar'}
                  </option>
                  <option value="regular">
                    {publisher.gender === 'feminino' ? 'Pioneira regular' : 'Pioneiro regular'}
                  </option>
                  <option value="special">
                    {publisher.gender === 'feminino' ? 'Pioneira especial' : 'Pioneiro especial'}
                  </option>
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-medium text-muted">Situação</span>
                <select
                  value={publisher.status}
                  disabled={saving}
                  onChange={(event) =>
                    onUpdateDraft((prev) => ({
                      ...prev,
                      status: event.target.value as MockStatus,
                    }))
                  }
                  className="mt-1 h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-indigo"
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </label>
            </div>
          </div>
        ) : null}

        {drawerTab === 'grupo' ? (
          <div className="space-y-4">
            {currentGroup ? (
              <div className="rounded-xl border border-line bg-[#F8FAFC] p-3.5 text-xs">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                  Grupo selecionado
                </span>
                <p className="mt-1 text-sm font-semibold text-ink">{currentGroup.name}</p>
                <div className="mt-2 space-y-1 text-muted">
                  <p>
                    SG: <strong className="text-ink">{sg?.name ?? 'Não definido'}</strong>
                  </p>
                  <p>
                    Ajudante:{' '}
                    <strong className="text-ink">{assistant?.name ?? 'Não definido'}</strong>
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-line bg-[#F8FAFC] p-3.5 text-xs text-muted">
                Este publicador está atualmente <strong>sem grupo</strong>.
              </div>
            )}

            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-muted">
                Alterar grupo
              </span>
              <div className="mt-2 space-y-1.5">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => onUpdateDraft((prev) => ({ ...prev, groupId: null }))}
                  className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-sm transition ${
                    publisher.groupId === null
                      ? 'border-indigo bg-indigo-soft/50 font-semibold text-indigo'
                      : 'border-line bg-white text-ink hover:border-[#C7D2FE]'
                  }`}
                >
                  <span>Sem grupo</span>
                  {publisher.groupId === null ? (
                    <span className="text-xs font-semibold">Atual</span>
                  ) : null}
                </button>

                {groups.map((group) => {
                  const tone = groupTones[group.tone]
                  const active = publisher.groupId === group.id
                  return (
                    <button
                      key={group.id}
                      type="button"
                      disabled={saving}
                      onClick={() => onUpdateDraft((prev) => ({ ...prev, groupId: group.id }))}
                      className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-sm transition ${
                        active
                          ? 'border-indigo bg-indigo-soft/50 font-semibold text-indigo'
                          : 'border-line bg-white text-ink hover:border-[#C7D2FE]'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: tone.text }}
                        />
                        <span>{group.name}</span>
                      </span>
                      {active ? <span className="text-xs font-semibold">Selecionado</span> : null}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Rodapé do Drawer */}
      <div className="flex items-center gap-2.5 border-t border-line p-4">
        <button
          type="button"
          disabled={saving}
          onClick={onCancel}
          className="h-10 flex-1 rounded-xl border border-line bg-white px-4 text-sm font-medium text-ink hover:bg-[#F8FAFC] disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={totalPendingChanges === 0 || saving}
          onClick={onSave}
          className="h-10 flex-1 rounded-xl bg-indigo px-4 text-sm font-semibold text-white shadow-sm tabular-nums disabled:pointer-events-none disabled:opacity-45"
        >
          {saving
            ? 'Salvando…'
            : totalPendingChanges > 0
              ? `Salvar alterações (${totalPendingChanges})`
              : 'Salvar alterações'}
        </button>
      </div>
    </div>
  )
}

function ToggleSwitch({
  checked,
  disabled = false,
  ariaLabel,
  onChange,
}: {
  checked: boolean
  disabled?: boolean
  ariaLabel?: string
  onChange: (next: boolean) => void
}) {
  return (
    <span
      role="switch"
      tabIndex={disabled ? -1 : 0}
      aria-checked={checked}
      aria-disabled={disabled || undefined}
      aria-label={ariaLabel}
      onMouseDown={(event) => event.preventDefault()}
      onClick={(event) => {
        event.stopPropagation()
        if (!disabled) onChange(!checked)
      }}
      onKeyDown={(event) => {
        if (disabled) return
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault()
          event.stopPropagation()
          onChange(!checked)
        }
      }}
      className={`relative inline-flex h-6 w-11 shrink-0 select-none items-center rounded-full p-0.5 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo/40 ${
        disabled ? 'cursor-not-allowed opacity-45' : 'cursor-pointer'
      } ${checked ? 'bg-indigo' : 'bg-[#D5DDE8]'}`}
    >
      <span
        className={`h-5 w-5 rounded-full bg-[#FFFFFF] shadow-[0_1px_2px_rgba(0,0,0,0.22)] transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </span>
  )
}

function FunctionsSummaryBadge({ functions }: { functions: FunctionMeta[] }) {
  const triggerRef = useRef<HTMLSpanElement>(null)
  const [tooltipPos, setTooltipPos] = useState<{
    top: number
    left: number
    placeBelow: boolean
  } | null>(null)

  useEffect(() => {
    if (!tooltipPos) return
    function close() {
      setTooltipPos(null)
    }
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [tooltipPos])

  if (functions.length === 0) {
    return <span className="text-xs text-muted">—</span>
  }

  const first = functions[0]!
  const extraCount = functions.length - 1
  const summaryLabel = functions.map((fn) => fn.label).join(', ')

  function openTooltip() {
    const el = triggerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const placeBelow = rect.top < 110
    const left = Math.min(
      Math.max(rect.left + rect.width / 2, 130),
      window.innerWidth - 130,
    )
    setTooltipPos({
      top: placeBelow ? rect.bottom + 8 : rect.top - 8,
      left,
      placeBelow,
    })
  }

  return (
    <>
      <span
        ref={triggerRef}
        tabIndex={extraCount > 0 ? 0 : undefined}
        aria-label={summaryLabel}
        onMouseEnter={openTooltip}
        onMouseLeave={() => setTooltipPos(null)}
        onFocus={openTooltip}
        onBlur={() => setTooltipPos(null)}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-indigo/40 ${first.badgeClass}`}
      >
        <span>{first.shortLabel}</span>
        {extraCount > 0 ? (
          <span className="rounded-full bg-black/8 px-1.5 py-px text-[11px] font-semibold tabular-nums">
            +{extraCount}
          </span>
        ) : null}
      </span>

      {tooltipPos
        ? createPortal(
            <div
              role="tooltip"
              style={{
                top: tooltipPos.top,
                left: tooltipPos.left,
                transform: tooltipPos.placeBelow
                  ? 'translate(-50%, 0)'
                  : 'translate(-50%, -100%)',
              }}
              className="pointer-events-none fixed z-50 w-max max-w-64 rounded-xl border border-line bg-white p-2.5 shadow-[0_10px_28px_rgba(15,23,42,0.14)]"
            >
              <p className="mb-1.5 text-[11px] font-semibold text-muted">
                Atribuições ({functions.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {functions.map((fn) => (
                  <span
                    key={fn.key}
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${fn.badgeClass}`}
                  >
                    {fn.label}
                  </span>
                ))}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
