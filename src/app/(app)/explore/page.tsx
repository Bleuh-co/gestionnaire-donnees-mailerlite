"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { MailerLiteAccount } from "@/lib/types";

export default function ExplorePage() {
  const [accounts, setAccounts] = useState<MailerLiteAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((data) => setAccounts(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="py-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">🔍 Explorer en direct</h1>
        <p className="text-sm text-gray-500 mt-1">
          Consulter les abonnés en direct sur MailerLite (pas de copie)
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="card p-8 animate-pulse">
              <div className="h-6 bg-chanv-fibre rounded w-40" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {accounts.map((acc) => {
            const emoji = acc.id === "chanv" ? "🌿" : acc.id === "bleuh" ? "🔵" : "🏠";
            return (
              <Link
                key={acc.id}
                href={`/explore/${acc.id}`}
                className="card p-6 flex items-center gap-4 hover:shadow-lg hover:-translate-y-1 transition-all group"
              >
                <span className="text-3xl">{emoji}</span>
                <div className="flex-1">
                  <h2 className="font-bold group-hover:underline">
                    {acc.label}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {(acc.subscriberCount || 0).toLocaleString("fr-CA")} abonnés
                  </p>
                </div>
                <span className="text-gray-300 group-hover:text-chanv-terre transition-colors text-xl">
                  →
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
