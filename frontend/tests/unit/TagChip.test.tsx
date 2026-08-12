import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TagChip } from "@/components/tags/TagChip";

describe("TagChip", () => {
  it("renders the tag name", () => {
    render(<TagChip name="machine-learning" />);
    expect(screen.getByText("machine-learning")).toBeInTheDocument();
  });

  it("calls onRemove and does not bubble to onClick when the remove button is clicked", () => {
    const onRemove = vi.fn();
    const onClick = vi.fn();
    render(<TagChip name="cli" onRemove={onRemove} onClick={onClick} />);

    fireEvent.click(screen.getByLabelText("Remove tag cli"));

    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("calls onClick when the chip body is clicked", () => {
    const onClick = vi.fn();
    render(<TagChip name="rust" onClick={onClick} />);

    fireEvent.click(screen.getByText("rust"));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
