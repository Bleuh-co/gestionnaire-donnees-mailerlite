import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-server";
import type { MLGroup } from "@/lib/types";

// GET /api/accounts/[id]/groups → liste les groupes du compte (live ML)
export async function GET(
  _req: NextRequest,
  _ctx: { params: Promise<{ id: string }> }
) {
  await requireSession();
  // TODO: implémenter — voir Antigravity.md
  const groups: MLGroup[] = [];
  return NextResponse.json(groups);
}
