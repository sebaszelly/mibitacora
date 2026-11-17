import { describe, expect, it } from 'vitest';
import { fmtInt, fmtNum, parseNum, rangeLabel } from './format';
import { groupState, sessionDays, setsByGroup } from './gym';
import { weightDelta, weightSeries } from './weight';
import type { BodyMetric, Workout, WorkoutSet } from './types';

const base = (id: string) => ({ id, user_id: 'u', created_at: `2026-11-01T10:00:00.000Z`, updated_at: '', deleted_at: null as string | null });

describe('formato', () => {
  it('miles con espacio fino y decimales con punto', () => {
    expect(fmtInt(1500)).toBe('1 500');
    expect(fmtInt(250)).toBe('250');
    expect(fmtNum(72.4)).toBe('72.4');
    expect(fmtNum(72)).toBe('72');
    expect(parseNum('72,4')).toBe(72.4);
    expect(parseNum(' 500 ')).toBe(500);
    expect(parseNum('abc')).toBeNull();
    expect(parseNum('0')).toBeNull();
  });
  it('etiquetas de rango', () => {
    expect(rangeLabel({ start: '2026-11-01', end: '2026-11-30' })).toBe('noviembre 2026');
    expect(rangeLabel({ start: '2026-11-16', end: '2026-11-22' })).toBe('16 nov – 22 nov');
  });
});

describe('gym', () => {
  const w = (id: string, date: string): Workout => ({ ...base(id), date, duration_min: null, rpe: null, note: null, routine_id: null });
  const s = (id: string, workout_id: string, g: string, n = 1, deleted = false): WorkoutSet => ({
    ...base(id),
    deleted_at: deleted ? 'x' : null,
    workout_id,
    muscle_group_id: g,
    exercise_id: null,
    weight_kg: null,
    reps: null,
    set_count: n,
  });
  const workouts = [w('w1', '2026-11-16'), w('w2', '2026-11-18'), w('w3', '2026-11-09'), w('w4', '2026-11-19')];
  const sets = [s('a', 'w1', 'pecho', 4), s('b', 'w1', 'triceps', 3), s('c', 'w2', 'pecho', 5), s('d', 'w3', 'pecho', 9), s('e', 'w2', 'pecho', 1, true), s('f', 'w4', 'pecho', 1, true)];

  it('cuenta las series de la semana por grupo, sin las borradas', () => {
    const m = setsByGroup(workouts, sets, { start: '2026-11-16', end: '2026-11-22' });
    expect(m.get('pecho')).toBe(9);
    expect(m.get('triceps')).toBe(3);
  });
  it('un día cuenta como sesión solo si tiene series', () => {
    expect([...sessionDays(workouts, sets).keys()].sort()).toEqual(['2026-11-09', '2026-11-16', '2026-11-18']);
  });
  it('verde en rango, amarillo bajo la meta, rojo sobre el máximo', () => {
    const g = { weekly_min_sets: 10, weekly_max_sets: 20 };
    expect(groupState(9, g)).toBe('below');
    expect(groupState(10, g)).toBe('in');
    expect(groupState(20, g)).toBe('in');
    expect(groupState(21, g)).toBe('above');
    expect(groupState(5, { weekly_min_sets: null, weekly_max_sets: null })).toBe('none');
  });
});

describe('peso corporal', () => {
  const m = (date: string, kg: number, created = '10'): BodyMetric => ({
    ...base(date + created),
    created_at: `${date}T${created}:00:00.000Z`,
    date,
    time: null,
    weight_kg: kg,
    body_fat_pct: null,
    measurements: null,
  });
  const metrics = [m('2026-11-10', 73), m('2026-11-12', 72.6), m('2026-11-17', 72.8, '08'), m('2026-11-17', 72.4, '20'), m('2026-11-01', 74)];

  it('un punto por día (el último) y media móvil de 7 días', () => {
    const s = weightSeries(metrics);
    expect(s.map((p) => p.date)).toEqual(['2026-11-01', '2026-11-10', '2026-11-12', '2026-11-17']);
    expect(s[3]).toEqual({ date: '2026-11-17', kg: 72.4, avg: 72.5 });
    expect(s[1]!.avg).toBe(73);
  });
  it('variación semanal y mensual', () => {
    const s = weightSeries(metrics);
    expect(weightDelta(s, 7)).toBe(-0.6);
    expect(weightDelta(s, 30)).toBeNull();
    expect(weightDelta(s, 14)).toBe(-1.6);
  });
});
