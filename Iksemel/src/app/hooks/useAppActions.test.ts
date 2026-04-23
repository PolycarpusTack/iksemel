import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAppActions } from "./useAppActions";

describe("useAppActions", () => {
  it("maps UI actions to correct dispatch payloads", () => {
    const dispatch = vi.fn();
    const { result } = renderHook(() => useAppActions(dispatch));

    act(() => {
      result.current.setSearchQuery("title");
      result.current.expandAll();
      result.current.toggleNode("node-1");
      result.current.setFormat("csv");
      result.current.setActiveTab("templates");
    });

    expect(dispatch).toHaveBeenNthCalledWith(1, { type: "SET_SEARCH_QUERY", query: "title" });
    expect(dispatch).toHaveBeenNthCalledWith(2, { type: "EXPAND_ALL" });
    expect(dispatch).toHaveBeenNthCalledWith(3, { type: "TOGGLE_NODE", nodeId: "node-1" });
    expect(dispatch).toHaveBeenNthCalledWith(4, { type: "SET_FORMAT", format: "csv" });
    expect(dispatch).toHaveBeenNthCalledWith(5, { type: "SET_ACTIVE_TAB", tab: "templates" });
  });

  it("returns stable action references across rerenders", () => {
    const dispatch = vi.fn();
    const { result, rerender } = renderHook(() => useAppActions(dispatch));
    const first = result.current;

    rerender();

    expect(result.current).toBe(first);
    expect(result.current.toggleNode).toBe(first.toggleNode);
  });
});
