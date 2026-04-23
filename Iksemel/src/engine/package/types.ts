export interface PackageZipEntry {
  readonly path: string;
  readonly content: string;
}

export interface ZipBackend {
  readonly name: string;
  create(entries: readonly PackageZipEntry[]): Promise<Uint8Array>;
}
