import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebouncedCallback } from "@/lib/useDebouncedCallback";

describe("useDebouncedCallback", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("only invokes the callback once after the delay, with the latest args", () => {
    const fn = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(fn, 1000));

    act(() => {
      result.current("a");
      result.current("b");
      result.current("c");
    });

    expect(fn).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("c");
  });

  it("resets the timer on every call within the delay window", () => {
    const fn = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(fn, 1000));

    act(() => {
      result.current("first");
    });
    act(() => {
      vi.advanceTimersByTime(600);
      result.current("second");
    });
    act(() => {
      vi.advanceTimersByTime(600);
    });

    // 1200ms elapsed total, but the second call reset the clock at 600ms,
    // so only 600ms has passed since the last call — should not have fired yet.
    expect(fn).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("second");
  });
});
