interface HeroProps {
  onSignIn: () => void;
}

export function Hero({ onSignIn }: HeroProps) {
  return (
    <section className="relative overflow-hidden px-6 pb-24 pt-16 text-center">
      {/* Subtle starfield backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 10% 20%, white, transparent), radial-gradient(1px 1px at 80% 10%, white, transparent), radial-gradient(1.5px 1.5px at 60% 40%, white, transparent), radial-gradient(1px 1px at 30% 70%, white, transparent), radial-gradient(1px 1px at 90% 80%, white, transparent), radial-gradient(1.5px 1.5px at 45% 85%, white, transparent)",
          backgroundSize: "100% 100%",
        }}
      />

      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-1 text-xs font-medium text-[var(--color-text-muted)]">
        ✨ Open source · self-hostable
      </span>

      <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight text-[var(--color-text)] sm:text-5xl">
        You starred it. Now you can&rsquo;t find it.
      </h1>
      <p className="mx-auto mt-5 max-w-xl text-lg text-[var(--color-text-muted)]">
        Stellar organizes your GitHub stars with tags, private notes, and
        smart filters — so the library you already built is actually
        useful again.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={onSignIn}
          className="focus-ring flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-5 py-3 font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)]"
        >
          <GitHubMark className="h-5 w-5" />
          Sign in with GitHub
        </button>
        <a
          href="https://github.com/oragnu/stellar#readme"
          className="focus-ring rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-5 py-3 font-medium text-[var(--color-text)] transition-colors hover:border-[var(--color-primary)]"
        >
          Self-host it
        </a>
      </div>
    </section>
  );
}

function GitHubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}
