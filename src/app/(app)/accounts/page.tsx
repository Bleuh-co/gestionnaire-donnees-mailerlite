"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { MailerLiteAccount } from "@/lib/types";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<MailerLiteAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((data) => {
        setAccounts(Array.isArray(data) ? data : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="py-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">📊 Comptes MailerLite</h1>
          <p className="text-sm text-gray-500 mt-1">
            Comptes configurés via les variables d&apos;environnement
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-6 bg-chanv-fibre rounded w-40 mb-4" />
              <div className="h-10 bg-chanv-fibre rounded w-28 mb-4" />
              <div className="h-4 bg-chanv-fibre rounded w-32" />
            </div>
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <p className="text-lg mb-2">Aucun compte configuré</p>
          <p className="text-sm">
            Ajoutez les variables <code>MAILERLITE_API_KEY</code> et/ou{" "}
            <code>MAILERLITE_CHANV_API_KEY</code> aux env vars.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {accounts.map((acc) => (
            <AccountCard key={acc.id} account={acc} />
          ))}
        </div>
      )}
    </main>
  );
}

function AccountCard({ account }: { account: MailerLiteAccount }) {
  const brandEmoji =
    account.id === "chanv" ? "🌿" : account.id === "mdh" ? "🏠" : "📧";

  return (
    <div
      className="card p-6 transition-all hover:shadow-lg hover:-translate-y-1"
      style={{ animationDelay: "0.1s", animation: "chanvFadeIn 0.5s ease-out both" }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <span className="text-2xl mr-2">{brandEmoji}</span>
          <h2 className="inline text-lg font-bold">{account.label}</h2>
        </div>
        <span className="badge-neutral text-[10px]">
          Clé: {account.apiKeyMasked}
        </span>
      </div>

      <div className="mb-6">
        <div className="text-3xl font-bold tracking-tight">
          {(account.subscriberCount || 0).toLocaleString("fr-CA")}
        </div>
        <div className="text-xs text-gray-500 uppercase tracking-widest mt-1">
          Abonnés
        </div>
      </div>

      <div className="flex gap-2">
        <Link
          href={`/explore/${account.id}`}
          className="btn-primary text-xs flex-1 text-center"
        >
          🔍 Explorer
        </Link>
        <Link
          href={`/snapshots/new?accountId=${account.id}`}
          className="btn-secondary text-xs flex-1 text-center"
        >
          📦 Créer une copie
        </Link>
      </div>
    </div>
  );
}
