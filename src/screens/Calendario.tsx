import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { useState } from 'react';
import { type DateStr, addDays, eachDay, monthEnd, monthStart, weekday } from '../domain/dates';
import { WEEKDAY_LETTERS, capitalize, dayNum, longDate, monthName, year } from '../domain/format';
import { dayPhase, daySummary, evalPeriod, goalKindOn } from '../domain/rules';
import { useData } from '../state/data';
import { useUI } from '../state/ui';
import { Phase, type PhaseKind, statusPhase } from '../ui/Phase';
import { Sheet } from '../ui/Sheet';
import { DayList, habitsOn } from './DayList';

export function Calendario() {
  const { datas } = useData();
  const { today, open, privateOpen } = useUI();
  const [cursor, setCursor] = useState(monthStart(today));
  const [filter, setFilter] = useState('all');
  const month = { start: cursor, end: monthEnd(cursor) };
  const visible = datas.filter((d) => privateOpen || !d.habit.is_private);
  const hasPrivate = datas.some((d) => d.habit.is_private);
  const one = filter === 'all' ? null : (visible.find((d) => d.habit.id === filter) ?? null);

  let perfect = 0;
  const phaseOf = (d: DateStr): PhaseKind => {
    if (d > today) return 'future';
    if (one) {
      if (goalKindOn(one, d) === 'day') return statusPhase(evalPeriod(one, 'day', d, today).status);
      return (one.byDay.get(d) ?? 0) > 0 ? 'mark' : 'off';
    }
    const s = daySummary(habitsOn(visible, d), d, today);
    if (s.perfect) perfect += 1;
    return dayPhase(s, d, today);
  };
  const cells = eachDay(month).map((d) => ({ d, phase: phaseOf(d) }));
  const blanks = weekday(month.start) - 1;
  const isCurrent = cursor === monthStart(today);

  return (
    <>
      <header className="page-hd">
        <h1>Calendario</h1>
        {!one && <p>{perfect} {perfect === 1 ? 'día completo' : 'días completos'}</p>}
      </header>
      <div className="stepper">
        <button type="button" className="icon-btn press" aria-label="Mes anterior" onClick={() => setCursor(monthStart(addDays(cursor, -1)))}>
          <CaretLeft size={20} weight="bold" />
        </button>
        <strong>{capitalize(monthName(cursor))} {year(cursor)}</strong>
        <button type="button" className="icon-btn press" aria-label="Mes siguiente" disabled={isCurrent} onClick={() => setCursor(addDays(month.end, 1))}>
          <CaretRight size={20} weight="bold" />
        </button>
      </div>
      <div className="filter">
        <label className="field">
          <span>Mostrar</span>
          <select className="input" value={one ? filter : 'all'} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">Resumen de los hábitos diarios</option>
            {visible.map((d) => (
              <option key={d.habit.id} value={d.habit.id}>
                {d.habit.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="cal-head" aria-hidden="true">
        {WEEKDAY_LETTERS.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
      <div className="cal">
        {Array.from({ length: blanks }, (_, i) => (
          <span key={`b${i}`} className="cal-cell out" />
        ))}
        {cells.map(({ d, phase }) => (
          <button
            key={d}
            type="button"
            className={`cal-cell${weekday(d) === 7 ? ' sun' : ''}${d === today ? ' is-today' : ''}`}
            disabled={d > today}
            onClick={() => open({ t: 'day', date: d })}
            aria-label={`${longDate(d)}: ver y editar`}
          >
            <b className="num">{dayNum(d)}</b>
            <Phase kind={phase} small />
          </button>
        ))}
      </div>
      <div className="legend-row">
        {one && goalKindOn(one, today) !== 'day' ? (
          <span><Phase kind="mark" small /> Registrado ese día</span>
        ) : (
          <>
            <span><Phase kind="full" small /> Cumplido</span>
            <span><Phase kind="half" small /> Parcial</span>
            <span><Phase kind="none" small /> No cumplido</span>
            <span><Phase kind="paused" small /> Pausa</span>
          </>
        )}
      </div>
      {hasPrivate && !privateOpen && (
        <div className="pad" style={{ paddingTop: 12 }}>
          <button type="button" className="link" style={{ paddingLeft: 0 }} onClick={() => open({ t: 'reveal' })}>
            Mostrar privados
          </button>
        </div>
      )}
    </>
  );
}

/** Todo lo de un día, para verlo y corregirlo. */
export function DaySheet({ date, onClosed }: { date: DateStr; onClosed: () => void }) {
  return (
    <Sheet title={capitalize(longDate(date))} subtitle="Toca para registrar o corregir" onClosed={onClosed} full>
      <DayList date={date} />
    </Sheet>
  );
}
