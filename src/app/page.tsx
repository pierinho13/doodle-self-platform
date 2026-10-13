import ServiceTable from "@/components/ServiceTable";

export default function Home() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-neutral-100">Service releases</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Live Flux state for preproduction and production, cross-referenced with the
          latest GitHub release and any open promotion PR in devops-tenants.
        </p>
      </header>
      <ServiceTable />
    </main>
  );
}
