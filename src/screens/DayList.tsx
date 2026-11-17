import { Check, Plus } from '@phosphor-icons/react';
import { type DateStr, monthEnd, monthStart, weekEnd, weekStart } from '../domain/dates';
import { ago, fmtNum } from '../domain/format';
import { setsByGroup } from '../domain/gym';
import { type HabitData, type PeriodResult, evalOn, goalKindOn, habitEnd, valueIn } from '../domain/rules';
import { logWithUndo, toggleYesNo } from '../state/actions';
import { useData } from '../state/data';
import { displayName, useUI } from '../state/ui';
import { Phase, statusPhase } from '../ui/Phase';
import { HabitIcon } from '../ui/icons';

const PERIOD_LABEL = { day: 'hoy', week: 'esta semana', month: 'este mes' } as const;

/** Hábitos que existen en una fecha: no archivados antes de ese día. */
export function habitsOn(datas: HabitData[], date: DateStr): HabitData[] {
  return datas.filter((d) => {
    const end = habitEnd(d.habit);
    return end === null || end >= date;
  });
}

/** Todo lo de un día, listo para registrar. Se usa en Hoy y al tocar un día del calendario. */
export function DayList({ date }: { date: DateStr }) {
  const { datas } = useData();
  const { today, privateOpen } = useUI();
  const rows = habitsOn(datas, date).map((data) => ({ data, r: evalOn(data, date, today), kind: goalKindOn(data, date) }));

  const daily = rows.filter((x) => x.kind === 'day' && (x.r.status !== 'unscheduled' || x.r.value > 0));
  const periodic = rows.filter((x) => x.kind === 'week' || x.kind === 'month');
  const other = rows.filter((x) => x.kind === null);
  const isToday = date === today;

  if (rows.length === 0) {
    return (
      <div className="empty">
        <strong>Todavía no hay hábitos</strong>
        Crea el primero en Más → Mis hábitos.
      </div>
    );
  }

  return (
    <>
      {daily.length > 0 && (
        <section aria-label="Hábitos diarios">
          <h2 className="sec">{isToday ? 'Hoy' : 'Ese día'}</h2>
          {daily.map((x) => (
            <HabitRow key={x.data.habit.id} {...x} date={date} privateOpen={privateOpen} />
          ))}
        </section>
      )}
      {periodic.length > 0 && (
        <section aria-label="Hábitos por periodo">
          <h2 className="sec">{isToday ? 'Esta semana' : 'Su semana'}</h2>
          {periodic.map((x) => (
            <HabitRow key={x.data.habit.id} {...x} date={date} privateOpen={privateOpen} />
          ))}
        </section>
      )}
      {other.length > 0 && (
        <section aria-label="Registrar">
          <h2 className="sec">Registrar</h2>
          {other.map((x) => (
            <HabitRow key={x.data.habit.id} {...x} date={date} privateOpen={privateOpen} />
          ))}
        </section>
      )}
    </>
  );
}

interface RowProps {
  data: HabitData;
  r: PeriodResult;
  kind: 'day' | 'week' | 'month' | null;
  date: DateStr;
  privateOpen: boolean;
}

