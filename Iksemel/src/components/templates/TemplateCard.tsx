import { memo, useCallback, type KeyboardEvent } from "react";
import type { TemplateSpec, TemplateCategory } from "@engine/templates";
import styles from "./TemplateBrowser.module.css";

// ─── Category colour mapping ────────────────────────────────────────────

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  schedule: "Schedule",
  epg: "EPG",
  rights: "Rights",
  compliance: "Compliance",
  commercial: "Commercial",
  custom: "Custom",
};

const CATEGORY_CLASSES: Record<TemplateCategory, string> = {
  schedule: styles["badgeSchedule"] ?? "",
  epg: styles["badgeEpg"] ?? "",
  rights: styles["badgeRights"] ?? "",
  compliance: styles["badgeCompliance"] ?? "",
  commercial: styles["badgeCommercial"] ?? "",
  custom: styles["badgeCustom"] ?? "",
};

// ─── Component ──────────────────────────────────────────────────────────

interface TemplateCardProps {
  template: TemplateSpec;
  onClick: (template: TemplateSpec) => void;
}

function TemplateCardInner({ template, onClick }: TemplateCardProps) {
  const handleClick = useCallback(() => {
    onClick(template);
  }, [template, onClick]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick(template);
      }
    },
    [template, onClick],
  );

  const columnCount = template.config.columns.length;
  const displayTags = template.tags.slice(0, 3);
  const categoryLabel = CATEGORY_LABELS[template.category];
  const categoryClass = CATEGORY_CLASSES[template.category];

  return (
    <article
      className={styles["card"]}
      role="button"
      tabIndex={0}
      aria-label={`Apply template: ${template.name}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <div className={styles["cardHeader"]}>
        <h3 className={styles["cardName"]}>{template.name}</h3>
        <span className={`${styles["badge"]} ${categoryClass}`}>
          {categoryLabel}
        </span>
      </div>

      <p className={styles["cardDescription"]}>{template.description}</p>

      <div className={styles["cardMeta"]}>
        <span className={styles["formatBadge"]}>
          {template.config.format.toUpperCase()}
        </span>
        <span className={styles["columnCount"]}>
          {columnCount} {columnCount === 1 ? "column" : "columns"}
        </span>
        {template.author && (
          <span className={styles["author"]}>by {template.author}</span>
        )}
      </div>

      {displayTags.length > 0 && (
        <div className={styles["tags"]} aria-label="Template tags">
          {displayTags.map((tag) => (
            <span key={tag} className={styles["tag"]}>
              {tag}
            </span>
          ))}
          {template.tags.length > 3 && (
            <span className={styles["tag"]}>
              +{template.tags.length - 3}
            </span>
          )}
        </div>
      )}
    </article>
  );
}

export const TemplateCard = memo(TemplateCardInner);
