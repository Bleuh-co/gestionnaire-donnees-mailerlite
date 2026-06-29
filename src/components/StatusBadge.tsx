"use client";

import type { SnapshotStatus } from "@/lib/types";

const CONFIG: Record<SnapshotStatus, { label: string; className: string }> = {
  completed: { label: "Terminé", className: "badge-accent" },
  running: { label: "En cours…", className: "badge-warning" },
  pending: { label: "En attente", className: "badge-neutral" },
  failed: { label: "Échoué", className: "badge-failed" },
};

export function StatusBadge({ status }: { status: SnapshotStatus }) {
  const cfg = CONFIG[status] || CONFIG.pending;
  return (
    <span className={cfg.className}>
      {status === "running" && <span className="animate-pulse mr-1">●</span>}
      {cfg.label}
    </span>
  );
}
