/**
 * Template style preview component.
 *
 * Displays extracted styles from an uploaded document template:
 * font samples, color swatches, page layout info.
 * Read-only preview so user can verify the template was parsed correctly.
 */

import type { ReactNode } from "react";
import { useAppState } from "@/state/app-state";

export function TemplateStylePreview(): ReactNode {
  const state = useAppState();
  const template = state.documentTemplate;

  if (!template?.extractedStyles) {
    return null;
  }

  const styles = template.extractedStyles;

  return (
    <div className="xfeb-style-preview">
      <h4 className="xfeb-style-preview-title">Extracted Styles</h4>

      {/* Fonts */}
      {styles.fonts.length > 0 && (
        <div className="xfeb-style-preview-section">
          <h5>Fonts ({String(styles.fonts.length)})</h5>
          <div className="xfeb-style-preview-fonts">
            {styles.fonts.slice(0, 8).map((font, i) => (
              <div
                key={`font-${String(i)}`}
                className="xfeb-style-preview-font"
                style={{
                  fontFamily: font.name,
                  fontSize: `${String(Math.min(font.size, 16))}px`,
                  fontWeight: font.bold ? "bold" : "normal",
                  fontStyle: font.italic ? "italic" : "normal",
                }}
              >
                {font.name} {String(font.size)}pt
                {font.bold ? " B" : ""}
                {font.italic ? " I" : ""}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fills / Colors */}
      {styles.fills.length > 0 && (
        <div className="xfeb-style-preview-section">
          <h5>Fills ({String(styles.fills.length)})</h5>
          <div className="xfeb-style-preview-colors">
            {styles.fills
              .filter((f) => f.fgColor && f.patternType !== "none")
              .slice(0, 12)
              .map((fill, i) => (
                <div
                  key={`fill-${String(i)}`}
                  className="xfeb-style-preview-swatch"
                  style={{
                    backgroundColor: `#${fill.fgColor.replace(/^FF/, "")}`,
                  }}
                  title={`#${fill.fgColor}`}
                />
              ))}
          </div>
        </div>
      )}

      {/* Theme Colors */}
      {styles.themeColors.length > 0 && (
        <div className="xfeb-style-preview-section">
          <h5>Theme Colors</h5>
          <div className="xfeb-style-preview-colors">
            {styles.themeColors.slice(0, 12).map((color, i) => (
              <div
                key={`theme-${String(i)}`}
                className="xfeb-style-preview-swatch"
                style={{ backgroundColor: `#${color}` }}
                title={`#${color}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Number Formats */}
      {styles.numberFormats.length > 0 && (
        <div className="xfeb-style-preview-section">
          <h5>Number Formats ({String(styles.numberFormats.length)})</h5>
          <div className="xfeb-style-preview-list">
            {styles.numberFormats.slice(0, 6).map((fmt) => (
              <code key={`fmt-${String(fmt.id)}`} className="xfeb-style-preview-format">
                {fmt.formatCode}
              </code>
            ))}
          </div>
        </div>
      )}

      {/* Cell Styles count */}
      {styles.cellStyles.length > 0 && (
        <div className="xfeb-style-preview-section">
          <h5>Cell Styles: {String(styles.cellStyles.length)}</h5>
        </div>
      )}
    </div>
  );
}
