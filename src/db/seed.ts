import { type DateStr, today as todayStr } from '../domain/dates';
import { SEED_CATEGORIES, SEED_HABITS, SEED_MUSCLE_GROUPS } from '../domain/seed-data';
import type { Category, Habit, HabitGoal, MuscleGroup } from '../domain/types';
import { type BitacoraDB, DATA_TABLES, db as defaultDb } from './db';
import { getMeta, getUserId, setMeta, stamp } from './repo';

/** Crea los hábitos iniciales la primera vez que se abre la app. No hace nada después. */
export async function ensureSeeded(db: BitacoraDB = defaultDb, start: DateStr = todayStr()): Promise<boolean> {
  if (await getMeta<boolean>(db, 'seeded')) return false;
  const user_id = await getUserId(db);
  await db.transaction('rw', [...DATA_TABLES.map((t) => db.table(t)), db.meta], async () => {
    if (await getMeta<boolean>(db, 'seeded')) return;

    const categoryId = new Map<string, string>();
    const categories = SEED_CATEGORIES.map((c, i) => {
      const row = stamp<Category>(user_id, { name: c.name, color: c.key, icon: c.key, is_private: c.is_private ?? false, sort_order: i });
      categoryId.set(c.key, row.id);
      return row;
    });

    const goals: HabitGoal[] = [];
    const habits = SEED_HABITS.map((h, i) => {
      const row = stamp<Habit>(user_id, {
        name: h.name,
        icon: h.icon,
        color: h.category,
        category_id: categoryId.get(h.category)!,
        type: h.type,
        unit: h.unit,
        schedule: { start_date: start },
        quick_buttons: h.quick_buttons ?? [],
        log_fields: h.log_fields ?? [],
        is_private: h.category === 'privado',
        archived_at: null,
        sort_order: i,
        module: h.module ?? null,
        reference_value: null,
      });
      if (h.goal) goals.push(stamp<HabitGoal>(user_id, { habit_id: row.id, ...h.goal, valid_from: start, valid_to: null }));
      return row;
    });

    const groups = SEED_MUSCLE_GROUPS.map((g, i) =>
      stamp<MuscleGroup>(user_id, { name: g.name, weekly_min_sets: g.min, weekly_max_sets: g.max, sort_order: i }),
    );

    await db.categories.bulkAdd(categories);
    await db.habits.bulkAdd(habits);
    await db.habit_goals.bulkAdd(goals);
    await db.muscle_groups.bulkAdd(groups);
    await setMeta(db, 'seeded', true);
  });
  return true;
}
