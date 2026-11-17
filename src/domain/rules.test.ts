import { describe, expect, it } from 'vitest';
import type { DateStr, PeriodKind } from './dates';
import { completion, daySummary, evalOn, evalPeriod, prepare, streak } from './rules';
import type { Habit, HabitGoal, HabitLog, HabitPause, HabitType } from './types';

let seq = 0;
const base = () => ({ id: `id-${++seq}`, user_id: 'u', created_at: '2026-10-01T12:00:00.000Z', updated_at: '2026-10-01T12:00:00.000Z', deleted_at: null });

function habit(type: HabitType, over: Partial<Habit> = {}): Habit {
  return {
    ...base(),
    name: 'h',
    icon: '',
    color: '',
    category_id: 'c',
    type,
    unit: '',
    schedule: { start_date: '2026-10-01' },
    quick_buttons: [],
    log_fields: [],
    is_private: false,
    archived_at: null,
    sort_order: 0,
    module: null,
    reference_value: null,
    ...over,
  };
}
const goal = (h: Habit, target_value: number, period: PeriodKind, valid_from: DateStr, valid_to: DateStr | null = null, direction: 'min' | 'max' = 'min'): HabitGoal => ({
  ...base(),
  habit_id: h.id,
  target_value,
  period,
  direction,
  valid_from,
  valid_to,
});
const log = (h: Habit, date: DateStr, value: number | null = null, duration_min: number | null = null): HabitLog => ({
  ...base(),
  habit_id: h.id,
  date,
  value,
  duration_min,
  note: null,
  extra: null,
});
const pause = (h: Habit, start_date: DateStr, end_date: DateStr | null): HabitPause => ({ ...base(), habit_id: h.id, start_date, end_date, reason: null });

const TODAY = '2026-11-19'; // jueves

describe('estado por día', () => {
  const agua = habit('quantity');
  const goals = [goal(agua, 2000, 'day', '2026-10-01')];

  it('cantidad: se acumula en el día y se cumple al llegar a la meta', () => {
    const d = prepare(agua, goals, [], [log(agua, '2026-11-18', 500), log(agua, '2026-11-18', 750), log(agua, '2026-11-18', 750)]);
    const r = evalPeriod(d, 'day', '2026-11-18', TODAY);
    expect(r).toMatchObject({ status: 'done', value: 2000, target: 2000, open: false });
  });

  it('parcial cuando hay avance pero no alcanza; no cumplido cuando no hay nada', () => {
    const d = prepare(agua, goals, [], [log(agua, '2026-11-17', 1500)]);
    expect(evalPeriod(d, 'day', '2026-11-17', TODAY).status).toBe('partial');
    expect(evalPeriod(d, 'day', '2026-11-16', TODAY).status).toBe('missed');
  });

  it('hoy sin registros está pendiente, no fallado', () => {
    const d = prepare(agua, goals, [], []);
    expect(evalPeriod(d, 'day', TODAY, TODAY)).toMatchObject({ status: 'pending', open: true });
  });

  it('los registros borrados no cuentan', () => {
    const borrado = { ...log(agua, '2026-11-18', 2000), deleted_at: '2026-11-18T20:00:00.000Z' };
    expect(evalPeriod(prepare(agua, goals, [], [borrado]), 'day', '2026-11-18', TODAY).status).toBe('missed');
  });

  it('duración: suma minutos y guarda los extra', () => {
    const anki = habit('duration');
    const d = prepare(anki, [goal(anki, 30, 'day', '2026-10-01')], [], [log(anki, '2026-11-18', null, 20), log(anki, '2026-11-18', null, 14)]);
    expect(evalPeriod(d, 'day', '2026-11-18', TODAY)).toMatchObject({ status: 'done', value: 34 });
  });

  it('sí/no: marcado dos veces sigue siendo un solo cumplido', () => {
    const cama = habit('yesno');
    const d = prepare(cama, [goal(cama, 1, 'day', '2026-10-01')], [], [log(cama, '2026-11-18'), log(cama, '2026-11-18')]);
    expect(evalPeriod(d, 'day', '2026-11-18', TODAY)).toMatchObject({ status: 'done', value: 1 });
  });

  it('pausa: gris, no cuenta en contra', () => {
    const d = prepare(agua, goals, [pause(agua, '2026-11-10', '2026-11-12')], []);
    expect(evalPeriod(d, 'day', '2026-11-11', TODAY).status).toBe('paused');
    expect(evalPeriod(d, 'day', '2026-11-13', TODAY).status).toBe('missed');
  });

  it('días específicos: fuera de ellos no está programado', () => {
    const lmv = habit('yesno', { schedule: { start_date: '2026-10-01', days: [1, 3, 5] } });
    const d = prepare(lmv, [goal(lmv, 1, 'day', '2026-10-01')], [], []);
    expect(evalPeriod(d, 'day', '2026-11-17', TODAY).status).toBe('unscheduled'); // martes
    expect(evalPeriod(d, 'day', '2026-11-18', TODAY).status).toBe('missed'); // miércoles
  });

  it('evento y medición no tienen meta: solo cuentan', () => {
    const fiesta = habit('event');
    expect(evalOn(prepare(fiesta, [], [], [log(fiesta, '2026-11-14')]), '2026-11-14', TODAY)).toMatchObject({ status: 'untracked', value: 1 });
    const peso = habit('measurement');
    expect(evalOn(prepare(peso, [], [], [log(peso, '2026-11-14', 72.4)]), '2026-11-14', TODAY)).toMatchObject({ status: 'untracked', value: 72.4 });
  });

  it('meta máxima ("como mucho"): se cumple mientras no se supere', () => {
    const cafe = habit('quantity');
    const g = [goal(cafe, 2, 'day', '2026-10-01', null, 'max')];
    expect(evalPeriod(prepare(cafe, g, [], [log(cafe, '2026-11-18', 2)]), 'day', '2026-11-18', TODAY).status).toBe('done');
    expect(evalPeriod(prepare(cafe, g, [], [log(cafe, '2026-11-18', 3)]), 'day', '2026-11-18', TODAY).status).toBe('missed');
    expect(evalPeriod(prepare(cafe, g, [], []), 'day', '2026-11-18', TODAY).status).toBe('done');
  });
});

