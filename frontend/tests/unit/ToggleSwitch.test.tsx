import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ToggleSwitch } from "@/components/ui/ToggleSwitch";

describe("ToggleSwitch", () => {
  it("reflects the checked state via aria-checked", () => {
    render(<ToggleSwitch checked label="Autosave notes" onChange={vi.fn()} />);
    expect(screen.getByRole("switch", { name: "Autosave notes" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("calls onChange with the inverted value when clicked", () => {
    const onChange = vi.fn();
    render(<ToggleSwitch checked={false} label="Show language facets" onChange={onChange} />);

    fireEvent.click(screen.getByRole("switch", { name: "Show language facets" }));

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("does not fire onChange when disabled", () => {
    const onChange = vi.fn();
    render(<ToggleSwitch checked={false} label="Auto-tag by topic" onChange={onChange} disabled />);

    fireEvent.click(screen.getByRole("switch", { name: "Auto-tag by topic" }));

    expect(onChange).not.toHaveBeenCalled();
  });
});
