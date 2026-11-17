import type { PeriodKind } from './dates';
import type { HabitType, LogField } from './types';

/** Datos de arranque de SPEC.md, sección "Hábitos iniciales". Todo es editable después. */
export interface SeedCategory {
  key: string;
  name: string;
  is_private?: boolean;
}

export interface SeedHabit {
  name: string;
  category: string;
  icon: string;
  type: HabitType;
  unit: string;
  goal?: { target_value: number; period: PeriodKind; direction: 'min' | 'max' };
  quick_buttons?: number[];
  log_fields?: LogField[];
  module?: 'gym' | 'weight';
}

export const SEED_CATEGORIES: SeedCategory[] = [
  { key: 'salud', name: 'Salud' },
  { key: 'estudio', name: 'Estudio' },
  { key: 'social', name: 'Social' },
  { key: 'trabajo', name: 'Trabajo' },
  { key: 'personal', name: 'Personal' },
  { key: 'privado', name: 'Privado', is_private: true },
];

export const SEED_HABITS: SeedHabit[] = [
  {
    name: 'Tomar agua',
    category: 'salud',
    icon: 'agua',
    type: 'quantity',
    unit: 'ml',
    goal: { target_value: 2000, period: 'day', direction: 'min' },
    quick_buttons: [250, 500, 750],
  },
  {
    name: 'Anki',
    category: 'estudio',
    icon: 'tarjetas',
    type: 'duration',
    unit: 'min',
    goal: { target_value: 30, period: 'day', direction: 'min' },
  },
  {
    name: 'Practicar speaking',
    category: 'estudio',
    icon: 'voz',
    type: 'frequency',
    unit: 'veces',
    goal: { target_value: 3, period: 'week', direction: 'min' },
    log_fields: ['duration', 'note'],
  },
  {
    name: 'Película en inglés',
    category: 'estudio',
    icon: 'pelicula',
    type: 'frequency',
    unit: 'veces',
    goal: { target_value: 1, period: 'week', direction: 'min' },
    log_fields: ['title', 'rating'],
  },
  // La meta del gimnasio se define en la app; hasta entonces solo cuenta sesiones.
  { name: 'Gimnasio', category: 'salud', icon: 'pesa', type: 'frequency', unit: 'sesiones', module: 'gym' },
  { name: 'Peso corporal', category: 'salud', icon: 'balanza', type: 'measurement', unit: 'kg', module: 'weight', log_fields: ['time'] },
  { name: 'Salir de fiesta', category: 'social', icon: 'fiesta', type: 'event', unit: 'veces', log_fields: ['note', 'cost'] },
  { name: 'Comer fuera', category: 'social', icon: 'plato', type: 'event', unit: 'veces', log_fields: ['place', 'with', 'cost'] },
  { name: 'Intimidad', category: 'privado', icon: 'punto', type: 'event', unit: 'veces', log_fields: ['note'] },
];

/** Meta semanal de series por defecto: de 10 a 20. Cardio no cuenta series. */
export const SEED_MUSCLE_GROUPS: { name: string; min: number | null; max: number | null }[] = [
  'Pecho',
  'Espalda',
  'Hombros',
  'Bíceps',
  'Tríceps',
  'Antebrazos',
  'Cuádriceps',
  'Isquiotibiales',
  'Glúteos',
  'Pantorrillas',
  'Abdomen',
].map((name) => ({ name, min: 10, max: 20 }));
SEED_MUSCLE_GROUPS.push({ name: 'Cardio', min: null, max: null });
