/**
 * Maps a live Flux HelmRelease name to candidate GitHub repo names, in
 * order of likelihood. This mapping is inherently approximate -- the chart
 * name and the GitHub repo name usually match exactly, but there are known
 * exceptions (e.g. the "service-airflow" HelmRelease is built from the
 * "doodle-airflow" repo). Extend this list as more exceptions are found;
 * there's no reliable way to derive it generically.
 */
export function candidateRepoNames(helmReleaseName: string): string[] {
  const candidates = [helmReleaseName];

  if (helmReleaseName.startsWith("service-")) {
    candidates.push("doodle-" + helmReleaseName.slice("service-".length));
  }

  return candidates;
}