describe('metas con vigencia', () => {
  it('si cambio la meta de agua a 2500, los meses anteriores se siguen evaluando contra 2000', () => {
    const agua = habit('quantity');
    const goals = [goal(agua, 2000, 'day', '2026-10-01', '2026-11-18'), goal(agua, 2500, 'day', '2026-11-19')];
    const logs = [log(agua, '2026-10-15', 2000), log(agua, '2026-11-19', 2000)];
    const d = prepare(agua, goals, [], logs);
    expect(evalPeriod(d, 'day', '2026-10-15', TODAY)).toMatchObject({ status: 'done', target: 2000 });
    expect(evalPeriod(d, 'day', '2026-11-19', TODAY)).toMatchObject({ status: 'partial', target: 2500 });
  });

  it('una semana usa la meta vigente en su último día', () => {
    const spk = habit('frequency');
    const goals = [goal(spk, 3, 'week', '2026-10-01', '2026-11-18'), goal(spk, 4, 'week', '2026-11-19')];
    const d = prepare(spk, goals, [], []);
    expect(evalPeriod(d, 'week', '2026-11-12', TODAY).target).toBe(3);
    expect(evalPeriod(d, 'week', TODAY, TODAY).target).toBe(4);
  });
});

describe('frecuencia por semana', () => {
  const spk = habit('frequency');
  const goals = [goal(spk, 3, 'week', '2026-10-01')];

  it('se cumple con 3 veces en la semana, en cualquier día', () => {
    const d = prepare(spk, goals, [], [log(spk, '2026-11-09'), log(spk, '2026-11-11'), log(spk, '2026-11-15')]);
    expect(evalPeriod(d, 'week', '2026-11-12', TODAY)).toMatchObject({ status: 'done', value: 3, range: { start: '2026-11-09', end: '2026-11-15' } });
  });

  it('la semana en curso muestra el avance sin darla por perdida', () => {
    const d = prepare(spk, goals, [], [log(spk, '2026-11-17')]);
    expect(evalOn(d, TODAY, TODAY)).toMatchObject({ status: 'partial', value: 1, target: 3, kind: 'week', open: true });
  });

  it('la racha se cuenta en semanas cumplidas', () => {
    const logs = ['2026-10-26', '2026-10-27', '2026-10-28', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-17'].map((d) => log(spk, d));
    const s = streak(prepare(spk, goals, [], logs), TODAY);
    expect(s).toEqual({ current: 3, best: 3, unit: 'week' });
  });

  it('una semana empezada a medias no cuenta en contra', () => {
    const nuevo = habit('frequency', { schedule: { start_date: '2026-11-12' } }); // jueves
    const d = prepare(nuevo, [goal(nuevo, 3, 'week', '2026-11-12')], [], [log(nuevo, '2026-11-13')]);
    expect(evalPeriod(d, 'week', '2026-11-12', TODAY).status).toBe('unscheduled');
    expect(completion(d, { start: '2026-11-01', end: '2026-11-30' }, TODAY)).toMatchObject({ scheduled: 0, pct: null });
  });
});

describe('% del día', () => {
  it('solo cuentan los hábitos con meta diaria', () => {
    const agua = habit('quantity');
    const anki = habit('duration');
    const spk = habit('frequency');
    const fiesta = habit('event');
    const all = [
      prepare(agua, [goal(agua, 2000, 'day', '2026-10-01')], [], [log(agua, TODAY, 1500)]),
      prepare(anki, [goal(anki, 30, 'day', '2026-10-01')], [], [log(anki, TODAY, null, 34)]),
      prepare(spk, [goal(spk, 3, 'week', '2026-10-01')], [], []),
      prepare(fiesta, [], [], [log(fiesta, TODAY)]),
    ];
    expect(daySummary(all, TODAY, TODAY)).toEqual({ done: 1, partial: 1, total: 2, pct: 50, perfect: false });
  });

  it('un hábito en pausa no entra en la cuenta', () => {
    const agua = habit('quantity');
    const anki = habit('duration');
    const all = [
      prepare(agua, [goal(agua, 2000, 'day', '2026-10-01')], [pause(agua, TODAY, null)], []),
      prepare(anki, [goal(anki, 30, 'day', '2026-10-01')], [], [log(anki, TODAY, null, 30)]),
    ];
    expect(daySummary(all, TODAY, TODAY)).toEqual({ done: 1, partial: 0, total: 1, pct: 100, perfect: true });
  });
});

describe('% de cumplimiento y rachas', () => {
  it('periodos cumplidos ÷ programados, sin contar pausas ni el día en curso', () => {
    const agua = habit('quantity', { schedule: { start_date: '2026-11-09' } });
    const logs = [log(agua, '2026-11-09', 2000), log(agua, '2026-11-10', 2000), log(agua, '2026-11-11', 500), log(agua, '2026-11-16', 2000)];
    const d = prepare(agua, [goal(agua, 2000, 'day', '2026-11-09')], [pause(agua, '2026-11-12', '2026-11-15')], logs);
    // 9 ✓, 10 ✓, 11 parcial, 12–15 pausa, 16 ✓, 17 ✗, 18 ✗, 19 hoy (abierto)
    expect(completion(d, { start: '2026-11-01', end: '2026-11-30' }, TODAY)).toEqual({ done: 3, scheduled: 6, pct: 50 });
  });

  it('la pausa no rompe la racha; un día fallado sí', () => {
    const agua = habit('quantity', { schedule: { start_date: '2026-11-09' } });
    const g = [goal(agua, 2000, 'day', '2026-11-09')];
    const dias = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-16', '2026-11-17', '2026-11-18'];
    const d = prepare(agua, g, [pause(agua, '2026-11-12', '2026-11-15')], dias.map((x) => log(agua, x, 2000)));
    expect(streak(d, TODAY)).toEqual({ current: 6, best: 6, unit: 'day' });
    const roto = prepare(agua, g, [], dias.map((x) => log(agua, x, 2000)));
    expect(streak(roto, TODAY)).toEqual({ current: 3, best: 3, unit: 'day' });
  });

  it('un hábito archivado sigue apareciendo en los reportes de su periodo', () => {
    const viejo = habit('yesno', { schedule: { start_date: '2026-10-01' }, archived_at: '2026-10-11T15:00:00.000Z' });
    const logs = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05'].map((x) => log(viejo, x));
    const d = prepare(viejo, [goal(viejo, 1, 'day', '2026-10-01')], [], logs);
    // Programado del 1 al 10 de octubre: 5 de 10.
    expect(completion(d, { start: '2026-10-01', end: '2026-10-31' }, TODAY)).toEqual({ done: 5, scheduled: 10, pct: 50 });
    expect(evalPeriod(d, 'day', '2026-11-18', TODAY).status).toBe('unscheduled');
  });
});
