import type { ForeignKeyRelation } from "../../preload/api";

/**
 * Runs DFS over the FK graph and marks the edge that closes each cycle
 * as `isCircular: true`. Returns a new array (input is not mutated).
 *
 * Only the back-edge (the edge that points to an ancestor in the current DFS
 * path) is marked — not all edges in the cycle.
 */
export function detectCycles(fks: ForeignKeyRelation[]): ForeignKeyRelation[] {
  // Build adjacency: fromTableId → list of {toTableId, fkId}
  const adj = new Map<string, { toTableId: string; fkId: string }[]>();
  for (const fk of fks) {
    if (!adj.has(fk.fromTableId)) adj.set(fk.fromTableId, []);
    adj.get(fk.fromTableId)!.push({ toTableId: fk.toTableId, fkId: fk.fkId });
  }

  const circularFkIds = new Set<string>();
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(node: string): void {
    if (inStack.has(node)) return;
    if (visited.has(node)) return;
    visited.add(node);
    inStack.add(node);

    for (const edge of adj.get(node) ?? []) {
      if (inStack.has(edge.toTableId)) {
        // Back-edge: this closes a cycle
        circularFkIds.add(edge.fkId);
      } else if (!visited.has(edge.toTableId)) {
        dfs(edge.toTableId);
      }
    }

    inStack.delete(node);
  }

  // Self-references
  for (const fk of fks) {
    if (fk.fromTableId === fk.toTableId) {
      circularFkIds.add(fk.fkId);
    }
  }

  const allTables = new Set(fks.flatMap((f) => [f.fromTableId, f.toTableId]));
  for (const table of allTables) {
    if (!visited.has(table)) {
      dfs(table);
    }
  }

  return fks.map((fk) =>
    circularFkIds.has(fk.fkId) ? { ...fk, isCircular: true } : fk,
  );
}
