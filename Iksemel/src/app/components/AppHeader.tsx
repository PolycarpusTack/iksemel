import { SchemaUpload } from "@components/shared";
import { Button } from "@components/primitives";
import styles from "../../App.module.css";

declare const __XFEB_VERSION__: string;
const APP_VERSION: string = typeof __XFEB_VERSION__ !== "undefined" ? __XFEB_VERSION__ : "0.0.0";

interface AppHeaderProps {
  readonly isEmbedded: boolean;
  readonly hasSchema: boolean;
  readonly hasPolicyErrors: boolean;
  readonly onSendPackageReady: () => void;
  readonly onSchemaLoad: (xsdText: string) => void;
  readonly onShowShortcuts: () => void;
  readonly onStartTour?: () => void;
}

export function AppHeader(props: AppHeaderProps) {
  const {
    isEmbedded,
    hasSchema,
    hasPolicyErrors,
    onSendPackageReady,
    onSchemaLoad,
    onShowShortcuts,
    onStartTour,
  } = props;

  return (
    <header className={styles["header"]}>
      <div className={styles["logo"]}>
        <svg width="20" height="20" viewBox="0 0 22 22" fill="none" aria-hidden="true">
          <rect x="2" y="2" width="18" height="18" rx="3" stroke="var(--color-accent-green)" strokeWidth="1.5" />
          <path d="M7 8h8M7 11h5M7 14h6" stroke="var(--color-accent-green)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span className={styles["title"]}>Iksemel</span>
        <span className={styles["version"]}>v{APP_VERSION}</span>
      </div>
      <span className={styles["subtitle"]}>Schema &rarr; Filter &rarr; Transform &rarr; Package</span>
      <div className={styles["spacer"]} />
      {isEmbedded && hasSchema && (
        <Button variant="success" size="sm" onClick={onSendPackageReady} disabled={hasPolicyErrors}>
          Save to WHATS&apos;ON
        </Button>
      )}
      {hasSchema && !isEmbedded && (
        <SchemaUpload onSchemaLoad={onSchemaLoad} hasSchema={true} />
      )}
      {onStartTour && (
        <Button size="sm" variant="ghost" onClick={onStartTour} aria-label="Take a guided tour">
          Tour
        </Button>
      )}
      <Button size="sm" variant="ghost" onClick={onShowShortcuts} aria-label="Keyboard shortcuts (Shift+?)">
        ?
      </Button>
    </header>
  );
}
