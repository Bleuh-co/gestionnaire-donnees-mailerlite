import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-server";
import { getClientById } from "@/lib/mailerlite-client";
import type { SubscriberStatus } from "@/lib/types";

export const runtime = "nodejs";

// GET /api/accounts/[id]/subscribers → abonnés live paginés (proxy ML)
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  await requireSession();
  const { id } = await ctx.params;
  const client = getClientById(id);
  if (!client) {
    return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });
  }

  const sp = req.nextUrl.searchParams;
  const cursor = sp.get("cursor") || undefined;
  const limit = Math.min(parseInt(sp.get("limit") || "50", 10), 100);
  const search = sp.get("search") || undefined;
  const status = (sp.get("status") || undefined) as
    | SubscriberStatus
    | undefined;

  try {
    const result = await client.getSubscribers({
      cursor,
      limit,
      search,
      status,
    });
    return NextResponse.json(result);
  } catch (e: any) {
    console.error(`[api/accounts/${id}/subscribers] Error:`, e?.message);
    return NextResponse.json(
      { error: "Erreur lors du chargement des abonnés" },
      { status: 502 }
    );
  }
}
