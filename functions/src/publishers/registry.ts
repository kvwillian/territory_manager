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
  if (text.length > 120) throw new PublisherError("invalid-argument", `${label} é longo demais.`)
  return text
}

function requireName(value: unknown) {
  const name = cleanText(value, "Nome", true)
  if (!name) throw new PublisherError("invalid-argument", "Informe o nome.")
  return name
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
  if (typeof input.name === "string") group.name = requireName(input.name)
  if (input.description !== undefined) {
    const description = cleanText(input.description, "Descrição")
    if (description) group.description = description
    else delete group.description
  }
  if (input.assistantPublisherId !== undefined) {
    if (input.assistantPublisherId == null || input.assistantPublisherId === "") delete group.assistantPublisherId
    else {
      const assistant = await requirePublisher(deps, congregationId, input.assistantPublisherId)
      group.assistantPublisherId = assistant.id
    }
  }
  group.updatedAt = deps.now().toISOString()
  await deps.store.saveGroup(group)
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
