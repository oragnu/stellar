import DOMPurify from "dompurify";
import { useReadme } from "@/queries/useStars";

/** Renders the repo's README HTML (already rendered server-side by GitHub,
 * and sanitized again server-side — see backend/app/api/stars.py). Client-
 * side sanitization here is defense in depth before `dangerouslySetInnerHTML`,
 * per docs/plan.md's security checklist.
 */
export function ReadmePane({
  repoId,
  nameWithOwner,
}: {
  repoId: number;
  nameWithOwner: string;
}) {
  const { data, isLoading } = useReadme(repoId, nameWithOwner);

  if (isLoading) {
    return <p className="text-sm text-[var(--color-text-muted)]">Loading README…</p>;
  }

  if (!data?.html) {
    return <p className="text-sm text-[var(--color-text-muted)]">No README found.</p>;
  }

  const safeHtml = DOMPurify.sanitize(data.html);

  return (
    <div
      className="stellar-readme max-w-none text-sm text-[var(--color-text)]"
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}
