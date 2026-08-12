import { create } from "zustand";

export type SidebarView =
  | { type: "all" }
  | { type: "untagged" }
  | { type: "tag"; id: string; name: string }
  | { type: "language"; value: string }
  | { type: "predicate"; id: string; name: string };

interface UiState {
  selectedView: SidebarView;
  searchQuery: string;
  selectedRepoId: number | null;
  settingsModalOpen: boolean;

  setSelectedView: (view: SidebarView) => void;
  setSearchQuery: (query: string) => void;
  selectStar: (repoId: number | null) => void;
  openSettingsModal: () => void;
  closeSettingsModal: () => void;
}

/** UI-only state (which sidebar view/star is selected, in-progress search
 * text, modal visibility) — deliberately separate from server data, which
 * lives in TanStack Query (see queries/). Nothing here is persisted or
 * synced to the backend.
 */
export const useUiStore = create<UiState>((set) => ({
  selectedView: { type: "all" },
  searchQuery: "",
  selectedRepoId: null,
  settingsModalOpen: false,

  setSelectedView: (view) => set({ selectedView: view }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  selectStar: (repoId) => set({ selectedRepoId: repoId }),
  openSettingsModal: () => set({ settingsModalOpen: true }),
  closeSettingsModal: () => set({ settingsModalOpen: false }),
}));
