import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-server";
import { adminDb } from "@/lib/firebase-admin";
import { deleteSnapshotFromGCS } from "@/lib/gcs-storage";
import type { Snapshot } from "@/lib/types";

export const runtime = "nodejs";

const COLLECTION = "ml_snapshots";

// GET /api/snapshots/[id] → détail + progression
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  await requireSession();
  const { id } = await ctx.params;
  try {
    const db = adminDb();
    const doc = await db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) {
      return NextResponse.json(
        { error: "Snapshot introuvable" },
        { status: 404 }
      );
    }
    return NextResponse.json({ id: doc.id, ...doc.data() } as Snapshot);
  } catch (e: any) {
    console.error(`[api/snapshots/${id}] GET error:`, e?.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// DELETE /api/snapshots/[id] → supprime le snapshot (GCS + Firestore)
export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  await requireSession();
  const { id } = await ctx.params;
  try {
    const db = adminDb();
    const snapshotRef = db.collection(COLLECTION).doc(id);
    const doc = await snapshotRef.get();
    if (!doc.exists) {
      return NextResponse.json(
        { error: "Snapshot introuvable" },
        { status: 404 }
      );
    }

    const data = doc.data()!;

    // Supprimer le fichier GCS (si existe)
    try {
      await deleteSnapshotFromGCS(id);
    } catch (e: any) {
      console.warn(`[delete] GCS cleanup skipped for ${id}:`, e?.message);
    }

    // Supprimer l'ancienne sous-collection subscribers (si existe, pour rétro-compat)
    if (!data.gcsPath) {
      try {
        let subsSnap = await snapshotRef.collection("subscribers").limit(500).get();
        while (!subsSnap.empty) {
          const batch = db.batch();
          for (const subDoc of subsSnap.docs) {
            batch.delete(subDoc.ref);
          }
          await batch.commit();
          subsSnap = await snapshotRef.collection("subscribers").limit(500).get();
        }
      } catch (e: any) {
        console.warn(`[delete] Subcollection cleanup skipped for ${id}:`, e?.message);
      }
    }

    // Supprimer le document snapshot
    await snapshotRef.delete();

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error(`[api/snapshots/${id}] DELETE error:`, e?.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
