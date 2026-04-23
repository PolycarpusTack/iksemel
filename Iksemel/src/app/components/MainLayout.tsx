import type { ReactNode } from "react";
import { SchemaUpload } from "@components/shared";
import styles from "../../App.module.css";

interface MainLayoutProps {
  readonly hasSchema: boolean;
  readonly isEmbedded: boolean;
  readonly onSchemaLoad: (xsdText: string) => void;
  readonly children: ReactNode;
}

export function MainLayout({ hasSchema, isEmbedded, onSchemaLoad, children }: MainLayoutProps) {
  return (
    <main className={styles["main"]}>
      {!hasSchema ? (
        <div className={styles["uploadContainer"]}>
          {isEmbedded ? (
            <p className={styles["embeddedWaiting"]}>Waiting for schema from WHATS&apos;ON...</p>
          ) : (
            <SchemaUpload onSchemaLoad={onSchemaLoad} hasSchema={false} />
          )}
        </div>
      ) : (
        children
      )}
    </main>
  );
}
