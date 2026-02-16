/**
 * Synthetic data provider.
 *
 * Generates realistic mock data for standalone / offline mode.
 * Field name patterns are matched to broadcast-domain value generators
 * so the sample data looks plausible in the WHATS'ON context.
 *
 * Pure TypeScript -- no React imports.
 */

import type {
  DataProvider,
  SampleDataResponse,
  FieldSampleData,
  SampleValue,
  CardinalityStats,
} from "./types";

/* ------------------------------------------------------------------ */
/*  Value generators                                                   */
/* ------------------------------------------------------------------ */

const BROADCASTER_NAMES = ["VTM", "een", "Canvas", "VRT", "RTBF"];
const PROGRAMME_TITLES = [
  "News",
  "Weather",
  "Sports",
  "Documentary",
  "Talk Show",
  "Drama",
  "Comedy",
  "Music Live",
  "Children",
  "Film",
];
const CODES = ["CH01", "SL042", "PRG007", "EP123", "BRD05"];
const DURATIONS = ["PT30M", "PT1H", "PT15M", "PT45M", "PT2H"];
const DESCRIPTIONS = [
  "A compelling look at modern events across the region.",
  "An in-depth exploration of cultural heritage and traditions.",
  "Live coverage featuring expert commentary and analysis.",
  "Award-winning production with stunning visuals.",
  "A behind-the-scenes journey into everyday stories.",
];

function recentIsoDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString().slice(0, 10);
}

function timeString(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00:00`;
}

type ValueGenerator = () => readonly SampleValue[];

function pickValues(pool: readonly string[], n: number): readonly SampleValue[] {
  const count = Math.min(n, pool.length);
  const picked: SampleValue[] = [];
  for (let i = 0; i < count; i++) {
    picked.push({ value: pool[i] ?? `val-${i}`, count: 5 - i });
  }
  return picked;
}

const GENERATORS: readonly { pattern: RegExp; generate: ValueGenerator }[] = [
  {
    pattern: /Name/i,
    generate: () => pickValues(BROADCASTER_NAMES, 5),
  },
  {
    pattern: /Date/i,
    generate: () => {
      const values: SampleValue[] = [];
      for (let i = 0; i < 5; i++) {
        values.push({ value: recentIsoDate(i), count: 5 - i });
      }
      return values;
    },
  },
  {
    pattern: /Time/i,
    generate: () => {
      const hours = [8, 12, 18, 20, 22];
      return hours.map((h, i) => ({ value: timeString(h), count: 5 - i }));
    },
  },
  {
    pattern: /Code/i,
    generate: () => pickValues(CODES, 5),
  },
  {
    pattern: /Title/i,
    generate: () => pickValues(PROGRAMME_TITLES, 5),
  },
  {
    pattern: /Duration/i,
    generate: () => pickValues(DURATIONS, 5),
  },
  {
    pattern: /Description/i,
    generate: () => pickValues(DESCRIPTIONS, 3),
  },
];

function generateValuesForField(fieldPath: string): readonly SampleValue[] {
  const lastSegment = fieldPath.split("/").pop() ?? fieldPath;
  for (const gen of GENERATORS) {
    if (gen.pattern.test(lastSegment)) {
      return gen.generate();
    }
  }
  // Default: generic values
  const count = 3 + Math.floor(Math.random() * 3); // 3-5 values
  const values: SampleValue[] = [];
  for (let i = 1; i <= count; i++) {
    values.push({ value: `value-${i}`, count: 6 - i });
  }
  return values;
}

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export class SyntheticDataProvider implements DataProvider {
  readonly source = "synthetic" as const;

  async fetchSampleData(
    fieldPaths: readonly string[],
    _limit?: number,
  ): Promise<SampleDataResponse> {
    const fields: FieldSampleData[] = fieldPaths.map((fp) => {
      const values = generateValuesForField(fp);
      const totalCount = values.reduce((sum, v) => sum + v.count, 0);
      return {
        fieldId: fp.replace(/\//g, "."),
        fieldPath: fp,
        values,
        totalCount,
        distinctCount: values.length,
        nullCount: 0,
      };
    });

    const cardinality: CardinalityStats[] = fieldPaths
      .filter((p) => p.includes("/"))
      .map((p) => ({
        elementPath: p,
        avgCount: 50,
        minCount: 1,
        maxCount: 200,
        sampleSize: 100,
      }));

    return {
      fields,
      cardinality,
      fetchedAt: Date.now(),
      source: "synthetic",
    };
  }

  async fetchCardinality(
    elementPaths: readonly string[],
  ): Promise<readonly CardinalityStats[]> {
    return elementPaths.map((p) => ({
      elementPath: p,
      avgCount: 50,
      minCount: 1,
      maxCount: 200,
      sampleSize: 100,
    }));
  }

  isAvailable(): boolean {
    return true;
  }
}
