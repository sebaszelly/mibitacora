import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { useState } from 'react';
import { addDays, weekEnd, weekStart } from '../domain/dates';
import { ago, capitalize, fmtNum, longDate, rangeLabel } from '../domain/format';
import { setsByDay, setsByGroup } from '../domain/gym';
import { weightDelta } from '../domain/weight';
import { useData } from '../state/data';
import { useUI } from '../state/ui';
import { WeightChart } from '../ui/WeightChart';
import { GroupRows } from './GymSheets';

const signed = (n: number): string => `${n > 0 ? '+' : n < 0 ? '−' : ''}${fmtNum(Math.abs(n))} kg`;

export function Gym() {
  const { workouts, sets, weight, habits } = useData();
  const { today, open } = useUI();
  const [cursor, setCursor] = useState(today);
  const week = { start: weekStart(cursor), end: weekEnd(cursor) };
  const current = today >= week.start && today <= week.end;

  const byDay = setsByDay(workouts, sets);
  let total = 0;
  for (const n of setsByGroup(workouts, sets, week).values()) total += n;
  const sessions = [...byDay.keys()].filter((d) => d >= week.start && d <= week.end).length;
  const recent = [...byDay.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 6);

  const last = weight[weight.length - 1];
  const d7 = weightDelta(weight, 7);
  const d30 = weightDelta(weight, 30);
  const reference = habits.find((h) => h.module === 'weight')?.reference_value ?? null;

  return (
    <>
      <header className="page-hd">
        <h1>Gym</h1>
        <p>
          {sessions} {sessions === 1 ? 'sesión' : 'sesiones'} · {fmtNum(total)} series
        </p>
      </header>
      <div className="stepper">
        <button type="button" className="icon-btn press" aria-label="Semana anterior" onClick={() => setCursor(addDays(cursor, -7))}>
          <CaretLeft size={20} weight="bold" />
        </button>
        <strong>{current ? 'Esta semana' : rangeLabel(week)}</strong>
        <button type="button" className="icon-btn press" aria-label="Semana siguiente" disabled={current} onClick={() => setCursor(addDays(cursor, 7))}>
          <CaretRight size={20} weight="bold" />
        </button>
      </div>

      <GroupRows date={current ? today : week.start} canAdd={current} />
      {!current && <p className="notice" style={{ paddingBlock: 12 }}>Para registrar en una semana pasada, toca el día en Calendario.</p>}

      <h2 className="sec">Peso corporal</h2>
      {last ? (
        <div className="weight">
          <div>
            <div className="big num">
              {fmtNum(last.kg)} <small>kg</small>
            </div>
            <p className="when">{capitalize(ago(last.date, today))} · media de 7 días {fmtNum(last.avg)} kg</p>
          </div>
          <div className="deltas">
            <span>
              7 días <b>{d7 === null ? '—' : signed(d7)}</b>
            </span>
            <span>
              30 días <b>{d30 === null ? '—' : signed(d30)}</b>
            </span>
          </div>
        </div>
      ) : (
        <p className="empty">Aún no has registrado tu peso.</p>
      )}
      {last && <div className="pad"><WeightChart series={weight} reference={reference} until={today} /></div>}
      <div className="pad" style={{ paddingBlock: 12 }}>
        <button type="button" className="btn block press" onClick={() => open({ t: 'weight', date: today })}>
          Registrar peso de hoy
        </button>
      </div>

      <h2 className="sec">Sesiones recientes</h2>
      {recent.length === 0 && <p className="empty">Cuando sumes series, tus sesiones aparecerán aquí.</p>}
      {recent.map(([d, n]) => (
        <button type="button" className="kv" key={d} style={{ width: '100%', textAlign: 'left' }} onClick={() => open({ t: 'gym', date: d })}>
          <span className="name">{capitalize(longDate(d))}</span>
          <span className="fig">
            {fmtNum(n)} <small>series</small>
          </span>
        </button>
      ))}
    </>
  );
}
