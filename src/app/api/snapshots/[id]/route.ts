import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-server";
import { adminDb } from "@/lib/firebase-admin";
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

// DELETE /api/snapshots/[id] → supprime un snapshot + ses abonnés
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

    // Supprimer la sous-collection subscribers par batch
    const subsSnap = await snapshotRef.collection("subscribers").limit(500).get();
    while (!subsSnap.empty) {
      const batch = db.batch();
      for (const subDoc of subsSnap.docs) {
        batch.delete(subDoc.ref);
      }
      await batch.commit();
      // Continuer si plus de 500
      const next = await snapshotRef.collection("subscribers").limit(500).get();
      if (next.empty) break;
    }

    // Supprimer le document snapshot
    await snapshotRef.delete();

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error(`[api/snapshots/${id}] DELETE error:`, e?.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
