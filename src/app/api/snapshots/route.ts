import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-server";
import { adminDb } from "@/lib/firebase-admin";
import { getClientById } from "@/lib/mailerlite-client";
import type { Snapshot, SnapshotStatus } from "@/lib/types";

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

// POST /api/snapshots → lance la création d'un snapshot (copie)
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

    // Créer le document snapshot
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
 * Copie tous les abonnés du compte ML dans Firestore (sous-collection).
 * Met à jour la progression périodiquement.
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
  const subsCollection = snapshotRef.collection("subscribers");

  try {
    do {
      // Fetch une page d'abonnés
      const result = await client!.getSubscribers({
        cursor,
        limit: BATCH_SIZE,
      });

      if (result.data.length === 0) break;

      // Batch write dans Firestore (max 500 opérations par batch)
      const batch = db.batch();
      for (const sub of result.data) {
        const subRef = subsCollection.doc(sub.id);
        batch.set(subRef, {
          email: sub.email,
          status: sub.status,
          source: sub.source || null,
          fields: sub.fields,
          groups: sub.groups,
          subscribedAt: sub.subscribedAt || null,
          createdAt: sub.createdAt || null,
          updatedAt: sub.updatedAt || null,
        });
      }
      await batch.commit();

      fetched += result.data.length;
      cursor = result.nextCursor;

      // Update progression tous les 100 abonnés
      await snapshotRef.update({
        fetchedSubscribers: fetched,
        totalSubscribers: result.total > fetched ? result.total : fetched,
      });

      console.log(
        `[snapshot:${snapshotId}] Fetched ${fetched} subscribers...`
      );
    } while (cursor);

    // Terminé
    await snapshotRef.update({
      status: "completed",
      fetchedSubscribers: fetched,
      totalSubscribers: fetched,
      completedAt: new Date().toISOString(),
    });

    console.log(
      `[snapshot:${snapshotId}] ✅ Completed — ${fetched} subscribers copied`
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
