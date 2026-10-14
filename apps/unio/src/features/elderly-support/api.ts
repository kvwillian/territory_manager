import { FirebaseError } from 'firebase/app'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../../firebase'
import type { ElderlySchedule, StoredAssignment } from './model'

export function callErrorMessage(error: unknown) {
  if (error instanceof FirebaseError && error.message) return error.message
  return 'Não foi possível concluir a operação.'
}

export async function listSchedules(input: { from: string; to: string }) {
  const call = httpsCallable<{ from: string; to: string }, { schedules: ElderlySchedule[] }>(
    functions,
    'listElderlySupportSchedules',
  )
  const result = await call(input)
  return result.data.schedules ?? []
}

export async function createSchedule(input: { title?: string; note?: string; assignments: StoredAssignment[] }) {
  const call = httpsCallable<typeof input, ElderlySchedule>(functions, 'createElderlySupportSchedule')
  const result = await call(input)
  return result.data
}

export async function updateSchedule(input: { scheduleId: string; note?: string; assignments: StoredAssignment[] }) {
  const call = httpsCallable<typeof input, ElderlySchedule>(functions, 'updateElderlySupportAssignments')
  const result = await call(input)
  return result.data
}

export async function publishSchedule(scheduleId: string) {
  const call = httpsCallable<{ scheduleId: string }, ElderlySchedule>(functions, 'publishElderlySupportSchedule')
  const result = await call({ scheduleId })
  return result.data
}

export async function unpublishSchedule(scheduleId: string) {
  const call = httpsCallable<{ scheduleId: string }, ElderlySchedule>(functions, 'unpublishElderlySupportSchedule')
  const result = await call({ scheduleId })
  return result.data
}
