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

  // A congregação vem do perfil do admin. O cliente não escolhe outra.
  const callerCongregation = callerDoc.data()?.congregationId;
  const congregationId =
    typeof callerCongregation === "string" && callerCongregation.trim() !== ""
      ? callerCongregation.trim()
      : DEFAULT_CONGREGATION_ID;
  if (
    data.congregationId &&
    data.congregationId.trim() !== "" &&
    data.congregationId.trim() !== congregationId
  ) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Não é possível criar usuário em outra congregação",
    );
  }

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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function generateTemporaryPassword(length = 12): string {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(length);
  let pwd = "";
  for (let i = 0; i < length; i++) {
    pwd += charset[bytes[i]! % charset.length];
  }
  return pwd;
}

async function sendTemporaryPasswordEmail(opts: {
  apiKey: string;
  to: string;
  temporaryPassword: string;
}): Promise<void> {
  const from =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "Territory Manager <onboarding@resend.dev>";

  const html = `
<p>Olá,</p>
<p>Sua senha temporária do <strong>Gerenciador de Territórios</strong> é:</p>
<p><strong style="font-size:1.25em;letter-spacing:0.04em">${escapeHtml(opts.temporaryPassword)}</strong></p>
<p>Entre no aplicativo com essa senha. Em seguida, o app pede para você escolher uma senha nova. A senha temporária deixa de valer depois dessa troca.</p>
<p>Se você não pediu isso, avise um administrador da congregação.</p>
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
      subject: "Senha temporária — Gerenciador de Territórios",
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
 * Callable (sem login): define uma senha temporária e envia por e-mail.
 * O app exige a troca dessa senha no primeiro login.
 *
 * Configure RESEND_API_KEY (e opcionalmente RESEND_FROM_EMAIL) no ambiente da função.
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

  const apiKey = process.env.RESEND_API_KEY;
  const isEmu = process.env.FUNCTIONS_EMULATOR === "true";
  if (!apiKey) {
    if (isEmu) {
      functions.logger.warn("requestPasswordReset (emulator): RESEND_API_KEY missing");
      return { ok: true };
    }
    functions.logger.error("RESEND_API_KEY missing in production");
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Envio de e-mail não está configurado. Contacte o administrador."
    );
  }

  const temporaryPassword = generateTemporaryPassword();
  try {
    await sendTemporaryPasswordEmail({
      apiKey,
      to: emailRaw,
      temporaryPassword,
    });
  } catch (err) {
    functions.logger.error("sendTemporaryPasswordEmail", err);
    throw new functions.https.HttpsError(
      "internal",
      "Não foi possível enviar o e-mail. Tente mais tarde."
    );
  }

  await admin.auth().updateUser(uid, { password: temporaryPassword });
  await admin.firestore().collection(USERS_COLLECTION).doc(uid).set(
    { mustChangePassword: true },
    { merge: true },
  );

  return { ok: true };
});

function passwordFormPage(token: string, error?: string): string {
  const errorBlock = error
    ? `<p style="color:#b02a37">${escapeHtml(error)}</p>`
    : "";
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Nova senha</title>
<style>
body{font-family:system-ui,-apple-system,sans-serif;max-width:36rem;margin:2.5rem auto;padding:0 1.2rem;color:#222;line-height:1.5}
h1{font-size:1.35rem}
label{display:block;margin:1rem 0 .35rem}
input{width:100%;box-sizing:border-box;padding:.7rem;font-size:1rem}
button{margin-top:1.2rem;background:#0d6efd;color:#fff;border:0;border-radius:8px;padding:.8rem 1.2rem;font-size:1rem;font-weight:600}
</style>
</head>
<body>
<h1>Escolha uma nova senha</h1>
<p>A senha do aplicativo só muda depois que você enviar este formulário.</p>
${errorBlock}
<form method="POST" action="">
  <input type="hidden" name="token" value="${escapeHtml(token)}"/>
  <label for="password">Nova senha</label>
  <input id="password" name="password" type="password" minlength="6" required autocomplete="new-password"/>
  <label for="confirm">Confirmar senha</label>
  <input id="confirm" name="confirm" type="password" minlength="6" required autocomplete="new-password"/>
  <button type="submit">Definir senha</button>
</form>
</body>
</html>`;
}

function readFormField(req: functions.https.Request, name: string): string {
  const body = req.body as Record<string, unknown> | undefined;
  const value = body?.[name];
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return "";
}

/**
 * GET mostra o formulário. POST grava a senha.
 * Abrir o link (inclusive um filtro de e-mail) não altera a senha.
 */
export const confirmPasswordReset = functions.https.onRequest(async (req, res) => {
  res.set("Content-Type", "text/html; charset=utf-8");

  const rawToken = req.method === "POST" ? readFormField(req, "token") : req.query.token;
  const token = typeof rawToken === "string"
    ? rawToken.trim()
    : Array.isArray(rawToken)
      ? String(rawToken[0]).trim()
      : "";

  if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
    res.status(400).send(htmlResultPage(
      "Link inválido",
      "O link de redefinição é inválido ou está incompleto.",
      false,
    ));
    return;
  }

  const ref = admin.firestore().collection(PASSWORD_RESET_COLLECTION).doc(token);
  const snap = await ref.get();
  if (!snap.exists) {
    res.status(404).send(htmlResultPage(
      "Link já usado ou inválido",
      "Este link não é mais válido. Solicite uma nova senha no aplicativo.",
      false,
    ));
    return;
  }

  const doc = snap.data()!;
  const exp = doc.expiresAt as admin.firestore.Timestamp | undefined;
  if (exp && exp.toMillis() < Date.now()) {
    await ref.delete().catch(() => undefined);
    res.status(400).send(htmlResultPage(
      "Link expirado",
      "Este link expirou. Solicite uma nova senha no aplicativo.",
      false,
    ));
    return;
  }

  const uid = doc.uid as string | undefined;
  if (!uid) {
    res.status(500).send(htmlResultPage("Erro", "Dados de redefinição inválidos.", false));
    return;
  }

  if (req.method === "GET") {
    res.status(200).send(passwordFormPage(token));
    return;
  }

  if (req.method !== "POST") {
    res.status(405).set("Allow", "GET, POST").send(htmlResultPage(
      "Método não permitido",
      "Abra o link enviado por e-mail no navegador.",
      false,
    ));
    return;
  }

  const password = readFormField(req, "password");
  const confirm = readFormField(req, "confirm");
  if (password.length < 6) {
    res.status(400).send(passwordFormPage(token, "A senha deve ter pelo menos 6 caracteres."));
    return;
  }
  if (password !== confirm) {
    res.status(400).send(passwordFormPage(token, "As senhas não coincidem."));
    return;
  }

  try {
    await admin.auth().updateUser(uid, { password });
  } catch (err) {
    functions.logger.error("confirmPasswordReset updateUser", err);
    res.status(500).send(htmlResultPage(
      "Erro ao alterar senha",
      "Não foi possível concluir a alteração. Solicite uma nova senha no aplicativo.",
      false,
    ));
    return;
  }

  await ref.delete().catch((e) => functions.logger.error("confirmPasswordReset delete token", e));
  res.status(200).send(htmlResultPage(
    "Senha alterada",
    "Sua senha foi atualizada. Volte ao aplicativo e entre com a nova senha.",
    true,
  ));
});
