import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import type { AppAction } from "@/state";

interface ShortcutState {
  readonly showShortcuts: boolean;
  setShowShortcuts: Dispatch<SetStateAction<boolean>>;
}

export function useUiShortcuts(dispatch: Dispatch<AppAction>): ShortcutState {
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && !e.shiftKey && e.key === "z") {
        e.preventDefault();
        dispatch({ type: "UNDO" });
        return;
      }

      if ((ctrl && e.shiftKey && e.key === "Z") || (ctrl && e.key === "y")) {
        e.preventDefault();
        dispatch({ type: "REDO" });
        return;
      }

      if (e.key === "?" && e.shiftKey) {
        e.preventDefault();
        setShowShortcuts((v) => !v);
      }
    };

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
    };
  }, [dispatch]);

  return { showShortcuts, setShowShortcuts };
}

export function useBeforeUnloadWarning(hasSchema: boolean): void {
  useEffect(() => {
    if (!hasSchema) {
      return;
    }

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
    };
  }, [hasSchema]);
}
