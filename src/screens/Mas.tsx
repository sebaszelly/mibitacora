import { ArrowDown, ArrowUp, CaretRight, DownloadSimple, ListChecks, ShieldCheck, Tag } from '@phosphor-icons/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { daysSinceBackup } from '../db/backup';
import { db } from '../db/db';
import { insert, patch, setMeta, softDelete } from '../db/repo';
import { longDate, shortDate } from '../domain/format';
import { fromDate } from '../domain/dates';
import { isPausedOn } from '../domain/rules';
import type { Category, Habit, HabitPause } from '../domain/types';
import { useData } from '../state/data';
import { useUI } from '../state/ui';
import { Sheet, useClose } from '../ui/Sheet';
import { HabitIcon } from '../ui/icons';

type Theme = 'system' | 'light' | 'dark';

export function Mas() {
  const { habits, categories, meta } = useData();
  const { open } = useUI();
  const theme = (meta.get('theme') as Theme | undefined) ?? 'system';
  const active = habits.filter((h) => !h.archived_at).length;
  const days = daysSinceBackup(meta.get('last_backup_at') as string | undefined);
  const Row = ({ icon, title, note, onClick }: { icon: React.ReactNode; title: string; note: string; onClick: () => void }) => (
    <button type="button" className="nav-row" onClick={onClick}>
      {icon}
      <strong>{title}</strong>
      <span>{note}</span>
      <CaretRight size={18} weight="bold" color="var(--muted)" />
    </button>
  );
  return (
    <>
      <header className="page-hd">
        <h1>Más</h1>
      </header>
      <div style={{ borderTop: '2px solid var(--ink)' }}>
        <Row icon={<ListChecks size={22} weight="bold" />} title="Mis hábitos" note={`${active} activos`} onClick={() => open({ t: 'habits' })} />
        <Row icon={<Tag size={22} weight="bold" />} title="Categorías" note={`${categories.length}`} onClick={() => open({ t: 'categories' })} />
        <Row icon={<ShieldCheck size={22} weight="bold" />} title="Privacidad" note={meta.get('pin') ? 'PIN activo' : 'Sin PIN'} onClick={() => open({ t: 'privacy' })} />
        <Row icon={<DownloadSimple size={22} weight="bold" />} title="Respaldo" note={days === null ? 'Nunca' : days === 0 ? 'Hoy' : `Hace ${days} ${days === 1 ? 'día' : 'días'}`} onClick={() => open({ t: 'backup' })} />
      </div>
      <h2 className="sec">Tema</h2>
      <div className="pad" style={{ paddingTop: 12 }}>
        <div className="seg" role="group" aria-label="Tema">
          {(['system', 'light', 'dark'] as Theme[]).map((t) => (
            <button key={t} type="button" aria-pressed={theme === t} onClick={() => void setMeta(db, 'theme', t)}>
              {t === 'system' ? 'Como el iPhone' : t === 'light' ? 'Claro' : 'Oscuro'}
            </button>
          ))}
        </div>
      </div>
      <p className="pad help" style={{ paddingTop: 24 }}>
        Versión del {longDate(fromDate(new Date(__BUILD_TIME__)))}. Las tareas, el gym detallado y más reportes llegan en la fase 2.
      </p>
    </>
  );
}

export function HabitsSheet({ onClosed }: { onClosed: () => void }) {
  const { habits } = useData();
  const { open } = useUI();
  const active = habits.filter((h) => !h.archived_at);
  const archived = habits.filter((h) => h.archived_at);
  const list = (items: Habit[]) =>
    items.map((h) => (
      <button type="button" className="nav-row" key={h.id} onClick={() => open({ t: 'manage', id: h.id })}>
        <HabitIcon habit={h} size={22} />
        <strong>{h.name}</strong>
        <span>{h.is_private ? 'Privado' : ''}</span>
        <CaretRight size={18} weight="bold" color="var(--muted)" />
      </button>
    ));
  return (
    <Sheet
      title="Mis hábitos"
      subtitle="Toca uno para editarlo, pausarlo o archivarlo"
      onClosed={onClosed}
      full
      footer={
        <button type="button" className="btn primary press" onClick={() => open({ t: 'form' })}>
          Nuevo hábito
        </button>
      }
    >
      {list(active)}
      {archived.length > 0 && (
        <>
          <h3 className="sec">Archivados <span>su historial sigue en Reportes</span></h3>
          {list(archived)}
        </>
      )}
    </Sheet>
  );
}

export function ManageSheet({ id, onClosed }: { id: string; onClosed: () => void }) {
  const { dataById } = useData();
  const data = dataById.get(id);
  if (!data) return null;
  return (
    <Sheet title={data.habit.name} subtitle={data.habit.archived_at ? 'Archivado' : undefined} onClosed={onClosed}>
      <ManageBody id={id} />
    </Sheet>
  );
}

