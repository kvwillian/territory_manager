export const PUBLISHERS = "publishers"
export const PUBLISHER_GROUPS = "publisherGroups"
export const PUBLISHERS_FLAG = "publishers"

export type PublisherStatus = "active" | "inactive"

export type PublisherRecord = {
  id: string
  congregationId: string
  name: string
  phone?: string
  email?: string
  groupId?: string
  userId?: string
  status: PublisherStatus
  privilege: string
  pioneer: string
  indicador: boolean
  microfone: boolean
  som: boolean
  estudante: boolean
  volante: boolean
  needsElderlySupport: boolean
  driver: boolean
  gender?: "feminino" | "masculino"
  age?: number
  createdAt: string
  updatedAt: string
}

export type PublisherGroupRecord = {
  id: string
  congregationId: string
  name: string
  superintendentPublisherId: string
  assistantPublisherId?: string
  description?: string
  createdAt: string
  updatedAt: string
}

export type PublisherCaller = {
  uid: string
  role?: string
  congregationId?: string
  manageFlags?: unknown
  accessFlags?: unknown
  supervisedGroupId?: string
}

export class PublisherError extends Error {
  constructor(
    readonly code: "permission-denied" | "invalid-argument" | "not-found",
    message: string,
  ) {
    super(message)
    this.name = "PublisherError"
  }
}

export type UserLink = {
  congregationId?: string
  publisherId?: string
  supervisedGroupId?: string
}

export type PublisherStore = {
  createPublisher(publisher: PublisherRecord): Promise<void>
  savePublisher(publisher: PublisherRecord): Promise<void>
  deletePublisher(id: string): Promise<void>
  getPublisher(id: string): Promise<PublisherRecord | null>
  listPublishers(congregationId: string): Promise<PublisherRecord[]>
  createGroup(group: PublisherGroupRecord): Promise<void>
  saveGroup(group: PublisherGroupRecord): Promise<void>
  deleteGroup(id: string): Promise<void>
  getGroup(id: string): Promise<PublisherGroupRecord | null>
  listGroups(congregationId: string): Promise<PublisherGroupRecord[]>
  getUser(uid: string): Promise<UserLink | null>
  saveUserLink(uid: string, link: UserLink): Promise<void>
  saveBatch?(input: { publishers: PublisherRecord[]; groups: PublisherGroupRecord[] }): Promise<void>
  deleteBatch?(input: {
    publisherIds: string[]
    groupIds: string[]
    updatedGroups: PublisherGroupRecord[]
  }): Promise<void>
}

export type PublisherDeps = {
  store: PublisherStore
  now: () => Date
  newId: () => string
}

export function canManagePublishers(caller: PublisherCaller | null) {
  if (!caller?.congregationId) return false
  if (caller.role === "admin") return true
  return Array.isArray(caller.manageFlags) && caller.manageFlags.includes(PUBLISHERS_FLAG)
}

function assertManager(caller: PublisherCaller | null) {
  if (!canManagePublishers(caller) || !caller?.congregationId) {
    throw new PublisherError("permission-denied", "Você não pode gerenciar os publicadores desta congregação.")
  }
  return caller.congregationId
}

function cleanText(value: unknown, label: string, required = false) {
  if (value == null || value === "") return undefined
  if (typeof value !== "string") throw new PublisherError("invalid-argument", `${label} inválido.`)
  const text = value.trim()
  if (!text) return undefined
  if (text.length > 240) throw new PublisherError("invalid-argument", `${label} é longo demais.`)
  return text
}

function requireName(value: unknown) {
  const name = cleanText(value, "Nome", true)
  if (!name) throw new PublisherError("invalid-argument", "Informe o nome.")
  return name
}

const FEMALE_FIRST_NAMES = new Set([
  "adelina",
  "adriana",
  "agatha",
  "alice",
  "aline",
  "ana",
  "angela",
  "antonia",
  "aparecida",
  "beatriz",
  "bernadete",
  "bianca",
  "bruna",
  "camila",
  "camile",
  "carmem",
  "carmen",
  "claudia",
  "daiana",
  "dalva",
  "daniela",
  "dilela",
  "dirce",
  "divanice",
  "edna",
  "endruine",
  "ester",
  "evelyn",
  "fatima",
  "fernanda",
  "gabrieli",
  "gabriela",
  "giovana",
  "gloria",
  "helena",
  "iracema",
  "isabela",
  "isabely",
  "ivanilde",
  "janete",
  "jennifer",
  "julia",
  "juliete",
  "karen",
  "larissa",
  "lelia",
  "leonice",
  "leticia",
  "lisandrela",
  "lourdes",
  "luciana",
  "luzeni",
  "luzenira",
  "margarida",
  "maria",
  "marina",
  "mariza",
  "marli",
  "marta",
  "melissa",
  "miriam",
  "natalia",
  "nathalina",
  "ondina",
  "patricia",
  "priscila",
  "raquel",
  "rejane",
  "renata",
  "rosana",
  "rosangela",
  "rosemeire",
  "roseli",
  "rute",
  "sara",
  "sheila",
  "silvana",
  "sol",
  "sophia",
  "suelen",
  "sueli",
  "tatiane",
  "terezinha",
  "vanessa",
  "vera",
  "vilani",
  "zeni",
])

