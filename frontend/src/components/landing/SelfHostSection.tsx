export function SelfHostSection() {
  return (
    <section id="docs" className="w-full px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-10 text-center">
          <h2 className="text-2xl font-bold text-[var(--color-text)]">
            Your stars, your server
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[var(--color-text-muted)]">
            Stellar is MIT-licensed and built to self-host: one Docker image,
            Postgres, and a reverse proxy of your choice. Or run it without
            Docker at all — the choice is yours.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://github.com/oragnu/stellar/blob/main/docs/deployment/docker.md"
              className="focus-ring rounded-lg bg-[var(--color-primary)] px-5 py-3 font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)]"
            >
              Deploy with Docker
            </a>
            <a
              href="https://github.com/oragnu/stellar/blob/main/docs/plan.md"
              className="focus-ring rounded-lg border border-[var(--color-border)] px-5 py-3 font-medium text-[var(--color-text)] transition-colors hover:border-[var(--color-primary)]"
            >
              Read the architecture
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
