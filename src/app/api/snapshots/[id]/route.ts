import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-server";

// GET /api/snapshots/[id] → détail + progression
export async function GET(
  _req: NextRequest,
  _ctx: { params: Promise<{ id: string }> }
) {
  await requireSession();
  // TODO: implémenter — voir Antigravity.md
  return NextResponse.json({});
}

// DELETE /api/snapshots/[id] → supprime un snapshot + ses abonnés
export async function DELETE(
  _req: NextRequest,
  _ctx: { params: Promise<{ id: string }> }
) {
  await requireSession();
  // TODO: implémenter — voir Antigravity.md
  return NextResponse.json({ success: true });
}
