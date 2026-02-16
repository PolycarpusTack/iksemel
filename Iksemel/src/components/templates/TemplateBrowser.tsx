import {
  useState,
  useCallback,
  useRef,
  useMemo,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import type { TemplateSpec, TemplateCategory } from "@engine/templates";
import { Button } from "@components/primitives";
import { Input } from "@components/primitives";
import { Select } from "@components/primitives";
import { TemplateCard } from "./TemplateCard";
import styles from "./TemplateBrowser.module.css";

// ─── Constants ──────────────────────────────────────────────────────────

type FilterCategory = "all" | TemplateCategory;

const FILTER_OPTIONS: readonly { id: FilterCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "schedule", label: "Schedule" },
  { id: "epg", label: "EPG" },
  { id: "rights", label: "Rights" },
  { id: "compliance", label: "Compliance" },
  { id: "commercial", label: "Commercial" },
  { id: "custom", label: "Custom" },
] as const;

const CATEGORY_OPTIONS: readonly { value: TemplateCategory; label: string }[] = [
  { value: "schedule", label: "Schedule" },
  { value: "epg", label: "EPG" },
  { value: "rights", label: "Rights" },
  { value: "compliance", label: "Compliance" },
  { value: "commercial", label: "Commercial" },
  { value: "custom", label: "Custom" },
] as const;

// ─── Props ──────────────────────────────────────────────────────────────

interface SaveTemplateOverrides {
  name: string;
  description: string;
  category: string;
}

interface TemplateBrowserProps {
  templates: readonly TemplateSpec[];
  onApplyTemplate: (template: TemplateSpec) => void;
  onSaveAsTemplate: (overrides: SaveTemplateOverrides) => void;
  onImportTemplate: (json: string) => void;
}

// ─── Component ──────────────────────────────────────────────────────────

