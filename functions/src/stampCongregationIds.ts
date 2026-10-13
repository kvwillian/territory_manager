/**
 * Marca congregationId: "default" nos documentos que ainda não têm o campo.
 * Rode isto antes de publicar firestore.rules, senão esses documentos ficam
 * invisíveis para as regras novas.
 *
 * Da pasta functions, com credencial de administrador do projeto:
 *   npm run stamp-congregation-ids
 *   npm run stamp-congregation-ids -- --dry-run
 */
import * as fs from "fs";
import * as path from "path";
import * as admin from "firebase-admin";

const DEFAULT_CONGREGATION_ID = "default";

const COLLECTIONS = [
  "users",
  "territories",
  "segments",
  "assignments",
  "workSessions",
  "neighborhoods",
  "meetingLocations",
  "fieldGroups",
  "preachingSessions",
];

function projectId(): string {
  const fromEnv = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
  if (fromEnv && fromEnv.trim() !== "") {
    return fromEnv.trim();
  }
  const rcPath = path.join(__dirname, "..", "..", ".firebaserc");
  const rc = JSON.parse(fs.readFileSync(rcPath, "utf8")) as {
    projects?: { default?: string };
  };
  const id = rc.projects?.default?.trim();
  if (!id) {
    throw new Error(
      "Id do projeto ausente. Defina GOOGLE_CLOUD_PROJECT ou projects.default em .firebaserc.",
    );
  }
  return id;
}

function needsStamp(value: unknown): boolean {
  return typeof value !== "string" || value.trim() === "";
}

async function stampCollection(
  db: FirebaseFirestore.Firestore,
  name: string,
  dryRun: boolean,
): Promise<number> {
  const snap = await db.collection(name).get();
  let batch = db.batch();
  let pending = 0;
  let updated = 0;

  for (const doc of snap.docs) {
    if (!needsStamp(doc.get("congregationId"))) {
      continue;
    }
    updated++;
    if (dryRun) {
      continue;
    }
    batch.update(doc.ref, { congregationId: DEFAULT_CONGREGATION_ID });
    pending++;
    if (pending === 400) {
      await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  }

  if (!dryRun && pending > 0) {
    await batch.commit();
  }
  return updated;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const id = projectId();
  admin.initializeApp({ projectId: id });
  const db = admin.firestore();
  console.log(`Projeto: ${id}`);

  console.log(
    dryRun
      ? "Simulação. Nenhum documento será gravado."
      : `Gravando congregationId "${DEFAULT_CONGREGATION_ID}" onde o campo falta.`,
  );

  let total = 0;
  for (const name of COLLECTIONS) {
    const count = await stampCollection(db, name, dryRun);
    total += count;
    console.log(`${name}: ${count}`);
  }
  console.log(`Total: ${total}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
