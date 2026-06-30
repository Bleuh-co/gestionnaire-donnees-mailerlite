import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth-server";
import { adminDb } from "@/lib/firebase-admin";
import { getClientById } from "@/lib/mailerlite-client";
import { saveSubscribersToGCS } from "@/lib/gcs-storage";
import type { Snapshot, MLSubscriber } from "@/lib/types";

export const runtime = "nodejs";
// Prevent Next.js from buffering the stream
export const dynamic = "force-dynamic";

const COLLECTION = "ml_snapshots";

/**
 * POST /api/snapshots/stream — crée un snapshot avec streaming SSE de la progression.
 * La requête reste ouverte pendant toute la copie (~5-10 min pour 37K abonnés).
 * Cloud Run garde le CPU actif tant que la requête est ouverte (pas de surcoût).
 */
export async function POST(req: NextRequest) {
  const session = await requireSession();
  const body = await req.json().catch(() => ({}));
  const { accountId, scope, groupId, label } = body as {
    accountId?: string;
    scope?: "all" | "group";
    groupId?: string;
    label?: string;
  };

  if (!accountId) {
    return new Response(JSON.stringify({ error: "accountId requis" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const client = getClientById(accountId);
  if (!client) {
    return new Response(JSON.stringify({ error: "Compte introuvable" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const effectiveScope = scope || "all";
  if (effectiveScope === "group" && !groupId) {
    return new Response(
      JSON.stringify({ error: "groupId requis pour scope=group" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function sendEvent(event: string, data: any) {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      }

      try {
        const db = adminDb();

        // Fetch account info + fields
        sendEvent("status", { message: "Chargement des informations du compte…" });
        const [info, fields] = await Promise.all([
          client.getAccountInfo(),
          client.getFields(),
        ]);

        // Resolve group name
        let groupName: string | undefined;
        if (effectiveScope === "group" && groupId) {
          const groups = await client.getGroups();
          groupName = groups.find((g) => g.id === groupId)?.name || groupId;
        }

        const defaultLabel =
          label ||
          `Copie ${client.label}${groupName ? ` — ${groupName}` : ""} — ${new Date().toLocaleDateString("fr-CA")}`;

        // Create snapshot metadata in Firestore (1 doc)
        const snapshotData: Omit<Snapshot, "id"> = {
          accountId,
          accountLabel: client.label,
          label: defaultLabel,
          status: "running",
          scope: effectiveScope,
          ...(groupId && { groupId }),
          ...(groupName && { groupName }),
          totalSubscribers: info.subscriberCount,
          fetchedSubscribers: 0,
          fields,
          createdAt: new Date().toISOString(),
          createdByEmail: session.email,
        };

        const docRef = await db.collection(COLLECTION).add(snapshotData);
        const snapshotId = docRef.id;
        const snapshotRef = docRef;

        sendEvent("created", {
          id: snapshotId,
          label: defaultLabel,
          totalSubscribers: info.subscriberCount,
        });

        // Paginate through all subscribers
        let cursor: string | null = null;
        let fetched = 0;
        const BATCH_SIZE = 100;
        const allSubscribers: MLSubscriber[] = [];

        do {
          const result = await client.getSubscribers({
            cursor,
            limit: BATCH_SIZE,
          });

          if (result.data.length === 0) break;

          allSubscribers.push(...result.data);
          fetched += result.data.length;
          cursor = result.nextCursor;

          // Update Firestore progress
          const estimatedTotal = result.total > fetched ? result.total : fetched;
          await snapshotRef.update({
            fetchedSubscribers: fetched,
            totalSubscribers: estimatedTotal,
          });

          // Send progress via SSE
          sendEvent("progress", {
            fetched,
            total: estimatedTotal,
            percent: estimatedTotal > 0
              ? Math.round((fetched / estimatedTotal) * 100)
              : 0,
          });
        } while (cursor);

        // Save to GCS
        sendEvent("status", { message: "Sauvegarde dans le cloud…" });
        const gcsPath = await saveSubscribersToGCS(snapshotId, allSubscribers);

        // Mark as completed
        await snapshotRef.update({
          status: "completed",
          fetchedSubscribers: fetched,
          totalSubscribers: fetched,
          gcsPath,
          completedAt: new Date().toISOString(),
        });

        sendEvent("completed", {
          id: snapshotId,
          totalSubscribers: fetched,
        });
      } catch (e: any) {
        console.error("[snapshot/stream] Error:", e?.message);
        sendEvent("error", { message: e?.message || "Erreur inconnue" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
