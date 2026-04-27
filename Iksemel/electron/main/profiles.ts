import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { safeStorage } from "electron";
import type {
  ConnectionProfile,
  ConnectionProfileInput,
  SchemaConfig,
} from "../preload/api";

const PROFILES_FILE = "profiles.json";

// On-disk shape includes encrypted password as hex string
interface StoredProfile extends Omit<ConnectionProfile, never> {
  encryptedPassword: string; // hex-encoded encrypted buffer
  isFavourite?: boolean;
  schemaConfig?: SchemaConfig;
}

function defaultXfebDir(): string {
  const home = process.env["HOME"] ?? process.env["USERPROFILE"] ?? ".";
  return path.join(home, ".xfeb");
}

function profilesPath(dir: string): string {
  return path.join(dir, PROFILES_FILE);
}

async function readStoredProfiles(dir: string): Promise<StoredProfile[]> {
  const filePath = profilesPath(dir);
  try {
    const raw = await fs.promises.readFile(filePath, "utf8");
    return JSON.parse(raw) as StoredProfile[];
  } catch {
    return [];
  }
}

async function writeStoredProfiles(dir: string, profiles: StoredProfile[]): Promise<void> {
  await fs.promises.mkdir(dir, { recursive: true });
  await fs.promises.writeFile(profilesPath(dir), JSON.stringify(profiles, null, 2), "utf8");
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
    engine: input.engine,
    label: input.label,
    host: input.host,
    port: input.port,
    database: input.database,
    username: input.username,
    schemas: input.schemas,
  };
  stored.push(newProfile);
  await writeStoredProfiles(dir, stored);
  const { encryptedPassword: _e, ...profile } = newProfile;
  return profile as ConnectionProfile;
}

export async function deleteProfile(id: string, dir: string = defaultXfebDir()): Promise<void> {
  const stored = await readStoredProfiles(dir);
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
  const stored = await readStoredProfiles(dir);
  const profile = stored.find((p) => p.id === id);
  if (!profile) throw new Error(`Profile not found: ${id}`);
  const buf = Buffer.from(profile.encryptedPassword, "hex");
  return safeStorage.decryptString(buf);
}
