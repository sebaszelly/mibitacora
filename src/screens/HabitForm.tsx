import { useState } from 'react';
import { toast } from 'sonner';
import { db } from '../db/db';
import { insert, patch, setGoal } from '../db/repo';
import { type PeriodKind, addDays } from '../domain/dates';
import { WEEKDAY_LETTERS, fmtNum, parseNum } from '../domain/format';
import { goalOn } from '../domain/rules';
import type { Category, Habit, HabitGoal, HabitType, LogField } from '../domain/types';
import { useData } from '../state/data';
import { useUI } from '../state/ui';
import { Sheet, useClose } from '../ui/Sheet';
import { HABIT_ICONS, HabitIcon, TONES, toneVar } from '../ui/icons';

const TYPES: { type: HabitType; name: string; how: string; example: string }[] = [
  { type: 'yesno', name: 'Sí/No', how: 'Un toque al día. Se cumple si lo marcaste.', example: 'Tender la cama' },
  { type: 'quantity', name: 'Cantidad con meta', how: 'Botones rápidos que se suman durante el día.', example: 'Agua 2 000 ml' },
  { type: 'duration', name: 'Duración', how: 'Anotas los minutos a mano.', example: 'Anki 30 min' },
  { type: 'frequency', name: 'Frecuencia', how: 'Un toque por vez; la meta es por semana o por mes.', example: 'Speaking 3 veces a la semana' },
  { type: 'event', name: 'Evento', how: 'Sin meta: solo se cuenta cuándo pasó.', example: 'Salidas de fiesta' },
  { type: 'measurement', name: 'Medición', how: 'Un valor con fecha para ver la tendencia.', example: 'Peso corporal' },
];
const TYPE_DEFAULTS: Record<HabitType, Partial<Draft>> = {
  yesno: { unit: 'veces', target: '1', period: 'day' },
  quantity: { unit: 'ml', target: '', period: 'day', quick: ['250', '500', '750'] },
  duration: { unit: 'min', target: '30', period: 'day', quick: ['10', '15', '30'] },
  frequency: { unit: 'veces', target: '3', period: 'week' },
  event: { unit: 'veces', target: '' },
  measurement: { unit: 'kg', target: '' },
};
const FIELDS: { key: LogField; label: string }[] = [
  { key: 'note', label: 'Nota' },
  { key: 'duration', label: 'Duración' },
  { key: 'place', label: 'Lugar' },
  { key: 'with', label: 'Con quién' },
  { key: 'cost', label: 'Gasto' },
  { key: 'title', label: 'Título' },
  { key: 'rating', label: 'Calificación de 1 a 5' },
];
const PERIODS: { key: PeriodKind; label: string }[] = [
  { key: 'day', label: 'Al día' },
  { key: 'week', label: 'A la semana' },
  { key: 'month', label: 'Al mes' },
];

interface Draft {
  name: string;
  icon: string;
  color: string;
  category_id: string;
  type: HabitType;
  unit: string;
  target: string;
  period: PeriodKind;
  direction: 'min' | 'max';
  days: number[];
  end_date: string;
  quick: string[];
  is_private: boolean;
  log_fields: LogField[];
  reference: string;
}
type Step = 'nombre' | 'categoria' | 'tipo' | 'meta' | 'dias' | 'botones' | 'opciones' | 'vista';
const STEP_TITLE: Record<Step, string> = {
  nombre: 'Nombre e ícono',
  categoria: 'Categoría',
  tipo: 'Tipo de seguimiento',
  meta: 'Meta',
  dias: 'Programación',
  botones: 'Botones rápidos',
  opciones: 'Opciones',
  vista: 'Vista previa',
};
const hasGoal = (t: HabitType) => t === 'quantity' || t === 'duration' || t === 'frequency';
const stepsFor = (t: HabitType): Step[] =>
  (['nombre', 'categoria', 'tipo', 'meta', 'dias', 'botones', 'opciones', 'vista'] as Step[]).filter(
    (s) => (s !== 'meta' || hasGoal(t) || t === 'measurement') && (s !== 'botones' || t === 'quantity' || t === 'duration'),
  );

