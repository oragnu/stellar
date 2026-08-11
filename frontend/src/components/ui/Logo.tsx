interface LogoProps {
  className?: string;
  withWordmark?: boolean;
}

/**
 * Stellar mark: a minimal constellation gesture (three connected points
 * forming a stylized shooting star / "S") — see docs/branding/README.md.
 * Uses currentColor for the accent dot so it can be recolored via
 * Tailwind's text-* utilities.
 */
export function Logo({ className = "", withWordmark = true }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg viewBox="0 0 64 64" className="h-8 w-8 shrink-0" fill="none" aria-hidden="true">
        <rect width="64" height="64" rx="14" fill="var(--color-bg-elevated)" />
        <path
          d="M46 16 L22 38 L30 38 L18 50 L42 28 L34 28 Z"
          fill="var(--color-primary)"
        />
        <circle cx="47" cy="17" r="2.6" fill="var(--color-accent)" />
        <circle cx="17" cy="49" r="2.1" fill="var(--color-accent)" />
      </svg>
      {withWordmark && (
        <span className="text-lg font-bold tracking-tight text-[var(--color-text)]">
          Stellar
        </span>
      )}
    </div>
  );
}
