import type { StyleConfig, StylePresetKey, ExportFormat } from "@/types";
import { Select, Input } from "@components/primitives";
import { ToggleSwitch } from "./ToggleSwitch";
import styles from "./StylePanel.module.css";

interface StylePanelProps {
  style: StyleConfig;
  stylePresetKey: StylePresetKey;
  format: ExportFormat;
  onStyleChange: (style: Partial<StyleConfig>) => void;
  onPresetChange: (key: StylePresetKey) => void;
}

const PRESET_OPTIONS: readonly { key: StylePresetKey; label: string }[] = [
  { key: "corporate", label: "Corporate" },
  { key: "broadcast", label: "Broadcast" },
  { key: "clean", label: "Clean" },
  { key: "warm", label: "Warm" },
  { key: "modern", label: "Modern" },
];

const FONT_OPTIONS = [
  "Arial, sans-serif",
  "Calibri, sans-serif",
  "Helvetica, sans-serif",
  "Times New Roman, serif",
  "Georgia, serif",
  "Courier New, monospace",
];

export function StylePanel({
  style,
  stylePresetKey,
  format,
  onStyleChange,
  onPresetChange,
}: StylePanelProps) {
  return (
    <div className={styles["container"]}>
      <div className={styles["section"]}>
        <span className={styles["sectionLabel"]}>Preset</span>
        <Select
          value={stylePresetKey}
          onChange={(e) => onPresetChange(e.target.value as StylePresetKey)}
          aria-label="Style preset"
        >
          {PRESET_OPTIONS.map((p) => (
            <option key={p.key} value={p.key}>{p.label}</option>
          ))}
        </Select>
      </div>

      <div className={styles["section"]}>
        <span className={styles["sectionLabel"]}>Colors</span>
        <div className={styles["colorGrid"]}>
          <ColorField label="Header BG" value={style.headerBg} onChange={(v) => onStyleChange({ headerBg: v })} />
          <ColorField label="Header FG" value={style.headerFg} onChange={(v) => onStyleChange({ headerFg: v })} />
          <ColorField label="Alt Row BG" value={style.altRowBg} onChange={(v) => onStyleChange({ altRowBg: v })} />
          <ColorField label="Group BG" value={style.groupBg} onChange={(v) => onStyleChange({ groupBg: v })} />
        </div>
      </div>

      <div className={styles["section"]}>
        <span className={styles["sectionLabel"]}>Typography</span>
        <div className={styles["fontRow"]}>
          <div className={styles["fieldWrapper"]}>
            <label className={styles["fieldLabel"]} htmlFor="font-family">Font Family</label>
            <Select
              id="font-family"
              value={style.fontFamily}
              onChange={(e) => onStyleChange({ fontFamily: e.target.value })}
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f} value={f}>{f.split(",")[0]}</option>
              ))}
            </Select>
          </div>
          <div className={styles["fieldWrapper"]}>
            <label className={styles["fieldLabel"]} htmlFor="font-size">Size (pt)</label>
            <Input
              id="font-size"
              compact
              type="text"
              value={style.fontSize}
              onChange={(e) => onStyleChange({ fontSize: (e.target as HTMLInputElement).value })}
            />
          </div>
        </div>
      </div>

      <div className={styles["section"]}>
        <span className={styles["sectionLabel"]}>Display</span>
        <ToggleSwitch
          label="Show Title"
          checked={style.showTitle}
          onChange={(v) => onStyleChange({ showTitle: v })}
        />
        <ToggleSwitch
          label="Show Footer"
          checked={style.showFooter}
          onChange={(v) => onStyleChange({ showFooter: v })}
        />
      </div>

      {format === "xlsx" && (
        <FormatXlsxOptions style={style} onStyleChange={onStyleChange} />
      )}
      {format === "csv" && (
        <FormatCsvOptions style={style} onStyleChange={onStyleChange} />
      )}
      {format === "word" && (
        <FormatWordOptions style={style} onStyleChange={onStyleChange} />
      )}
      {format === "xlsx-native" && (
        <FormatXlsxNativeOptions style={style} onStyleChange={onStyleChange} />
      )}
      {format === "docx-native" && (
        <FormatDocxNativeOptions style={style} onStyleChange={onStyleChange} />
      )}
      {format === "pptx-native" && (
        <FormatPptxNativeOptions />
      )}
      {(format === "ods-native" || format === "odt-native") && (
        <FormatOdfNativeOptions />
      )}
    </div>
  );
}

/* ─── Sub-components for format-specific options ─────────────── */