const MALE_EXCEPTIONS = new Set([
  "djalma",
  "eliseu",
  "jair",
  "josua",
  "laucy",
  "luca",
])

export function inferPublisherGender(name: string): "feminino" | "masculino" {
  const first = name
    .trim()
    .split(/\s+/)[0]
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z]/g, "")
    .toLowerCase()
  if (!first) return "masculino"
  if (MALE_EXCEPTIONS.has(first)) return "masculino"
  if (FEMALE_FIRST_NAMES.has(first)) return "feminino"
  if (first.endsWith("a")) return "feminino"
  return "masculino"
}

export async function createPublisher(deps: PublisherDeps, caller: PublisherCaller | null, input: Record<string, unknown>) {
  const congregationId = assertManager(caller)
  const now = deps.now().toISOString()
  const publisher: PublisherRecord = {
    id: deps.newId(),
    congregationId,
    name: requireName(input.name),
    status: input.status === "inactive" ? "inactive" : "active",
    privilege: typeof input.privilege === "string" ? input.privilege : "publisher",
    pioneer: typeof input.pioneer === "string" ? input.pioneer : "none",
    indicador: input.indicador === true,
    microfone: input.microfone === true,
    som: input.som === true,
    estudante: input.estudante === true,
    volante: input.volante === true,
    needsElderlySupport: input.needsElderlySupport === true,
    driver: input.driver === true,
    createdAt: now,
    updatedAt: now,
  }
  const phone = cleanText(input.phone, "Telefone")
  const email = cleanText(input.email, "E-mail")
  const userId = cleanText(input.userId, "Conta")
  if (phone) publisher.phone = phone
  if (email) publisher.email = email
  if (userId) publisher.userId = userId
  const gender = input.gender === "feminino" || input.gender === "masculino" ? input.gender : undefined
  if (gender) publisher.gender = gender
  if (typeof input.age === "number" && input.age >= 1 && input.age <= 120) publisher.age = Math.round(input.age)
  if (input.groupId != null) await assertSameCongregationGroup(deps, congregationId, input.groupId)
  if (typeof input.groupId === "string" && input.groupId) publisher.groupId = input.groupId
  await deps.store.createPublisher(publisher)
  return publisher
}

export async function updatePublisher(deps: PublisherDeps, caller: PublisherCaller | null, input: Record<string, unknown>) {
  const congregationId = assertManager(caller)
  const publisher = await requirePublisher(deps, congregationId, input.publisherId)
  if (typeof input.name === "string") publisher.name = requireName(input.name)
  if (input.phone !== undefined) {
    const phone = cleanText(input.phone, "Telefone")
    if (phone) publisher.phone = phone
    else delete publisher.phone
  }
  if (input.email !== undefined) {
    const email = cleanText(input.email, "E-mail")
    if (email) publisher.email = email
    else delete publisher.email
  }
  if (input.status === "active" || input.status === "inactive") publisher.status = input.status
  if (typeof input.privilege === "string") publisher.privilege = input.privilege
  if (typeof input.pioneer === "string") publisher.pioneer = input.pioneer
  if (input.indicador !== undefined) publisher.indicador = input.indicador === true
  if (input.microfone !== undefined) publisher.microfone = input.microfone === true
  if (input.som !== undefined) publisher.som = input.som === true
  if (input.estudante !== undefined) publisher.estudante = input.estudante === true
  if (input.volante !== undefined) publisher.volante = input.volante === true
  if (input.needsElderlySupport !== undefined) publisher.needsElderlySupport = input.needsElderlySupport === true
  if (input.driver !== undefined) publisher.driver = input.driver === true
  if (input.gender === "feminino" || input.gender === "masculino") publisher.gender = input.gender
  if (input.age === null) delete publisher.age
  if (typeof input.age === "number" && input.age >= 1 && input.age <= 120) publisher.age = Math.round(input.age)
  publisher.updatedAt = deps.now().toISOString()
  await deps.store.savePublisher(publisher)
  return publisher
}

