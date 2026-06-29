import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-server";
import { getClientById } from "@/lib/mailerlite-client";

export const runtime = "nodejs";

// GET /api/accounts/[id]/groups → liste les groupes du compte (live ML)
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  await requireSession();
  const { id } = await ctx.params;
  const client = getClientById(id);
  if (!client) {
    return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });
  }
  try {
    const groups = await client.getGroups();
    return NextResponse.json(groups);
  } catch (e: any) {
    console.error(`[api/accounts/${id}/groups] Error:`, e?.message);
    return NextResponse.json(
      { error: "Erreur lors du chargement des groupes" },
      { status: 502 }
    );
  }
}
