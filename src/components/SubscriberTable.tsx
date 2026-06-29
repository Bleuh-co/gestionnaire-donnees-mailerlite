"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { MLSubscriber, SubscriberStatus } from "@/lib/types";

interface Props {
  fetchUrl: string;
  /** If true, uses cursor-based pagination (live API) */
  cursorMode?: boolean;
}

export function SubscriberTable({ fetchUrl, cursorMode = false }: Props) {
  const [rows, setRows] = useState<MLSubscriber[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const limit = 50;

  const load = useCallback(
    async (p: number, s: string, st: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: String(limit) });
        if (cursorMode) {
          if (cursor && p > 1) params.set("cursor", cursor);
        } else {
          params.set("page", String(p));
        }
        if (s) params.set("search", s);
        if (st) params.set("status", st);

        const res = await fetch(`${fetchUrl}?${params.toString()}`);
        if (!res.ok) throw new Error(`${res.status}`);
        const json = await res.json();

        if (cursorMode) {
          setRows(json.data || []);
          setTotal(json.total || 0);
          setCursor(json.nextCursor || null);
        } else {
          setRows(json.data || []);
          setTotal(json.total || 0);
        }
      } catch (e) {
        console.error("[SubscriberTable] load error:", e);
      } finally {
        setLoading(false);
      }
    },
    [fetchUrl, cursorMode, cursor, limit]
  );

  useEffect(() => {
    load(1, "", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchUrl]);

  const handleSearch = (val: string) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      setCursor(null);
      load(1, val, status);
    }, 300);
  };

  const handleStatusChange = (val: string) => {
    setStatus(val);
    setPage(1);
    setCursor(null);
    load(1, search, val);
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div>
      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          className="input flex-1"
          placeholder="🔍 Rechercher par email…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
        />
        <select
          className="input w-auto min-w-[160px]"
          value={status}
          onChange={(e) => handleStatusChange(e.target.value)}
        >
          <option value="">Tous les statuts</option>
          <option value="active">Actif</option>
          <option value="unsubscribed">Désabonné</option>
          <option value="unconfirmed">Non confirmé</option>
          <option value="bounced">Bounced</option>
          <option value="junk">Junk</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-chanv-fibre text-left">
              <th className="py-3 px-3 font-semibold" scope="col">
                Email
              </th>
              <th className="py-3 px-3 font-semibold" scope="col">
                Statut
              </th>
              <th className="py-3 px-3 font-semibold hidden md:table-cell" scope="col">
                Groupes
              </th>
              <th className="py-3 px-3 font-semibold hidden lg:table-cell" scope="col">
                Champs
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-chanv-fibre/50">
                  <td className="py-3 px-3">
                    <div className="h-4 bg-chanv-fibre rounded animate-pulse w-48" />
                  </td>
                  <td className="py-3 px-3">
                    <div className="h-4 bg-chanv-fibre rounded animate-pulse w-16" />
                  </td>
                  <td className="py-3 px-3 hidden md:table-cell">
                    <div className="h-4 bg-chanv-fibre rounded animate-pulse w-24" />
                  </td>
                  <td className="py-3 px-3 hidden lg:table-cell">
                    <div className="h-4 bg-chanv-fibre rounded animate-pulse w-32" />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-400">
                  Aucun abonné trouvé
                </td>
              </tr>
            ) : (
              rows.map((sub) => (
                <tr
                  key={sub.id}
                  className="border-b border-chanv-fibre/50 hover:bg-chanv-fibre/30 transition-colors"
                >
                  <td className="py-2.5 px-3 font-mono text-xs">
                    {sub.email}
                  </td>
                  <td className="py-2.5 px-3">
                    <StatusPill status={sub.status} />
                  </td>
                  <td className="py-2.5 px-3 hidden md:table-cell text-xs text-gray-500">
                    {sub.groups?.join(", ") || "—"}
                  </td>
                  <td className="py-2.5 px-3 hidden lg:table-cell text-xs text-gray-500 max-w-[200px] truncate">
                    {sub.fields
                      ? Object.entries(sub.fields)
                          .filter(([, v]) => v != null && v !== "")
                          .slice(0, 3)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(", ")
                      : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && total > 0 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
          <span>
            {total.toLocaleString("fr-CA")} abonné{total > 1 ? "s" : ""}
          </span>
          {!cursorMode && (
            <div className="flex gap-2">
              <button
                className="btn-ghost text-xs"
                disabled={page <= 1}
                onClick={() => {
                  const p = page - 1;
                  setPage(p);
                  load(p, search, status);
                }}
              >
                ← Précédent
              </button>
              <span className="py-1 px-2">
                {page} / {totalPages}
              </span>
              <button
                className="btn-ghost text-xs"
                disabled={page >= totalPages}
                onClick={() => {
                  const p = page + 1;
                  setPage(p);
                  load(p, search, status);
                }}
              >
                Suivant →
              </button>
            </div>
          )}
          {cursorMode && cursor && (
            <button
              className="btn-ghost text-xs"
              onClick={() => {
                const p = page + 1;
                setPage(p);
                load(p, search, status);
              }}
            >
              Charger plus →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    unsubscribed: "bg-red-100 text-red-800",
    unconfirmed: "bg-yellow-100 text-yellow-800",
    bounced: "bg-orange-100 text-orange-800",
    junk: "bg-gray-200 text-gray-600",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${colors[status] || colors.active}`}
    >
      {status}
    </span>
  );
}