export async function listPublishers(deps: PublisherDeps, caller: PublisherCaller | null, input: Record<string, unknown>) {
  const congregationId = caller?.congregationId
  if (!congregationId) throw new PublisherError("permission-denied", "Esta conta não está ligada a uma congregação.")
  const manager = canManagePublishers(caller)
  const supervisedGroupId = !manager && caller?.supervisedGroupId ? caller.supervisedGroupId : undefined
  if (!manager && !supervisedGroupId && !canViewPublishers(caller)) {
    throw new PublisherError("permission-denied", "Você não pode consultar os publicadores desta congregação.")
  }
  let items = await deps.store.listPublishers(congregationId)
  if (supervisedGroupId) items = items.filter((item) => item.groupId === supervisedGroupId)
  if (typeof input.groupId === "string" && input.groupId) {
    if (supervisedGroupId && input.groupId !== supervisedGroupId) {
      throw new PublisherError("permission-denied", "Você só supervisiona o seu grupo.")
    }
    items = items.filter((item) => item.groupId === input.groupId)
  }
  if (input.unassigned === true) items = items.filter((item) => !item.groupId)
  if (input.status === "active" || input.status === "inactive") {
    items = items.filter((item) => item.status === input.status)
  }
  if (typeof input.name === "string" && input.name.trim()) {
    const folded = input.name.trim().toLocaleLowerCase("pt-BR")
    items = items.filter((item) => item.name.toLocaleLowerCase("pt-BR").includes(folded))
  }
  return items.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
}

function canViewPublishers(caller: PublisherCaller | null) {
  return Array.isArray(caller?.accessFlags) && caller.accessFlags.includes(PUBLISHERS_FLAG)
}

export async function createPublisherGroup(deps: PublisherDeps, caller: PublisherCaller | null, input: Record<string, unknown>) {
  const congregationId = assertManager(caller)
  const superintendent = await requirePublisher(deps, congregationId, input.superintendentPublisherId)
  const assistant = input.assistantPublisherId
    ? await requirePublisher(deps, congregationId, input.assistantPublisherId)
    : undefined
  const now = deps.now().toISOString()
  const group: PublisherGroupRecord = {
    id: deps.newId(),
    congregationId,
    name: requireName(input.name),
    superintendentPublisherId: superintendent.id,
    createdAt: now,
    updatedAt: now,
  }
  const description = cleanText(input.description, "Descrição")
  if (description) group.description = description
  if (assistant) group.assistantPublisherId = assistant.id
  await deps.store.createGroup(group)
  await movePublisherToGroup(deps, superintendent, group.id, now)
  if (assistant && assistant.id !== superintendent.id) await movePublisherToGroup(deps, assistant, group.id, now)
  await syncSuperintendentLink(deps, undefined, superintendent, group.id)
  return group
}

export async function updatePublisherGroup(deps: PublisherDeps, caller: PublisherCaller | null, input: Record<string, unknown>) {
  const congregationId = assertManager(caller)
  const group = await requireGroup(deps, congregationId, input.groupId)
  const now = deps.now().toISOString()
  if (typeof input.name === "string") group.name = requireName(input.name)
  if (input.description !== undefined) {
    const description = cleanText(input.description, "Descrição")
    if (description) group.description = description
    else delete group.description
  }
  let previousSuperintendent: PublisherRecord | undefined
  let nextSuperintendent: PublisherRecord | undefined
  if (input.superintendentPublisherId !== undefined) {
    if (input.superintendentPublisherId == null || input.superintendentPublisherId === "") {
      if (group.superintendentPublisherId) {
        previousSuperintendent = (await deps.store.getPublisher(group.superintendentPublisherId)) ?? undefined
      }
      group.superintendentPublisherId = ""
    } else {
      nextSuperintendent = await requirePublisher(deps, congregationId, input.superintendentPublisherId)
      if (group.superintendentPublisherId && group.superintendentPublisherId !== nextSuperintendent.id) {
        previousSuperintendent = (await deps.store.getPublisher(group.superintendentPublisherId)) ?? undefined
      }
      group.superintendentPublisherId = nextSuperintendent.id
    }
  }
  let nextAssistant: PublisherRecord | undefined
  if (input.assistantPublisherId !== undefined) {
    if (input.assistantPublisherId == null || input.assistantPublisherId === "") delete group.assistantPublisherId
    else {
      nextAssistant = await requirePublisher(deps, congregationId, input.assistantPublisherId)
      group.assistantPublisherId = nextAssistant.id
    }
  }
  if (group.assistantPublisherId && group.assistantPublisherId === group.superintendentPublisherId) {
    delete group.assistantPublisherId
  }
  group.updatedAt = now
  await deps.store.saveGroup(group)
  if (nextSuperintendent) {
    await movePublisherToGroup(deps, nextSuperintendent, group.id, now)
    await syncSuperintendentLink(deps, previousSuperintendent, nextSuperintendent, group.id)
  } else if (previousSuperintendent) {
    await clearSupervisedGroup(deps, previousSuperintendent, group.id)
  }
  if (nextAssistant && nextAssistant.id !== group.superintendentPublisherId) {
    await movePublisherToGroup(deps, nextAssistant, group.id, now)
  }
  return group
}

