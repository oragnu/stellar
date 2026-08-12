import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useUiStore } from "@/stores/uiStore";
import type { StarRecord } from "@/queries/useStars";

function makeStar(repoId: number): StarRecord {
  return {
    repo_id: repoId,
    name_with_owner: `owner/repo-${repoId}`,
    description: null,
    url: `https://github.com/owner/repo-${repoId}`,
    is_archived: false,
    pushed_at: null,
    default_branch: null,
    language: null,
    stargazer_count: 0,
    fork_count: 0,
    topics: [],
    latest_release_tag: null,
    starred_at: null,
    notes: null,
    tag_names: [],
    tag_ids: [],
  };
}

const ITEMS = [makeStar(1), makeStar(2), makeStar(3)];

function press(key: string, target: EventTarget = window) {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
  act(() => {
    target.dispatchEvent(event);
  });
}

describe("useKeyboardShortcuts", () => {
  beforeEach(() => {
    useUiStore.setState({
      selectedView: { type: "all" },
      searchQuery: "",
      selectedRepoId: null,
      settingsModalOpen: false,
    });
    document.body.innerHTML = "";
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("focuses the search input on '/'", () => {
    const input = document.createElement("input");
    input.id = "stellar-search-input";
    document.body.appendChild(input);
    renderHook(() => useKeyboardShortcuts(ITEMS));

    press("/");

    expect(document.activeElement).toBe(input);
  });

  it("focuses the new-tag input on 't'", () => {
    const input = document.createElement("input");
    input.id = "stellar-new-tag-input";
    document.body.appendChild(input);
    renderHook(() => useKeyboardShortcuts(ITEMS));

    press("t");

    expect(document.activeElement).toBe(input);
  });

  it("selects the first item on 'j' when nothing is selected, then advances", () => {
    renderHook(() => useKeyboardShortcuts(ITEMS));

    press("j");
    expect(useUiStore.getState().selectedRepoId).toBe(1);

    press("j");
    expect(useUiStore.getState().selectedRepoId).toBe(2);
  });

  it("clamps at the last item and doesn't wrap past the end", () => {
    useUiStore.setState({ selectedRepoId: 3 });
    renderHook(() => useKeyboardShortcuts(ITEMS));

    press("j");

    expect(useUiStore.getState().selectedRepoId).toBe(3);
  });

  it("moves backward on 'k' and clamps at the first item", () => {
    useUiStore.setState({ selectedRepoId: 2 });
    renderHook(() => useKeyboardShortcuts(ITEMS));

    press("k");
    expect(useUiStore.getState().selectedRepoId).toBe(1);

    press("k");
    expect(useUiStore.getState().selectedRepoId).toBe(1);
  });

  it("clears the search query on Escape", () => {
    useUiStore.setState({ searchQuery: "react" });
    renderHook(() => useKeyboardShortcuts(ITEMS));

    press("Escape");

    expect(useUiStore.getState().searchQuery).toBe("");
  });

  it("does not steal 'j'/'t'/'/' while the user is typing in a field", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    renderHook(() => useKeyboardShortcuts(ITEMS));

    press("j", input);

    expect(useUiStore.getState().selectedRepoId).toBeNull();
  });

  it("ignores every shortcut while a modal (role=dialog) is open", () => {
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    document.body.appendChild(dialog);
    renderHook(() => useKeyboardShortcuts(ITEMS));

    press("j");

    expect(useUiStore.getState().selectedRepoId).toBeNull();
  });
});
