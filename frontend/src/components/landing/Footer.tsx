import { Logo } from "@/components/ui/Logo";

export function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <Logo className="opacity-80" />
        <p className="text-sm text-[var(--color-text-muted)]">
          GitHub calls them &ldquo;stars.&rdquo; This organizes them.
        </p>
        <div className="flex items-center gap-5 text-sm text-[var(--color-text-muted)]">
          <a href="https://github.com/oragnu/stellar" className="hover:text-[var(--color-text)]">
            GitHub
          </a>
          <a
            href="https://github.com/oragnu/stellar/blob/main/LICENSE"
            className="hover:text-[var(--color-text)]"
          >
            MIT License
          </a>
        </div>
      </div>
    </footer>
  );
}
