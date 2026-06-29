import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-server";
import { adminDb } from "@/lib/firebase-admin";
import { loadSubscribersFromGCS } from "@/lib/gcs-storage";
import type { MLSubscriber, PaginatedResult, SubscriberStatus } from "@/lib/types";

export const runtime = "nodejs";

const COLLECTION = "ml_snapshots";

// GET /api/snapshots/[id]/subscribers → abonnés du snapshot, paginés + filtres
// Charge le fichier JSON depuis GCS, filtre en mémoire (~15 MB max)
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  await requireSession();
  const { id } = await ctx.params;
  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const limit = Math.min(parseInt(sp.get("limit") || "50", 10), 100);
  const search = (sp.get("search") || "").toLowerCase();
  const status = sp.get("status") as SubscriberStatus | undefined;

  try {
    const db = adminDb();
    const snapshotRef = db.collection(COLLECTION).doc(id);
    const snapshotDoc = await snapshotRef.get();
    if (!snapshotDoc.exists) {
      return NextResponse.json(
        { error: "Snapshot introuvable" },
        { status: 404 }
      );
    }

    // Charger les abonnés depuis GCS
    let subscribers: MLSubscriber[] = await loadSubscribersFromGCS(id);

    // Filtres en mémoire
    if (status) {
      subscribers = subscribers.filter((s) => s.status === status);
    }
    if (search) {
      subscribers = subscribers.filter((s) =>
        s.email.toLowerCase().includes(search)
      );
    }

    // Tri par email
    subscribers.sort((a, b) => a.email.localeCompare(b.email));

    // Pagination
    const total = subscribers.length;
    const offset = (page - 1) * limit;
    const data = subscribers.slice(offset, offset + limit);

    const result: PaginatedResult<MLSubscriber> = {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    return NextResponse.json(result);
  } catch (e: any) {
    console.error(`[api/snapshots/${id}/subscribers] Error:`, e?.message);
    return NextResponse.json(
      { error: "Erreur lors du chargement des abonnés" },
      { status: 500 }
    );
  }
}
