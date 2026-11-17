import { Trash } from '@phosphor-icons/react';
import { useState } from 'react';
import { db } from '../db/db';
import { patch } from '../db/repo';
import { type DateStr, weekEnd, weekStart } from '../domain/dates';
import { capitalize, fmtNum, longDate, parseNum } from '../domain/format';
import { type GroupState, groupState, setsByGroup } from '../domain/gym';
import type { MuscleGroup } from '../domain/types';
import { addSets, addWeight, removeSet, removeWeight } from '../state/actions';
import { useData } from '../state/data';
import { useUI } from '../state/ui';
import { Sheet, useClose } from '../ui/Sheet';

const STATE_TEXT: Record<GroupState, string> = { none: 'sin meta', below: 'bajo la meta', in: 'en rango', above: 'sobre el máximo' };

/** Series de la semana por grupo, con +1 para un día concreto. */
export function GroupRows({ date, canAdd }: { date: DateStr; canAdd: boolean }) {
  const { groups, workouts, sets } = useData();
  const { open } = useUI();
  const counts = setsByGroup(workouts, sets, { start: weekStart(date), end: weekEnd(date) });
  return (
    <>
      {groups.map((g) => {
        const n = counts.get(g.id) ?? 0;
        const state = groupState(n, g);
        const max = g.weekly_max_sets ?? g.weekly_min_sets ?? 0;
        const scale = Math.max(max * 1.25, n, 1);
        const range = g.weekly_min_sets !== null && g.weekly_max_sets !== null ? `${g.weekly_min_sets}–${g.weekly_max_sets}` : null;
        return (
          <div className="g-row" key={g.id}>
            <button type="button" className="main" onClick={() => open({ t: 'group', id: g.id })} aria-label={`${g.name}: ${n} series, ${STATE_TEXT[state]}. Editar meta`}>
              <span className="name">{g.name}</span>
              <span className={`g-bar ${state}`}>
                {range && <span className="zone" style={{ left: `${(g.weekly_min_sets! / scale) * 100}%`, right: `${100 - (g.weekly_max_sets! / scale) * 100}%` }} />}
                <i style={{ transform: `scaleX(${n / scale})` }} />
              </span>
            </button>
            <span className="fig">
              {fmtNum(n)} {range && <small>/ {range}</small>}
            </span>
            <button type="button" className="g-plus press" disabled={!canAdd} aria-label={`Sumar una serie a ${g.name}`} onClick={() => void addSets(g.id, g.name, date)}>
              +1
            </button>
          </div>
        );
      })}
    </>
  );
}

/** Registrar series en un día: lo abre la fila Gimnasio de Hoy o de un día del calendario. */
export function GymSheet({ date, onClosed }: { date: DateStr; onClosed: () => void }) {
  const { workouts, sets, groups } = useData();
  const ids = new Set(workouts.filter((w) => w.date === date).map((w) => w.id));
  const daySets = sets.filter((s) => ids.has(s.workout_id)).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const nameOf = new Map(groups.map((g) => [g.id, g.name]));
  return (
    <Sheet title="Series" subtitle={`${capitalize(longDate(date))} · toca +1 por cada serie`} onClosed={onClosed} full>
      <GroupRows date={date} canAdd />
      {daySets.length > 0 && (
        <>
          <h3 className="sec">Series de este día</h3>
          {daySets.map((s) => (
            <div className="entry" key={s.id}>
              <strong>
                {nameOf.get(s.muscle_group_id) ?? 'Grupo'} · {s.set_count} {s.set_count === 1 ? 'serie' : 'series'}
              </strong>
              <span />
              <button type="button" className="icon-btn press" aria-label="Borrar serie" onClick={() => void removeSet(s.id)}>
                <Trash size={20} weight="bold" />
              </button>
            </div>
          ))}
        </>
      )}
    </Sheet>
  );
}

/** Meta semanal de un grupo muscular y suma de varias series de una vez. */
export function GroupSheet({ id, onClosed }: { id: string; onClosed: () => void }) {
  const { groups } = useData();
  const g = groups.find((x) => x.id === id);
  if (!g) return null;
  return (
    <Sheet title={g.name} subtitle="Meta semanal de series" onClosed={onClosed}>
      <GroupForm group={g} />
    </Sheet>
  );
}

