import { describe, expect, it } from 'vitest';
import { addDays, diffDays, fortnight, isoWeek, monthEnd, periodsEndingIn, previousRange, weekEnd, weekStart, weekday } from './dates';

describe('fechas', () => {
  it('la semana va de lunes a domingo', () => {
    expect(weekday('2026-11-16')).toBe(1); // lunes
    expect(weekday('2026-11-22')).toBe(7); // domingo
    expect(weekStart('2026-11-19')).toBe('2026-11-16');
    expect(weekEnd('2026-11-19')).toBe('2026-11-22');
    expect(weekStart('2026-11-22')).toBe('2026-11-16');
  });

  it('suma días cruzando meses y años', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29');
    expect(diffDays('2026-11-01', '2026-11-30')).toBe(29);
  });

  it('la quincena va del 1 al 15 y del 16 a fin de mes', () => {
    expect(fortnight('2026-11-15')).toEqual({ start: '2026-11-01', end: '2026-11-15' });
    expect(fortnight('2026-11-16')).toEqual({ start: '2026-11-16', end: '2026-11-30' });
    expect(fortnight('2027-02-20')).toEqual({ start: '2027-02-16', end: '2027-02-28' });
    expect(monthEnd('2028-02-10')).toBe('2028-02-29');
  });

  it('número de semana ISO', () => {
    expect(isoWeek('2026-11-19')).toBe(47);
    expect(isoWeek('2026-01-01')).toBe(1);
    expect(isoWeek('2027-01-01')).toBe(53);
  });

  it('una semana partida entre dos meses cuenta donde termina', () => {
    const nov = periodsEndingIn('week', { start: '2026-11-01', end: '2026-11-30' });
    expect(nov.map((p) => p.end)).toEqual(['2026-11-01', '2026-11-08', '2026-11-15', '2026-11-22', '2026-11-29']);
    const dec = periodsEndingIn('week', { start: '2026-12-01', end: '2026-12-31' });
    expect(dec[0]).toEqual({ start: '2026-11-30', end: '2026-12-06' });
  });

  it('periodo anterior de igual duración', () => {
    expect(previousRange({ start: '2026-11-16', end: '2026-11-22' })).toEqual({ start: '2026-11-09', end: '2026-11-15' });
    expect(previousRange({ start: '2026-03-01', end: '2026-03-31' })).toEqual({ start: '2026-02-01', end: '2026-02-28' });
  });
});
