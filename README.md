# doodle-self-platform

Self platform -- a local internal tool that shells out to your own `kubectl`
(via `kubesafe`) and `gh` sessions to show live state across Doodle's
infra, instead of inferring it from static config.

## Prerequisites

- `kubesafe kubectl` already configured with `staging` and `production`
  contexts (same ones used everywhere else).
- `gh` authenticated (`gh auth status`) -- used both for `gh pr list` and
  for the GitHub REST token (`gh auth token`) behind release lookups.
- Node 20+.

## Running it

```sh
npm install
npm run dev
```

Then open http://localhost:3000.

## Current screen: Service releases

Shows every Flux `HelmRelease` in `preproduction` and `production`, joined
by name, with:

- Chart version and Flux `Ready` state in each environment (live from
  `kubectl get helmrelease`, not from git).
- The latest GitHub release for the matching repo (best-effort name
  matching, see `src/lib/repoMapping.ts` -- extend it as you find
  exceptions).
- Any currently open PR in `devops-tenants` that bumps the preprod pinned
  version (Renovate) or promotes to production (`promote-release`),
  parsed from PR titles.

If `gh` isn't authenticated, the preprod/production columns still work
(they only need `kubectl`); the release and PR columns show "No data" and
the page surfaces which lookups failed instead of silently going blank.

## Structure

- `src/lib/exec.ts` -- shared helper to shell out to a CLI and get
  stdout/JSON, without going through a shell (no injection risk).
- `src/lib/kubectl.ts` -- fetches HelmReleases for an environment.
- `src/lib/github.ts` -- open promotion PRs + latest release lookups.
- `src/lib/repoMapping.ts` -- HelmRelease name -> candidate GitHub repo
  name(s). This mapping is inherently approximate; add exceptions here
  as they come up.
- `src/app/api/services/route.ts` -- aggregates the above into one
  response, tolerating partial failures (one failing source doesn't take
  down the rest).
- `src/components/ServiceTable.tsx` -- the table, with a name filter and
  manual refresh (no auto-polling, so it doesn't hammer `kubectl`/GitHub
  in the background).

Add new screens as new routes under `src/app/`; this one isn't meant to
be the only thing here.
