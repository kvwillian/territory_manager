import * as admin from "firebase-admin"
import * as functions from "firebase-functions"
import { callerCongregationId, canManageMeetings, type CallerProfile } from "../meetingWorkbook/policy"
import { BoardError, sanitizeCleaning, sanitizeMeeting, sanitizeRoster } from "./records"

const MEETINGS = "meetingPrograms"
const ROSTERS = "audioVideoRosters"
const CLEANING = "cleaningAssignments"

async function profileOf(context: functions.https.CallableContext): Promise<CallerProfile | null> {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "É preciso entrar na conta.")
  const snapshot = await admin.firestore().collection("users").doc(context.auth.uid).get()
  return (snapshot.data() as CallerProfile | undefined) ?? null
}

function managerCongregation(profile: CallerProfile | null) {
  const congregationId = callerCongregationId(profile)
  if (!canManageMeetings(profile) || !congregationId) {
    throw new functions.https.HttpsError("permission-denied", "Você não pode gravar as designações desta congregação.")
  }
  return congregationId
}

function rethrow(error: unknown): never {
  if (error instanceof functions.https.HttpsError) throw error
  if (error instanceof BoardError) throw new functions.https.HttpsError(error.code, error.message)
  functions.logger.error("boards", error)
  throw new functions.https.HttpsError("internal", "Não foi possível gravar.")
}

export const saveMeetingProgram = functions.https.onCall(async (data: { meeting?: unknown } | null, context) => {
  try {
    const congregationId = managerCongregation(await profileOf(context))
    const meeting = sanitizeMeeting(congregationId, data?.meeting)
    await admin.firestore().collection(MEETINGS).doc(meeting.id).set(meeting)
    return meeting
  } catch (error) {
    rethrow(error)
  }
})

export const saveAudioVideoRoster = functions.https.onCall(async (data: { roster?: unknown } | null, context) => {
  try {
    const congregationId = managerCongregation(await profileOf(context))
    const roster = sanitizeRoster(congregationId, data?.roster)
    await admin.firestore().collection(ROSTERS).doc(roster.id).set(roster)
    return roster
  } catch (error) {
    rethrow(error)
  }
})

export const saveCleaningAssignment = functions.https.onCall(
  async (data: { meetingId?: unknown; person?: unknown } | null, context) => {
    try {
      const congregationId = managerCongregation(await profileOf(context))
      const slot = sanitizeCleaning(data?.meetingId, data?.person)
      const ref = admin.firestore().collection(CLEANING).doc(congregationId)
      if (slot.person) {
        await ref.set({ congregationId, people: { [slot.meetingId]: slot.person } }, { merge: true })
      } else {
        await ref.set(
          { congregationId, people: { [slot.meetingId]: admin.firestore.FieldValue.delete() } },
          { merge: true },
        )
      }
      return slot
    } catch (error) {
      rethrow(error)
    }
  },
)
