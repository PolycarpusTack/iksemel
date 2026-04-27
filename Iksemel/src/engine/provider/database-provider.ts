// src/engine/provider/database-provider.ts
import type {
  DataProvider,
  SampleDataResponse,
  CardinalityStats,
  FieldSampleData,
} from "../data-provider/types";

type TableMapping = Map<string, string>; // fieldPathPrefix → tableId (e.g. "programme." → "public.programme")

type ElectronStats = {
  fetchSampleStats: (connectionId: string, columns: string[]) => Promise<FieldSampleData[]>;
  fetchCardinality: (connectionId: string, tableId: string) => Promise<CardinalityStats>;
  getRowCount?: (connectionId: string, tableId: string) => Promise<number>;
};

type ElectronWindow = Window & {
  electronAPI?: {
    stats: ElectronStats;
  };
};

export class DatabaseProvider implements DataProvider {
  readonly source = "api" as const;

  constructor(
    private readonly connectionId: string,
    private readonly tableMapping: TableMapping,
  ) {}

  isAvailable(): boolean {
    return (
      typeof window !== "undefined" &&
      typeof (window as ElectronWindow).electronAPI !== "undefined" &&
      (window as ElectronWindow).electronAPI != null
    );
  }

  async fetchSampleData(
    fieldPaths: readonly string[],
    _limit?: number,
  ): Promise<SampleDataResponse> {
    if (!this.isAvailable()) {
      return { fields: [], cardinality: [], fetchedAt: Date.now(), source: "api" };
    }

    const api = (window as ElectronWindow).electronAPI!;

    const dbColumns = fieldPaths
      .map((fp) => this.resolveDbColumn(fp))
      .filter((c): c is string => c !== null);

    if (dbColumns.length === 0) {
      return { fields: [], cardinality: [], fetchedAt: Date.now(), source: "api" };
    }

    const fields = await api.stats.fetchSampleStats(this.connectionId, dbColumns);

    return {
      fields,
      cardinality: [],
      fetchedAt: Date.now(),
      source: "api",
    };
  }

  async fetchCardinality(
    elementPaths: readonly string[],
  ): Promise<readonly CardinalityStats[]> {
    if (!this.isAvailable()) return [];

    const api = (window as ElectronWindow).electronAPI!;

    const results: CardinalityStats[] = [];
    for (const elementPath of elementPaths) {
      const tableId = this.resolveTableId(elementPath);
      if (!tableId) continue;
      const stat = await api.stats.fetchCardinality(this.connectionId, tableId);
      results.push(stat);
    }
    return results;
  }

  private resolveDbColumn(fieldPath: string): string | null {
    for (const [prefix, tableId] of this.tableMapping) {
      if (fieldPath.startsWith(prefix)) {
        const columnName = fieldPath.slice(prefix.length);
        return `${tableId}.${columnName}`;
      }
    }
    return fieldPath.includes(".") ? fieldPath : null;
  }

  private resolveTableId(elementPath: string): string | null {
    const prefix = `${elementPath}.`;
    return this.tableMapping.get(prefix) ?? null;
  }
}
