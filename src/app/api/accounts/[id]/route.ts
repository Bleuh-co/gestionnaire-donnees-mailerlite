import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-server";

// DELETE /api/accounts/[id] → supprime un compte
export async function DELETE(
  _req: NextRequest,
  _ctx: { params: Promise<{ id: string }> }
) {
  await requireSession();
  // TODO: implémenter — voir Antigravity.md
  return NextResponse.json({ success: true });
}
