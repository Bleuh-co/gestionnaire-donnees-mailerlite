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

// DELETE /api/snapshots/[id] → supprime le snapshot Firestore + fichier GCS
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

    // Supprimer le fichier GCS
    await deleteSnapshotFromGCS(id);

    // Supprimer le document Firestore
    await snapshotRef.delete();

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error(`[api/snapshots/${id}] DELETE error:`, e?.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
