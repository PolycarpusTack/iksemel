/**
 * API data provider.
 *
 * Connects to the WHATS'ON API to fetch real sample data and
 * cardinality statistics. Network errors are handled gracefully:
 * failed requests return empty results rather than throwing.
 *
 * Pure TypeScript -- no React imports.
 */

import type {
  DataProvider,
  SampleDataResponse,
  FieldSampleData,
  CardinalityStats,
} from "./types";

/** Timeout for fetch requests (ms). */
const FETCH_TIMEOUT_MS = 5_000;

/** How long to cache the isAvailable() result (ms). */
const AVAILABILITY_CACHE_TTL_MS = 30_000;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Wraps fetch() with an AbortController timeout.
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs: number = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function emptyResponse(): SampleDataResponse {
  return {
    fields: [],
    cardinality: [],
    fetchedAt: Date.now(),
    source: "api",
  };
}

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export class ApiDataProvider implements DataProvider {
  readonly source = "api" as const;

  private readonly baseUrl: string;
  private availableCache: { value: boolean; checkedAt: number } | null = null;

  constructor(baseUrl: string) {
    // Strip trailing slash for consistency
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  /* ---------------------------------------------------------------- */
  /*  fetchSampleData                                                  */
  /* ---------------------------------------------------------------- */

  async fetchSampleData(
    fieldPaths: readonly string[],
    limit: number = 5,
  ): Promise<SampleDataResponse> {
    if (fieldPaths.length === 0) return emptyResponse();

    const params = new URLSearchParams();
    params.set("fields", fieldPaths.join(","));
    params.set("limit", String(limit));

    const url = `${this.baseUrl}/api/v1/export-configs/sample-data?${params.toString()}`;

    try {
      const res = await fetchWithTimeout(url);
      if (!res.ok) return emptyResponse();

      const json: unknown = await res.json();
      return parseSampleDataResponse(json);
    } catch {
      return emptyResponse();
    }
  }

  /* ---------------------------------------------------------------- */
  /*  fetchCardinality                                                 */
  /* ---------------------------------------------------------------- */

  async fetchCardinality(
    elementPaths: readonly string[],
  ): Promise<readonly CardinalityStats[]> {
    if (elementPaths.length === 0) return [];

    const params = new URLSearchParams();
    params.set("elements", elementPaths.join(","));

    const url = `${this.baseUrl}/api/v1/export-configs/cardinality?${params.toString()}`;

    try {
      const res = await fetchWithTimeout(url);
      if (!res.ok) return [];

      const json: unknown = await res.json();
      return parseCardinalityResponse(json);
    } catch {
      return [];
    }
  }

  /* ---------------------------------------------------------------- */
  /*  isAvailable                                                      */
  /* ---------------------------------------------------------------- */

  isAvailable(): boolean {
    if (
      this.availableCache &&
      Date.now() - this.availableCache.checkedAt < AVAILABILITY_CACHE_TTL_MS
    ) {
      return this.availableCache.value;
    }

    // Fire-and-forget: update the cache asynchronously.
    // Return the last known value (or false on first call).
    void this.checkAvailability();
    return this.availableCache?.value ?? false;
  }

  private async checkAvailability(): Promise<void> {
    try {
      const res = await fetchWithTimeout(this.baseUrl, { method: "HEAD" });
      this.availableCache = { value: res.ok, checkedAt: Date.now() };
    } catch {
      this.availableCache = { value: false, checkedAt: Date.now() };
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Response parsers (defensive)                                       */
/* ------------------------------------------------------------------ */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function parseSampleDataResponse(json: unknown): SampleDataResponse {
  if (!isRecord(json)) return emptyResponse();

  const rawFields = Array.isArray(json["fields"]) ? json["fields"] : [];
  const rawCardinality = Array.isArray(json["cardinality"])
    ? json["cardinality"]
    : [];

  const fields: FieldSampleData[] = rawFields
    .filter(isRecord)
    .map((f) => ({
      fieldId: asString(f["fieldId"]),
      fieldPath: asString(f["fieldPath"]),
      values: parseValues(f["values"]),
      totalCount: Number(f["totalCount"]) || 0,
      distinctCount: Number(f["distinctCount"]) || 0,
      nullCount: Number(f["nullCount"]) || 0,
    }));

  const cardinality = rawCardinality.filter(isRecord).map(parseOneCardinality);

  return {
    fields,
    cardinality,
    fetchedAt: Date.now(),
    source: "api",
  };
}

function parseValues(raw: unknown): readonly import("./types").SampleValue[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isRecord).map((v) => ({
    value: asString(v["value"]),
    count: Number(v["count"]) || 0,
  }));
}

function parseCardinalityResponse(json: unknown): readonly CardinalityStats[] {
  if (!Array.isArray(json)) return [];
  return json.filter(isRecord).map(parseOneCardinality);
}

function parseOneCardinality(c: Record<string, unknown>): CardinalityStats {
  return {
    elementPath: asString(c["elementPath"]),
    avgCount: Number(c["avgCount"]) || 0,
    minCount: Number(c["minCount"]) || 0,
    maxCount: Number(c["maxCount"]) || 0,
    sampleSize: Number(c["sampleSize"]) || 0,
  };
}
