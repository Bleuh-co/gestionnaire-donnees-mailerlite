import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-server";
import { adminDb } from "@/lib/firebase-admin";
import type { MLSubscriber, PaginatedResult, SubscriberStatus } from "@/lib/types";

export const runtime = "nodejs";

const COLLECTION = "ml_snapshots";

// GET /api/snapshots/[id]/subscribers → abonnés du snapshot, paginés + filtres
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  await requireSession();
  const { id } = await ctx.params;
  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const limit = Math.min(parseInt(sp.get("limit") || "50", 10), 100);
  const search = sp.get("search") || "";
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

    const subsRef = snapshotRef.collection("subscribers");
    let query: FirebaseFirestore.Query = subsRef;

    // Filtre par statut
    if (status) {
      query = query.where("status", "==", status);
    }

    // Recherche par préfixe email
    if (search) {
      const lower = search.toLowerCase();
      query = query
        .where("email", ">=", lower)
        .where("email", "<=", lower + "\uf8ff");
    }

    // Count total (approximatif via une query sans limit)
    const countSnap = await query.count().get();
    const total = countSnap.data().count;

    // Pagination par offset
    const offset = (page - 1) * limit;
    const dataSnap = await query
      .orderBy("email")
      .offset(offset)
      .limit(limit)
      .get();

    const data: MLSubscriber[] = dataSnap.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<MLSubscriber, "id">),
    }));

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
