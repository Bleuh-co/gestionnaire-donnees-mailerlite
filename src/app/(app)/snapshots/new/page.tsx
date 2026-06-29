"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { MailerLiteAccount, MLGroup } from "@/lib/types";

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
  const [loading, setLoading] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [error, setError] = useState("");

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
    if (!accountId) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          scope,
          ...(scope === "group" && { groupId }),
          ...(label && { label }),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Erreur ${res.status}`);
      }

      const snapshot = await res.json();
      router.push(`/snapshots/${snapshot.id}`);
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
      setLoading(false);
    }
  };

  return (
    <main className="py-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">📦 Nouvelle copie</h1>
      <p className="text-sm text-gray-500 mb-8">
        Sauvegarder la base d&apos;abonnés MailerLite dans Firestore
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
              />
              <span className="text-sm">Un groupe spécifique</span>
            </label>
          </div>
        </div>

        {/* Groupe (si scope=group) */}
        {scope === "group" && (
          <div>
            <label className="label label-required">Groupe</label>
            <select
              className="input"
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              required
              disabled={loadingGroups}
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
          />
        </div>

        {/* Erreur */}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="btn-primary flex-1"
            disabled={loading || !accountId}
          >
            {loading ? "⏳ Lancement…" : "🚀 Lancer la copie"}
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => router.push("/snapshots")}
          >
            Annuler
          </button>
        </div>
      </form>
    </main>
  );
}