function GroupForm({ group }: { group: MuscleGroup }) {
  const { today } = useUI();
  const close = useClose();
  const [min, setMin] = useState(group.weekly_min_sets?.toString() ?? '');
  const [max, setMax] = useState(group.weekly_max_sets?.toString() ?? '');
  const [n, setN] = useState('');
  const [error, setError] = useState('');

  async function save() {
    const lo = min.trim() === '' ? null : parseNum(min);
    const hi = max.trim() === '' ? null : parseNum(max);
    if ((min.trim() !== '' && lo === null) || (max.trim() !== '' && hi === null) || (lo !== null && hi !== null && lo > hi)) {
      setError('El mínimo y el máximo deben ser números, y el mínimo no puede superar al máximo.');
      return;
    }
    await patch<MuscleGroup>(db.muscle_groups, group.id, { weekly_min_sets: lo, weekly_max_sets: hi });
    const count = n.trim() === '' ? null : parseNum(n);
    if (count !== null) await addSets(group.id, group.name, today, Math.round(count));
    close();
  }

  return (
    <form
      className="pad stack"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <div className="cols2">
        <label className="field">
          <span>Mínimo por semana</span>
          <input className="input" inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value)} placeholder="Sin mínimo" />
        </label>
        <label className="field">
          <span>Máximo por semana</span>
          <input className="input" inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value)} placeholder="Sin máximo" />
        </label>
      </div>
      <label className="field">
        <span>
          Sumar varias series hoy <small>(opcional)</small>
        </span>
        <input className="input" inputMode="numeric" value={n} onChange={(e) => setN(e.target.value)} placeholder="Por ejemplo 4" />
      </label>
      {error && <p className="error">{error}</p>}
      <button type="submit" className="btn primary block press">
        Guardar
      </button>
    </form>
  );
}

export function WeightSheet({ date, onClosed }: { date: DateStr; onClosed: () => void }) {
  const { metrics } = useData();
  const entries = metrics.filter((m) => m.date === date && m.weight_kg !== null).sort((a, b) => a.created_at.localeCompare(b.created_at));
  return (
    <Sheet title="Peso corporal" subtitle={capitalize(longDate(date))} onClosed={onClosed}>
      <div className="stack lg">
        <WeightForm date={date} />
        {entries.length > 0 && (
          <div>
            <h3 className="sec">Registros de este día</h3>
            {entries.map((m) => (
              <div className="entry" key={m.id}>
                <div>
                  <strong>{fmtNum(m.weight_kg!)} kg</strong>
                  {m.time && <p>{m.time}</p>}
                </div>
                <span />
                <button type="button" className="icon-btn press" aria-label="Borrar peso" onClick={() => void removeWeight(m.id)}>
                  <Trash size={20} weight="bold" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}

function WeightForm({ date }: { date: DateStr }) {
  const { weight } = useData();
  const close = useClose();
  const last = weight[weight.length - 1];
  const [kg, setKg] = useState('');
  const [time, setTime] = useState('');
  const [error, setError] = useState('');

  async function save() {
    const n = parseNum(kg);
    if (n === null || n < 20 || n > 400) {
      setError('Escribe tu peso en kilos, por ejemplo 72.4.');
      return;
    }
    await addWeight(date, Math.round(n * 10) / 10, time || null);
    close();
  }

  return (
    <form
      className="pad stack"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <label className="field">
        <span>Peso (kg)</span>
        <input
          className="input big"
          inputMode="decimal"
          enterKeyHint="done"
          autoComplete="off"
          placeholder={last ? fmtNum(last.kg) : '0.0'}
          value={kg}
          onChange={(e) => {
            setKg(e.target.value);
            setError('');
          }}
          aria-invalid={error !== ''}
        />
        {error && <span className="error">{error}</span>}
      </label>
      <label className="field">
        <span>
          Hora <small>(opcional)</small>
        </span>
        <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </label>
      <button type="submit" className="btn primary block press">
        Guardar
      </button>
    </form>
  );
}
