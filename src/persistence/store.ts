import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { AppData, ShiftPlan } from '../domain/models.js';

interface StorageEnvelope {
  appData: AppData;
  lastPlan?: ShiftPlan;
  updatedAt: string;
}

function lockFileName(siteId: string): string {
  return `.shiftmaker.${siteId}.lock`;
}

export async function acquireSiteLock(baseDir: string, siteId: string): Promise<string> {
  await mkdir(baseDir, { recursive: true });
  const lockPath = join(baseDir, lockFileName(siteId));
  const payload = `${process.pid}-${Date.now()}`;
  try {
    await writeFile(lockPath, payload, { flag: 'wx' });
    return lockPath;
  } catch {
    const lockInfo = await stat(lockPath).catch(() => null);
    if (lockInfo && Date.now() - lockInfo.mtimeMs > 30_000) {
      await rm(lockPath, { force: true });
      await writeFile(lockPath, payload, { flag: 'wx' });
      return lockPath;
    }
    throw new Error(`現場(${siteId})は他ユーザーが編集中です。共有フォルダのロックファイルを確認してください。`);
  }
}

export async function releaseLock(lockPath: string): Promise<void> {
  await rm(lockPath, { force: true });
}

export async function saveData(baseDir: string, appData: AppData, lastPlan?: ShiftPlan): Promise<void> {
  const envelope: StorageEnvelope = {
    appData,
    lastPlan,
    updatedAt: new Date().toISOString(),
  };
  await mkdir(baseDir, { recursive: true });
  const temp = join(baseDir, 'shift-data.tmp.json');
  const dest = join(baseDir, 'shift-data.json');
  await writeFile(temp, JSON.stringify(envelope, null, 2), 'utf8');
  await rename(temp, dest);
}

export async function loadData(baseDir: string): Promise<StorageEnvelope> {
  const p = join(baseDir, 'shift-data.json');
  const raw = await readFile(p, 'utf8');
  return JSON.parse(raw) as StorageEnvelope;
}
