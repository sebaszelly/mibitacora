import { Trash } from '@phosphor-icons/react';
import { useState } from 'react';
import type { DateStr } from '../domain/dates';
import { capitalize, fmtNum, longDate, parseNum } from '../domain/format';
import { evalOn, streak } from '../domain/rules';
import type { HabitLog, LogField } from '../domain/types';
import { logWithUndo, removeLog } from '../state/actions';
import { useData } from '../state/data';
import { displayName, useUI } from '../state/ui';
import { Sheet, useClose } from '../ui/Sheet';

const FIELD_LABEL: Record<LogField, string> = {
  note: 'Nota',
  duration: 'Duración (min)',
  place: 'Lugar',
  with: 'Con quién',
  cost: 'Gasto (S/)',
  title: 'Título',
  rating: 'Calificación',
  time: 'Hora',
};

function describe(log: HabitLog): string {
  const x = (log.extra ?? {}) as Record<string, unknown>;
  const parts = [
    x.title,
    x.place,
    x.with ? `con ${String(x.with)}` : null,
    x.cost ? `S/ ${String(x.cost)}` : null,
    x.rating ? `${String(x.rating)} de 5` : null,
    x.time,
    log.note,
  ];
  return parts.filter(Boolean).map(String).join(' · ');
}

/** Ver, agregar y borrar los registros de un hábito en un día. También sirve para corregir días pasados. */
export function HabitSheet({ id, date, onClosed }: { id: string; date: DateStr; onClosed: () => void }) {
  const { dataById, logs } = useData();
  const { today, privateOpen } = useUI();
  const data = dataById.get(id);
  if (!data) return null;
  const { habit } = data;
  const r = evalOn(data, date, today);
  const st = streak(data, today);
  const entries = logs.filter((l) => l.habit_id === id && l.date === date).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const unitWord = st.unit === 'day' ? 'días' : st.unit === 'week' ? 'semanas' : 'meses';
  const goalLine =
    r.target !== null
      ? `Meta: ${r.direction === 'max' ? 'como mucho' : 'al menos'} ${fmtNum(r.target)} ${habit.unit} ${r.kind === 'day' ? 'al día' : r.kind === 'week' ? 'a la semana' : 'al mes'}`
      : 'Sin meta: solo se cuenta';

  return (
    <Sheet title={displayName(habit, privateOpen)} subtitle={`${capitalize(longDate(date))} · ${goalLine}`} onClosed={onClosed}>
      <div className="stack lg">
        <AddForm id={id} date={date} />
        <div>
          <h3 className="sec">
            Registros de este día <span>{st.best > 0 ? `Racha ${st.current} · máxima ${st.best} ${unitWord}` : ''}</span>
          </h3>
          {entries.length === 0 && <p className="empty">Nada registrado este día.</p>}
          {entries.map((l) => {
            const amount = habit.type === 'duration' ? l.duration_min : habit.type === 'quantity' || habit.type === 'measurement' ? l.value : null;
            const detail = describe(l) || (habit.type === 'frequency' && l.duration_min ? `${l.duration_min} min` : '');
            return (
              <div className="entry" key={l.id}>
                <div>
                  <strong>{amount !== null ? `${fmtNum(amount)} ${habit.unit}` : 'Registrado'}</strong>
                  {detail && <p>{detail}</p>}
                </div>
                <span />
                <button type="button" className="icon-btn press" aria-label="Borrar registro" onClick={() => void removeLog(l.id)}>
                  <Trash size={20} weight="bold" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </Sheet>
  );
}

function AddForm({ id, date }: { id: string; date: DateStr }) {
  const { dataById } = useData();
  const { privateOpen } = useUI();
  const close = useClose();
  const { habit } = dataById.get(id)!;
  const needsValue = habit.type === 'quantity' || habit.type === 'duration' || habit.type === 'measurement';
  const [value, setValue] = useState('');
  const [extra, setExtra] = useState<Partial<Record<LogField, string>>>({});
  const [error, setError] = useState('');
  const set = (k: LogField, v: string) => setExtra((e) => ({ ...e, [k]: v }));
  const name = displayName(habit, privateOpen);

  async function save() {
    const n = needsValue ? parseNum(value) : null;
    if (needsValue && n === null) {
      setError(`Escribe un número mayor que cero, por ejemplo ${habit.quick_buttons[0] ?? 10}.`);
      return;
    }
    const { note, duration, ...rest } = extra;
    const cleaned = Object.fromEntries(Object.entries(rest).filter(([, v]) => v && v.trim() !== ''));
    const minutes = habit.type === 'duration' ? n : duration ? parseNum(duration) : null;
    await logWithUndo(
      habit,
      date,
      {
        value: habit.type === 'duration' ? null : n,
        duration_min: minutes,
        note: note?.trim() || null,
        extra: Object.keys(cleaned).length > 0 ? cleaned : null,
      },
      needsValue ? `+${fmtNum(n!)} ${habit.unit}` : `${name} · registrado`,
    );
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
      {needsValue && (
        <label className="field">
          <span>{habit.type === 'duration' ? 'Minutos' : `Cantidad (${habit.unit})`}</span>
          <input
            className="input big"
            inputMode="decimal"
            enterKeyHint="done"
            autoComplete="off"
            placeholder="0"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError('');
            }}
            aria-invalid={error !== ''}
          />
          {error && <span className="error">{error}</span>}
        </label>
      )}
      {habit.log_fields.map((f) =>
        f === 'rating' ? (
          <div className="field" key={f}>
            <span>{FIELD_LABEL[f]}</span>
            <div className="chips" role="group" aria-label="Calificación de 1 a 5">
              {['1', '2', '3', '4', '5'].map((n) => (
                <button key={n} type="button" className="chip" aria-pressed={extra.rating === n} onClick={() => set('rating', extra.rating === n ? '' : n)}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <label className="field" key={f}>
            <span>
              {FIELD_LABEL[f]} <small>(opcional)</small>
            </span>
            {f === 'note' ? (
              <textarea className="input" rows={2} value={extra.note ?? ''} onChange={(e) => set('note', e.target.value)} />
            ) : (
              <input
                className="input"
                type={f === 'time' ? 'time' : 'text'}
                inputMode={f === 'cost' || f === 'duration' ? 'decimal' : undefined}
                autoComplete="off"
                value={extra[f] ?? ''}
                onChange={(e) => set(f, e.target.value)}
              />
            )}
          </label>
        ),
      )}
      <button type="submit" className="btn primary block press">
        {needsValue ? 'Guardar' : 'Registrar'}
      </button>
    </form>
  );
}
