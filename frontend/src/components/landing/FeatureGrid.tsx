import {
  Tags,
  StickyNote,
  Filter,
  Sparkles,
  Search,
  Github,
  RefreshCw,
  Download,
  type LucideIcon,
} from "lucide-react";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: Tags,
    title: "Custom tags",
    description: "Organize stars with your own tags, drag-reorderable and yours to shape.",
  },
  {
    icon: StickyNote,
    title: "Private notes",
    description: "Add markdown notes to any repo — remember why you starred it.",
  },
  {
    icon: Filter,
    title: "Smart filters",
    description:
      "Build reusable saved filters over language, stars, dates, tags, and more.",
  },
  {
    icon: Sparkles,
    title: "Auto-tagging",
    description: "Automatically tag repos based on their GitHub topics.",
  },
  {
    icon: Search,
    title: "Fast search",
    description: "Keyboard-driven, instant search across thousands of stars.",
  },
  {
    icon: Github,
    title: "GitHub OAuth",
    description: "Sign in with GitHub — no separate account, no separate password.",
  },
  {
    icon: RefreshCw,
    title: "Kept in sync",
    description: "Stellar periodically refreshes your star list in the background.",
  },
  {
    icon: Download,
    title: "Export anytime",
    description: "Your tags and notes, as JSON, whenever you want them.",
  },
];

export function FeatureGrid() {
  return (
    <section className="w-full px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[var(--color-text)]">
            Everything you need to tame your stars
          </h2>
          <p className="mt-3 text-[var(--color-text-muted)]">
            Equivalent to Astral, rebuilt with a modern Python + React stack —
            same ideas, cleaner foundation.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5 transition-colors hover:border-[var(--color-primary)]"
            >
              <Icon className="h-6 w-6 text-[var(--color-accent)]" strokeWidth={1.75} />
              <h3 className="mt-3 font-semibold text-[var(--color-text)]">{title}</h3>
              <p className="mt-1.5 text-sm text-[var(--color-text-muted)]">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
