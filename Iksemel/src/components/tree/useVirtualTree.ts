import { useState, useCallback, useEffect } from "react";
import type { FlatTreeNode } from "./flattenTree";

/**
 * Configuration options for the virtual tree hook.
 */
export interface VirtualTreeOptions {
  /** Flat list of visible nodes (after expansion filtering) */
  readonly flatNodes: readonly FlatTreeNode[];
  /** Height of each row in pixels */
  readonly rowHeight: number;
  /** Container element ref */
  readonly containerRef: React.RefObject<HTMLDivElement | null>;
  /** Buffer rows above/below viewport (default 20) */
  readonly overscan?: number;
}

/**
 * Values returned by the virtual tree hook.
 */
export interface VirtualTreeResult {
  /** Only the visible nodes to render */
  readonly visibleNodes: readonly FlatTreeNode[];
  /** Total height of the virtual scroll container in pixels */
  readonly totalHeight: number;
  /** Offset from top for the first rendered node in pixels */
  readonly offsetY: number;
  /** Handler for scroll events on the container */
  readonly onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
}

const DEFAULT_OVERSCAN = 20;

/**
 * Custom hook that virtualises tree rendering.
 *
 * Calculates which nodes are visible in the scrollable viewport and returns
 * only that subset along with positional data for the scroll container.
 * Tree node components do not know they are virtualised.
 *
 * Uses constant row height for O(1) position calculation and
 * requestAnimationFrame for smooth scroll handling.
 */
export function useVirtualTree({
  flatNodes,
  rowHeight,
  containerRef,
  overscan = DEFAULT_OVERSCAN,
}: VirtualTreeOptions): VirtualTreeResult {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  // Observe container size changes so we recalculate when the panel resizes.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Set initial height.
    setContainerHeight(el.clientHeight);

    // Use ResizeObserver to track container size changes.
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [containerRef]);

  // Scroll handler using requestAnimationFrame for smooth updates.
  const onScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      requestAnimationFrame(() => {
        setScrollTop(target.scrollTop);
      });
    },
    [],
  );

  // Calculate the visible window of nodes.
  const totalHeight = flatNodes.length * rowHeight;

  // The first node index whose top edge is at or above the scroll position.
  const startIdx = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);

  // The last node index whose top edge is within the viewport.
  const visibleCount = Math.ceil(containerHeight / rowHeight);
  const endIdx = Math.min(
    flatNodes.length,
    Math.floor(scrollTop / rowHeight) + visibleCount + overscan,
  );

  const visibleNodes = flatNodes.slice(startIdx, endIdx);
  const offsetY = startIdx * rowHeight;

  return {
    visibleNodes,
    totalHeight,
    offsetY,
    onScroll,
  };
}
