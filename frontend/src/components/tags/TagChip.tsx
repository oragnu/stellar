import { X } from "lucide-react";

interface TagChipProps {
  name: string;
  onRemove?: () => void;
  active?: boolean;
  onClick?: () => void;
}

/** Renders as a plain span by default; when `onClick` is given it becomes
 * keyboard-accessible via role="button" rather than a real <button> —
 * necessary because `onRemove` also renders a real <button> inside, and
 * nesting interactive elements (button-in-button) is invalid HTML and
 * breaks assistive tech when both props are supplied together.
 */
export function TagChip({ name, onRemove, active, onClick }: TagChipProps) {
  const interactiveProps = onClick
    ? {
        role: "button" as const,
        tabIndex: 0,
        onClick,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        },
      }
    : {};

  return (
    <span
      {...interactiveProps}
      className={`focus-ring inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
        onClick ? "cursor-pointer" : ""
      } ${
        active
          ? "bg-[var(--color-primary)] text-white"
          : "bg-[color-mix(in_srgb,var(--color-primary)_18%,transparent)] text-[var(--color-text)]"
      }`}
    >
      {name}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove tag ${name}`}
          className="rounded-full hover:opacity-70"
        >
          <X aria-hidden="true" className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
