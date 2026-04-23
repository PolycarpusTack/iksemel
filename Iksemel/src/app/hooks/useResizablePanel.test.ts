import { describe, expect, it, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useResizablePanel } from "./useResizablePanel";

function keyEvent(key: string): ReactKeyboardEvent<HTMLDivElement> {
  return {
    key,
    preventDefault: vi.fn(),
  } as unknown as ReactKeyboardEvent<HTMLDivElement>;
}

describe("useResizablePanel", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("initializes from default width and persists keyboard resize", () => {
    const { result } = renderHook(() => useResizablePanel({
      minWidth: 240,
      maxWidth: 600,
      defaultWidth: 360,
      storageKey: "panel-width-test",
    }));

    expect(result.current.panelWidth).toBe(360);

    act(() => {
      result.current.handleResizeKeyDown(keyEvent("ArrowRight"));
    });

    expect(result.current.panelWidth).toBe(376);
    expect(localStorage.getItem("panel-width-test")).toBe("376");
  });

  it("supports keyboard bounds shortcuts Home and End", () => {
    const { result } = renderHook(() => useResizablePanel({
      minWidth: 240,
      maxWidth: 600,
      defaultWidth: 360,
      storageKey: "panel-width-test",
    }));

    act(() => {
      result.current.handleResizeKeyDown(keyEvent("End"));
    });
    expect(result.current.panelWidth).toBe(600);

    act(() => {
      result.current.handleResizeKeyDown(keyEvent("Home"));
    });
    expect(result.current.panelWidth).toBe(240);
  });

  it("clamps width when restoring from localStorage", () => {
    localStorage.setItem("panel-width-test", "999");

    const { result } = renderHook(() => useResizablePanel({
      minWidth: 240,
      maxWidth: 600,
      defaultWidth: 360,
      storageKey: "panel-width-test",
    }));

    expect(result.current.panelWidth).toBe(600);
  });

  it("ignores unsupported keyboard keys", () => {
    const { result } = renderHook(() => useResizablePanel({
      minWidth: 240,
      maxWidth: 600,
      defaultWidth: 360,
      storageKey: "panel-width-test",
    }));

    act(() => {
      result.current.handleResizeKeyDown(keyEvent("Enter"));
    });

    expect(result.current.panelWidth).toBe(360);
    expect(localStorage.getItem("panel-width-test")).toBeNull();
  });
});