interface FormatOptionsProps {
  style: StyleConfig;
  onStyleChange: (style: Partial<StyleConfig>) => void;
}

function FormatXlsxOptions({ style, onStyleChange }: FormatOptionsProps) {
  return (
    <div className={styles["formatOptions"]}>
      <span className={styles["formatTitle"]}>Excel Options</span>
      <ToggleSwitch
        label="AutoFilter"
        checked={style.autoFilter}
        onChange={(v) => onStyleChange({ autoFilter: v })}
      />
    </div>
  );
}

function FormatCsvOptions({ style, onStyleChange }: FormatOptionsProps) {
  return (
    <div className={styles["formatOptions"]}>
      <span className={styles["formatTitle"]}>CSV Options</span>
      <div className={styles["inlineGroup"]}>
        <div className={styles["fieldWrapper"]}>
          <label className={styles["fieldLabel"]} htmlFor="csv-delimiter">Delimiter</label>
          <Input id="csv-delimiter" compact value={style.delimiter}
            onChange={(e) => onStyleChange({ delimiter: (e.target as HTMLInputElement).value })} />
        </div>
        <div className={styles["fieldWrapper"]}>
          <label className={styles["fieldLabel"]} htmlFor="csv-quote">Quote Character</label>
          <Input id="csv-quote" compact value={style.quoteChar}
            onChange={(e) => onStyleChange({ quoteChar: (e.target as HTMLInputElement).value })} />
        </div>
      </div>
    </div>
  );
}

function FormatWordOptions({ style, onStyleChange }: FormatOptionsProps) {
  return (
    <div className={styles["formatOptions"]}>
      <span className={styles["formatTitle"]}>Word Options</span>
      <ToggleSwitch
        label={style.orientation === "landscape" ? "Landscape" : "Portrait"}
        checked={style.orientation === "landscape"}
        onChange={(v) => onStyleChange({ orientation: v ? "landscape" : "portrait" })}
      />
      <div className={styles["fieldWrapper"]}>
        <label className={styles["fieldLabel"]} htmlFor="word-margins">Margins</label>
        <Input id="word-margins" compact value={style.margins}
          onChange={(e) => onStyleChange({ margins: (e.target as HTMLInputElement).value })} />
      </div>
    </div>
  );
}

/* ─── Native format option components ─────────────────────────── */

function FormatXlsxNativeOptions({ style, onStyleChange }: FormatOptionsProps) {
  return (
    <div className={styles["formatOptions"]}>
      <span className={styles["formatTitle"]}>Native Excel Options</span>
      <ToggleSwitch
        label="AutoFilter"
        checked={style.autoFilter}
        onChange={(v) => onStyleChange({ autoFilter: v })}
      />
      <p className={styles["formatHint"]}>
        Output uses true SpreadsheetML cell types and number formats.
      </p>
    </div>
  );
}

function FormatDocxNativeOptions({ style, onStyleChange }: FormatOptionsProps) {
  return (
    <div className={styles["formatOptions"]}>
      <span className={styles["formatTitle"]}>Native Word Options</span>
      <ToggleSwitch
        label={style.orientation === "landscape" ? "Landscape" : "Portrait"}
        checked={style.orientation === "landscape"}
        onChange={(v) => onStyleChange({ orientation: v ? "landscape" : "portrait" })}
      />
      <p className={styles["formatHint"]}>
        Output uses WordprocessingML table with preserved template styles.
      </p>
    </div>
  );
}

function FormatPptxNativeOptions() {
  return (
    <div className={styles["formatOptions"]}>
      <span className={styles["formatTitle"]}>Native PowerPoint Options</span>
      <p className={styles["formatHint"]}>
        Data table will be placed on the first slide using DrawingML table markup.
        Column widths are automatically converted to EMU units.
      </p>
    </div>
  );
}

function FormatOdfNativeOptions() {
  return (
    <div className={styles["formatOptions"]}>
      <span className={styles["formatTitle"]}>OpenDocument Options</span>
      <p className={styles["formatHint"]}>
        Output uses ODF table markup compatible with LibreOffice and OpenOffice.
      </p>
    </div>
  );
}

/* ─── Color Field sub-component ──────────────────────────────── */

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function ColorField({ label, value, onChange }: ColorFieldProps) {
  return (
    <div className={styles["colorField"]}>
      <span className={styles["colorLabel"]}>{label}</span>
      <div className={styles["colorInput"]}>
        <input
          type="color"
          className={styles["colorSwatch"]}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
        />
        <Input compact mono value={value} onChange={(e) => onChange((e.target as HTMLInputElement).value)} />
      </div>
    </div>
  );
}
