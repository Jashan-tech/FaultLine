import fs from 'node:fs/promises';
import path from 'node:path';
import { ensureDir, readTextOrEmpty, writeFileAtomic } from './files.js';
import { managedPaths } from './paths.js';
import type { VersionRecord } from './types.js';

export async function readVersions(): Promise<VersionRecord[]> {
  const raw = await readTextOrEmpty(managedPaths.versionsMeta);
  if (!raw.trim()) {
    return [];
  }

  try {
    return JSON.parse(raw) as VersionRecord[];
  } catch {
    return [];
  }
}

export async function writeVersions(records: VersionRecord[]): Promise<void> {
  await ensureDir(path.dirname(managedPaths.versionsMeta));
  await writeFileAtomic(managedPaths.versionsMeta, `${JSON.stringify(records, null, 2)}\n`);
}

export async function appendVersion(record: VersionRecord): Promise<void> {
  const records = await readVersions();
  records.push(record);
  await writeVersions(records);
}

export async function createSnapshot(versionId: string, files: Record<string, string>): Promise<string> {
  const snapshotDir = path.join(managedPaths.versionsDir, versionId);
  await ensureDir(snapshotDir);

  await Promise.all(
    Object.entries(files).map(async ([name, content]) => {
      const filePath = path.join(snapshotDir, `${name}.snapshot`);
      await fs.writeFile(filePath, content, 'utf8');
    })
  );

  return snapshotDir;
}

export async function restoreSnapshot(versionId: string): Promise<Partial<Record<string, string>>> {
  const snapshotDir = path.join(managedPaths.versionsDir, versionId);
  const keys = ['compose', 'prometheus', 'collector', 'tempo', 'loki', 'alertRules', 'generatedAlerts'];
  const restored: Partial<Record<string, string>> = {};

  for (const key of keys) {
    const filePath = path.join(snapshotDir, `${key}.snapshot`);
    const value = await readTextOrEmpty(filePath);
    if (value !== '') {
      restored[key] = value;
    }
  }

  return restored;
}
