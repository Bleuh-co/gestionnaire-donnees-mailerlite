import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-server";
import { adminDb } from "@/lib/firebase-admin";
import { getClientById } from "@/lib/mailerlite-client";
import { saveSubscribersToGCS } from "@/lib/gcs-storage";
import type { Snapshot, SnapshotStatus, MLSubscriber } from "@/lib/types";

export const runtime = "nodejs";

const COLLECTION = "ml_snapshots";

// GET /api/snapshots → liste des snapshots
export async function GET(req: NextRequest) {
  await requireSession();
  const sp = req.nextUrl.searchParams;
  const accountId = sp.get("accountId") || undefined;
  const status = sp.get("status") as SnapshotStatus | undefined;

  try {
    const db = adminDb();
    let query: FirebaseFirestore.Query = db
      .collection(COLLECTION)
      .orderBy("createdAt", "desc")
      .limit(100);

    if (accountId) query = query.where("accountId", "==", accountId);
    if (status) query = query.where("status", "==", status);

    const snap = await query.get();
    const snapshots: Snapshot[] = snap.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<Snapshot, "id">),
    }));

    return NextResponse.json(snapshots);
  } catch (e: any) {
    console.error("[api/snapshots] GET error:", e?.message);
    return NextResponse.json(
      { error: "Erreur lors du chargement des snapshots" },
      { status: 500 }
    );
  }
}

// POST /api/snapshots → lance la création d'un snapshot (copie vers GCS)
export async function POST(req: NextRequest) {
  const session = await requireSession();
  const body = await req.json().catch(() => ({}));
  const { accountId, scope, groupId, label } = body as {
    accountId?: string;
    scope?: "all" | "group";
    groupId?: string;
    label?: string;
  };

  if (!accountId) {
    return NextResponse.json(
      { error: "accountId requis" },
      { status: 400 }
    );
  }

  const client = getClientById(accountId);
  if (!client) {
    return NextResponse.json(
      { error: "Compte introuvable" },
      { status: 404 }
    );
  }

  const effectiveScope = scope || "all";
  if (effectiveScope === "group" && !groupId) {
    return NextResponse.json(
      { error: "groupId requis pour scope=group" },
      { status: 400 }
    );
  }

  try {
    const db = adminDb();

    // Récupère info du compte et les champs
    const [info, fields] = await Promise.all([
      client.getAccountInfo(),
      client.getFields(),
    ]);

    // Résout le nom du groupe si nécessaire
    let groupName: string | undefined;
    if (effectiveScope === "group" && groupId) {
      const groups = await client.getGroups();
      groupName = groups.find((g) => g.id === groupId)?.name || groupId;
    }

    const defaultLabel =
      label ||
      `Copie ${client.label}${groupName ? ` — ${groupName}` : ""} — ${new Date().toLocaleDateString("fr-CA")}`;

    // Créer le document snapshot (1 seul doc Firestore = metadata)
    const snapshotData: Omit<Snapshot, "id"> = {
      accountId,
      accountLabel: client.label,
      label: defaultLabel,
      status: "pending",
      scope: effectiveScope,
      ...(groupId && { groupId }),
      ...(groupName && { groupName }),
      totalSubscribers: info.subscriberCount,
      fetchedSubscribers: 0,
      fields,
      createdAt: new Date().toISOString(),
      createdByEmail: session.email,
    };

    const docRef = await db.collection(COLLECTION).add(snapshotData);
    const snapshotId = docRef.id;

    // Lancer la copie en arrière-plan (ne bloque pas la réponse)
    processSnapshot(snapshotId, client, effectiveScope, groupId).catch(
      (err) => {
        console.error(
          `[snapshot] Background processing failed for ${snapshotId}:`,
          err
        );
      }
    );

    return NextResponse.json({
      id: snapshotId,
      ...snapshotData,
      status: "running",
    });
  } catch (e: any) {
    console.error("[api/snapshots] POST error:", e?.message);
    return NextResponse.json(
      { error: "Erreur lors de la création du snapshot" },
      { status: 500 }
    );
  }
}

/**
 * Copie tous les abonnés du compte ML dans un fichier JSON sur Cloud Storage.
 * Metadata (progression) dans Firestore (1 doc).
 * Données abonnés dans GCS (1 fichier JSON).
 */
async function processSnapshot(
  snapshotId: string,
  client: ReturnType<typeof getClientById> & {},
  scope: "all" | "group",
  groupId?: string
) {
  const db = adminDb();
  const snapshotRef = db.collection(COLLECTION).doc(snapshotId);

  // Passer en running
  await snapshotRef.update({ status: "running" });

  let cursor: string | null = null;
  let fetched = 0;
  const BATCH_SIZE = 100;
  const allSubscribers: MLSubscriber[] = [];

  try {
    do {
      // Fetch une page d'abonnés
      const result = await client!.getSubscribers({
        cursor,
        limit: BATCH_SIZE,
      });

      if (result.data.length === 0) break;

      // Accumuler en mémoire (au lieu d'écrire dans Firestore)
      allSubscribers.push(...result.data);

      fetched += result.data.length;
      cursor = result.nextCursor;

      // Update progression dans Firestore (1 seul doc)
      await snapshotRef.update({
        fetchedSubscribers: fetched,
        totalSubscribers: result.total > fetched ? result.total : fetched,
      });

      console.log(
        `[snapshot:${snapshotId}] Fetched ${fetched} subscribers...`
      );
    } while (cursor);

    // Sauvegarder tout dans GCS (1 fichier JSON)
    const gcsPath = await saveSubscribersToGCS(snapshotId, allSubscribers);

    // Terminé — update metadata Firestore
    await snapshotRef.update({
      status: "completed",
      fetchedSubscribers: fetched,
      totalSubscribers: fetched,
      gcsPath,
      completedAt: new Date().toISOString(),
    });

    console.log(
      `[snapshot:${snapshotId}] ✅ Completed — ${fetched} subscribers saved to GCS`
    );
  } catch (e: any) {
    console.error(`[snapshot:${snapshotId}] ❌ Failed:`, e?.message);
    await snapshotRef.update({
      status: "failed",
      errorMessage: e?.message || "Erreur inconnue",
      fetchedSubscribers: fetched,
    });
  }
}
