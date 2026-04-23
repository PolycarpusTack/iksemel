import { jszipBackend } from "@/engine/package/backends/jszip-backend";
import { tryCreateFflateBackend } from "@/engine/package/backends/fflate-backend";
import type { PackageZipEntry } from "@/engine/package/types";

export interface ZipBenchmarkResult {
  readonly backend: string;
  readonly ms: number;
  readonly bytes: number;
}

function nowMs(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

export async function benchmarkZipBackends(
  entries: readonly PackageZipEntry[],
): Promise<readonly ZipBenchmarkResult[]> {
  const results: ZipBenchmarkResult[] = [];
  const backends = [jszipBackend];

  const fflate = await tryCreateFflateBackend();
  if (fflate) {
    backends.push(fflate);
  }

  for (const backend of backends) {
    const start = nowMs();
    const output = await backend.create(entries);
    const ms = nowMs() - start;
    results.push({
      backend: backend.name,
      ms,
      bytes: output.byteLength,
    });
  }

  return results;
}
