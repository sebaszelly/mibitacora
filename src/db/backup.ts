import { type BitacoraDB, DATA_TABLES, type DataTable, db as defaultDb } from './db';
import { getUserId, setMeta } from './repo';

export const BACKUP_APP = 'mibitacora';
export const BACKUP_FORMAT = 1;

export interface Backup {
  app: typeof BACKUP_APP;
  format: number;
  exported_at: string;
  user_id: string;
  tables: Record<DataTable, unknown[]>;
}

/**
 * Respaldo completo: todas las tablas, incluidos los registros en la papelera.
 * No incluye el PIN ni otros ajustes del dispositivo.
 */
export async function exportBackup(db: BitacoraDB = defaultDb): Promise<Backup> {
  const user_id = await getUserId(db);
  const tables = {} as Record<DataTable, unknown[]>;
  await db.transaction('r', DATA_TABLES.map((t) => db.table(t)), async () => {
    for (const name of DATA_TABLES) tables[name] = await db.table(name).orderBy('id').toArray();
  });
  return { app: BACKUP_APP, format: BACKUP_FORMAT, exported_at: new Date().toISOString(), user_id, tables };
}

/** Anota que el respaldo llegó a manos del usuario. Se llama solo cuando lo guardó, no si canceló. */
export async function markBackupDone(backup: Backup, db: BitacoraDB = defaultDb): Promise<void> {
  await setMeta(db, 'last_backup_at', backup.exported_at);
}

export class BackupError extends Error {}

/** Comprueba que un archivo es un respaldo de esta app antes de tocar nada. */
export function parseBackup(text: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupError('El archivo no es un JSON válido. Elige un respaldo exportado desde esta app.');
  }
  const b = data as Partial<Backup> | null;
  if (!b || typeof b !== 'object' || b.app !== BACKUP_APP || typeof b.tables !== 'object' || b.tables === null) {
    throw new BackupError('Este archivo no es un respaldo de Mi Bitácora.');
  }
  if (typeof b.format !== 'number' || b.format > BACKUP_FORMAT) {
    throw new BackupError('El respaldo viene de una versión más nueva de la app. Actualiza la app e inténtalo de nuevo.');
  }
  for (const name of DATA_TABLES) {
    const rows = (b.tables as Record<string, unknown>)[name] ?? [];
    if (!Array.isArray(rows) || rows.some((r) => !r || typeof r !== 'object' || typeof (r as { id?: unknown }).id !== 'string')) {
      throw new BackupError(`El respaldo está dañado: la tabla "${name}" no se puede leer.`);
    }
  }
  return b as Backup;
}

/**
 * Reemplaza todos los datos por los del respaldo. O entra todo o no cambia
 * nada: se hace en una sola transacción.
 */
export async function importBackup(backup: Backup, db: BitacoraDB = defaultDb): Promise<void> {
  await db.transaction('rw', [...DATA_TABLES.map((t) => db.table(t)), db.meta], async () => {
    for (const name of DATA_TABLES) {
      await db.table(name).clear();
      await db.table(name).bulkAdd(backup.tables[name] ?? []);
    }
    if (typeof backup.user_id === 'string') await setMeta(db, 'user_id', backup.user_id);
    await setMeta(db, 'seeded', true);
  });
}

/** Días desde el último respaldo, o null si nunca se hizo uno. */
export function daysSinceBackup(lastBackupAt: string | undefined, now: Date = new Date()): number | null {
  if (!lastBackupAt) return null;
  return Math.floor((now.getTime() - new Date(lastBackupAt).getTime()) / 86_400_000);
}
