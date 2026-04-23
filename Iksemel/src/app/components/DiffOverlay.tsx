import type { ConfigDiffResult } from "@engine/diff";
import { DiffViewer } from "@components/diff";
import styles from "../../App.module.css";

interface DiffOverlayProps {
  readonly diff: ConfigDiffResult | null;
  readonly onAcceptAll: () => void;
  readonly onDismiss: () => void;
}

export function DiffOverlay({ diff, onAcceptAll, onDismiss }: DiffOverlayProps) {
  if (!diff) {
    return null;
  }

  return (
    <div className={styles["diffOverlay"]}>
      <div className={styles["diffModal"]}>
        <DiffViewer
          diff={diff}
          onAcceptChange={() => {}}
          onAcceptAll={onAcceptAll}
          onDismiss={onDismiss}
        />
      </div>
    </div>
  );
}
