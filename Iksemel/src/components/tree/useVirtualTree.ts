import { useState, useCallback, useEffect, useMemo, useRef } from "react";
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

interface VirtualRange {
  readonly startIdx: number;
  readonly endIdx: number;
}

interface ComputeVirtualRangeInput {
  readonly itemCount: number;
  readonly rowHeight: number;
  readonly scrollTop: number;
  readonly containerHeight: number;
  readonly overscan: number;
}

export function computeVirtualRange(input: ComputeVirtualRangeInput): VirtualRange {
  const {
    itemCount,
    rowHeight,
    scrollTop,
    containerHeight,
    overscan,
  } = input;

  if (itemCount <= 0 || rowHeight <= 0) {
    return { startIdx: 0, endIdx: 0 };
  }

  const startIdx = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const visibleCount = Math.ceil(Math.max(0, containerHeight) / rowHeight);
  const endIdx = Math.min(
    itemCount,
    Math.floor(scrollTop / rowHeight) + visibleCount + overscan,
  );

  return { startIdx, endIdx };
}

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
  const [range, setRange] = useState<VirtualRange>({ startIdx: 0, endIdx: 0 });
  const rafRef = useRef<number | null>(null);
  const scrollTopRef = useRef(0);
  const containerHeightRef = useRef(0);

  const updateRange = useCallback((scrollTop: number, containerHeight: number) => {
    const next = computeVirtualRange({
      itemCount: flatNodes.length,
      rowHeight,
      scrollTop,
      containerHeight,
      overscan,
    });

    setRange((prev) => (
      prev.startIdx === next.startIdx && prev.endIdx === next.endIdx
        ? prev
        : next
    ));
  }, [flatNodes.length, overscan, rowHeight]);

  // Observe container size changes so we recalculate when the panel resizes.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Set initial height.
    containerHeightRef.current = el.clientHeight;
    updateRange(scrollTopRef.current, containerHeightRef.current);

    // Use ResizeObserver to track container size changes.
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        containerHeightRef.current = entry.contentRect.height;
        updateRange(scrollTopRef.current, containerHeightRef.current);
      }
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [containerRef, updateRange]);

  useEffect(() => {
    updateRange(scrollTopRef.current, containerHeightRef.current);
  }, [updateRange]);

  useEffect(() => () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  // Scroll handler using requestAnimationFrame for smooth updates.
  const onScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      scrollTopRef.current = target.scrollTop;

      if (rafRef.current !== null) {
        return;
      }

      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        updateRange(scrollTopRef.current, target.clientHeight);
      });
    },
    [updateRange],
  );

  // Calculate the visible window of nodes.
  const totalHeight = flatNodes.length * rowHeight;
  const visibleNodes = useMemo(
    () => flatNodes.slice(range.startIdx, range.endIdx),
    [flatNodes, range.endIdx, range.startIdx],
  );
  const offsetY = range.startIdx * rowHeight;

  return {
    visibleNodes,
    totalHeight,
    offsetY,
    onScroll,
  };
}
