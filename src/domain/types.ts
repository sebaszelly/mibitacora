import type { DateStr, PeriodKind } from './dates';

/**
 * Modelo de datos de SPEC.md. Los nombres de campo van en snake_case porque
 * son los de las tablas que se sincronizarán en la fase 3: así no hay que
 * migrar ni traducir nada.
 */
export interface Base {
  id: string;
  user_id: string;
  /** Instantes ISO 8601 (UTC). */
  created_at: string;
  updated_at: string;
  /** Borrado lógico: nada se elimina de verdad. */
  deleted_at: string | null;
}

export type HabitType = 'yesno' | 'quantity' | 'duration' | 'frequency' | 'event' | 'measurement';

/** Campos opcionales que se pueden pedir al registrar. */
export type LogField = 'note' | 'duration' | 'place' | 'with' | 'cost' | 'title' | 'rating' | 'time';

export interface Schedule {
  /** Días de la semana programados (1 = lunes … 7 = domingo). Sin valor: todos los días. */
  days?: number[];
  /** Primer día programado. Sin valor: el día en que se creó el hábito. */
  start_date?: DateStr;
  end_date?: DateStr | null;
}

export interface Category extends Base {
  name: string;
  color: string;
  icon: string;
  is_private: boolean;
  sort_order: number;
}

export interface Habit extends Base {
  name: string;
  icon: string;
  color: string;
  category_id: string;
  type: HabitType;
  unit: string;
  schedule: Schedule;
  quick_buttons: number[];
  log_fields: LogField[];
  is_private: boolean;
  archived_at: string | null;
  sort_order: number;
  /** 'gym': su avance sale de las sesiones de gym. 'weight': sus valores son el peso corporal. */
  module: 'gym' | 'weight' | null;
  /** Valor objetivo de una medición (peso objetivo). Solo es una línea de referencia. */
  reference_value: number | null;
}

export interface HabitGoal extends Base {
  habit_id: string;
  target_value: number;
  period: PeriodKind;
  /** 'min': al menos. 'max': como mucho. */
  direction: 'min' | 'max';
  valid_from: DateStr;
  valid_to: DateStr | null;
}

export interface HabitLog extends Base {
  habit_id: string;
  date: DateStr;
  value: number | null;
  duration_min: number | null;
  note: string | null;
  extra: Record<string, unknown> | null;
}

export interface HabitPause extends Base {
  habit_id: string;
  start_date: DateStr;
  end_date: DateStr | null;
  reason: string | null;
}

export interface MuscleGroup extends Base {
  name: string;
  weekly_min_sets: number | null;
  weekly_max_sets: number | null;
  sort_order: number;
}

export interface Exercise extends Base {
  name: string;
  primary_group_id: string;
  secondary_group_ids: string[];
}

export interface Workout extends Base {
  date: DateStr;
  duration_min: number | null;
  rpe: number | null;
  note: string | null;
  routine_id: string | null;
}

export interface WorkoutSet extends Base {
  workout_id: string;
  muscle_group_id: string;
  exercise_id: string | null;
  weight_kg: number | null;
  reps: number | null;
  set_count: number;
}

export interface Routine extends Base {
  name: string;
  items: unknown[];
}

export interface BodyMetric extends Base {
  date: DateStr;
  /** Hora local 'HH:MM', opcional. */
  time: string | null;
  weight_kg: number | null;
  body_fat_pct: number | null;
  measurements: Record<string, number> | null;
}

export interface Task extends Base {
  title: string;
  note: string | null;
  category_id: string | null;
  priority: 'high' | 'medium' | 'low';
  schedule: Record<string, unknown> | null;
  due_date: DateStr | null;
  start_date: DateStr | null;
  end_date: DateStr | null;
  completed_at: string | null;
  subtasks: { title: string; done: boolean }[];
}

export interface DailyCheckin extends Base {
  date: DateStr;
  sleep_hours: number | null;
  energy: number | null;
  mood: number | null;
  note: string | null;
}

export interface WeeklyReview extends Base {
  week_start: DateStr;
  went_well: string | null;
  to_improve: string | null;
}

/** Ajustes locales del dispositivo (clave → valor). */
export interface MetaRow {
  key: string;
  value: unknown;
}
