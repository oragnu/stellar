import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PredicateGroupBox } from "@/components/predicates/PredicateGroupBox";
import type { PredicateGroupNode } from "@/queries/usePredicates";

function renderGroup(group: PredicateGroupNode, onChange = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <PredicateGroupBox group={group} onChange={onChange} />
    </QueryClientProvider>,
  );
  return onChange;
}

describe("PredicateGroupBox", () => {
  it("shows an empty state when there are no rules", () => {
    renderGroup({ logical_type: "all", rules: [] });
    expect(screen.getByText(/matches everything/i)).toBeInTheDocument();
  });

  it("adds a rule with sensible defaults when 'Add rule' is clicked", () => {
    const onChange = renderGroup({ logical_type: "all", rules: [] });

    fireEvent.click(screen.getByText("Add rule"));

    expect(onChange).toHaveBeenCalledWith({
      logical_type: "all",
      rules: [{ field: "name_with_owner", operator: "contains", value: "" }],
    });
  });

  it("adds a nested group when 'Add group' is clicked", () => {
    const onChange = renderGroup({ logical_type: "all", rules: [] });

    fireEvent.click(screen.getByText("Add group"));

    expect(onChange).toHaveBeenCalledWith({
      logical_type: "all",
      rules: [{ logical_type: "all", rules: [] }],
    });
  });

  it("changes the logical_type via the select", () => {
    const onChange = renderGroup({ logical_type: "all", rules: [] });

    fireEvent.change(screen.getByDisplayValue("All"), { target: { value: "any" } });

    expect(onChange).toHaveBeenCalledWith({ logical_type: "any", rules: [] });
  });

  it("removes a rule when its remove button is clicked", () => {
    const onChange = renderGroup({
      logical_type: "all",
      rules: [
        { field: "language", operator: "is", value: "Python" },
        { field: "language", operator: "is", value: "Go" },
      ],
    });

    fireEvent.click(screen.getAllByLabelText("Remove rule")[0]);

    expect(onChange).toHaveBeenCalledWith({
      logical_type: "all",
      rules: [{ field: "language", operator: "is", value: "Go" }],
    });
  });

  it("resets operator and value when a rule's field changes to a different kind", () => {
    const onChange = renderGroup({
      logical_type: "all",
      rules: [{ field: "language", operator: "is", value: "Python" }],
    });

    // language (string) -> stargazer_count (number): operator/value must reset,
    // since "is"/"Python" aren't valid for a number field.
    fireEvent.change(screen.getByDisplayValue("Language"), {
      target: { value: "stargazer_count" },
    });

    expect(onChange).toHaveBeenCalledWith({
      logical_type: "all",
      rules: [{ field: "stargazer_count", operator: "equals", value: 0 }],
    });
  });

  it("renders a nested group's own rules independently of the parent's", () => {
    renderGroup({
      logical_type: "all",
      rules: [
        { field: "language", operator: "is", value: "Python" },
        { logical_type: "any", rules: [{ field: "is_archived", operator: "is", value: true }] },
      ],
    });

    // Two "Match ... of the following" selectors: one for the root, one for the nested group.
    expect(screen.getAllByText(/of the following/i)).toHaveLength(2);
    // The nested group is removable (it has an onRemove), the root is not.
    expect(screen.getByLabelText("Remove group")).toBeInTheDocument();
  });
});
