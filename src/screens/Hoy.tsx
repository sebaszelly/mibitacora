import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { daysSinceBackup } from '../db/backup';
import { addDays, eachDay, weekEnd, weekStart, weekday } from '../domain/dates';
import { WEEKDAY_LETTERS, dayNum, fmtPct, longDate, monthWeek, weekdayName } from '../domain/format';
import { dayPhase, daySummary } from '../domain/rules';
import { useData } from '../state/data';
import { useUI } from '../state/ui';
import { Phase } from '../ui/Phase';
import { DayList, habitsOn } from './DayList';

export function Hoy() {
  const { datas, meta } = useData();
  const { today, date, setDate, open } = useUI();
  const week = { start: weekStart(date), end: weekEnd(date) };
  const summary = daySummary(habitsOn(datas, date), date, today);

  // Celebración poco frecuente: avisar una vez cuando el día queda completo.
  const wasPerfect = useRef<boolean | null>(null);
  useEffect(() => {
    if (date !== today) return;
    if (wasPerfect.current === false && summary.perfect) toast(`Día completo · ${summary.done} de ${summary.total}`);
    wasPerfect.current = summary.perfect;
  }, [summary.perfect, summary.done, summary.total, date, today]);

  const backupDays = daysSinceBackup((meta.get('last_backup_at') as string | undefined) ?? (meta.get('installed_at') as string | undefined));
  const neverBackedUp = !meta.get('last_backup_at');

  return (
    <>
      <header className="day-hd">
        <div className="day num" aria-hidden="true">{dayNum(date)}</div>
        <div className="meta">
          <h1 className="sr-only">{longDate(date)}</h1>
          <b aria-hidden="true">{weekdayName(date)}</b>
          <span>{monthWeek(date)}</span>
        </div>
        {summary.pct !== null && (
          <div className="pct">
            <b className="num">{fmtPct(summary.pct)}</b>
            <span>{summary.perfect ? 'Día completo' : `${summary.done} de ${summary.total} del día`}</span>
          </div>
        )}
      </header>

      <div className="week" role="group" aria-label="Días de la semana">
        <button type="button" className="wk-nav" aria-label="Semana anterior" onClick={() => setDate(addDays(date, -7))}>
          <CaretLeft size={18} weight="bold" />
        </button>
        {eachDay(week).map((d) => {
          const s = daySummary(habitsOn(datas, d), d, today);
          const cls = `cell${weekday(d) === 7 ? ' sun' : ''}${d === today ? ' is-today' : ''}`;
          return (
            <button key={d} type="button" className={cls} aria-pressed={d === date} disabled={d > today} onClick={() => setDate(d)} aria-label={longDate(d)}>
              {WEEKDAY_LETTERS[weekday(d) - 1]}
              <b className="num">{dayNum(d)}</b>
              <Phase kind={dayPhase(s, d, today)} celebrate={d === today} />
            </button>
          );
        })}
        <button type="button" className="wk-nav" aria-label="Semana siguiente" disabled={addDays(date, 7) > today && week.end >= today} onClick={() => setDate(addDays(date, 7) > today ? today : addDays(date, 7))}>
          <CaretRight size={18} weight="bold" />
        </button>
      </div>

      {date !== today && (
        <div className="notice">
          <span>Estás registrando en un día pasado.</span>
          <button type="button" className="link" onClick={() => setDate(today)}>
            Volver a hoy
          </button>
        </div>
      )}
      {date === today && backupDays !== null && backupDays > 7 && (
        <div className="notice">
          <span>{neverBackedUp ? 'Aún no has hecho un respaldo.' : `Último respaldo: hace ${backupDays} días.`}</span>
          <button type="button" className="link" onClick={() => open({ t: 'backup' })}>
            Respaldar
          </button>
        </div>
      )}

      <DayList date={date} />
    </>
  );
}
