import "server-only";
import { firebaseAdmin } from "./firebase-admin";
import { getStorage } from "firebase-admin/storage";

/**
 * Helper Cloud Storage pour les snapshots MailerLite.
 * Stocke les abonnés dans un fichier JSON au lieu de documents Firestore individuels.
 *
 * Structure: ml-snapshots/{snapshotId}.json
 */

const BUCKET_FOLDER = "ml-snapshots";

function getBucket() {
  const bucketName = process.env.GCS_BUCKET || undefined;
  return getStorage(firebaseAdmin()).bucket(bucketName);
}

function snapshotPath(snapshotId: string): string {
  return `${BUCKET_FOLDER}/${snapshotId}.json`;
}

/**
 * Sauvegarde les abonnés d'un snapshot en tant que fichier JSON dans GCS.
 * Utilise un stream pour écrire progressivement (pas tout en mémoire).
 */
export async function saveSubscribersToGCS(
  snapshotId: string,
  subscribers: any[]
): Promise<string> {
  const bucket = getBucket();
  const filePath = snapshotPath(snapshotId);
  const file = bucket.file(filePath);

  const json = JSON.stringify(subscribers);
  await file.save(json, {
    contentType: "application/json",
    gzip: true,
    metadata: {
      cacheControl: "private, max-age=0",
    },
  });

  console.log(
    `[GCS] Saved ${subscribers.length} subscribers to gs://${bucket.name}/${filePath} (${(json.length / 1024).toFixed(0)} KB)`
  );
  return filePath;
}

/**
 * Charge les abonnés d'un snapshot depuis GCS.
 * Retourne un tableau en mémoire (~15 MB max pour 90K abonnés).
 */
export async function loadSubscribersFromGCS(
  snapshotId: string
): Promise<any[]> {
  const bucket = getBucket();
  const file = bucket.file(snapshotPath(snapshotId));

  const [exists] = await file.exists();
  if (!exists) return [];

  const [buffer] = await file.download();
  return JSON.parse(buffer.toString("utf-8"));
}

/**
 * Supprime le fichier JSON d'un snapshot.
 */
export async function deleteSnapshotFromGCS(
  snapshotId: string
): Promise<void> {
  const bucket = getBucket();
  const file = bucket.file(snapshotPath(snapshotId));

  const [exists] = await file.exists();
  if (exists) {
    await file.delete();
    console.log(`[GCS] Deleted gs://${bucket.name}/${snapshotPath(snapshotId)}`);
  }
}
