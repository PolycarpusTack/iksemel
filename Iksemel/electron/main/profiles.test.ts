// @vitest-environment node
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// Mock safeStorage before importing profiles
vi.mock("electron", () => ({
  safeStorage: {
    isEncryptionAvailable: vi.fn().mockReturnValue(true),
    encryptString: vi.fn((s: string) => Buffer.from(`enc:${s}`)),
    decryptString: vi.fn((b: Buffer) => b.toString().replace(/^enc:/, "")),
  },
  app: {
    getPath: vi.fn().mockReturnValue("/tmp/iksemel-test"),
  },
}));

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "iksemel-profiles-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  vi.resetModules();
});

describe("profiles", () => {
  it("returns empty array when profiles.json does not exist", async () => {
    const { loadProfiles } = await import("./profiles");
    const profiles = await loadProfiles(tmpDir);
    expect(profiles).toEqual([]);
  });

  it("saveProfile creates a new profile with encrypted password", async () => {
    const { saveProfile, loadProfiles } = await import("./profiles");
    const input = {
      label: "My PG",
      engine: "postgres" as const,
      host: "localhost",
      port: 5432,
      database: "mydb",
      username: "pguser",
      password: "secret",
      schemas: ["public"],
    };
    const saved = await saveProfile(input, tmpDir);
    expect(saved.id).toBeTruthy();
    expect(saved.label).toBe("My PG");
    expect((saved as any).password).toBeUndefined();

    const profilesOnDisk = JSON.parse(
      fs.readFileSync(path.join(tmpDir, "profiles.json"), "utf8"),
    );
    expect(profilesOnDisk[0].encryptedPassword).toBeTruthy();
    expect(profilesOnDisk[0].encryptedPassword).not.toBe("secret");

    const loaded = await loadProfiles(tmpDir);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].label).toBe("My PG");
  });

  it("saveProfile updates existing profile when id matches", async () => {
    const { saveProfile, loadProfiles } = await import("./profiles");
    const input = {
      label: "Old",
      engine: "postgres" as const,
      host: "localhost",
      port: 5432,
      database: "db",
      username: "u",
      password: "pw",
      schemas: ["public"],
    };
    const created = await saveProfile(input, tmpDir);
    await saveProfile({ ...input, label: "Updated", id: created.id } as any, tmpDir);
    const profiles = await loadProfiles(tmpDir);
    expect(profiles).toHaveLength(1);
    expect(profiles[0].label).toBe("Updated");
  });

  it("deleteProfile removes the profile", async () => {
    const { saveProfile, deleteProfile, loadProfiles } = await import("./profiles");
    const created = await saveProfile({
      label: "ToDelete",
      engine: "postgres" as const,
      host: "h",
      port: 5432,
      database: "d",
      username: "u",
      password: "pw",
      schemas: ["public"],
    }, tmpDir);
    await deleteProfile(created.id, tmpDir);
    const profiles = await loadProfiles(tmpDir);
    expect(profiles).toHaveLength(0);
  });

  it("setFavourite toggles isFavourite", async () => {
    const { saveProfile, setFavourite, loadProfiles } = await import("./profiles");
    const created = await saveProfile({
      label: "Fav",
      engine: "postgres" as const,
      host: "h",
      port: 5432,
      database: "d",
      username: "u",
      password: "pw",
      schemas: ["public"],
    }, tmpDir);
    await setFavourite(created.id, true, tmpDir);
    const profiles = await loadProfiles(tmpDir);
    expect(profiles[0].isFavourite).toBe(true);
    await setFavourite(created.id, false, tmpDir);
    const after = await loadProfiles(tmpDir);
    expect(after[0].isFavourite).toBe(false);
  });

  it("getPassword returns decrypted password", async () => {
    const { saveProfile, getPassword } = await import("./profiles");
    const created = await saveProfile({
      label: "PW Test",
      engine: "postgres" as const,
      host: "h",
      port: 5432,
      database: "d",
      username: "u",
      password: "my-secret-pw",
      schemas: ["public"],
    }, tmpDir);
    const pw = await getPassword(created.id, tmpDir);
    expect(pw).toBe("my-secret-pw");
  });
});
