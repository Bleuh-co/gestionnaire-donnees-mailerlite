"use client";

import { useT } from "@/lib/i18n";
import type { SnapshotStatus } from "@/lib/types";

const CONFIG: Record<SnapshotStatus, { key: string; className: string }> = {
  completed: { key: "status.completed", className: "badge-accent" },
  running: { key: "status.running", className: "badge-warning" },
  pending: { key: "status.pending", className: "badge-neutral" },
  failed: { key: "status.failed", className: "badge-failed" },
};

export function StatusBadge({ status }: { status: SnapshotStatus }) {
  const t = useT();
  const cfg = CONFIG[status] || CONFIG.pending;
  return (
    <span className={cfg.className}>
      {status === "running" && <span className="animate-pulse mr-1">●</span>}
      {t(cfg.key)}
    </span>
  );
}
