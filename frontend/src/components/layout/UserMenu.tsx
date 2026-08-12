import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Github, LogOut, Settings } from "lucide-react";
import type { CurrentUser } from "@/queries/useCurrentUser";
import { useLogout } from "@/queries/useSettings";
import { useUiStore } from "@/stores/uiStore";

export function UserMenu({ user }: { user: CurrentUser }) {
  const logout = useLogout();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const openSettingsModal = useUiStore((s) => s.openSettingsModal);

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        queryClient.setQueryData(["auth", "me"], null);
        navigate("/");
      },
    });
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          aria-label={`Account menu for ${user.github_login}`}
          className="focus-ring flex items-center gap-2 rounded-full"
        >
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt=""
              className="h-8 w-8 rounded-full"
            />
          ) : (
            <div aria-hidden="true" className="h-8 w-8 rounded-full bg-[var(--color-primary)]" />
          )}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-48 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-1 shadow-xl"
        >
          <div className="border-b border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-text)]">
            {user.github_login}
          </div>
          <DropdownMenu.Item
            onSelect={openSettingsModal}
            className="focus-ring flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-[var(--color-text)] outline-none hover:bg-[var(--color-bg-elevated-2)]"
          >
            <Settings aria-hidden="true" className="h-4 w-4" /> Settings
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <a
              href={`https://github.com/${user.github_login}`}
              target="_blank"
              rel="noreferrer"
              className="focus-ring flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-[var(--color-text)] outline-none hover:bg-[var(--color-bg-elevated-2)]"
            >
              <Github aria-hidden="true" className="h-4 w-4" /> GitHub profile
            </a>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={handleLogout}
            className="focus-ring flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-[var(--color-danger)] outline-none hover:bg-[var(--color-bg-elevated-2)]"
          >
            <LogOut aria-hidden="true" className="h-4 w-4" /> Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
