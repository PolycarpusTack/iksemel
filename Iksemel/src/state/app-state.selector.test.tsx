import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useRef, type ReactNode } from "react";
import { AppProvider, useAppDispatch, useAppSelector } from "./app-state";

function wrapper(props: { readonly children: ReactNode }) {
  return <AppProvider>{props.children}</AppProvider>;
}

describe("useAppSelector", () => {
  it("rerenders only when selected slice changes", () => {
    const { result } = renderHook(() => {
      const activeTab = useAppSelector((state) => state.activeTab);
      const dispatch = useAppDispatch();
      const renders = useRef(0);
      renders.current += 1;
      return { activeTab, dispatch, renders: renders.current };
    }, { wrapper });

    expect(result.current.activeTab).toBe("design");
    expect(result.current.renders).toBe(1);

    act(() => {
      result.current.dispatch({ type: "SET_SEARCH_QUERY", query: "title" });
    });

    expect(result.current.activeTab).toBe("design");
    expect(result.current.renders).toBe(1);

    act(() => {
      result.current.dispatch({ type: "SET_ACTIVE_TAB", tab: "xslt" });
    });

    expect(result.current.activeTab).toBe("xslt");
    expect(result.current.renders).toBe(2);
  });
});
