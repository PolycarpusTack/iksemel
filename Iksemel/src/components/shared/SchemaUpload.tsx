import { useCallback, useRef, useState, type DragEvent, type ChangeEvent } from "react";
import { Button, Input } from "@components/primitives";
import { DEMO_BROADCAST_SCHEMA } from "./demoSchema";
import styles from "./SchemaUpload.module.css";

interface SchemaUploadProps {
  onSchemaLoad: (xsdText: string) => void;
  hasSchema: boolean;
}

export function SchemaUpload({ onSchemaLoad, hasSchema }: SchemaUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      const name = file.name.toLowerCase();
      if (!name.endsWith(".xsd") && !name.endsWith(".xml")) {
        setError("Only .xsd and .xml files are accepted.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          onSchemaLoad(reader.result);
        }
      };
      reader.onerror = () => setError("Failed to read file.");
      reader.readAsText(file);
    },
    [onSchemaLoad],
  );

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const onFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [handleFile],
  );

  const onParse = useCallback(() => {
    setError(null);
    const trimmed = pasteText.trim();
    if (!trimmed) {
      setError("Paste XSD content before parsing.");
      return;
    }
    onSchemaLoad(trimmed);
    setPasteText("");
  }, [pasteText, onSchemaLoad]);

  const onLoadDemo = useCallback(() => {
    setError(null);
    onSchemaLoad(DEMO_BROADCAST_SCHEMA);
  }, [onSchemaLoad]);

  /* ── Compact strip when a schema is already loaded ──────────────── */
  if (hasSchema) {
    return (
      <div className={styles["strip"]}>
        <span className={styles["stripLabel"]}>Schema loaded</span>
        <Button size="sm" onClick={() => fileInputRef.current?.click()}>
          Replace Schema
        </Button>
        <Button size="sm" variant="ghost" onClick={onLoadDemo}>
          Load Demo
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xsd,.xml"
          className={styles["hiddenInput"]}
          onChange={onFileChange}
        />
      </div>
    );
  }

  /* ── Full upload panel ──────────────────────────────────────────── */
  const dropZoneClass = [styles["dropZone"], dragOver ? styles["dropZoneActive"] : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles["panel"]}>
      <h2 className={styles["heading"]}>Load XSD Schema</h2>

      {error && <div className={styles["error"]}>{error}</div>}

      {/* ── File upload / drag-and-drop ── */}
      <div>
        <div className={styles["sectionLabel"]}>Upload file</div>
        <div
          className={dropZoneClass}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
          }}
        >
          <span className={styles["dropIcon"]}>&#128196;</span>
          <span className={styles["dropText"]}>Drop .xsd file here</span>
          <span className={styles["browseHint"]}>or click to browse</span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xsd,.xml"
          className={styles["hiddenInput"]}
          onChange={onFileChange}
        />
      </div>

      {/* ── Divider ── */}
      <div className={styles["divider"]}>
        <span className={styles["dividerLine"]} />
        <span className={styles["dividerText"]}>or</span>
        <span className={styles["dividerLine"]} />
      </div>

      {/* ── Paste area ── */}
      <div className={styles["pasteSection"]}>
        <div className={styles["sectionLabel"]}>Paste XSD content</div>
        <Input
          multiline
          mono
          rows={6}
          placeholder="Paste XSD / XML Schema content here..."
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
        />
        <div className={styles["pasteActions"]}>
          <Button onClick={onParse} disabled={!pasteText.trim()}>
            Parse
          </Button>
        </div>
      </div>

      {/* ── Demo schema ── */}
      <div className={styles["demoSection"]}>
        <Button variant="success" onClick={onLoadDemo}>
          Load Demo Schema
        </Button>
        <span className={styles["demoHint"]}>
          Loads a sample broadcast schedule XSD
        </span>
      </div>
    </div>
  );
}
