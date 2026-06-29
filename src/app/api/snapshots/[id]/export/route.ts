import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-server";
import type { ExportFormat } from "@/lib/types";

// GET /api/snapshots/[id]/export → export CSV/JSON (query: format, fields)
export async function GET(
  req: NextRequest,
  _ctx: { params: Promise<{ id: string }> }
) {
  await requireSession();
  // TODO: implémenter — voir Antigravity.md
  const format = (req.nextUrl.searchParams.get("format") || "json") as ExportFormat;

  if (format === "csv") {
    return new Response("email,status\n", {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="snapshot.csv"',
      },
    });
  }

  return NextResponse.json({ data: [] });
}