function HabitRow({ data, r, kind, date, privateOpen }: RowProps) {
  const { habit } = data;
  const ui = useUI();
  const { workouts, sets } = useData();
  const name = displayName(habit, privateOpen);
  const discreet = habit.is_private && !privateOpen;
  const openSheet = () => ui.open(habit.module === 'gym' ? { t: 'gym', date } : habit.module === 'weight' ? { t: 'weight', date } : { t: 'habit', id: habit.id, date });
  const paused = r.status === 'paused';
  const measured = habit.type === 'quantity' || habit.type === 'duration';
  const unit = habit.unit;

  // Última vez que se registró, para eventos y mediciones.
  let lastDate: DateStr | null = null;
  if (kind === null) for (const [d, v] of data.byDay) if (v > 0 && d <= date && (lastDate === null || d > lastDate)) lastDate = d;

  const lead =
    kind === 'day' ? <Phase kind={statusPhase(r.status)} /> : <HabitIcon habit={habit} discreet={discreet} />;

  let figure: React.ReactNode = null;
  let action: React.ReactNode = null;
  let hint: string | null = paused ? 'en pausa' : null;

  const plus = (label: string, onClick: () => void) => (
    <button type="button" className="icon-btn accent press" aria-label={label} onClick={onClick}>
      <Plus size={22} weight="bold" />
    </button>
  );

  if (habit.module === 'gym') {
    const week = { start: weekStart(date), end: weekEnd(date) };
    let total = 0;
    for (const n of setsByGroup(workouts, sets, week).values()) total += n;
    const sessions = valueIn(data, week);
    hint ??= `${sessions} ${sessions === 1 ? 'sesión' : 'sesiones'}`;
    figure = r.target !== null ? (
      <span className="fig">{sessions} <small>de {r.target}</small></span>
    ) : (
      <span className="fig">{total} <small>series</small></span>
    );
    action = plus('Registrar series', openSheet);
  } else if (habit.type === 'measurement') {
    const last = lastDate ? data.byDay.get(lastDate)! : null;
    hint ??= lastDate ? ago(lastDate, date) : 'sin registros';
    figure = last !== null ? <span className="fig">{fmtNum(last)} <small>{unit}</small></span> : null;
    action = plus(`Registrar ${name}`, openSheet);
  } else if (habit.type === 'yesno') {
    const done = r.value > 0;
    action = (
      <button type="button" className="icon-btn press" aria-pressed={done} aria-label={done ? `Desmarcar ${name}` : `Marcar ${name}`} onClick={() => void toggleYesNo(habit, date, name)} style={done ? { background: 'var(--accent)', color: 'var(--accent-ink)' } : { border: '1.5px solid var(--ink)' }}>
        {done && <Check size={22} weight="bold" />}
      </button>
    );
  } else if (measured && r.target !== null) {
    figure = <span className="fig">{fmtNum(r.value)} <small>/ {fmtNum(r.target)} {unit}</small></span>;
  } else if (r.target !== null) {
    // Frecuencia con meta: una fase por vez, o cifras si son muchas.
    figure = r.target <= 7 ? (
      <span className="dots" role="img" aria-label={`${r.value} de ${r.target} ${PERIOD_LABEL[r.kind]}`}>
        {Array.from({ length: Math.max(r.target, Math.min(r.value, 7)) }, (_, i) => (
          <span key={i} className={`ph sm ${i < r.value ? 'full' : 'future'}`} />
        ))}
      </span>
    ) : (
      <span className="fig">{fmtNum(r.value)} <small>de {fmtNum(r.target)}</small></span>
    );
    action = plus(`Registrar ${name}`, () => void logWithUndo(habit, date, {}, `${name} · ${r.value + 1} de ${r.target}`));
  } else {
    // Evento o hábito sin meta: solo cuenta.
    const month = valueIn(data, { start: monthStart(date), end: monthEnd(date) });
    hint ??= lastDate ? ago(lastDate, date) : null;
    figure = measured ? (
      <span className="fig">{fmtNum(r.value)} <small>{unit}</small></span>
    ) : (
      <span className="fig">{fmtNum(month)} <small>este mes</small></span>
    );
    if (!measured) action = plus(`Registrar ${name}`, () => void logWithUndo(habit, date, {}, `${name} · registrado`));
  }

  const showQuick = measured && !paused;
  const quick = habit.quick_buttons.slice(0, 3);
  const over = r.direction === 'max' && r.target !== null && r.value > r.target;

  return (
    <>
      <div className={`row${showQuick ? ' open' : ''}${paused ? ' is-paused' : ''}`}>
        <span className="lead">{lead}</span>
        <button type="button" className="main" onClick={openSheet} aria-label={`${name}: ver y editar registros`}>
          <span className="name">{name}</span>
          {hint && <span className="hint">{hint}</span>}
        </button>
        {action ? (
          <>
            {figure ?? <span />}
            {action}
          </>
        ) : (
          <span className="span">{figure}</span>
        )}
      </div>
      {showQuick && (
        <div className="sub">
          {r.target !== null && (
            <div className={`bar${over ? ' over' : ''}`}>
              <i style={{ transform: `scaleX(${Math.min(r.value / r.target, 1)})` }} />
            </div>
          )}
          <div className="quick">
            {quick.map((n) => (
              <button
                key={n}
                type="button"
                className="btn q press"
                aria-label={`Sumar ${n} ${unit}`}
                onClick={() => void logWithUndo(habit, date, habit.type === 'duration' ? { duration_min: n } : { value: n }, `+${fmtNum(n)} ${unit}`)}
              >
                +{fmtNum(n)}
              </button>
            ))}
            <button type="button" className="btn q press" onClick={openSheet}>
              Otro
            </button>
          </div>
        </div>
      )}
    </>
  );
}
