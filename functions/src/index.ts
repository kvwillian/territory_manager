import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const USERS_COLLECTION = "users";
const DEFAULT_CONGREGATION_ID = "default";

interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  role: "admin" | "conductor";
  congregationId?: string;
}

/**
 * Callable function: creates a Firebase Auth user and a Firestore user document.
 * Only admins can call this (caller must be authenticated and have admin role in Firestore).
 * New user inherits congregationId from the admin caller.
 */
export const createUser = functions.https.onCall(async (data: CreateUserRequest, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  }

  const callerUid = context.auth.uid;

  // Verify caller is admin and get their congregationId
  const callerDoc = await admin.firestore().collection(USERS_COLLECTION).doc(callerUid).get();
  if (!callerDoc.exists || callerDoc.data()?.role !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "Only admins can create users");
  }

  // Prefer congregationId from client (admin's current congregation), fallback to admin's doc
  const congregationId =
    (data.congregationId && data.congregationId.trim() !== "")
      ? data.congregationId.trim()
      : (callerDoc.data()?.congregationId ?? DEFAULT_CONGREGATION_ID);

  const { email, password, name, role } = data;
  if (!email || !password || !name || !role) {
    throw new functions.https.HttpsError("invalid-argument", "Missing email, password, name, or role");
  }
  if (role !== "admin" && role !== "conductor") {
    throw new functions.https.HttpsError("invalid-argument", "Role must be admin or conductor");
  }

  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    const uid = userRecord.uid;

    await admin.firestore().collection(USERS_COLLECTION).doc(uid).set({
      name,
      email,
      role,
      congregationId,
    });

    return { uid, name, email, role, congregationId };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("email address is already in use")) {
      throw new functions.https.HttpsError("already-exists", "Este e-mail já está em uso");
    }
    if (message.includes("password")) {
      throw new functions.https.HttpsError("invalid-argument", "Senha deve ter pelo menos 6 caracteres");
    }
    throw new functions.https.HttpsError("internal", message);
  }
});

/**
 * Callable function: resets a user's password (admin only).
 * Caller must be authenticated and have admin role.
 */
export const resetUserPassword = functions.https.onCall(
  async (data: { uid: string; newPassword: string }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be logged in"
      );
    }

    const callerUid = context.auth.uid;
    const callerDoc = await admin
      .firestore()
      .collection(USERS_COLLECTION)
      .doc(callerUid)
      .get();
    if (!callerDoc.exists || callerDoc.data()?.role !== "admin") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only admins can reset passwords"
      );
    }

    const { uid, newPassword } = data;
    if (!uid || !newPassword) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing uid or newPassword"
      );
    }
    if (newPassword.length < 6) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Senha deve ter pelo menos 6 caracteres"
      );
    }

    try {
      await admin.auth().updateUser(uid, { password: newPassword });
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const code = err && typeof err === "object" && "code" in err
        ? (err as { code: string }).code
        : "";
      if (code === "auth/user-not-found" || message.includes("user-not-found")) {
        throw new functions.https.HttpsError(
          "not-found",
          "Usuário não encontrado no Firebase Auth. Este usuário pode ter sido criado sem conta de login."
        );
      }
      if (message.includes("password") || code === "auth/weak-password") {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Senha deve ter pelo menos 6 caracteres"
        );
      }
      throw new functions.https.HttpsError("internal", message);
    }
  }
);
