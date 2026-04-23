import { jszipBackend } from "@/engine/package/backends/jszip-backend";
import { tryCreateFflateBackend } from "@/engine/package/backends/fflate-backend";
import type { PackageZipEntry, ZipBackend } from "@/engine/package/types";

let backendPromise: Promise<ZipBackend> | null = null;

function preferredBackend(): "jszip" | "fflate" {
  return import.meta.env.VITE_ZIP_BACKEND === "fflate" ? "fflate" : "jszip";
}

async function resolveBackend(): Promise<ZipBackend> {
  if (preferredBackend() !== "fflate") {
    return jszipBackend;
  }

  const fflateBackend = await tryCreateFflateBackend();
  if (fflateBackend) {
    return fflateBackend;
  }

  return jszipBackend;
}

export async function getPackageZipBackend(): Promise<ZipBackend> {
  if (backendPromise === null) {
    backendPromise = resolveBackend();
  }

  return backendPromise;
}

export async function createPackageZip(entries: readonly PackageZipEntry[]): Promise<Uint8Array> {
  const backend = await getPackageZipBackend();
  return backend.create(entries);
}
