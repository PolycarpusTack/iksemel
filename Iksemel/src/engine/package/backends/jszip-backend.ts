import JSZip from "jszip";
import type { PackageZipEntry, ZipBackend } from "@/engine/package/types";

export const jszipBackend: ZipBackend = {
  name: "jszip",
  async create(entries: readonly PackageZipEntry[]): Promise<Uint8Array> {
    const zip = new JSZip();
    for (const entry of entries) {
      zip.file(entry.path, entry.content);
    }

    return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  },
};
