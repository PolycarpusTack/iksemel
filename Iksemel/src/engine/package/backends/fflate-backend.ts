import type { PackageZipEntry, ZipBackend } from "@/engine/package/types";

type FflateModule = {
  readonly strToU8?: (value: string) => Uint8Array;
  readonly zipSync?: (data: Record<string, Uint8Array>) => Uint8Array;
};

function hasFflateApi(mod: FflateModule): mod is Required<Pick<FflateModule, "strToU8" | "zipSync">> {
  return typeof mod.strToU8 === "function" && typeof mod.zipSync === "function";
}

export async function tryCreateFflateBackend(): Promise<ZipBackend | null> {
  const packageName = "fflate";

  try {
    const mod = await import(/* @vite-ignore */ packageName) as FflateModule;
    if (!hasFflateApi(mod)) {
      return null;
    }

    return {
      name: "fflate",
      async create(entries: readonly PackageZipEntry[]): Promise<Uint8Array> {
        const zipInput: Record<string, Uint8Array> = {};
        for (const entry of entries) {
          zipInput[entry.path] = mod.strToU8(entry.content);
        }
        return mod.zipSync(zipInput);
      },
    };
  } catch {
    return null;
  }
}
