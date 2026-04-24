import styles from "./Breadcrumb.module.css";

interface BreadcrumbSegment {
  readonly id: string;
  readonly name: string;
}

interface BreadcrumbProps {
  readonly segments: readonly BreadcrumbSegment[];
  readonly onNavigate: (nodeId: string) => void;
}

export function Breadcrumb({ segments, onNavigate }: BreadcrumbProps) {
  if (segments.length === 0) return null;

  return (
    <nav className={styles["breadcrumb"]} aria-label="Schema path">
      {segments.map((seg, i) => (
        <span key={seg.id} className={styles["item"]}>
          {i > 0 && <span className={styles["separator"]} aria-hidden="true">/</span>}
          <button
            className={`${styles["segment"]} ${i === segments.length - 1 ? styles["segmentActive"] ?? "" : ""}`}
            onClick={() => onNavigate(seg.id)}
            aria-current={i === segments.length - 1 ? "location" : undefined}
          >
            {seg.name}
          </button>
        </span>
      ))}
    </nav>
  );
}
