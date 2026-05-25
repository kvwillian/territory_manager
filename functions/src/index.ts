import * as crypto from "crypto";
import * as dotenv from "dotenv";
import * as path from "path";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Carrega functions/.env no emulador e em `node lib/index.js` local. Em produção o ficheiro não vai no bundle; usa variáveis do Cloud.
dotenv.config({ path: path.join(__dirname, "..", ".env") });

admin.initializeApp();

const USERS_COLLECTION = "users";
const DEFAULT_CONGREGATION_ID = "default";
const PASSWORD_RESET_COLLECTION = "passwordResetRequests";

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

// --- Self-service password reset (e-mail com senha provisória + confirmação via link) ---

function generateRandomPassword(length = 14): string {
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@%#&*";
  const bytes = crypto.randomBytes(length);
  let pwd = "";
  for (let i = 0; i < length; i++) {
    pwd += charset[bytes[i]! % charset.length];
  }
  return pwd;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildPasswordResetConfirmUrl(token: string): string {
  const explicit = process.env.PASSWORD_RESET_CONFIRM_BASE_URL?.trim();
  if (explicit) {
    const hasQuery = explicit.includes("?");
    return `${explicit}${hasQuery ? "&" : "?"}token=${encodeURIComponent(token)}`;
  }
  const project = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  const region = process.env.FUNCTION_REGION || "us-central1";
  if (!project) {
    throw new Error("Missing GCLOUD_PROJECT and PASSWORD_RESET_CONFIRM_BASE_URL");
  }
  return `https://${region}-${project}.cloudfunctions.net/confirmPasswordReset?token=${encodeURIComponent(token)}`;
}

async function deletePendingPasswordResetsForUid(uid: string): Promise<void> {
  const snap = await admin
    .firestore()
    .collection(PASSWORD_RESET_COLLECTION)
    .where("uid", "==", uid)
    .get();
  if (snap.empty) {
    return;
  }
  const batch = admin.firestore().batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

async function sendResendPasswordResetEmail(opts: {
  apiKey: string;
  to: string;
  newPassword: string;
  confirmUrl: string;
}): Promise<void> {
  const from =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "Territory Manager <onboarding@resend.dev>";

  const html = `
<p>Olá,</p>
<p>Você solicitou uma nova senha para o <strong>Gerenciador de Territórios</strong>.</p>
<p><strong>Nova senha:</strong> <code style="font-size:1.1em">${escapeHtml(opts.newPassword)}</code></p>
<p>Ela <strong>só passa a valer no aplicativo</strong> depois que você tocar em <strong>Confirmar alteração</strong> abaixo.</p>
<p style="margin:2rem 0">
  <a href="${escapeHtml(opts.confirmUrl)}" style="background:#0d6efd;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;font-weight:600">
    Confirmar alteração
  </a>
</p>
<p>Ou copie o link no navegador:<br/><span style="word-break:break-all">${escapeHtml(opts.confirmUrl)}</span></p>
<p>O link expira em <strong>1 hora</strong>. Se você não pediu isso, ignore este e-mail.</p>
`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [opts.to],
      subject: "Confirme sua nova senha — Gerenciador de Territórios",
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend HTTP ${res.status}: ${text}`);
  }
}

function htmlResultPage(title: string, message: string, ok: boolean): string {
  const color = ok ? "#0d6efd" : "#b02a37";
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${escapeHtml(title)}</title>
<style>
body{font-family:system-ui,-apple-system,sans-serif;max-width:36rem;margin:2.5rem auto;padding:0 1.2rem;color:#222;line-height:1.5}
h1{font-size:1.35rem;color:${color}}
</style>
</head>
<body><h1>${escapeHtml(title)}</h1><p>${message}</p></body>
</html>`;
}

/**
 * Callable (sem login): pede redefinição por e-mail.
 * Envia senha aleatória + link para confirmar. A senha no Firebase só muda após o link.
 *
 * Configure RESEND_API_KEY (e opcionalmente RESEND_FROM_EMAIL) no ambiente da função.
 * Para chamadas sem utilizador Firebase autenticado, conceda invocador público a esta função (IAM).
 */
export const requestPasswordReset = functions.https.onCall(async (data: { email?: string }) => {
  const emailRaw =
    typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
  if (!emailRaw || !emailRaw.includes("@")) {
    throw new functions.https.HttpsError("invalid-argument", "E-mail inválido");
  }

  let uid: string;
  try {
    const user = await admin.auth().getUserByEmail(emailRaw);
    uid = user.uid;
  } catch (err: unknown) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: unknown }).code)
        : "";
    if (code === "auth/user-not-found") {
      functions.logger.info("requestPasswordReset: unknown email (masked success)");
      return { ok: true };
    }
    functions.logger.error("requestPasswordReset getUserByEmail", err);
    throw new functions.https.HttpsError("internal", "Não foi possível processar o pedido");
  }

  const newPassword = generateRandomPassword(14);
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + 60 * 60 * 1000);
  const docRef = admin.firestore().collection(PASSWORD_RESET_COLLECTION).doc(token);

  await deletePendingPasswordResetsForUid(uid);
  await docRef.set({
    uid,
    newPassword,
    email: emailRaw,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt,
  });

  let confirmUrl: string;
  try {
    confirmUrl = buildPasswordResetConfirmUrl(token);
  } catch (err) {
    functions.logger.error("buildPasswordResetConfirmUrl", err);
    await docRef.delete();
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Configuração do servidor incompleta (URL de confirmação)."
    );
  }

  const isEmu = process.env.FUNCTIONS_EMULATOR === "true";
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    if (isEmu) {
      functions.logger.warn(
        `requestPasswordReset (emulator): RESEND_API_KEY missing. confirmUrl=${confirmUrl}`
      );
      return { ok: true };
    }
    functions.logger.error("RESEND_API_KEY missing in production");
    await docRef.delete();
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Envio de e-mail não está configurado. Contacte o administrador."
    );
  }

  try {
    await sendResendPasswordResetEmail({
      apiKey,
      to: emailRaw,
      newPassword,
      confirmUrl,
    });
  } catch (err) {
    functions.logger.error("sendResendPasswordResetEmail", err);
    await docRef.delete();
    throw new functions.https.HttpsError(
      "internal",
      "Não foi possível enviar o e-mail. Tente mais tarde."
    );
  }

  return { ok: true };
});

