import { Logo } from "@/components/ui/Logo";

export function Nav({ onSignIn }: { onSignIn: () => void }) {
  return (
    <nav className="w-full px-6 py-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Logo />
        <div className="flex items-center gap-6 text-sm">
          <a
            href="https://github.com/oragnu/stellar"
            className="text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
          >
            GitHub
          </a>
          <a
            href="#docs"
            className="text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
          >
            Docs
          </a>
          <button
            onClick={onSignIn}
            className="focus-ring rounded-lg bg-[var(--color-primary)] px-4 py-2 font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)]"
          >
            Sign in
          </button>
        </div>
      </div>
    </nav>
  );
}