export async function listPublisherGroups(deps: PublisherDeps, caller: PublisherCaller | null) {
  const congregationId = caller?.congregationId
  if (!congregationId) throw new PublisherError("permission-denied", "Esta conta não está ligada a uma congregação.")
  if (!canManagePublishers(caller) && !caller?.supervisedGroupId && !canViewPublishers(caller)) {
    throw new PublisherError("permission-denied", "Você não pode consultar os grupos desta congregação.")
  }
  const groups = await deps.store.listGroups(congregationId)
  if (!canManagePublishers(caller) && caller?.supervisedGroupId) {
    return groups.filter((group) => group.id === caller.supervisedGroupId)
  }
  return groups.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
}

export async function listGroupMembers(deps: PublisherDeps, caller: PublisherCaller | null, input: Record<string, unknown>) {
  const congregationId = caller?.congregationId
  if (!congregationId) throw new PublisherError("permission-denied", "Esta conta não está ligada a uma congregação.")
  const group = await requireGroup(deps, congregationId, input.groupId)
  if (!canManagePublishers(caller) && caller?.supervisedGroupId !== group.id && !canViewPublishers(caller)) {
    throw new PublisherError("permission-denied", "Você só supervisiona o seu grupo.")
  }
  const publishers = await deps.store.listPublishers(congregationId)
  return publishers.filter((item) => item.groupId === group.id).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
}

export async function setGroupSuperintendent(deps: PublisherDeps, caller: PublisherCaller | null, input: Record<string, unknown>) {
  const congregationId = assertManager(caller)
  const group = await requireGroup(deps, congregationId, input.groupId)
  const next = await requirePublisher(deps, congregationId, input.publisherId)
  const previous = await deps.store.getPublisher(group.superintendentPublisherId)
  const now = deps.now().toISOString()
  group.superintendentPublisherId = next.id
  group.updatedAt = now
  await deps.store.saveGroup(group)
  await movePublisherToGroup(deps, next, group.id, now)
  await syncSuperintendentLink(deps, previous ?? undefined, next, group.id)
  return group
}

export async function setPublisherGroup(deps: PublisherDeps, caller: PublisherCaller | null, input: Record<string, unknown>) {
  const congregationId = assertManager(caller)
  const publisher = await requirePublisher(deps, congregationId, input.publisherId)
  const now = deps.now().toISOString()
  if (input.groupId == null || input.groupId === "") {
    await clearGroupRoles(deps, publisher, now)
    delete publisher.groupId
    publisher.updatedAt = now
    await deps.store.savePublisher(publisher)
    return publisher
  }
  const group = await assertSameCongregationGroup(deps, congregationId, input.groupId)
  await movePublisherToGroup(deps, publisher, group.id, now)
  return (await deps.store.getPublisher(publisher.id)) ?? publisher
}

export async function deletePublisherRecord(deps: PublisherDeps, caller: PublisherCaller | null, input: Record<string, unknown>) {
  const congregationId = assertManager(caller)
  const publisher = await requirePublisher(deps, congregationId, input.publisherId)
  const groups = await deps.store.listGroups(congregationId)
  if (groups.some((group) => group.superintendentPublisherId === publisher.id || group.assistantPublisherId === publisher.id)) {
    throw new PublisherError("invalid-argument", "Troque o superintendente ou o ajudante antes de excluir este publicador.")
  }
  await deps.store.deletePublisher(publisher.id)
  return { deleted: true }
}

export async function deletePublisherGroup(deps: PublisherDeps, caller: PublisherCaller | null, input: Record<string, unknown>) {
  const congregationId = assertManager(caller)
  const group = await requireGroup(deps, congregationId, input.groupId)
  const now = deps.now().toISOString()
  const members = (await deps.store.listPublishers(congregationId)).filter((item) => item.groupId === group.id)
  for (const member of members) {
    delete member.groupId
    member.updatedAt = now
    await deps.store.savePublisher(member)
    await clearSupervisedGroup(deps, member, group.id)
  }
  await deps.store.deleteGroup(group.id)
  return { deleted: true, released: members.length }
}

