import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Download, Sparkles, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { ToggleSwitch } from "@/components/ui/ToggleSwitch";
import { useUiStore } from "@/stores/uiStore";
import { useCurrentUser } from "@/queries/useCurrentUser";
import { useDeleteAccount, useRunAutotag, useUpdateSettings } from "@/queries/useSettings";

export function SettingsModal() {
  const { settingsModalOpen, closeSettingsModal } = useUiStore();
  const { data: user } = useCurrentUser();
  const updateSettings = useUpdateSettings();
  const runAutotag = useRunAutotag();
  const deleteAccount = useDeleteAccount();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  if (!user) return null;

  const handleDeleteAccount = () => {
    if (
      window.confirm(
        "Delete your Stellar account? This revokes Stellar's GitHub access and permanently deletes all your tags, notes, and predicates. This cannot be undone.",
      )
    ) {
      deleteAccount.mutate(undefined, {
        onSuccess: () => {
          queryClient.clear();
          navigate("/");
        },
      });
    }
  };

  return (
    <Modal open={settingsModalOpen} onOpenChange={closeSettingsModal} title="Settings">
      <div className="divide-y divide-[var(--color-border)]">
        <div className="pb-3">
          <ToggleSwitch
            checked={user.autotag_topics}
            onChange={(checked) => updateSettings.mutate({ autotag_topics: checked })}
            label="Auto-tag by topic"
            description="Automatically tag stars using their GitHub topics"
          />
          <ToggleSwitch
            checked={user.show_language_tags}
            onChange={(checked) => updateSettings.mutate({ show_language_tags: checked })}
            label="Show language facets"
            description="Show a Languages section in the sidebar"
          />
          <ToggleSwitch
            checked={user.autosave_notes}
            onChange={(checked) => updateSettings.mutate({ autosave_notes: checked })}
            label="Autosave notes"
            description="Save notes automatically as you type, instead of a Save button"
          />
        </div>

        <div className="flex flex-col gap-2 py-3">
          <button
            onClick={() => runAutotag.mutate()}
            disabled={runAutotag.isPending}
            className="focus-ring flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-elevated-2)] disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4 text-[var(--color-accent)]" />
            {runAutotag.isPending ? "Auto-tagging…" : "Run auto-tagger now"}
            {runAutotag.isSuccess && (
              <span className="ml-auto text-xs text-[var(--color-text-muted)]">
                +{runAutotag.data?.applied_count ?? 0} tagged
              </span>
            )}
          </button>
          <a
            href="/api/v1/export"
            className="focus-ring flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-elevated-2)]"
          >
            <Download className="h-4 w-4" /> Export stars as JSON
          </a>
        </div>

        <div className="pt-3">
          <button
            onClick={handleDeleteAccount}
            disabled={deleteAccount.isPending}
            className="focus-ring flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[var(--color-danger)] hover:bg-[var(--color-bg-elevated-2)] disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            {deleteAccount.isPending ? "Deleting…" : "Delete account"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