function ManageBody({ id }: { id: string }) {
  const { dataById, habits } = useData();
  const { open, today } = useUI();
  const close = useClose();
  const { habit, pauses } = dataById.get(id)!;
  const [pausing, setPausing] = useState(false);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState('');
  const [armed, setArmed] = useState(false);
  const activePause = pauses.find((p) => isPausedOn([p], today) || p.start_date > today);
  const siblings = habits.filter((h) => !h.archived_at);
  const idx = siblings.findIndex((h) => h.id === id);

  async function move(dir: -1 | 1) {
    const other = siblings[idx + dir];
    if (!other) return;
    await patch<Habit>(db.habits, habit.id, { sort_order: other.sort_order });
    await patch<Habit>(db.habits, other.id, { sort_order: habit.sort_order });
  }

  return (
    <div className="pad stack">
      <button type="button" className="btn block press" onClick={() => { close(); open({ t: 'form', id }); }}>Editar</button>
      {!habit.archived_at && (
        <div className="cols2">
          <button type="button" className="btn press" disabled={idx <= 0} onClick={() => void move(-1)}><ArrowUp size={18} weight="bold" /> Subir</button>
          <button type="button" className="btn press" disabled={idx < 0 || idx >= siblings.length - 1} onClick={() => void move(1)}><ArrowDown size={18} weight="bold" /> Bajar</button>
        </div>
      )}
      {activePause ? (
        <div className="stack">
          <p className="help">En pausa desde el {shortDate(activePause.start_date)}{activePause.end_date ? ` hasta el ${shortDate(activePause.end_date)}` : ', sin fecha de fin'}. Esos días no cuentan en contra.</p>
          <button type="button" className="btn block press" onClick={async () => { await softDelete(db.habit_pauses, activePause.id); toast('Pausa quitada'); }}>Quitar la pausa</button>
        </div>
      ) : pausing ? (
        <div className="stack">
          <div className="cols2">
            <label className="field"><span>Desde</span><input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
            <label className="field"><span>Hasta <small>(opcional)</small></span><input className="input" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></label>
          </div>
          <button type="button" className="btn primary block press" disabled={!from} onClick={async () => { await insert<HabitPause>(db.habit_pauses, { habit_id: id, start_date: from, end_date: to || null, reason: null }); setPausing(false); toast('Hábito en pausa'); }}>Guardar pausa</button>
        </div>
      ) : (
        !habit.archived_at && <button type="button" className="btn block press" onClick={() => setPausing(true)}>Pausar</button>
      )}
      <button
        type="button"
        className="btn block press"
        onClick={async () => {
          await patch<Habit>(db.habits, id, { archived_at: habit.archived_at ? null : new Date().toISOString() });
          toast(habit.archived_at ? 'Hábito reactivado' : 'Hábito archivado. Su historial sigue en Reportes.');
          close();
        }}
      >
        {habit.archived_at ? 'Reactivar' : 'Archivar'}
      </button>
      <button
        type="button"
        className="btn danger block press"
        onClick={async () => {
          if (!armed) return setArmed(true);
          await softDelete(db.habits, id);
          toast('Hábito eliminado');
          close();
        }}
      >
        {armed ? 'Sí, eliminar con su historial' : 'Eliminar'}
      </button>
      {armed && <p className="help">Eliminar lo quita también de los reportes. Si solo quieres dejar de verlo en Hoy, archívalo.</p>}
    </div>
  );
}

export function CategoriesSheet({ onClosed }: { onClosed: () => void }) {
  const { categories } = useData();
  const [name, setName] = useState('');
  return (
    <Sheet title="Categorías" subtitle="Una categoría privada oculta sus hábitos nuevos" onClosed={onClosed} full>
      {categories.map((c) => (
        <div className="entry" key={c.id} style={{ gridTemplateColumns: '1fr auto', paddingRight: 'var(--gr)' }}>
          <input className="input" style={{ border: 0, background: 'none', paddingLeft: 0 }} aria-label={`Nombre de la categoría ${c.name}`} defaultValue={c.name} onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== c.name) void patch<Category>(db.categories, c.id, { name: v }); }} />
          <button type="button" className="chip" aria-pressed={c.is_private} onClick={() => void patch<Category>(db.categories, c.id, { is_private: !c.is_private })}>Privada</button>
        </div>
      ))}
      <form
        className="pad inline"
        style={{ paddingTop: 16 }}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return;
          await insert<Category>(db.categories, { name: name.trim(), color: 'personal', icon: 'personal', is_private: false, sort_order: categories.length });
          setName('');
        }}
      >
        <label className="field"><span>Nueva categoría</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" /></label>
        <button type="submit" className="btn press" style={{ minHeight: 48 }}>Agregar</button>
      </form>
    </Sheet>
  );
}
