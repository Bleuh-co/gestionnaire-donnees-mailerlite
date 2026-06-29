import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-server";
import type { Snapshot } from "@/lib/types";

// GET /api/snapshots → liste des snapshots
export async function GET() {
  await requireSession();
  // TODO: implémenter — voir Antigravity.md
  const snapshots: Snapshot[] = [];
  return NextResponse.json(snapshots);
}

// POST /api/snapshots → lance la création d'un snapshot (copie)
export async function POST(_req: NextRequest) {
  await requireSession();
  // TODO: implémenter — voir Antigravity.md
  return NextResponse.json({ success: true });
}
