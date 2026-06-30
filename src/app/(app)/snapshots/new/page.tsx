"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { MailerLiteAccount, MLGroup } from "@/lib/types";

type StreamState =
  | { phase: "idle" }
  | { phase: "running"; message: string; fetched: number; total: number; percent: number }
  | { phase: "saving"; message: string }
  | { phase: "completed"; snapshotId: string; total: number }
  | { phase: "error"; message: string };

export default function NewSnapshotPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedAccount = searchParams.get("accountId") || "";

  const [accounts, setAccounts] = useState<MailerLiteAccount[]>([]);
  const [groups, setGroups] = useState<MLGroup[]>([]);
  const [accountId, setAccountId] = useState(preselectedAccount);
  const [scope, setScope] = useState<"all" | "group">("all");
  const [groupId, setGroupId] = useState("");
  const [label, setLabel] = useState("");
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [stream, setStream] = useState<StreamState>({ phase: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  // Charger les comptes
  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((data) => setAccounts(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // Charger les groupes quand le compte change
  useEffect(() => {
    if (!accountId) {
      setGroups([]);
      return;
    }
    setLoadingGroups(true);
    fetch(`/api/accounts/${accountId}/groups`)
      .then((r) => r.json())
      .then((data) => setGroups(Array.isArray(data) ? data : []))
      .catch(() => setGroups([]))
      .finally(() => setLoadingGroups(false));
  }, [accountId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId || stream.phase === "running" || stream.phase === "saving") return;

    const controller = new AbortController();
    abortRef.current = controller;

    setStream({ phase: "running", message: "Démarrage…", fetched: 0, total: 0, percent: 0 });

    try {
      const res = await fetch("/api/snapshots/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          scope,
          ...(scope === "group" && { groupId }),
          ...(label && { label }),
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Erreur ${res.status}`);
      }

      // Read SSE stream
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let eventType = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith("data: ") && eventType) {
            try {
              const data = JSON.parse(line.slice(6));
              handleSSEEvent(eventType, data);
            } catch { /* ignore parse errors */ }
            eventType = "";
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setStream({ phase: "error", message: err.message || "Erreur inconnue" });
      }
    }
  };

  const handleSSEEvent = (event: string, data: any) => {
    switch (event) {
      case "status":
        setStream((prev) => {
          if (prev.phase === "running") {
            return { ...prev, message: data.message };
          }
          return { phase: "saving", message: data.message };
        });
        break;
      case "progress":
        setStream({
          phase: "running",
          message: `${data.fetched.toLocaleString("fr-CA")} / ${data.total.toLocaleString("fr-CA")} abonnés`,
          fetched: data.fetched,
          total: data.total,
          percent: data.percent,
        });
        break;
      case "completed":
        setStream({
          phase: "completed",
          snapshotId: data.id,
          total: data.totalSubscribers,
        });
        break;
      case "error":
        setStream({ phase: "error", message: data.message });
        break;
    }
  };

  const isProcessing = stream.phase === "running" || stream.phase === "saving";

  return (
    <main className="py-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">📦 Nouvelle copie</h1>
      <p className="text-sm text-gray-500 mb-8">
        Sauvegarder la base d&apos;abonnés MailerLite dans le cloud
      </p>

      <form onSubmit={handleSubmit} className="section-card p-8 space-y-6">
        {/* Compte */}
        <div>
          <label className="label label-required">Compte MailerLite</label>
          <select
            className="input"
            value={accountId}
            onChange={(e) => {
              setAccountId(e.target.value);
              setScope("all");
              setGroupId("");
            }}
            required
            disabled={isProcessing}
          >
            <option value="">— Sélectionner —</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.label} ({(acc.subscriberCount || 0).toLocaleString("fr-CA")} abonnés)
              </option>
            ))}
          </select>
        </div>

        {/* Scope */}
        <div>
          <label className="label">Portée</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="scope"
                value="all"
                checked={scope === "all"}
                onChange={() => setScope("all")}
                disabled={isProcessing}
              />
              <span className="text-sm">Tous les abonnés</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="scope"
                value="group"
                checked={scope === "group"}
                onChange={() => setScope("group")}
                disabled={isProcessing}
              />
              <span className="text-sm">Un groupe spécifique</span>
            </label>
          </div>
        </div>

        {/* Groupe */}
        {scope === "group" && (
          <div>
            <label className="label label-required">Groupe</label>
            <select
              className="input"
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              required
              disabled={loadingGroups || isProcessing}
            >
              <option value="">
                {loadingGroups ? "Chargement…" : "— Sélectionner —"}
              </option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.activeCount.toLocaleString("fr-CA")} actifs)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Label */}
        <div>
          <label className="label">Label (optionnel)</label>
          <input
            type="text"
            className="input"
            placeholder="Ex : Copie complète Chanv — Juin 2026"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={120}
            disabled={isProcessing}
          />
        </div>

        {/* Barre de progression */}
        {stream.phase !== "idle" && (
          <div className="space-y-3">
            {/* Progress bar */}
            {(stream.phase === "running" || stream.phase === "saving") && (
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{stream.message}</span>
                  {stream.phase === "running" && stream.percent > 0 && (
                    <span className="font-mono">{stream.percent}%</span>
                  )}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300 ease-out"
                    style={{
                      width: stream.phase === "running" ? `${Math.max(stream.percent, 2)}%` : "100%",
                      background: stream.phase === "saving"
                        ? "linear-gradient(90deg, #c4a265, #d4b87a)"
                        : "linear-gradient(90deg, #4f8c5e, #6ab07a)",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Completed */}
            {stream.phase === "completed" && (
              <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-center space-y-3">
                <div className="text-green-700 font-semibold">
                  ✅ Copie terminée — {stream.total.toLocaleString("fr-CA")} abonnés sauvegardés
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => router.push(`/snapshots/${stream.snapshotId}`)}
                >
                  Voir la copie →
                </button>
              </div>
            )}

            {/* Error */}
            {stream.phase === "error" && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                ❌ {stream.message}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          {stream.phase !== "completed" && (
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={isProcessing || !accountId}
            >
              {isProcessing ? "⏳ Copie en cours…" : "🚀 Lancer la copie"}
            </button>
          )}
          {!isProcessing && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => router.push("/snapshots")}
            >
              {stream.phase === "completed" ? "Retour" : "Annuler"}
            </button>
          )}
        </div>
      </form>
    </main>
  );
}
