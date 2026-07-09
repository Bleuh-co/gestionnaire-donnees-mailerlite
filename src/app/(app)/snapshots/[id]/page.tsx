"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { SubscriberTable } from "@/components/SubscriberTable";
import { useT, useLocale } from "@/lib/i18n";
import type { Snapshot } from "@/lib/types";

export default function SnapshotDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [id, setId] = useState<string>("");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const t = useT();
  const locale = useLocale();

  useEffect(() => {
    params.then(({ id }) => setId(id));
  }, [params]);

  const loadSnapshot = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/snapshots/${id}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      setSnapshot(data);
    } catch {
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  // Auto-refresh si running
  useEffect(() => {
    if (!snapshot || (snapshot.status !== "running" && snapshot.status !== "pending"))
      return;
    const interval = setInterval(loadSnapshot, 3000);
    return () => clearInterval(interval);
  }, [snapshot, loadSnapshot]);

  if (loading) {
    return (
      <main className="py-6">
        <div className="card p-12 text-center text-gray-400 animate-pulse">
          {t("snapshotDetail.loading")}
        </div>
      </main>
    );
  }

  if (!snapshot) {
    return (
      <main className="py-6">
        <div className="card p-12 text-center text-gray-400">
          {t("snapshotDetail.notFound")}
        </div>
      </main>
    );
  }

  const progress =
    snapshot.totalSubscribers > 0
      ? Math.round(
          (snapshot.fetchedSubscribers / snapshot.totalSubscribers) * 100
        )
      : 0;

  return (
    <main className="py-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <button
            onClick={() => router.push("/snapshots")}
            className="btn-ghost text-xs mb-2"
          >
            {t("snapshotDetail.back")}
          </button>
          <h1 className="text-2xl font-bold">{snapshot.label}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {snapshot.accountLabel} •{" "}
            {new Date(snapshot.createdAt).toLocaleDateString(locale, {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <StatusBadge status={snapshot.status} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label={t("snapshotDetail.copied")}
          value={snapshot.fetchedSubscribers.toLocaleString(locale)}
        />
        <StatCard
          label={t("snapshotDetail.totalEstimated")}
          value={snapshot.totalSubscribers.toLocaleString(locale)}
        />
        <StatCard
          label={t("snapshotDetail.scope")}
          value={
            snapshot.scope === "all"
              ? t("snapshotDetail.scopeAll")
              : snapshot.groupName || t("snapshotDetail.scopeGroup")
          }
        />
        <StatCard
          label={t("snapshotDetail.by")}
          value={snapshot.createdByEmail.split("@")[0]}
        />
      </div>

      {/* Progress bar si running */}
      {(snapshot.status === "running" || snapshot.status === "pending") && (
        <div className="card p-6 mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">
              {snapshot.status === "pending"
                ? t("snapshotDetail.pending")
                : t("snapshotDetail.copying")}
            </span>
            <span className="text-sm text-gray-500">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-chanv-fibre rounded-full overflow-hidden">
            <div
              className="h-full bg-chanv-beige rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {t("snapshotDetail.progressDetail", {
              fetched: snapshot.fetchedSubscribers.toLocaleString(locale),
              total: snapshot.totalSubscribers.toLocaleString(locale),
            })}
          </p>
        </div>
      )}

      {/* Error */}
      {snapshot.status === "failed" && snapshot.errorMessage && (
        <div className="card p-6 mb-8 border-red-200 bg-red-50">
          <p className="text-sm text-red-700">
            ❌ <strong>{t("snapshotDetail.errorLabel")}</strong> {snapshot.errorMessage}
          </p>
        </div>
      )}

      {/* Export buttons */}
      {snapshot.status === "completed" && (
        <div className="flex gap-3 mb-8">
          <a
            href={`/api/snapshots/${id}/export?format=csv`}
            className="btn-primary text-sm"
            download
          >
            {t("snapshotDetail.exportCsv")}
          </a>
          <a
            href={`/api/snapshots/${id}/export?format=json`}
            className="btn-secondary text-sm"
            download
          >
            {t("snapshotDetail.exportJson")}
          </a>
        </div>
      )}

      {/* Subscriber table */}
      {snapshot.status === "completed" && (
        <div className="card p-6">
          <h2 className="text-lg font-bold mb-4">
            {t("snapshotDetail.subscribers", {
              n: snapshot.fetchedSubscribers.toLocaleString(locale),
            })}
          </h2>
          <SubscriberTable fetchUrl={`/api/snapshots/${id}/subscribers`} />
        </div>
      )}
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4 text-center">
      <div className="text-xl font-bold">{value}</div>
      <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">
        {label}
      </div>
    </div>
  );
}
