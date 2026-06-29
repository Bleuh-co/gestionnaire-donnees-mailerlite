"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SubscriberTable } from "@/components/SubscriberTable";
import type { MailerLiteAccount, MLGroup } from "@/lib/types";

export default function ExploreAccountPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const [accountId, setAccountId] = useState("");
  const [account, setAccount] = useState<MailerLiteAccount | null>(null);
  const [groups, setGroups] = useState<MLGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    params.then(({ accountId }) => setAccountId(accountId));
  }, [params]);

  useEffect(() => {
    if (!accountId) return;
    Promise.all([
      fetch("/api/accounts").then((r) => r.json()),
      fetch(`/api/accounts/${accountId}/groups`).then((r) => r.json()),
    ])
      .then(([accounts, grps]) => {
        const acc = (Array.isArray(accounts) ? accounts : []).find(
          (a: MailerLiteAccount) => a.id === accountId
        );
        setAccount(acc || null);
        setGroups(Array.isArray(grps) ? grps : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [accountId]);

  if (loading) {
    return (
      <main className="py-6">
        <div className="card p-12 text-center text-gray-400 animate-pulse">
          Chargement…
        </div>
      </main>
    );
  }

  if (!account) {
    return (
      <main className="py-6">
        <div className="card p-12 text-center text-gray-400">
          Compte introuvable
        </div>
      </main>
    );
  }

  const emoji = accountId === "chanv" ? "🌿" : "🏠";

  return (
    <main className="py-6">
      <button
        onClick={() => router.push("/explore")}
        className="btn-ghost text-xs mb-4"
      >
        ← Retour
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            {emoji} {account.label}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {(account.subscriberCount || 0).toLocaleString("fr-CA")} abonnés •
            Données en direct
          </p>
        </div>
      </div>

      {/* Groupes */}
      {groups.length > 0 && (
        <div className="card p-6 mb-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-3">
            Groupes
          </h2>
          <div className="flex flex-wrap gap-2">
            {groups.map((g) => (
              <span key={g.id} className="badge-neutral text-xs">
                {g.name}{" "}
                <span className="text-gray-400 ml-1">
                  ({g.activeCount.toLocaleString("fr-CA")})
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Table abonnés (live) */}
      <div className="card p-6">
        <h2 className="text-lg font-bold mb-4">👥 Abonnés (en direct)</h2>
        <SubscriberTable
          fetchUrl={`/api/accounts/${accountId}/subscribers`}
          cursorMode
        />
      </div>
    </main>
  );
}
