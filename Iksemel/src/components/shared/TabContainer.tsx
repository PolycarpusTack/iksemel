import { useRef, useCallback, type KeyboardEvent } from "react";
import styles from "./TabContainer.module.css";

interface TabContainerProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: readonly { id: string; label: string }[];
  children: React.ReactNode;
}

export function TabContainer({ activeTab, onTabChange, tabs, children }: TabContainerProps) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const focusTab = useCallback(
    (index: number) => {
      const tab = tabs[index];
      if (tab) {
        onTabChange(tab.id);
        tabRefs.current[index]?.focus();
      }
    },
    [tabs, onTabChange],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const currentIndex = tabs.findIndex((t) => t.id === activeTab);
      if (currentIndex === -1) return;

      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          focusTab((currentIndex + 1) % tabs.length);
          break;
        case "ArrowLeft":
          e.preventDefault();
          focusTab((currentIndex - 1 + tabs.length) % tabs.length);
          break;
        case "Home":
          e.preventDefault();
          focusTab(0);
          break;
        case "End":
          e.preventDefault();
          focusTab(tabs.length - 1);
          break;
      }
    },
    [activeTab, tabs, focusTab],
  );

  return (
    <div className={styles["container"]}>
      <div
        className={styles["tablist"]}
        role="tablist"
        aria-label="Export configuration"
        onKeyDown={handleKeyDown}
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            className={`${styles["tab"]} ${activeTab === tab.id ? styles["tabActive"] : ""}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div
        className={styles["panel"]}
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        tabIndex={0}
      >
        {children}
      </div>
    </div>
  );
}
