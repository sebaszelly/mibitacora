import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { evalPeriod, prepare } from '../domain/rules';
import { BackupError, exportBackup, importBackup, parseBackup } from './backup';
import { BitacoraDB, DATA_TABLES } from './db';
import { getMeta, logHabit, restore, setGoal, softDelete } from './repo';
import { ensureSeeded } from './seed';

let n = 0;
let db: BitacoraDB;
beforeEach(() => {
  db = new BitacoraDB(`test-${++n}`);
});

const dump = async (d: BitacoraDB) => Object.fromEntries(await Promise.all(DATA_TABLES.map(async (t) => [t, await d.table(t).orderBy('id').toArray()])));

describe('arranque', () => {
  it('crea los hábitos iniciales una sola vez', async () => {
    expect(await ensureSeeded(db, '2026-11-17')).toBe(true);
    expect(await ensureSeeded(db, '2026-11-17')).toBe(false);
    const habits = await db.habits.toArray();
    expect(habits.map((h) => h.name).sort()).toEqual(
      ['Anki', 'Comer fuera', 'Gimnasio', 'Intimidad', 'Película en inglés', 'Peso corporal', 'Practicar speaking', 'Salir de fiesta', 'Tomar agua'].sort(),
    );
    expect(await db.categories.count()).toBe(6);
    expect(await db.muscle_groups.count()).toBe(12);
    const agua = habits.find((h) => h.name === 'Tomar agua')!;
    expect(agua.quick_buttons).toEqual([250, 500, 750]);
    expect(habits.find((h) => h.name === 'Intimidad')!.is_private).toBe(true);
    const goals = await db.habit_goals.where('habit_id').equals(agua.id).toArray();
    expect(goals).toMatchObject([{ target_value: 2000, period: 'day', direction: 'min', valid_from: '2026-11-17', valid_to: null }]);
  });

  it('cada registro lleva id único, fechas y marca de borrado', async () => {
    await ensureSeeded(db, '2026-11-17');
    const user_id = await getMeta<string>(db, 'user_id');
    for (const t of DATA_TABLES) {
      for (const row of await db.table(t).toArray()) {
        expect(row.id).toMatch(/^[0-9a-f-]{36}$/);
        expect(row.user_id).toBe(user_id);
        expect(row.created_at).toBeTruthy();
        expect(row.updated_at).toBeTruthy();
        expect(row.deleted_at).toBeNull();
      }
    }
  });
});

describe('registrar y deshacer', () => {
  it('deshacer es un borrado lógico que se puede restaurar', async () => {
    await ensureSeeded(db, '2026-11-17');
    const agua = (await db.habits.toArray()).find((h) => h.name === 'Tomar agua')!;
    const log = await logHabit(agua.id, '2026-11-17', { value: 500 }, db);
    await softDelete(db.habit_logs, log.id);
    expect((await db.habit_logs.get(log.id))!.deleted_at).not.toBeNull();
    expect(await db.habit_logs.count()).toBe(1);
    await restore(db.habit_logs, log.id);
    expect((await db.habit_logs.get(log.id))!.deleted_at).toBeNull();
  });
});

describe('cambiar la meta', () => {
  it('crea una versión nueva desde hoy y cierra la anterior ayer', async () => {
    await ensureSeeded(db, '2026-10-01');
    const agua = (await db.habits.toArray()).find((h) => h.name === 'Tomar agua')!;
    await logHabit(agua.id, '2026-10-15', { value: 2000 }, db);
    await logHabit(agua.id, '2026-11-19', { value: 2000 }, db);
    await setGoal(agua.id, { target_value: 2500, period: 'day', direction: 'min' }, '2026-11-19', db);

    const goals = (await db.habit_goals.where('habit_id').equals(agua.id).toArray()).sort((a, b) => a.valid_from.localeCompare(b.valid_from));
    expect(goals).toMatchObject([
      { target_value: 2000, valid_from: '2026-10-01', valid_to: '2026-11-18' },
      { target_value: 2500, valid_from: '2026-11-19', valid_to: null },
    ]);

    const data = prepare(agua, goals, [], await db.habit_logs.toArray());
    expect(evalPeriod(data, 'day', '2026-10-15', '2026-11-19')).toMatchObject({ status: 'done', target: 2000 });
    expect(evalPeriod(data, 'day', '2026-11-19', '2026-11-19')).toMatchObject({ status: 'partial', target: 2500 });
  });

  it('cambiarla dos veces el mismo día no crea versiones vacías', async () => {
    await ensureSeeded(db, '2026-10-01');
    const agua = (await db.habits.toArray()).find((h) => h.name === 'Tomar agua')!;
    await setGoal(agua.id, { target_value: 2500, period: 'day', direction: 'min' }, '2026-11-19', db);
    await setGoal(agua.id, { target_value: 3000, period: 'day', direction: 'min' }, '2026-11-19', db);
    const goals = await db.habit_goals.where('habit_id').equals(agua.id).toArray();
    expect(goals).toHaveLength(2);
    expect(goals.find((g) => g.valid_from === '2026-11-19')!.target_value).toBe(3000);
  });
});

describe('respaldo', () => {
  it('exportar JSON, borrar los datos e importar ese JSON deja todo igual', async () => {
    await ensureSeeded(db, '2026-11-01');
    const habits = await db.habits.toArray();
    const agua = habits.find((h) => h.name === 'Tomar agua')!;
    await logHabit(agua.id, '2026-11-17', { value: 500 }, db);
    const borrado = await logHabit(agua.id, '2026-11-17', { value: 750, note: 'me equivoqué' }, db);
    await softDelete(db.habit_logs, borrado.id);
    await setGoal(agua.id, { target_value: 2500, period: 'day', direction: 'min' }, '2026-11-17', db);

    const before = await dump(db);
    const json = JSON.stringify(await exportBackup(db));
    expect(await getMeta<string>(db, 'last_backup_at')).toBeTruthy();

    await db.delete();
    const fresh = new BitacoraDB(`test-${++n}`);
    await importBackup(parseBackup(json), fresh);

    expect(await dump(fresh)).toEqual(before);
    expect(await getMeta<string>(fresh, 'user_id')).toBe(agua.user_id);
    expect(await ensureSeeded(fresh)).toBe(false);
  });

  it('rechaza archivos que no son un respaldo, sin tocar los datos', async () => {
    await ensureSeeded(db, '2026-11-01');
    const before = await dump(db);
    expect(() => parseBackup('hola')).toThrow(BackupError);
    expect(() => parseBackup('{"app":"otra"}')).toThrow(BackupError);
    expect(() => parseBackup(JSON.stringify({ app: 'mibitacora', format: 99, tables: {} }))).toThrow(/más nueva/);
    expect(() => parseBackup(JSON.stringify({ app: 'mibitacora', format: 1, tables: { habits: [{}] } }))).toThrow(/dañado/);
    expect(await dump(db)).toEqual(before);
  });
});
