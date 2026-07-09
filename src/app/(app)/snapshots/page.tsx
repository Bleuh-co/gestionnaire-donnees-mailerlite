"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useT, useLocale } from "@/lib/i18n";
import type { Snapshot } from "@/lib/types";

export default function SnapshotsPage() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Snapshot | null>(null);
  const [deleting, setDeleting] = useState(false);
  const t = useT();
  const locale = useLocale();

  const load = () => {
    setLoading(true);
    fetch("/api/snapshots")
      .then((r) => r.json())
      .then((data) => setSnapshots(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  // Refresh running snapshots
  useEffect(() => {
    const hasRunning = snapshots.some(
      (s) => s.status === "running" || s.status === "pending"
    );
    if (!hasRunning) return;
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [snapshots]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/snapshots/${deleteTarget.id}`, { method: "DELETE" });
      setSnapshots((prev) => prev.filter((s) => s.id !== deleteTarget.id));
    } catch {
      // ignore
    }
    setDeleting(false);
    setDeleteTarget(null);
  };

  return (
    <main className="py-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">{t("snapshots.title")}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("snapshots.subtitle")}</p>
        </div>
        <Link href="/snapshots/new" className="btn-primary text-sm">
          {t("snapshots.new")}
        </Link>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 animate-pulse">
            {t("snapshots.loading")}
          </div>
        ) : snapshots.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-lg mb-2">{t("snapshots.empty")}</p>
            <p className="text-sm">{t("snapshots.emptyHint")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-chanv-fibre text-left bg-chanv-fibre/30">
                  <th className="py-3 px-4 font-semibold" scope="col">{t("snapshots.colLabel")}</th>
                  <th className="py-3 px-4 font-semibold" scope="col">{t("snapshots.colAccount")}</th>
                  <th className="py-3 px-4 font-semibold" scope="col">{t("snapshots.colStatus")}</th>
                  <th className="py-3 px-4 font-semibold hidden md:table-cell" scope="col">
                    {t("snapshots.colSubscribers")}
                  </th>
                  <th className="py-3 px-4 font-semibold hidden md:table-cell" scope="col">
                    {t("snapshots.colDate")}
                  </th>
                  <th className="py-3 px-4" scope="col" />
                </tr>
              </thead>
              <tbody>
                {snapshots.map((snap) => (
                  <tr
                    key={snap.id}
                    className="border-b border-chanv-fibre/50 hover:bg-chanv-fibre/20 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <Link
                        href={`/snapshots/${snap.id}`}
                        className="font-medium hover:underline"
                      >
                        {snap.label}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-gray-500">
                      {snap.accountLabel}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={snap.status} />
                      {snap.status === "running" && (
                        <span className="text-xs text-gray-400 ml-2">
                          {snap.fetchedSubscribers.toLocaleString(locale)} /{" "}
                          {snap.totalSubscribers.toLocaleString(locale)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell text-gray-500">
                      {snap.fetchedSubscribers.toLocaleString(locale)}
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell text-gray-500 text-xs">
                      {new Date(snap.createdAt).toLocaleDateString(locale, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex gap-1 justify-end">
                        {snap.status === "completed" && (
                          <Link
                            href={`/snapshots/${snap.id}`}
                            className="btn-ghost text-xs"
                          >
                            {t("snapshots.view")}
                          </Link>
                        )}
                        <button
                          className="btn-ghost text-xs text-red-500 hover:text-red-700"
                          onClick={() => setDeleteTarget(snap)}
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title={t("snapshots.deleteTitle")}
        message={t("snapshots.deleteMessage", { label: deleteTarget?.label || "" })}
        confirmLabel={t("snapshots.deleteConfirm")}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </main>
  );
}
