/**
 * Document template upload component.
 *
 * Drag-and-drop zone accepting .xlsx, .docx, .pptx, .ods, .odt files.
 * On drop: calls extractDocumentTemplate(), dispatches SET_DOCUMENT_TEMPLATE.
 * Shows current template name/format when one is loaded.
 */

import { useCallback, useRef, useState, type DragEvent, type ReactNode } from "react";
import { useAppState, useAppDispatch } from "@/state/app-state";
import { extractDocumentTemplate } from "@engine/document-templates";

const ACCEPTED_EXTENSIONS = [".xlsx", ".docx", ".pptx", ".ods", ".odt"];
const ACCEPT_STRING = ACCEPTED_EXTENSIONS.join(",");

export function DocumentTemplateUpload(): ReactNode {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const template = await extractDocumentTemplate(buffer, file.name);
      dispatch({ type: "SET_DOCUMENT_TEMPLATE", template });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process template file");
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
  }, [handleFile]);

  const handleRemove = useCallback(() => {
    dispatch({ type: "CLEAR_DOCUMENT_TEMPLATE" });
    setError(null);
  }, [dispatch]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const template = state.documentTemplate;

  if (template) {
    return (
      <div className="xfeb-template-loaded">
        <div className="xfeb-template-info">
          <span className="xfeb-template-badge">{template.sourceFormat.toUpperCase()}</span>
          <span className="xfeb-template-name">{template.name}</span>
          <span className="xfeb-template-filename">({template.originalFilename})</span>
        </div>
        <button
          type="button"
          className="xfeb-template-remove"
          onClick={handleRemove}
        >
          Remove template
        </button>
      </div>
    );
  }

  return (
    <div className="xfeb-template-upload-wrapper">
      <div
        className={`xfeb-template-dropzone ${dragOver ? "xfeb-template-dropzone--active" : ""}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleClick(); }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_STRING}
          onChange={handleInputChange}
          style={{ display: "none" }}
        />
        {loading ? (
          <span className="xfeb-template-loading">Processing template...</span>
        ) : (
          <>
            <span className="xfeb-template-icon">+</span>
            <span className="xfeb-template-label">
              Drop a styled document here, or click to browse
            </span>
            <span className="xfeb-template-hint">
              Supported: {ACCEPTED_EXTENSIONS.join(", ")}
            </span>
          </>
        )}
      </div>
      {error && <div className="xfeb-template-error">{error}</div>}
    </div>
  );
}