/**
 * HTTP GET: aplica a nova senha ao utilizador e apaga o token (idempotência limitada: segundo clique falha).
 */
export const confirmPasswordReset = functions.https.onRequest(async (req, res) => {
  res.set("Content-Type", "text/html; charset=utf-8");

  if (req.method !== "GET") {
    res
      .status(405)
      .set("Allow", "GET")
      .send(
        htmlResultPage(
          "Método não permitido",
          "Abra o link enviado por e-mail no navegador.",
          false
        )
      );
    return;
  }

  const raw = req.query.token;
  const token = typeof raw === "string" ? raw.trim() : Array.isArray(raw) ? String(raw[0]).trim() : "";
  if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
    res
      .status(400)
      .send(
        htmlResultPage(
          "Link inválido",
          "O link de confirmação é inválido ou está incompleto.",
          false
        )
      );
    return;
  }

  const ref = admin.firestore().collection(PASSWORD_RESET_COLLECTION).doc(token);
  const snap = await ref.get();
  if (!snap.exists) {
    res
      .status(404)
      .send(
        htmlResultPage(
          "Link já usado ou inválido",
          "Este link não é mais válido. Se precisar, solicite uma nova senha no aplicativo.",
          false
        )
      );
    return;
  }

  const doc = snap.data()!;
  const exp = doc.expiresAt as admin.firestore.Timestamp | undefined;
  if (exp && exp.toMillis() < Date.now()) {
    await ref.delete().catch(() => undefined);
    res
      .status(400)
      .send(
        htmlResultPage(
          "Link expirado",
          "Este link expirou. Solicite uma nova senha no aplicativo.",
          false
        )
      );
    return;
  }

  const uid = doc.uid as string | undefined;
  const newPassword = doc.newPassword as string | undefined;
  if (!uid || !newPassword || newPassword.length < 6) {
    res
      .status(500)
      .send(htmlResultPage("Erro", "Dados de redefinição inválidos.", false));
    return;
  }

  try {
    await admin.auth().updateUser(uid, { password: newPassword });
  } catch (err) {
    functions.logger.error("confirmPasswordReset updateUser", err);
    res
      .status(500)
      .send(
        htmlResultPage(
          "Erro ao alterar senha",
          "Não foi possível concluir a alteração. Solicite uma nova senha ou contacte o suporte.",
          false
        )
      );
    return;
  }

  await ref.delete().catch((e) => functions.logger.error("confirmPasswordReset delete token", e));

  res
    .status(200)
    .send(
      htmlResultPage(
        "Senha alterada",
        "Sua senha foi atualizada com sucesso. Já pode entrar no aplicativo com a nova senha enviada por e-mail.",
        true
      )
    );
});
