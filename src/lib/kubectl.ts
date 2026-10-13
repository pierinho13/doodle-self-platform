import { runJson } from "./exec";

export type Environment = "preprod" | "production";

export interface ReleaseStatus {
  /** Full chart version from Flux's release history, e.g. "45.15.1+40" */
  chartVersion: string | null;
  /** chartVersion with the "+build" suffix stripped, for display */
  version: string | null;
  ready: "True" | "False" | "Unknown" | null;
  reason: string | null;
  message: string | null;
}

export interface EnvironmentConfig {
  context: string;
  namespace: string;
}

export const ENVIRONMENTS: Record<Environment, EnvironmentConfig> = {
  preprod: { context: "staging", namespace: "preproduction" },
  production: { context: "production", namespace: "production" },
};

interface HelmReleaseCondition {
  type: string;
  status: string;
  reason?: string;
  message?: string;
}

interface HelmReleaseHistoryEntry {
  chartVersion?: string;
}

interface HelmReleaseItem {
  metadata: { name: string; namespace: string };
  status?: {
    conditions?: HelmReleaseCondition[];
    history?: HelmReleaseHistoryEntry[];
  };
}

interface HelmReleaseList {
  items: HelmReleaseItem[];
}

/**
 * Fetches every HelmRelease in the given environment's namespace via
 * `kubesafe kubectl`, in a single call. Requires the caller to already be
 * authenticated against that context (same as any normal kubectl usage).
 */
export async function fetchHelmReleases(
  env: Environment
): Promise<Map<string, ReleaseStatus>> {
  const { context, namespace } = ENVIRONMENTS[env];
  const data = await runJson<HelmReleaseList>("kubesafe", [
    "kubectl",
    "--context",
    context,
    "get",
    "helmrelease",
    "-n",
    namespace,
    "-o",
    "json",
  ]);

  const result = new Map<string, ReleaseStatus>();
  for (const item of data.items) {
    const readyCondition = item.status?.conditions?.find((c) => c.type === "Ready");
    const chartVersion = item.status?.history?.[0]?.chartVersion ?? null;
    result.set(item.metadata.name, {
      chartVersion,
      version: chartVersion ? chartVersion.split("+")[0] : null,
      ready: (readyCondition?.status as ReleaseStatus["ready"]) ?? null,
      reason: readyCondition?.reason ?? null,
      message: readyCondition?.message ?? null,
    });
  }
  return result;
}
