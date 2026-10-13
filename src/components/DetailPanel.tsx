"use client";

import type { ReleaseStatus } from "@/lib/kubectl";

export interface SelectedDetail {
  serviceName: string;
  environment: "Preprod" | "Production";
  status: ReleaseStatus;
}

function readyColor(ready: ReleaseStatus["ready"]) {
  if (ready === "True") return "text-emerald-300";
  if (ready === "False") return "text-red-300";
  if (ready === "Unknown") return "text-amber-300";
  return "text-neutral-400";
}

export default function DetailPanel({
  detail,
  onClose,
}: {
  detail: SelectedDetail | null;
  onClose: () => void;
}) {
  if (!detail) return null;
  const { serviceName, environment, status } = detail;

  return (
    <>
      {/* Backdrop -- click to close, doesn't block interaction with the rest of the page visually but does intercept clicks */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-neutral-800 bg-neutral-950 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-neutral-800 px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-neutral-100">{serviceName}</div>
            <div className="text-xs text-neutral-500">{environment}</div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md px-2 py-1 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <dl className="flex flex-col gap-4 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-neutral-500">Ready</dt>
              <dd className={`mt-0.5 font-medium ${readyColor(status.ready)}`}>
                {status.ready ?? "No data"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-neutral-500">Chart version</dt>
              <dd className="mt-0.5 text-neutral-200">{status.chartVersion ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-neutral-500">Reason</dt>
              <dd className="mt-0.5 text-neutral-200">{status.reason ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-neutral-500">
                Message
                <span className="ml-2 normal-case text-neutral-600">
                  (raw Flux condition -- not guaranteed to pinpoint the exact cause)
                </span>
              </dt>
              <dd className="mt-1">
                {status.message ? (
                  <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap break-words rounded-md border border-neutral-800 bg-neutral-900 p-3 font-mono text-xs text-neutral-300">
                    {status.message}
                  </pre>
                ) : (
                  <span className="text-neutral-500">No message available.</span>
                )}
              </dd>
            </div>
          </dl>
        </div>
      </aside>
    </>
  );
}