export async function bulkDeletePublishers(
  deps: PublisherDeps,
  caller: PublisherCaller | null,
  input: Record<string, unknown>,
) {
  const congregationId = assertManager(caller)
  const rawIds = Array.isArray(input.publisherIds) ? input.publisherIds : []
  const requestedIds = new Set(
    rawIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0),
  )
  if (requestedIds.size === 0) {
    throw new PublisherError("invalid-argument", "Selecione ao menos um publicador para excluir.")
  }
  const deleteEmptyGroups = input.deleteEmptyGroups !== false
  const now = deps.now().toISOString()

  const allPublishers = await deps.store.listPublishers(congregationId)
  const allGroups = await deps.store.listGroups(congregationId)

  const toDeletePublishers = allPublishers.filter((p) => requestedIds.has(p.id))
  if (toDeletePublishers.length === 0) {
    throw new PublisherError("not-found", "Nenhum dos publicadores selecionados foi encontrado nesta congregação.")
  }
  const deleteIdSet = new Set(toDeletePublishers.map((p) => p.id))
  const remainingPublishers = allPublishers.filter((p) => !deleteIdSet.has(p.id))

  const groupsToDelete = new Set<string>()
  const updatedGroups = new Map<string, PublisherGroupRecord>()

  for (const group of allGroups) {
    const remainingMembers = remainingPublishers.filter((p) => p.groupId === group.id)
    const superintendentDeleted = deleteIdSet.has(group.superintendentPublisherId)
    const assistantDeleted = group.assistantPublisherId ? deleteIdSet.has(group.assistantPublisherId) : false

    if (remainingMembers.length === 0 && deleteEmptyGroups && (superintendentDeleted || assistantDeleted)) {
      groupsToDelete.add(group.id)
      continue
    }

    let changed = false
    if (assistantDeleted) {
      delete group.assistantPublisherId
      changed = true
    }
    if (superintendentDeleted) {
      const replacement =
        (group.assistantPublisherId && !deleteIdSet.has(group.assistantPublisherId)
          ? remainingMembers.find((p) => p.id === group.assistantPublisherId)
          : undefined) ?? remainingMembers[0]
      group.superintendentPublisherId = replacement ? replacement.id : ""
      changed = true
    }
    if (changed) {
      group.updatedAt = now
      updatedGroups.set(group.id, group)
    }
  }

  for (const pub of toDeletePublishers) {
    if (pub.groupId) {
      await clearSupervisedGroup(deps, pub, pub.groupId)
    }
  }

  const publisherIdsToDelete = [...deleteIdSet]
  const groupIdsToDelete = [...groupsToDelete]
  const groupsToUpdateList = [...updatedGroups.values()]

  if (deps.store.deleteBatch) {
    await deps.store.deleteBatch({
      publisherIds: publisherIdsToDelete,
      groupIds: groupIdsToDelete,
      updatedGroups: groupsToUpdateList,
    })
  } else {
    for (const group of groupsToUpdateList) {
      await deps.store.saveGroup(group)
    }
    for (const groupId of groupIdsToDelete) {
      await deps.store.deleteGroup(groupId)
    }
    for (const pubId of publisherIdsToDelete) {
      await deps.store.deletePublisher(pubId)
    }
  }

  const finalGroups = allGroups
    .filter((g) => !groupsToDelete.has(g.id))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))

  return {
    deletedCount: publisherIdsToDelete.length,
    deletedGroupsCount: groupIdsToDelete.length,
    publishers: remainingPublishers.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    groups: finalGroups,
  }
}

