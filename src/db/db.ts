import Dexie, { type Table } from 'dexie';
import type {
  BodyMetric,
  Category,
  DailyCheckin,
  Exercise,
  Habit,
  HabitGoal,
  HabitLog,
  HabitPause,
  MetaRow,
  MuscleGroup,
  Routine,
  Task,
  WeeklyReview,
  Workout,
  WorkoutSet,
} from '../domain/types';

/** Tablas con datos del usuario: las que entran en el respaldo y, más adelante, en la sincronización. */
export const DATA_TABLES = [
  'categories',
  'habits',
  'habit_goals',
  'habit_logs',
  'habit_pauses',
  'muscle_groups',
  'exercises',
  'workouts',
  'workout_sets',
  'routines',
  'body_metrics',
  'tasks',
  'daily_checkins',
  'weekly_reviews',
] as const;

export type DataTable = (typeof DATA_TABLES)[number];

export class BitacoraDB extends Dexie {
  categories!: Table<Category, string>;
  habits!: Table<Habit, string>;
  habit_goals!: Table<HabitGoal, string>;
  habit_logs!: Table<HabitLog, string>;
  habit_pauses!: Table<HabitPause, string>;
  muscle_groups!: Table<MuscleGroup, string>;
  exercises!: Table<Exercise, string>;
  workouts!: Table<Workout, string>;
  workout_sets!: Table<WorkoutSet, string>;
  routines!: Table<Routine, string>;
  body_metrics!: Table<BodyMetric, string>;
  tasks!: Table<Task, string>;
  daily_checkins!: Table<DailyCheckin, string>;
  weekly_reviews!: Table<WeeklyReview, string>;
  /** Ajustes de este dispositivo. No se sincronizan. */
  meta!: Table<MetaRow, string>;

  constructor(name = 'mibitacora') {
    super(name);
    this.version(1).stores({
      categories: 'id, updated_at',
      habits: 'id, updated_at, category_id',
      habit_goals: 'id, updated_at, habit_id',
      habit_logs: 'id, updated_at, date, [habit_id+date]',
      habit_pauses: 'id, updated_at, habit_id',
      muscle_groups: 'id, updated_at',
      exercises: 'id, updated_at, primary_group_id',
      workouts: 'id, updated_at, date',
      workout_sets: 'id, updated_at, workout_id, muscle_group_id',
      routines: 'id, updated_at',
      body_metrics: 'id, updated_at, date',
      tasks: 'id, updated_at, due_date',
      daily_checkins: 'id, updated_at, date',
      weekly_reviews: 'id, updated_at, week_start',
      meta: 'key',
    });
  }
}

export const db = new BitacoraDB();
