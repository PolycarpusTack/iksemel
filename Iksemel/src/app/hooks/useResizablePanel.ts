import { useCallback, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from "react";

interface UseResizablePanelOptions {
  readonly minWidth: number;
  readonly maxWidth: number;
  readonly defaultWidth: number;
  readonly storageKey: string;
}

interface ResizablePanelResult {
  readonly panelWidth: number;
  handleResizeStart(event: ReactMouseEvent): void;
  handleResizeKeyDown(event: ReactKeyboardEvent<HTMLDivElement>): void;
}

export function useResizablePanel(options: UseResizablePanelOptions): ResizablePanelResult {
  const { minWidth, maxWidth, defaultWidth, storageKey } = options;

  const [panelWidth, setPanelWidth] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    const parsed = saved ? Number(saved) : Number.NaN;
    if (!Number.isFinite(parsed)) {
      return defaultWidth;
    }
    return Math.max(minWidth, Math.min(maxWidth, parsed));
  });

  const persist = useCallback((width: number) => {
    localStorage.setItem(storageKey, String(width));
  }, [storageKey]);

  const handleResizeStart = useCallback((event: ReactMouseEvent) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = panelWidth;

    const onMove = (ev: MouseEvent) => {
      const width = Math.max(minWidth, Math.min(maxWidth, startWidth + ev.clientX - startX));
      setPanelWidth(width);
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      setPanelWidth((width) => {
        persist(width);
        return width;
      });
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [maxWidth, minWidth, panelWidth, persist]);

  const handleResizeKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    let next: number | null = null;
    if (event.key === "ArrowLeft") {
      next = panelWidth - 16;
    } else if (event.key === "ArrowRight") {
      next = panelWidth + 16;
    } else if (event.key === "Home") {
      next = minWidth;
    } else if (event.key === "End") {
      next = maxWidth;
    }

    if (next === null) {
      return;
    }

    event.preventDefault();
    const width = Math.max(minWidth, Math.min(maxWidth, next));
    setPanelWidth(width);
    persist(width);
  }, [maxWidth, minWidth, panelWidth, persist]);

  return {
    panelWidth,
    handleResizeStart,
    handleResizeKeyDown,
  };
}
