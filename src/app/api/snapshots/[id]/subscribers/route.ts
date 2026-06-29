import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-server";
import type { MLSubscriber, PaginatedResult } from "@/lib/types";

// GET /api/snapshots/[id]/subscribers → abonnés du snapshot, paginés + filtres
export async function GET(
  _req: NextRequest,
  _ctx: { params: Promise<{ id: string }> }
) {
  await requireSession();
  // TODO: implémenter — voir Antigravity.md
  const result: PaginatedResult<MLSubscriber> = {
    data: [],
    total: 0,
    page: 1,
    limit: 50,
    totalPages: 0,
  };
  return NextResponse.json(result);
}