export function TemplateBrowser({
  templates,
  onApplyTemplate,
  onSaveAsTemplate,
  onImportTemplate,
}: TemplateBrowserProps) {
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("all");
  const [confirmTemplate, setConfirmTemplate] = useState<TemplateSpec | null>(null);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveDescription, setSaveDescription] = useState("");
  const [saveCategory, setSaveCategory] = useState<TemplateCategory>("custom");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Filtered templates ────────────────────────────────────────────────

  const filtered = useMemo(
    () =>
      activeFilter === "all"
        ? templates
        : templates.filter((t) => t.category === activeFilter),
    [templates, activeFilter],
  );

  // ── Card click → show confirmation ────────────────────────────────────

  const handleCardClick = useCallback((template: TemplateSpec) => {
    setConfirmTemplate(template);
  }, []);

  // ── Confirm apply ─────────────────────────────────────────────────────

  const handleConfirmApply = useCallback(() => {
    if (confirmTemplate) {
      onApplyTemplate(confirmTemplate);
      setConfirmTemplate(null);
    }
  }, [confirmTemplate, onApplyTemplate]);

  const handleConfirmCancel = useCallback(() => {
    setConfirmTemplate(null);
  }, []);

  const handleConfirmKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setConfirmTemplate(null);
      }
    },
    [],
  );

  // ── Overlay click dismisses ───────────────────────────────────────────

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        setConfirmTemplate(null);
      }
    },
    [],
  );

  const handleSaveOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        setShowSaveForm(false);
      }
    },
    [],
  );

  // ── Save as template ──────────────────────────────────────────────────

  const handleSaveClick = useCallback(() => {
    setShowSaveForm(true);
    setSaveName("");
    setSaveDescription("");
    setSaveCategory("custom");
  }, []);

  const handleSaveSubmit = useCallback(() => {
    onSaveAsTemplate({
      name: saveName.trim(),
      description: saveDescription.trim(),
      category: saveCategory,
    });
    setShowSaveForm(false);
  }, [onSaveAsTemplate, saveName, saveDescription, saveCategory]);

  const handleSaveCancel = useCallback(() => {
    setShowSaveForm(false);
  }, []);

  const handleSaveKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setShowSaveForm(false);
      }
    },
    [],
  );

  // ── Import template ───────────────────────────────────────────────────

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          onImportTemplate(reader.result);
        }
      };
      reader.readAsText(file);

      // Reset input so the same file can be re-selected
      e.target.value = "";
    },
    [onImportTemplate],
  );

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <section className={styles["browser"]} aria-label="Template browser">
      {/* Category filter bar */}
      <nav className={styles["toolbar"]} aria-label="Template filters">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            className={
              activeFilter === opt.id
                ? styles["filterBtnActive"]
                : styles["filterBtn"]
            }
            aria-pressed={activeFilter === opt.id}
            onClick={() => setActiveFilter(opt.id)}
          >
            {opt.label}
          </button>
        ))}

        <div className={styles["toolbarActions"]}>
          <Button size="sm" variant="default" onClick={handleSaveClick}>
            Save Current as Template
          </Button>
          <Button size="sm" variant="ghost" onClick={handleImportClick}>
            Import Template
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className={styles["hiddenInput"]}
            tabIndex={-1}
            aria-hidden="true"
            onChange={handleFileChange}
          />
        </div>
      </nav>

      {/* Template grid */}
      {filtered.length > 0 ? (
        <div className={styles["grid"]} role="list" aria-label="Templates">
          {filtered.map((template) => (
            <div key={template.id} role="listitem">
              <TemplateCard template={template} onClick={handleCardClick} />
            </div>
          ))}
        </div>
      ) : (
        <div className={styles["empty"]}>
          No templates match the selected category.
        </div>
      )}

      {/* Confirmation dialog */}
      {confirmTemplate !== null && (
        <div
          className={styles["overlay"]}
          role="presentation"
          onClick={handleOverlayClick}
          onKeyDown={handleConfirmKeyDown}
        >
          <div
            className={styles["dialog"]}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-message"
          >
            <h2 id="confirm-dialog-title" className={styles["dialogTitle"]}>
              Apply Template
            </h2>
            <p id="confirm-dialog-message" className={styles["dialogMessage"]}>
              Apply &lsquo;{confirmTemplate.name}&rsquo;? This will replace your
              current configuration.
            </p>
            <div className={styles["dialogActions"]}>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleConfirmCancel}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="success"
                onClick={handleConfirmApply}
                autoFocus
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Save-as-template form dialog */}
      {showSaveForm && (
        <div
          className={styles["overlay"]}
          role="presentation"
          onClick={handleSaveOverlayClick}
          onKeyDown={handleSaveKeyDown}
        >
          <div
            className={styles["saveForm"]}
            role="dialog"
            aria-modal="true"
            aria-labelledby="save-form-title"
          >
            <h2 id="save-form-title" className={styles["saveFormTitle"]}>
              Save as Template
            </h2>

            <div className={styles["saveFormField"]}>
              <label htmlFor="tpl-save-name" className={styles["saveFormLabel"]}>
                Name
              </label>
              <Input
                id="tpl-save-name"
                compact
                value={saveName}
                onChange={(e) => setSaveName((e.target as HTMLInputElement).value)}
                placeholder="Template name"
                autoFocus
              />
            </div>

            <div className={styles["saveFormField"]}>
              <label htmlFor="tpl-save-desc" className={styles["saveFormLabel"]}>
                Description
              </label>
              <Input
                id="tpl-save-desc"
                compact
                value={saveDescription}
                onChange={(e) =>
                  setSaveDescription((e.target as HTMLInputElement).value)
                }
                placeholder="Brief description of this template"
              />
            </div>

            <div className={styles["saveFormField"]}>
              <label htmlFor="tpl-save-category" className={styles["saveFormLabel"]}>
                Category
              </label>
              <Select
                id="tpl-save-category"
                compact
                value={saveCategory}
                onChange={(e) =>
                  setSaveCategory(e.target.value as TemplateCategory)
                }
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className={styles["saveFormActions"]}>
              <Button size="sm" variant="ghost" onClick={handleSaveCancel}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="success"
                onClick={handleSaveSubmit}
                disabled={saveName.trim().length === 0}
              >
                Save Template
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
