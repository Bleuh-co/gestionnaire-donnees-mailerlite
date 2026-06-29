import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-server";
import type { MailerLiteAccount } from "@/lib/types";

// GET /api/accounts → liste des comptes ML (clés masquées)
export async function GET() {
  await requireSession();
  // TODO: implémenter — voir Antigravity.md
  const accounts: MailerLiteAccount[] = [];
  return NextResponse.json(accounts);
}

// POST /api/accounts → ajoute un compte (valide la clé via ML)
export async function POST(_req: NextRequest) {
  await requireSession();
  // TODO: implémenter — voir Antigravity.md
  return NextResponse.json({ success: true });
}
