/**
 * Style preset definitions for export styling.
 *
 * Each preset provides a complete base style that can be applied
 * to any export format. Users can select a preset and then customise
 * individual properties as needed.
 */

import type { StylePreset, StylePresetKey } from "@/types";

/**
 * Built-in style presets.
 * Keys match the StylePresetKey union type from @/types.
 */
export const STYLE_PRESETS: Readonly<Record<StylePresetKey, StylePreset>> = {
  corporate: {
    name: "Corporate",
    headerBg: "#1a365d",
    headerFg: "#ffffff",
    altRowBg: "#f7f9fc",
    groupBg: "#e8edf5",
    fontFamily: "Calibri, sans-serif",
    fontSize: "10",
  },
  broadcast: {
    name: "Broadcast",
    headerBg: "#1e1e2e",
    headerFg: "#60d394",
    altRowBg: "#0d0d14",
    groupBg: "#14141e",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "9",
  },
  clean: {
    name: "Clean",
    headerBg: "#f8f8f8",
    headerFg: "#333333",
    altRowBg: "#ffffff",
    groupBg: "#eeeeee",
    fontFamily: "Segoe UI, sans-serif",
    fontSize: "10",
  },
  warm: {
    name: "Warm",
    headerBg: "#8b4513",
    headerFg: "#fff8dc",
    altRowBg: "#fdf5e6",
    groupBg: "#f5deb3",
    fontFamily: "Georgia, serif",
    fontSize: "10",
  },
  modern: {
    name: "Modern",
    headerBg: "#2c3e50",
    headerFg: "#ecf0f1",
    altRowBg: "#f5f6fa",
    groupBg: "#dfe6e9",
    fontFamily: "Inter, sans-serif",
    fontSize: "10",
  },
} as const;