/** Asistente para crear un hábito, o formulario completo para editarlo. */
export function HabitFormSheet({ id, onClosed }: { id?: string; onClosed: () => void }) {
  const { dataById } = useData();
  const editing = id ? dataById.get(id) : undefined;
  return (
    <Sheet title={editing ? 'Editar hábito' : 'Nuevo hábito'} subtitle={editing ? editing.habit.name : undefined} onClosed={onClosed} full>
      <FormBody habit={editing?.habit} goals={editing?.goals ?? []} />
    </Sheet>
  );
}

function FormBody({ habit, goals }: { habit?: Habit; goals: HabitGoal[] }) {
  const { categories, habits } = useData();
  const { today } = useUI();
  const close = useClose();
  const current = habit ? goalOn(goals, today) : undefined;
  const [d, setD] = useState<Draft>(() => ({
    name: habit?.name ?? '',
    icon: habit?.icon ?? 'estrella',
    color: habit?.color ?? 'salud',
    category_id: habit?.category_id ?? categories[0]?.id ?? '',
    type: habit?.type ?? 'yesno',
    unit: habit?.unit ?? 'veces',
    target: current ? String(current.target_value) : habit ? '' : '1',
    period: current?.period ?? 'day',
    direction: current?.direction ?? 'min',
    days: habit?.schedule.days ?? [],
    end_date: habit?.schedule.end_date ?? '',
    quick: (habit?.quick_buttons ?? []).map(String).concat(['', '', '']).slice(0, 3),
    is_private: habit?.is_private ?? false,
    log_fields: habit?.log_fields ?? [],
    reference: habit?.reference_value != null ? String(habit.reference_value) : '',
  }));
  const [i, setI] = useState(0);
  const [error, setError] = useState('');
  const [newCat, setNewCat] = useState('');
  const set = (p: Partial<Draft>) => {
    setD((x) => ({ ...x, ...p }));
    setError('');
  };
  const steps = stepsFor(d.type);
  const step = steps[Math.min(i, steps.length - 1)]!;

  function validate(s: Step): string {
    if (s === 'nombre' && d.name.trim() === '') return 'Ponle un nombre al hábito.';
    if (s === 'categoria' && !d.category_id) return 'Elige una categoría.';
    if (s === 'meta' && hasGoal(d.type)) {
      if (d.target.trim() !== '' && parseNum(d.target) === null) return 'La meta debe ser un número mayor que cero.';
      if (d.target.trim() === '' && d.type !== 'frequency') return 'Escribe la meta, por ejemplo 2000.';
      if (d.unit.trim() === '') return 'Escribe la unidad, por ejemplo ml o min.';
    }
    if (s === 'meta' && d.type === 'measurement' && d.reference.trim() !== '' && parseNum(d.reference) === null) return 'El valor objetivo debe ser un número.';
    if (s === 'botones' && d.quick.some((q) => q.trim() !== '' && parseNum(q) === null)) return 'Los botones deben ser números, por ejemplo 250.';
    return '';
  }

  async function save() {
    for (const s of habit ? (['nombre', 'meta', 'botones'] as Step[]) : steps) {
      const problem = validate(s);
      if (problem) return setError(problem);
    }
    const fields = {
      name: d.name.trim(),
      icon: d.icon,
      color: d.color,
      category_id: d.category_id,
      unit: d.unit.trim() || 'veces',
      quick_buttons: d.quick.map(parseNum).filter((n): n is number => n !== null),
      log_fields: d.log_fields,
      is_private: d.is_private,
      reference_value: d.type === 'measurement' ? parseNum(d.reference) : null,
    };
    const target = d.type === 'yesno' ? 1 : hasGoal(d.type) ? parseNum(d.target) : null;
    const goal = target === null ? null : { target_value: target, period: d.type === 'yesno' ? ('day' as const) : d.period, direction: d.type === 'yesno' ? ('min' as const) : d.direction };
    const days = d.days.length > 0 && d.days.length < 7 ? [...d.days].sort() : undefined;

    if (habit) {
      await patch<Habit>(db.habits, habit.id, { ...fields, schedule: { ...habit.schedule, days, end_date: d.end_date || null } });
      const changed = !current || !goal || current.target_value !== goal.target_value || current.period !== goal.period || current.direction !== goal.direction;
      if (goal && changed) await setGoal(habit.id, goal, today);
      if (!goal && current) await patch<HabitGoal>(db.habit_goals, current.id, { valid_to: addDays(today, -1) });
      toast('Hábito actualizado');
    } else {
      const row = await insert<Habit>(db.habits, {
        ...fields,
        type: d.type,
        schedule: { start_date: today, days, end_date: d.end_date || null },
        archived_at: null,
        sort_order: habits.reduce((m, h) => Math.max(m, h.sort_order), -1) + 1,
        module: null,
      });
      if (goal) await insert<HabitGoal>(db.habit_goals, { habit_id: row.id, ...goal, valid_from: today, valid_to: null });
      toast(`${fields.name} · creado`);
    }
    close();
  }

  async function addCategory() {
    const name = newCat.trim();
    if (!name) return;
    const row = await insert<Category>(db.categories, { name, color: 'personal', icon: 'personal', is_private: false, sort_order: categories.length });
    setNewCat('');
    set({ category_id: row.id, color: 'personal' });
  }

  const sections: Record<Step, React.ReactNode> = {
    nombre: (
      <div className="pad stack lg">
        <label className="field">
          <span>Nombre</span>
          <input className="input" value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder="Por ejemplo, Leer" autoComplete="off" enterKeyHint="next" />
        </label>
        <div className="field">
          <span className="legend">Ícono</span>
          <div className="icon-grid" role="group" aria-label="Ícono">
            {Object.keys(HABIT_ICONS).map((k) => (
              <button key={k} type="button" aria-pressed={d.icon === k} aria-label={k} onClick={() => set({ icon: k })}>
                <HabitIcon habit={{ icon: k, color: d.color }} size={24} plain={d.icon === k} />
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span className="legend">Color</span>
          <div className="swatches" role="group" aria-label="Color">
            {TONES.map((t) => (
              <button key={t} type="button" aria-pressed={d.color === t} aria-label={`Tono ${t}`} style={{ color: toneVar(t) }} onClick={() => set({ color: t })}>
                <i />
              </button>
            ))}
          </div>
        </div>
      </div>
    ),
    categoria: (
      <div role="radiogroup" aria-label="Categoría">
        {categories.map((c) => (
          <button key={c.id} type="button" className="choice" role="radio" aria-checked={d.category_id === c.id} onClick={() => set({ category_id: c.id, is_private: c.is_private || d.is_private, color: TONES.includes(c.color as (typeof TONES)[number]) ? c.color : d.color })}>
            <i className="radio" />
            <div>
              <strong>{c.name}</strong>
              {c.is_private && <span>Sus hábitos se ocultan en Calendario y Reportes</span>}
            </div>
          </button>
        ))}
        <div className="pad inline" style={{ paddingTop: 12 }}>
          <label className="field">
            <span>Nueva categoría</span>
            <input className="input" value={newCat} onChange={(e) => setNewCat(e.target.value)} autoComplete="off" />
          </label>
          <button type="button" className="btn press" style={{ minHeight: 48 }} onClick={() => void addCategory()}>
            Agregar
          </button>
        </div>
      </div>
    ),
    tipo: (
      <div role="radiogroup" aria-label="Tipo de seguimiento">
        {TYPES.map((t) => (
          <button key={t.type} type="button" className="choice" role="radio" aria-checked={d.type === t.type} onClick={() => set({ type: t.type, ...TYPE_DEFAULTS[t.type] })}>
            <i className="radio" />
            <div>
              <strong>{t.name}</strong>
              <span>{t.how} Ejemplo: {t.example}.</span>
            </div>
          </button>
        ))}
      </div>
    ),
    meta:
      d.type === 'measurement' ? (
        <div className="pad stack">
          <div className="cols2">
            <label className="field">
              <span>Unidad</span>
              <input className="input" value={d.unit} onChange={(e) => set({ unit: e.target.value })} autoComplete="off" />
            </label>
            <label className="field">
              <span>Valor objetivo <small>(opcional)</small></span>
              <input className="input" inputMode="decimal" value={d.reference} onChange={(e) => set({ reference: e.target.value })} />
            </label>
          </div>
          <p className="help">Las mediciones no se cumplen ni se fallan. El objetivo solo se dibuja como línea de referencia.</p>
        </div>
      ) : (
        <div className="pad stack lg">
          <div className="cols2">
            <label className="field">
              <span>Meta{d.type === 'frequency' && <small> (vacío: solo contar)</small>}</span>
              <input className="input" inputMode="decimal" value={d.target} onChange={(e) => set({ target: e.target.value })} placeholder="2000" />
            </label>
            <label className="field">
              <span>Unidad</span>
              <input className="input" value={d.unit} onChange={(e) => set({ unit: e.target.value })} placeholder="ml, min, páginas, km" autoComplete="off" />
            </label>
          </div>
          <div className="field">
            <span className="legend">Periodo</span>
            <div className="seg" role="group" aria-label="Periodo de la meta">
              {PERIODS.filter((p) => d.type !== 'frequency' || p.key !== 'day').map((p) => (
                <button key={p.key} type="button" aria-pressed={d.period === p.key} onClick={() => set({ period: p.key })}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <span className="legend">La meta es</span>
            <div className="seg" role="group" aria-label="Sentido de la meta">
              <button type="button" aria-pressed={d.direction === 'min'} onClick={() => set({ direction: 'min' })}>Al menos</button>
              <button type="button" aria-pressed={d.direction === 'max'} onClick={() => set({ direction: 'max' })}>Como mucho</button>
            </div>
            <small className="help">«Como mucho» sirve para lo que quieres reducir.</small>
          </div>
          {habit && current && <p className="help">Si cambias la meta, vale desde hoy. Los días anteriores se siguen evaluando con la meta de {fmtNum(current.target_value)} {habit.unit}.</p>}
        </div>
      ),
    dias: (
      <div className="pad stack lg">
        <div className="field">
          <span className="legend">Días programados</span>
          <div className="chips" role="group" aria-label="Días de la semana">
            {WEEKDAY_LETTERS.map((l, k) => {
              const n = k + 1;
              const on = d.days.length === 0 || d.days.includes(n);
              return (
                <button
                  key={n}
                  type="button"
                  className="chip"
                  aria-pressed={on}
                  onClick={() => {
                    const all = d.days.length === 0 ? [1, 2, 3, 4, 5, 6, 7] : d.days;
                    const next = all.includes(n) ? all.filter((x) => x !== n) : [...all, n];
                    set({ days: next.length === 7 || next.length === 0 ? [] : next });
                  }}
                >
                  {l}
                </button>
              );
            })}
          </div>
          <small className="help">{d.days.length === 0 ? 'Todos los días.' : 'Solo los días marcados; los demás no cuentan en contra.'}</small>
        </div>
        <label className="field">
          <span>Termina el <small>(opcional)</small></span>
          <input className="input" type="date" value={d.end_date} min={today} onChange={(e) => set({ end_date: e.target.value })} />
        </label>
      </div>
    ),
    botones: (
      <div className="pad stack">
        <p className="help">Hasta tres botones para sumar con un toque desde Hoy.</p>
        <div className="quick" style={{ marginTop: 0 }}>
          {d.quick.map((q, k) => (
            <label className="field" key={k}>
              <span className="sr-only">Botón {k + 1}</span>
              <input className="input" inputMode="decimal" value={q} placeholder={`+${['250', '500', '750'][k]}`} onChange={(e) => set({ quick: d.quick.map((x, j) => (j === k ? e.target.value : x)) })} />
            </label>
          ))}
        </div>
      </div>
    ),
    opciones: (
      <div>
        <button type="button" className="choice check" role="checkbox" aria-checked={d.is_private} onClick={() => set({ is_private: !d.is_private })}>
          <i className="radio" />
          <div>
            <strong>Privado</strong>
            <span>En Hoy aparece como «Privado»; en Calendario y Reportes se oculta hasta ingresar el PIN.</span>
          </div>
        </button>
        <h3 className="sec">Datos opcionales al registrar</h3>
        {FIELDS.filter((f) => !(d.type === 'duration' && f.key === 'duration')).map((f) => (
          <button
            key={f.key}
            type="button"
            className="choice check"
            role="checkbox"
            aria-checked={d.log_fields.includes(f.key)}
            onClick={() => set({ log_fields: d.log_fields.includes(f.key) ? d.log_fields.filter((x) => x !== f.key) : [...d.log_fields, f.key] })}
          >
            <i className="radio" />
            <div><strong>{f.label}</strong></div>
          </button>
        ))}
      </div>
    ),
    vista: (
      <div>
        <p className="pad help" style={{ paddingBottom: 12 }}>Así se verá en Hoy:</p>
        <div className="row" style={{ borderTop: '2px solid var(--ink)' }}>
          <span className="lead"><HabitIcon habit={d} discreet={d.is_private} /></span>
          <span className="main"><span className="name">{d.is_private ? 'Privado' : d.name || 'Sin nombre'}</span></span>
          <span className="fig">
            {hasGoal(d.type) && parseNum(d.target) !== null ? <>0 <small>/ {fmtNum(parseNum(d.target)!)} {d.unit}</small></> : d.type === 'yesno' ? '' : <>0 <small>{d.unit}</small></>}
          </span>
          <span />
        </div>
        <p className="pad help" style={{ paddingTop: 12 }}>
          {TYPES.find((t) => t.type === d.type)!.name}
          {hasGoal(d.type) && parseNum(d.target) !== null ? ` · ${d.direction === 'max' ? 'como mucho' : 'al menos'} ${fmtNum(parseNum(d.target)!)} ${d.unit} ${PERIODS.find((p) => p.key === d.period)!.label.toLowerCase()}` : ''}
          {d.days.length > 0 ? ` · ${d.days.sort().map((n) => WEEKDAY_LETTERS[n - 1]).join(' ')}` : ' · todos los días'}
        </p>
      </div>
    ),
  };

  if (habit) {
    const editable = stepsFor(habit.type).filter((s) => s !== 'tipo' && s !== 'vista');
    return (
      <div className="stack lg">
        {editable.map((s) => (
          <section key={s}>
            <h3 className="sec" style={{ marginBottom: 12 }}>{STEP_TITLE[s]}</h3>
            {sections[s]}
          </section>
        ))}
        {error && <p className="pad error" role="alert">{error}</p>}
        <div className="pad">
          <button type="button" className="btn primary block press" onClick={() => void save()}>Guardar cambios</button>
        </div>
      </div>
    );
  }

  const lastStep = i >= steps.length - 1;
  return (
    <div className="stack">
      <div className="pad">
        <p className="steps">Paso {i + 1} de {steps.length}</p>
        <h3 style={{ fontSize: 'var(--t-md)' }}>{STEP_TITLE[step]}</h3>
      </div>
      {sections[step]}
      {error && <p className="pad error" role="alert">{error}</p>}
      <div className="pad cols2" style={{ paddingTop: 8 }}>
        <button type="button" className="btn press" disabled={i === 0} onClick={() => { setI(i - 1); setError(''); }}>Atrás</button>
        <button
          type="button"
          className="btn primary press"
          onClick={() => {
            const problem = validate(step);
            if (problem) return setError(problem);
            if (lastStep) void save();
            else setI(i + 1);
          }}
        >
          {lastStep ? 'Guardar hábito' : 'Siguiente'}
        </button>
      </div>
    </div>
  );
}
