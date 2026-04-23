/**
 * Template mapping panel component.
 *
 * When a user uploads a document template, shows extracted structure
 * and lets the user choose which sheet/section/slide receives the data table,
 * and map extracted cell styles to header/data/alternating rows.
 */

import type { ReactNode } from "react";
import { useAppSelector } from "@/state";
import type { DocumentTemplate } from "@/types";

/**
 * Shows structure extracted from the uploaded template and lets the user
 * configure how data maps into the template's structure.
 */
export function TemplateMappingPanel(): ReactNode {
  const template = useAppSelector((state) => state.documentTemplate);

  if (!template) {
    return null;
  }

  return (
    <div className="xfeb-mapping-panel">
      <h4 className="xfeb-mapping-title">Template Mapping</h4>

      <TemplateInfo template={template} />

      <div className="xfeb-mapping-section">
        <h5 className="xfeb-mapping-section-title">Injection Target</h5>
        <p className="xfeb-mapping-hint">
          Data table will be injected into:
        </p>
        <code className="xfeb-mapping-target">
          {template.injectionTarget || "Auto-detected"}
        </code>
      </div>

      <ScaffoldFileList template={template} />
    </div>
  );
}

function TemplateInfo({ template }: { readonly template: DocumentTemplate }): ReactNode {
  return (
    <div className="xfeb-mapping-section">
      <h5 className="xfeb-mapping-section-title">Template Details</h5>
      <dl className="xfeb-mapping-details">
        <dt>Name</dt>
        <dd>{template.name}</dd>
        <dt>Source Format</dt>
        <dd>{template.sourceFormat.toUpperCase()}</dd>
        <dt>Target Format</dt>
        <dd>{template.targetFormat}</dd>
        <dt>File</dt>
        <dd>{template.originalFilename}</dd>
        <dt>Scaffold Files</dt>
        <dd>{String(template.scaffoldEntries.length)}</dd>
      </dl>
    </div>
  );
}

function ScaffoldFileList({ template }: { readonly template: DocumentTemplate }): ReactNode {
  const dataTargets = template.scaffoldEntries.filter((e) => e.isDataTarget);
  const otherFiles = template.scaffoldEntries.filter((e) => !e.isDataTarget);

  return (
    <div className="xfeb-mapping-section">
      <h5 className="xfeb-mapping-section-title">
        Scaffold Files ({String(template.scaffoldEntries.length)})
      </h5>

      {dataTargets.length > 0 && (
        <div className="xfeb-mapping-targets">
          <span className="xfeb-mapping-label">Data targets:</span>
          <ul className="xfeb-mapping-file-list">
            {dataTargets.map((entry) => (
              <li key={entry.path} className="xfeb-mapping-file xfeb-mapping-file--target">
                {entry.path}
              </li>
            ))}
          </ul>
        </div>
      )}

      {otherFiles.length > 0 && (
        <details className="xfeb-mapping-other-files">
          <summary>Other files ({String(otherFiles.length)})</summary>
          <ul className="xfeb-mapping-file-list">
            {otherFiles.map((entry) => (
              <li key={entry.path} className="xfeb-mapping-file">
                {entry.path}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
