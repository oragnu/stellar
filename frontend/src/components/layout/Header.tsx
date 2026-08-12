import { Logo } from "@/components/ui/Logo";
import { UserMenu } from "@/components/layout/UserMenu";
import type { CurrentUser } from "@/queries/useCurrentUser";

export function Header({ user }: { user: CurrentUser }) {
  return (
    <header className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
      <Logo />
      <UserMenu user={user} />
    </header>
  );
}
