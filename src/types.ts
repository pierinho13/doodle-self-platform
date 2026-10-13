import type { ReleaseStatus } from "./lib/kubectl";
import type { LatestRelease, PromotionPR } from "./lib/github";

export interface ServiceRow {
  name: string;
  preprod: ReleaseStatus | null;
  production: ReleaseStatus | null;
  latestRelease: (LatestRelease & { matchedRepo: string }) | null;
  preprodBumpPR: PromotionPR | null;
  productionPromotePR: PromotionPR | null;
}

export interface ServicesResponse {
  services: ServiceRow[];
  fetchedAt: string;
  errors: string[];
}
