import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-server";
import { getAccountsList } from "@/lib/mailerlite-client";

export const runtime = "nodejs";

// GET /api/accounts → liste des comptes ML configurés (clés masquées)
export async function GET() {
  await requireSession();
  try {
    const accounts = await getAccountsList();
    return NextResponse.json(accounts);
  } catch (e: any) {
    console.error("[api/accounts] Error:", e?.message);
    return NextResponse.json(
      { error: "Impossible de charger les comptes" },
      { status: 500 }
    );
  }
}
