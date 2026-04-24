import { useState, useCallback } from "react";
import { loadHistory, saveNamed, deleteNamed } from "@engine/history";
import type { ConfigSnapshot, ConfigHistory } from "@engine/history";
import styles from "./HistoryPanel.module.css";

interface HistoryPanelProps {
  readonly currentSnapshot: ConfigSnapshot;
  readonly onRestore: (snapshot: ConfigSnapshot) => void;
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function snapshotSummary(snapshot: ConfigSnapshot): string {
  const fieldCount = Object.values(snapshot.selection).filter(Boolean).length;
  const filterCount = Object.keys(snapshot.filterValues).length;
  const colCount = snapshot.columns.length;
  const parts = [`${fieldCount} fields`, `${colCount} cols`];
  if (filterCount > 0) parts.push(`${filterCount} filters`);
  return parts.join(" · ");
}

export function HistoryPanel({ currentSnapshot, onRestore }: HistoryPanelProps) {
  const [history, setHistory] = useState<ConfigHistory>(() => loadHistory());
  const [saveName, setSaveName] = useState("");

  const refresh = useCallback(() => setHistory(loadHistory()), []);

  const handleSave = useCallback(() => {
    const name = saveName.trim();
    if (!name) return;
    saveNamed(name, { ...currentSnapshot, timestamp: Date.now() });
    setSaveName("");
    refresh();
  }, [saveName, currentSnapshot, refresh]);

  const handleDelete = useCallback((id: string) => {
    deleteNamed(id);
    refresh();
  }, [refresh]);

  return (
    <div className={styles["panel"]}>
      {/* Save current */}
      <section className={styles["section"]}>
        <h3 className={styles["sectionTitle"]}>Save current config</h3>
        <div className={styles["saveRow"]}>
          <input
            className={styles["nameInput"]}
            type="text"
            placeholder="Config name…"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            aria-label="Named config name"
          />
          <button
            className={styles["saveBtn"]}
            onClick={handleSave}
            disabled={!saveName.trim()}
          >
            Save
          </button>
        </div>
      </section>

      {/* Named configs */}
      {history.named.length > 0 && (
        <section className={styles["section"]}>
          <h3 className={styles["sectionTitle"]}>Named ({history.named.length})</h3>
          <ul className={styles["list"]}>
            {[...history.named].reverse().map((entry) => (
              <li key={entry.id} className={styles["entry"]}>
                <div className={styles["entryInfo"]}>
                  <span className={styles["entryName"]}>{entry.name}</span>
                  <span className={styles["entrySummary"]}>{snapshotSummary(entry)}</span>
                </div>
                <div className={styles["entryActions"]}>
                  <button className={styles["restoreBtn"]} onClick={() => onRestore(entry)}>Restore</button>
                  <button className={styles["deleteBtn"]} onClick={() => handleDelete(entry.id)} aria-label={`Delete ${entry.name}`}>×</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Recent auto-saves */}
      {history.recent.length > 0 && (
        <section className={styles["section"]}>
          <h3 className={styles["sectionTitle"]}>Recent ({history.recent.length})</h3>
          <ul className={styles["list"]}>
            {history.recent.map((entry, i) => (
              <li key={entry.timestamp + "-" + i} className={styles["entry"]}>
                <div className={styles["entryInfo"]}>
                  <span className={styles["entryName"]}>{formatTimestamp(entry.timestamp)}</span>
                  <span className={styles["entrySummary"]}>{snapshotSummary(entry)}</span>
                </div>
                <button className={styles["restoreBtn"]} onClick={() => onRestore(entry)}>Restore</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {history.named.length === 0 && history.recent.length === 0 && (
        <p className={styles["empty"]}>No history yet. Changes auto-save after 2 seconds of inactivity.</p>
      )}
    </div>
  );
}
