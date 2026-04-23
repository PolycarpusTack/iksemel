import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from "react";

interface ResizeHandleProps {
  readonly minWidth: number;
  readonly maxWidth: number;
  readonly width: number;
  readonly onMouseDown: (event: ReactMouseEvent<HTMLDivElement>) => void;
  readonly onKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => void;
  readonly className: string;
}

export function ResizeHandle(props: ResizeHandleProps) {
  const { minWidth, maxWidth, width, onMouseDown, onKeyDown, className } = props;

  return (
    <div
      className={className}
      onMouseDown={onMouseDown}
      onKeyDown={onKeyDown}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize panel"
      aria-valuemin={minWidth}
      aria-valuemax={maxWidth}
      aria-valuenow={width}
      tabIndex={0}
    />
  );
}
