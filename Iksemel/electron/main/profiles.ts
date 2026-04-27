import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { safeStorage } from "electron";
import type {
  ConnectionProfile,
  ConnectionProfileInput,
} from "../preload/api";

const PROFILES_FILE = "profiles.json";

// On-disk shape includes encrypted password as hex string
interface StoredProfile extends ConnectionProfile {
  encryptedPassword: string; // hex-encoded encrypted buffer
}

function requireEncryption(): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("safeStorage encryption is not available on this system");
  }
}

function defaultXfebDir(): string {
  const home = process.env["HOME"] ?? process.env["USERPROFILE"] ?? ".";
  return path.join(home, ".xfeb");
}

function profilesPath(dir: string): string {
  return path.join(dir, PROFILES_FILE);
}

async function readStoredProfiles(dir: string): Promise<StoredProfile[]> {
  try {
    const raw = await fs.promises.readFile(profilesPath(dir), "utf8");
    return JSON.parse(raw) as StoredProfile[];
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writeStoredProfiles(dir: string, profiles: StoredProfile[]): Promise<void> {
  await fs.promises.mkdir(dir, { recursive: true });
  const target = profilesPath(dir);
  const tmp = `${target}.tmp`;
  await fs.promises.writeFile(tmp, JSON.stringify(profiles, null, 2), "utf8");
  await fs.promises.rename(tmp, target);
}

export async function loadProfiles(dir: string = defaultXfebDir()): Promise<ConnectionProfile[]> {
  const stored = await readStoredProfiles(dir);
  return stored.map(({ encryptedPassword: _enc, ...rest }) => rest as ConnectionProfile);
}

export async function saveProfile(
  input: ConnectionProfileInput & { id?: string },
  dir: string = defaultXfebDir(),
): Promise<ConnectionProfile> {
  const stored = await readStoredProfiles(dir);

  requireEncryption();
  const encryptedBuffer = safeStorage.encryptString(input.password);
  const encryptedPassword = encryptedBuffer.toString("hex");

  const existingIndex = input.id ? stored.findIndex((p) => p.id === input.id) : -1;

  const { password: _pw, ...rest } = input;
  const now = Date.now();

  if (existingIndex >= 0) {
    stored[existingIndex] = {
      ...stored[existingIndex],
      ...rest,
      encryptedPassword,
      lastUsed: now,
    };
    await writeStoredProfiles(dir, stored);
    const { encryptedPassword: _e, ...profile } = stored[existingIndex];
    return profile as ConnectionProfile;
  }

  const newProfile: StoredProfile = {
    ...rest,
    id: crypto.randomUUID(),
    createdAt: now,
    encryptedPassword,
  };
  stored.push(newProfile);
  await writeStoredProfiles(dir, stored);
  const { encryptedPassword: _e, ...profile } = newProfile;
  return profile as ConnectionProfile;
}

export async function deleteProfile(id: string, dir: string = defaultXfebDir()): Promise<void> {
  const stored = await readStoredProfiles(dir);
  const idx = stored.findIndex((p) => p.id === id);
  if (idx < 0) throw new Error(`Profile not found: ${id}`);
  const updated = stored.filter((p) => p.id !== id);
  await writeStoredProfiles(dir, updated);
}

export async function setFavourite(
  id: string,
  favourite: boolean,
  dir: string = defaultXfebDir(),
): Promise<void> {
  const stored = await readStoredProfiles(dir);
  const idx = stored.findIndex((p) => p.id === id);
  if (idx < 0) throw new Error(`Profile not found: ${id}`);
  stored[idx] = { ...stored[idx], isFavourite: favourite };
  await writeStoredProfiles(dir, stored);
}

/** Returns the decrypted password for a stored profile — used by drivers only */
export async function getPassword(id: string, dir: string = defaultXfebDir()): Promise<string> {
  requireEncryption();
  const stored = await readStoredProfiles(dir);
  const profile = stored.find((p) => p.id === id);
  if (!profile) throw new Error(`Profile not found: ${id}`);
  const buf = Buffer.from(profile.encryptedPassword, "hex");
  return safeStorage.decryptString(buf);
}
