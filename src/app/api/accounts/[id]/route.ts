import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-server";

export const runtime = "nodejs";

// Comptes hardcodés — pas de suppression dynamique
export async function DELETE(
  _req: NextRequest,
  _ctx: { params: Promise<{ id: string }> }
) {
  await requireSession();
  return NextResponse.json(
    { error: "Les comptes sont configurés via les variables d'environnement et ne peuvent pas être supprimés." },
    { status: 405 }
  );
}
