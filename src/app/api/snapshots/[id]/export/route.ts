import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-server";
import { adminDb } from "@/lib/firebase-admin";
import { loadSubscribersFromGCS } from "@/lib/gcs-storage";
import type { ExportFormat, SubscriberStatus } from "@/lib/types";

export const runtime = "nodejs";

const COLLECTION = "ml_snapshots";

// GET /api/snapshots/[id]/export → export CSV/JSON depuis GCS
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  await requireSession();
  const { id } = await ctx.params;
  const sp = req.nextUrl.searchParams;
  const format = (sp.get("format") || "csv") as ExportFormat;
  const fieldsParam = sp.get("fields") || "";
  const statusFilter = sp.get("status") || "";
  const selectedFields = fieldsParam
    ? fieldsParam.split(",").filter(Boolean)
    : [];
  const statusFilters = statusFilter
    ? (statusFilter.split(",").filter(Boolean) as SubscriberStatus[])
    : [];

  try {
    const db = adminDb();
    const snapshotRef = db.collection(COLLECTION).doc(id);
    const snapshotDoc = await snapshotRef.get();
    if (!snapshotDoc.exists) {
      return NextResponse.json(
        { error: "Snapshot introuvable" },
        { status: 404 }
      );
    }

    const snapshotData = snapshotDoc.data()!;
    if (snapshotData.status !== "completed") {
      return NextResponse.json(
        { error: "Le snapshot n'est pas terminé" },
        { status: 409 }
      );
    }

    // Charger les abonnés depuis GCS
    let subscribers = await loadSubscribersFromGCS(id);

    // Filtrer par statut si demandé
    if (statusFilters.length > 0) {
      subscribers = subscribers.filter((s: any) =>
        statusFilters.includes(s.status)
      );
    }

    const label = snapshotData.label || "snapshot";
    const dateStr = new Date().toISOString().slice(0, 10);

    if (format === "json") {
      return new Response(JSON.stringify(subscribers, null, 2), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="snapshot-${label}-${dateStr}.json"`,
        },
      });
    }

    // CSV
    const allFieldKeys = new Set<string>();
    for (const sub of subscribers) {
      if (sub.fields && typeof sub.fields === "object") {
        for (const key of Object.keys(sub.fields)) {
          allFieldKeys.add(key);
        }
      }
    }

    const fieldKeys =
      selectedFields.length > 0
        ? selectedFields.filter((f) => allFieldKeys.has(f))
        : Array.from(allFieldKeys);

    // Header
    const csvHeaders = ["email", "status", "groups", ...fieldKeys];
    const csvLines = [csvHeaders.join(",")];

    for (const sub of subscribers) {
      const row = [
        escapeCsv(sub.email || ""),
        escapeCsv(sub.status || ""),
        escapeCsv(
          Array.isArray(sub.groups) ? sub.groups.join("; ") : ""
        ),
        ...fieldKeys.map((key: string) =>
          escapeCsv(String(sub.fields?.[key] ?? ""))
        ),
      ];
      csvLines.push(row.join(","));
    }

    const csvContent = "\uFEFF" + csvLines.join("\n"); // BOM for Excel
    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="snapshot-${label}-${dateStr}.csv"`,
      },
    });
  } catch (e: any) {
    console.error(`[api/snapshots/${id}/export] Error:`, e?.message);
    return NextResponse.json({ error: "Erreur export" }, { status: 500 });
  }
}

function escapeCsv(value: string): string {
  if (
    value.includes(",") ||
    value.includes('"') ||
    value.includes("\n")
  ) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