export async function bulkMovePublishers(
  deps: PublisherDeps,
  caller: PublisherCaller | null,
  input: Record<string, unknown>,
) {
  const congregationId = assertManager(caller)
  const rawIds = Array.isArray(input.publisherIds) ? input.publisherIds : []
  const requestedIds = new Set(
    rawIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0),
  )
  if (requestedIds.size === 0) {
    throw new PublisherError("invalid-argument", "Selecione ao menos um publicador para mover.")
  }

  const targetGroupId =
    typeof input.groupId === "string" && input.groupId.trim().length > 0 ? input.groupId.trim() : undefined

  const allPublishers = await deps.store.listPublishers(congregationId)
  const allGroups = await deps.store.listGroups(congregationId)

  if (targetGroupId && !allGroups.some((g) => g.id === targetGroupId)) {
    throw new PublisherError("not-found", "Grupo de destino não encontrado nesta congregação.")
  }

  const now = deps.now().toISOString()
  const publishersToSave = new Map<string, PublisherRecord>()
  const groupsToSave = new Map<string, PublisherGroupRecord>()

  const movingPublishers = allPublishers.filter((p) => requestedIds.has(p.id))
  if (movingPublishers.length === 0) {
    throw new PublisherError("not-found", "Nenhum dos publicadores selecionados foi encontrado nesta congregação.")
  }
  const movingIdSet = new Set(movingPublishers.map((p) => p.id))

  for (const pub of movingPublishers) {
    const previousGroupId = pub.groupId
    if (previousGroupId === targetGroupId) continue

    if (previousGroupId) {
      const previousGroup = allGroups.find((g) => g.id === previousGroupId)
      if (previousGroup) {
        if (previousGroup.assistantPublisherId === pub.id) {
          delete previousGroup.assistantPublisherId
          previousGroup.updatedAt = now
          groupsToSave.set(previousGroup.id, previousGroup)
        }
        if (previousGroup.superintendentPublisherId === pub.id) {
          const remainingInPrevious = allPublishers.filter(
            (p) => p.groupId === previousGroupId && !movingIdSet.has(p.id),
          )
          const replacement =
            (previousGroup.assistantPublisherId && !movingIdSet.has(previousGroup.assistantPublisherId)
              ? remainingInPrevious.find((p) => p.id === previousGroup.assistantPublisherId)
              : undefined) ?? remainingInPrevious[0]
          previousGroup.superintendentPublisherId = replacement ? replacement.id : ""
          previousGroup.updatedAt = now
          groupsToSave.set(previousGroup.id, previousGroup)
          await clearSupervisedGroup(deps, pub, previousGroupId)
        }
      }
    }

    if (targetGroupId) {
      pub.groupId = targetGroupId
    } else {
      delete pub.groupId
    }
    pub.updatedAt = now
    publishersToSave.set(pub.id, pub)
  }

  if (deps.store.saveBatch) {
    await deps.store.saveBatch({
      groups: [...groupsToSave.values()],
      publishers: [...publishersToSave.values()],
    })
  } else {
    for (const group of groupsToSave.values()) {
      await deps.store.saveGroup(group)
    }
    for (const pub of publishersToSave.values()) {
      await deps.store.savePublisher(pub)
    }
  }

  return {
    movedCount: publishersToSave.size,
    publishers: allPublishers.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    groups: allGroups.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
  }
}

export async function bulkUpdatePublishers(
  deps: PublisherDeps,
  caller: PublisherCaller | null,
  input: Record<string, unknown>,
) {
  const congregationId = assertManager(caller)
  const rawUpdates = Array.isArray(input.updates) ? input.updates : []
  if (rawUpdates.length === 0) {
    throw new PublisherError("invalid-argument", "Nenhuma alteração informada para salvar.")
  }

  const allPublishers = await deps.store.listPublishers(congregationId)
  const publisherMap = new Map(allPublishers.map((p) => [p.id, p]))
  const publishersToSave = new Map<string, PublisherRecord>()
  const now = deps.now().toISOString()

  for (const item of rawUpdates) {
    if (!item || typeof item !== "object") continue
    const patch = item as Record<string, unknown>
    const id = typeof patch.publisherId === "string" ? patch.publisherId.trim() : ""
    if (!id) continue
    const pub = publisherMap.get(id)
    if (!pub) continue

    let changed = false
    const boolKeys = [
      "indicador",
      "microfone",
      "som",
      "estudante",
      "volante",
      "needsElderlySupport",
      "driver",
    ] as const

    for (const key of boolKeys) {
      if (patch[key] !== undefined) {
        const nextVal = patch[key] === true
        if (pub[key] !== nextVal) {
          pub[key] = nextVal
          changed = true
        }
      }
    }

    if (changed) {
      pub.updatedAt = now
      publishersToSave.set(pub.id, pub)
    }
  }

  if (publishersToSave.size > 0) {
    if (deps.store.saveBatch) {
      await deps.store.saveBatch({
        groups: [],
        publishers: [...publishersToSave.values()],
      })
    } else {
      for (const pub of publishersToSave.values()) {
        await deps.store.savePublisher(pub)
      }
    }
  }

  return {
    updatedCount: publishersToSave.size,
    publishers: allPublishers.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
  }
}

