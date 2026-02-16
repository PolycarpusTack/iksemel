import { useState, type KeyboardEvent } from "react";
import type { ReportMetadata } from "@/types";
import { Input, Select } from "@components/primitives";
import styles from "./MetadataEditor.module.css";

interface MetadataEditorProps {
  metadata: ReportMetadata;
  onChange: (metadata: Partial<ReportMetadata>) => void;
}

const CATEGORIES = ["Schedule", "Rights", "EPG", "Finance", "Custom"] as const;
const VERSION_RE = /^\d+\.\d+\.\d+$/;

export function MetadataEditor({ metadata, onChange }: MetadataEditorProps) {
  const [tagInput, setTagInput] = useState("");
  const [nameTouched, setNameTouched] = useState(false);

  const nameEmpty = nameTouched && metadata.name.trim() === "";
  const versionInvalid = metadata.version !== "" && !VERSION_RE.test(metadata.version);

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const trimmed = tagInput.trim();
    if (trimmed === "" || metadata.tags.includes(trimmed)) return;
    onChange({ tags: [...metadata.tags, trimmed] });
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    onChange({ tags: metadata.tags.filter((t) => t !== tag) });
  };

  return (
    <div className={styles["container"]}>
      <span className={styles["sectionLabel"]}>Report Metadata</span>

      <div className={styles["fieldGroup"]}>
        <label className={`${styles["fieldLabel"]} ${styles["required"]}`}>Name</label>
        <Input
          className={nameEmpty ? styles["errorInput"] : undefined}
          value={metadata.name}
          placeholder="Report name"
          onBlur={() => setNameTouched(true)}
          onChange={(e) => onChange({ name: e.target.value })}
        />
        {nameEmpty && <span className={styles["errorMessage"]}>Name is required</span>}
      </div>

      <div className={styles["fieldGroup"]}>
        <label className={styles["fieldLabel"]}>Description</label>
        <Input
          multiline
          value={metadata.description}
          placeholder="Describe the purpose of this report..."
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </div>

      <div className={styles["row"]}>
        <div className={styles["fieldGroup"]}>
          <label className={styles["fieldLabel"]}>Version</label>
          <Input
            value={metadata.version}
            placeholder="1.0.0"
            onChange={(e) => onChange({ version: e.target.value })}
          />
          {versionInvalid && (
            <span className={styles["warningMessage"]}>Expected format: 1.0.0</span>
          )}
        </div>

        <div className={styles["fieldGroup"]}>
          <label className={styles["fieldLabel"]}>Author</label>
          <Input
            value={metadata.author}
            placeholder="Author name"
            onChange={(e) => onChange({ author: e.target.value })}
          />
        </div>
      </div>

      <div className={styles["fieldGroup"]}>
        <label className={styles["fieldLabel"]}>Category</label>
        <Select
          value={metadata.category}
          onChange={(e) => onChange({ category: e.target.value })}
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </Select>
      </div>

      <div className={styles["tagsContainer"]}>
        <label className={styles["fieldLabel"]}>Tags</label>
        <Input
          value={tagInput}
          placeholder="Add a tag and press Enter"
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleTagKeyDown}
        />
        {metadata.tags.length > 0 && (
          <div className={styles["tagList"]}>
            {metadata.tags.map((tag) => (
              <span key={tag} className={styles["tag"]}>
                {tag}
                <button
                  type="button"
                  className={styles["tagDismiss"]}
                  onClick={() => removeTag(tag)}
                  aria-label={`Remove tag ${tag}`}
                >
                  x
                </button>
              </span>
            ))}
          </div>
        )}
        {metadata.tags.length === 0 && (
          <span className={styles["tagHint"]}>No tags added yet</span>
        )}
      </div>
    </div>
  );
}
