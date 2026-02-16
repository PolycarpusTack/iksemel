import { useCallback, useEffect, useRef, useState } from "react";

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
}

interface UseTooltipResult {
  tooltip: TooltipState;
  onMouseEnter: (e: React.MouseEvent) => void;
  onMouseLeave: () => void;
}

/**
 * Manages delayed tooltip display with viewport-aware positioning.
 * Shows after 300 ms hover; repositions to avoid overflow.
 */
export function useTooltip(hasContent: boolean): UseTooltipResult {
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0 });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onMouseEnter = useCallback(
    (e: React.MouseEvent) => {
      if (!hasContent) return;
      timer.current = setTimeout(() => {
        const x = Math.min(e.clientX + 12, window.innerWidth - 340);
        const y = Math.min(e.clientY + 12, window.innerHeight - 100);
        setTooltip({ visible: true, x, y });
      }, 300);
    },
    [hasContent],
  );

  const onMouseLeave = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    setTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev));
  }, []);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return { tooltip, onMouseEnter, onMouseLeave };
}