export async function importPublisherGroups(
  deps: PublisherDeps,
  caller: PublisherCaller | null,
  input: Record<string, unknown>,
) {
  const congregationId = assertManager(caller)
  const rawGroups = Array.isArray(input.groups) ? input.groups : null
  if (!rawGroups || rawGroups.length === 0) {
    throw new PublisherError("invalid-argument", "Informe ao menos um grupo para importar.")
  }
  const prefixCode = input.prefixCode === true
  const stripQuestionMarks = input.stripQuestionMarks === true
  const now = deps.now().toISOString()

  const normalizePersonName = (raw: string) => {
    const trimmed = raw.trim()
    if (!stripQuestionMarks) return trimmed
    return trimmed.replace(/\.{2,}\??$/, "").replace(/\?+$/, "").trim()
  }

  const foldKey = (value: string) => value.trim().toLocaleLowerCase("pt-BR")

  const allPublishers = await deps.store.listPublishers(congregationId)
  const allGroups = await deps.store.listGroups(congregationId)

  let createdGroups = 0
  let updatedGroups = 0
  let createdPublishers = 0
  let matchedPublishers = 0

  const publishersToPersist = new Map<string, PublisherRecord>()
  const groupsToPersist = new Map<string, PublisherGroupRecord>()
  const superintendentLinks: Array<{ superintendent: PublisherRecord; groupId: string }> = []

  for (let index = 0; index < rawGroups.length; index++) {
    const item = rawGroups[index]
    if (!item || typeof item !== "object") {
      throw new PublisherError("invalid-argument", `O grupo ${index + 1} é inválido.`)
    }
    const entry = item as Record<string, unknown>
    const rawName = cleanText(entry.name, `Nome do grupo ${index + 1}`, true)
    if (!rawName) {
      throw new PublisherError("invalid-argument", `Informe o nome do grupo ${index + 1}.`)
    }
    const code = cleanText(entry.code, `Código do grupo ${index + 1}`)
    const groupName =
      prefixCode && code && !rawName.toLowerCase().startsWith(code.toLowerCase())
        ? `${code} — ${rawName}`
        : rawName

    const rawSuperintendent = cleanText(entry.superintendent, `Superintendente do grupo ${rawName}`, true)
    if (!rawSuperintendent) {
      throw new PublisherError("invalid-argument", `Informe o superintendente do grupo ${rawName}.`)
    }
    const superintendentName = normalizePersonName(rawSuperintendent)
    const rawAssistant = cleanText(entry.assistant, `Ajudante do grupo ${rawName}`)
    const assistantName = rawAssistant ? normalizePersonName(rawAssistant) : undefined
    const notes = cleanText(entry.notes ?? entry.description, `Observação do grupo ${rawName}`)

    const existingGroup = allGroups.find(
      (g) => foldKey(g.name) === foldKey(groupName) || foldKey(g.name) === foldKey(rawName),
    )
    const targetGroupId = existingGroup ? existingGroup.id : deps.newId()

    const ensurePerson = (
      personName: string,
      rolePrivilege: "elder" | "ministerialServant" | "publisher",
      forcedGender?: "feminino" | "masculino",
    ): PublisherRecord => {
      const key = foldKey(personName)
      const match = allPublishers.find(
        (p) =>
          foldKey(p.name) === key &&
          (p.groupId === targetGroupId || !p.groupId),
      )
      if (!match) {
        const record: PublisherRecord = {
          id: deps.newId(),
          congregationId,
          name: personName,
          groupId: targetGroupId,
          status: "active",
          privilege: rolePrivilege,
          pioneer: "none",
          indicador: false,
          microfone: false,
          som: false,
          estudante: false,
          volante: false,
          needsElderlySupport: false,
          driver: false,
          gender: forcedGender ?? inferPublisherGender(personName),
          createdAt: now,
          updatedAt: now,
        }
        allPublishers.push(record)
        publishersToPersist.set(record.id, record)
        createdPublishers += 1
        return record
      }
      matchedPublishers += 1
      let changed = false
      if (match.groupId !== targetGroupId) {
        match.groupId = targetGroupId
        changed = true
      }
      if (rolePrivilege === "elder" && match.privilege !== "elder") {
        match.privilege = "elder"
        changed = true
      } else if (rolePrivilege === "ministerialServant" && match.privilege === "publisher") {
        match.privilege = "ministerialServant"
        changed = true
      }
      if (changed) {
        match.updatedAt = now
        publishersToPersist.set(match.id, match)
      }
      return match
    }

    const superintendent = ensurePerson(superintendentName, "elder", "masculino")
    const assistant = assistantName
      ? ensurePerson(assistantName, "ministerialServant", "masculino")
      : undefined

    let group: PublisherGroupRecord
    if (existingGroup) {
      existingGroup.name = groupName
      existingGroup.superintendentPublisherId = superintendent.id
      if (assistant) existingGroup.assistantPublisherId = assistant.id
      if (notes) existingGroup.description = notes
      existingGroup.updatedAt = now
      group = existingGroup
      updatedGroups += 1
    } else {
      group = {
        id: targetGroupId,
        congregationId,
        name: groupName,
        superintendentPublisherId: superintendent.id,
        createdAt: now,
        updatedAt: now,
      }
      if (assistant) group.assistantPublisherId = assistant.id
      if (notes) group.description = notes
      allGroups.push(group)
      createdGroups += 1
    }
    groupsToPersist.set(group.id, group)
    superintendentLinks.push({ superintendent, groupId: group.id })

    const rawPublishers = Array.isArray(entry.publishers) ? entry.publishers : []
    for (const rawMember of rawPublishers) {
      if (typeof rawMember !== "string" || !rawMember.trim()) continue
      const memberName = normalizePersonName(rawMember)
      if (!memberName) continue
      ensurePerson(memberName, "publisher")
    }
  }

  if (deps.store.saveBatch) {
    await deps.store.saveBatch({
      groups: [...groupsToPersist.values()],
      publishers: [...publishersToPersist.values()],
    })
  } else {
    for (const group of groupsToPersist.values()) {
      await deps.store.saveGroup(group)
    }
    for (const publisher of publishersToPersist.values()) {
      await deps.store.savePublisher(publisher)
    }
  }

  for (const link of superintendentLinks) {
    await syncSuperintendentLink(deps, undefined, link.superintendent, link.groupId)
  }

  return {
    groups: allGroups.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    publishers: allPublishers.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    createdGroups,
    createdPublishers,
    groupsCreated: createdGroups,
    groupsUpdated: updatedGroups,
    publishersCreated: createdPublishers,
    publishersMatched: matchedPublishers,
  }
}

