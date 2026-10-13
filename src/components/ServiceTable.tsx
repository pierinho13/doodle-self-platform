"use client";

import { useEffect, useMemo, useState } from "react";
import type { ServiceRow, ServicesResponse } from "@/types";
import DetailPanel, { type SelectedDetail } from "./DetailPanel";

function ReadyBadge({
  ready,
  onClick,
}: {
  ready: string | null;
  onClick: () => void;
}) {
  if (!ready) {
    return <span className="text-xs text-neutral-500">No data</span>;
  }

  const styles: Record<string, string> = {
    True: "bg-emerald-900/40 text-emerald-300 hover:bg-emerald-900/70",
    False: "bg-red-900/40 text-red-300 hover:bg-red-900/70",
    Unknown: "bg-amber-900/40 text-amber-300 hover:bg-amber-900/70",
  };
  const labels: Record<string, string> = {
    True: "Ready",
    False: "Not ready",
    Unknown: "Unknown",
  };

  return (
    <button
      onClick={onClick}
      title="Click for details"
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[ready] ?? ""}`}
    >
      {labels[ready] ?? ready}
    </button>
  );
}

function PrLink({ pr, label }: { pr: ServiceRow["preprodBumpPR"]; label: string }) {
  if (!pr) return <span className="text-xs text-neutral-600">—</span>;
  return (
    <a
      href={pr.url}
      target="_blank"
      rel="noreferrer"
      title={pr.title}
      className="inline-flex items-center gap-1 rounded-full bg-sky-900/40 px-2 py-0.5 text-xs font-medium text-sky-300 hover:bg-sky-900/70"
    >
      {label} #{pr.number}
      {pr.proposedVersion ? ` → ${pr.proposedVersion}` : ""}
    </a>
  );
}

export default function ServiceTable() {
  const [data, setData] = useState<ServicesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [selectedDetail, setSelectedDetail] = useState<SelectedDetail | null>(null);

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/services", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData((await res.json()) as ServicesResponse);
    } catch (err) {
      setLoadError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    const needle = filter.trim().toLowerCase();
    if (!needle) return data.services;
    return data.services.filter((s) => s.name.toLowerCase().includes(needle));
  }, [data, filter]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          type="text"
          placeholder="Filter by service name…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-64 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-sky-500 focus:outline-none"
        />
        <div className="flex items-center gap-3 text-xs text-neutral-500">
          {data && <span>Fetched {new Date(data.fetchedAt).toLocaleTimeString()}</span>}
          <button
            onClick={load}
            disabled={loading}
            className="rounded-md bg-sky-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {loadError && (
        <div className="rounded-md border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          Failed to load: {loadError}
        </div>
      )}

      {data && data.errors.length > 0 && (
        <div className="rounded-md border border-amber-800 bg-amber-950/40 px-3 py-2 text-sm text-amber-300">
          <div className="font-medium">Partial data — some sources failed:</div>
          <ul className="mt-1 list-disc pl-5">
            {data.errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-neutral-800">
        <table className="min-w-full divide-y divide-neutral-800 text-sm">
          <thead className="bg-neutral-900">
            <tr>
              {[
                "Service",
                "Preprod version",
                "Preprod",
                "Preprod bump PR",
                "Latest release",
                "Production version",
                "Production",
                "Promotion PR",
              ].map((h) => (
                <th
                  key={h}
                  className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-neutral-400"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {filtered.map((s) => (
              <tr key={s.name} className="hover:bg-neutral-900/60">
                <td className="whitespace-nowrap px-3 py-2 font-medium text-neutral-100">
                  {s.name}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-neutral-300">
                  {s.preprod?.version ?? "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <ReadyBadge
                    ready={s.preprod?.ready ?? null}
                    onClick={() =>
                      s.preprod &&
                      setSelectedDetail({
                        serviceName: s.name,
                        environment: "Preprod",
                        status: s.preprod,
                      })
                    }
                  />
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <PrLink pr={s.preprodBumpPR} label="bump" />
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-neutral-300">
                  {s.latestRelease ? (
                    <a
                      href={s.latestRelease.url}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-sky-400"
                      title={`from ${s.latestRelease.matchedRepo}`}
                    >
                      {s.latestRelease.tagName}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-neutral-300">
                  {s.production?.version ?? "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <ReadyBadge
                    ready={s.production?.ready ?? null}
                    onClick={() =>
                      s.production &&
                      setSelectedDetail({
                        serviceName: s.name,
                        environment: "Production",
                        status: s.production,
                      })
                    }
                  />
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <PrLink pr={s.productionPromotePR} label="promote" />
                </td>
              </tr>
            ))}
            {data && filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-neutral-500">
                  No services match &quot;{filter}&quot;.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!data && !loading && !loadError && (
        <div className="text-sm text-neutral-500">No data yet.</div>
      )}

      <DetailPanel detail={selectedDetail} onClose={() => setSelectedDetail(null)} />
    </div>
  );
}
