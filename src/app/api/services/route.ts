import { NextResponse } from "next/server";
import { fetchHelmReleases, type ReleaseStatus } from "@/lib/kubectl";
import {
  fetchLatestRelease,
  fetchOpenPromotionPRs,
  mapWithConcurrency,
  type PromotionPR,
  type PromotionPRs,
} from "@/lib/github";
import { candidateRepoNames } from "@/lib/repoMapping";
import type { ServiceRow, ServicesResponse } from "@/types";

export async function GET() {
  const errors: string[] = [];

  const [preprod, production] = await Promise.all([
    fetchHelmReleases("preprod").catch((err: Error) => {
      errors.push(`Failed to read preprod HelmReleases: ${err.message}`);
      return new Map<string, ReleaseStatus>();
    }),
    fetchHelmReleases("production").catch((err: Error) => {
      errors.push(`Failed to read production HelmReleases: ${err.message}`);
      return new Map<string, ReleaseStatus>();
    }),
  ]);

  const prs: PromotionPRs = await fetchOpenPromotionPRs().catch((err: Error) => {
    errors.push(
      `Failed to list open PRs in devops-tenants (is 'gh' authenticated?): ${err.message}`
    );
    return {
      preprodBump: new Map<string, PromotionPR>(),
      productionPromote: new Map<string, PromotionPR>(),
    };
  });

  const serviceNames = Array.from(
    new Set([...preprod.keys(), ...production.keys()])
  ).sort((a, b) => a.localeCompare(b));

  let releaseLookupFailed = false;
  const latestReleases = await mapWithConcurrency(
    serviceNames,
    8,
    async (name): Promise<ServiceRow["latestRelease"]> => {
      if (releaseLookupFailed) return null;
      try {
        const found = await fetchLatestRelease(candidateRepoNames(name));
        if (!found) return null;
        return { ...found.release, matchedRepo: found.repo };
      } catch (err) {
        // Only surface this once -- if the token/auth is broken, every
        // subsequent call will fail the same way.
        if (!releaseLookupFailed) {
          releaseLookupFailed = true;
          errors.push(
            `Failed to fetch GitHub releases (is 'gh' authenticated?): ${(err as Error).message}`
          );
        }
        return null;
      }
    }
  );

  const services: ServiceRow[] = serviceNames.map((name, i) => ({
    name,
    preprod: preprod.get(name) ?? null,
    production: production.get(name) ?? null,
    latestRelease: latestReleases[i],
    preprodBumpPR: prs.preprodBump.get(name) ?? null,
    productionPromotePR: prs.productionPromote.get(name) ?? null,
  }));

  const body: ServicesResponse = {
    services,
    fetchedAt: new Date().toISOString(),
    errors,
  };

  return NextResponse.json(body);
}