async function requirePublisher(deps: PublisherDeps, congregationId: string, id: unknown) {
  if (typeof id !== "string" || !id) throw new PublisherError("invalid-argument", "Publicador inválido.")
  const publisher = await deps.store.getPublisher(id)
  if (!publisher || publisher.congregationId !== congregationId) {
    throw new PublisherError("not-found", "Publicador não encontrado nesta congregação.")
  }
  return publisher
}

async function requireGroup(deps: PublisherDeps, congregationId: string, id: unknown) {
  if (typeof id !== "string" || !id) throw new PublisherError("invalid-argument", "Grupo inválido.")
  const group = await deps.store.getGroup(id)
  if (!group || group.congregationId !== congregationId) {
    throw new PublisherError("not-found", "Grupo não encontrado nesta congregação.")
  }
  return group
}

async function assertSameCongregationGroup(deps: PublisherDeps, congregationId: string, id: unknown) {
  return requireGroup(deps, congregationId, id)
}

async function movePublisherToGroup(deps: PublisherDeps, publisher: PublisherRecord, groupId: string, now: string) {
  if (publisher.groupId === groupId) return
  if (publisher.groupId) {
    const previous = await deps.store.getGroup(publisher.groupId)
    if (previous?.congregationId === publisher.congregationId && previous.superintendentPublisherId === publisher.id) {
      throw new PublisherError(
        "invalid-argument",
        "Troque o superintendente antes de mover este publicador para outro grupo.",
      )
    }
    if (previous?.assistantPublisherId === publisher.id) {
      delete previous.assistantPublisherId
      previous.updatedAt = now
      await deps.store.saveGroup(previous)
    }
  }
  publisher.groupId = groupId
  publisher.updatedAt = now
  await deps.store.savePublisher(publisher)
}

async function clearGroupRoles(deps: PublisherDeps, publisher: PublisherRecord, now: string) {
  if (!publisher.groupId) return
  const group = await deps.store.getGroup(publisher.groupId)
  if (!group) return
  if (group.superintendentPublisherId === publisher.id) {
    throw new PublisherError("invalid-argument", "Troque o superintendente antes de remover este publicador do grupo.")
  }
  if (group.assistantPublisherId === publisher.id) {
    delete group.assistantPublisherId
    group.updatedAt = now
    await deps.store.saveGroup(group)
  }
}

async function syncSuperintendentLink(
  deps: PublisherDeps,
  previous: PublisherRecord | undefined,
  next: PublisherRecord,
  groupId: string,
) {
  if (previous && previous.id !== next.id) await clearSupervisedGroup(deps, previous, groupId)
  if (!next.userId) return
  const user = await deps.store.getUser(next.userId)
  if (!user || user.congregationId !== next.congregationId) return
  await deps.store.saveUserLink(next.userId, { ...user, publisherId: next.id, supervisedGroupId: groupId })
}

async function clearSupervisedGroup(deps: PublisherDeps, publisher: PublisherRecord, groupId: string) {
  if (!publisher.userId) return
  const user = await deps.store.getUser(publisher.userId)
  if (!user || user.supervisedGroupId !== groupId) return
  const next = { ...user }
  delete next.supervisedGroupId
  await deps.store.saveUserLink(publisher.userId, next)
}
