import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { useState } from 'react';
import { type PeriodKind, type Range, addDays, diffDays, eachDay, minDate, periodOf, previousRange } from '../domain/dates';
import { ago, capitalize, fmtNum, fmtPct, rangeLabel } from '../domain/format';
import { setsByGroup } from '../domain/gym';
import { type HabitReport, habitReport, overall } from '../domain/reports';
import { dayPhase, daySummary } from '../domain/rules';
import { useData } from '../state/data';
import { useUI } from '../state/ui';
import { Phase } from '../ui/Phase';
import { HabitIcon } from '../ui/icons';
import { habitsOn } from './DayList';

type Span = Extract<PeriodKind, 'week' | 'month'>;

export function Reportes() {
  const { datas, logs, workouts, sets } = useData();
  const { today, open, privateOpen } = useUI();
  const [span, setSpan] = useState<Span>('week');
  const [cursor, setCursor] = useState(today);
  const range = periodOf(span, cursor);
  const current = today >= range.start && today <= range.end;
  const visible = datas.filter((d) => privateOpen || !d.habit.is_private);
  const hasPrivate = datas.some((d) => d.habit.is_private);

  const build = (r: Range) => {
    const reports = visible.map((d) => habitReport(d, r, today));
    return { reports, all: overall(reports, visible, r, today) };
  };
  const now = build(range);
  const prev = build(previousRange(range)).all;
  const diff = now.all.pct !== null && prev.pct !== null ? now.all.pct - prev.pct : null;
  const shown = now.reports.filter((r) => r.completion.scheduled > 0 || r.total > 0 || r.data.habit.archived_at === null);
  const elapsed = diffDays(range.start, minDate(range.end, today)) + 1;

  const detail = (r: HabitReport): { fig: React.ReactNode; line: string } => {
    const { habit } = r.data;
    const c = r.completion;
    const unit = habit.unit;
    if (habit.module === 'gym') {
      let total = 0;
      for (const n of setsByGroup(workouts, sets, range).values()) total += n;
      return { fig: <>{r.total} <small>{r.total === 1 ? 'sesión' : 'sesiones'}</small></>, line: `${fmtNum(total)} series en el periodo` };
    }
    if (habit.type === 'measurement') {
      if (r.first === null || r.last === null) return { fig: '—', line: 'Sin registros en el periodo' };
      const d = Math.round((r.last - r.first) * 10) / 10;
      return { fig: <>{fmtNum(r.last)} <small>{unit}</small></>, line: `De ${fmtNum(r.first)} a ${fmtNum(r.last)} ${unit} · ${d > 0 ? '+' : d < 0 ? '−' : ''}${fmtNum(Math.abs(d))}` };
    }
    if (c.pct !== null) {
      const fig = fmtPct(c.pct);
      if (habit.type === 'quantity' || habit.type === 'duration') {
        const avg = Math.round(r.total / elapsed);
        return { fig, line: `Total ${fmtNum(r.total)} ${unit} · ${fmtNum(avg)} al día${r.best ? ` · mejor día ${fmtNum(r.best.value)}` : ''}` };
      }
      if (habit.type === 'yesno') return { fig, line: `${c.done} de ${c.scheduled} días · racha ${r.streak.current}, máxima ${r.streak.best}` };
      const unitWord = r.streak.unit === 'month' ? 'meses' : 'semanas';
      return { fig, line: `${c.done} de ${c.scheduled} ${unitWord} · ${fmtNum(r.total)} veces` };
    }
    if (habit.type === 'event') {
      let cost = 0;
      for (const l of logs) if (l.habit_id === habit.id && l.date >= range.start && l.date <= range.end) cost += Number((l.extra as { cost?: string } | null)?.cost?.replace(',', '.') ?? 0) || 0;
      const parts = [r.lastDate ? `última vez ${ago(r.lastDate, today)}` : 'sin registros'];
      if (cost > 0) parts.push(`gasto S/ ${fmtNum(cost, 2)}`);
      return { fig: <>{fmtNum(r.total)} <small>{r.total === 1 ? 'vez' : 'veces'}</small></>, line: parts.join(' · ') };
    }
    return { fig: <>{fmtNum(r.total)} <small>{unit}</small></>, line: current ? 'Periodo en curso' : 'Sin periodos evaluados' };
  };

  return (
    <>
      <header className="page-hd">
        <h1>Reportes</h1>
        <div className="seg" role="group" aria-label="Periodo" style={{ minWidth: 170 }}>
          <button type="button" aria-pressed={span === 'week'} onClick={() => setSpan('week')}>Semana</button>
          <button type="button" aria-pressed={span === 'month'} onClick={() => setSpan('month')}>Mes</button>
        </div>
      </header>
      <div className="stepper">
        <button type="button" className="icon-btn press" aria-label="Periodo anterior" onClick={() => setCursor(addDays(range.start, -1))}>
          <CaretLeft size={20} weight="bold" />
        </button>
        <strong>{current ? (span === 'week' ? 'Esta semana' : 'Este mes') : capitalize(rangeLabel(range))}</strong>
        <button type="button" className="icon-btn press" aria-label="Periodo siguiente" disabled={current} onClick={() => setCursor(minDate(addDays(range.end, 1), today))}>
          <CaretRight size={20} weight="bold" />
        </button>
      </div>

      <div className="summary">
        <div className="big num">{now.all.pct === null ? '—' : fmtPct(now.all.pct)}</div>
        <div>
          <strong>Cumplimiento</strong>
          <p>
            {now.all.pct === null
              ? 'Todavía no hay periodos cerrados que evaluar.'
              : diff === null
                ? 'Sin periodo anterior con qué comparar.'
                : `${fmtPct(prev.pct!)} el periodo anterior · ${diff > 0 ? '+' : diff < 0 ? '−' : ''}${Math.abs(diff)} puntos`}
          </p>
        </div>
      </div>
      <div className="strip" aria-label="Estado de cada día del periodo">
        {eachDay(range).map((d) => (
          <Phase key={d} kind={dayPhase(daySummary(habitsOn(visible, d), d, today), d, today)} small />
        ))}
      </div>
      <div className="kv"><span className="name">Días perfectos</span><span className="fig">{now.all.perfectDays}</span></div>
      <div className="kv"><span className="name">Periodos cumplidos</span><span className="fig">{now.all.done} <small>de {now.all.scheduled}</small></span></div>
      {now.all.best && (
        <div className="kv"><div><span className="name">Mejor hábito</span><p>{now.all.best.data.habit.name}</p></div><span className="fig">{fmtPct(now.all.best.completion.pct!)}</span></div>
      )}
      {now.all.worst && (
        <div className="kv"><div><span className="name">Para mejorar</span><p>{now.all.worst.data.habit.name}</p></div><span className="fig">{fmtPct(now.all.worst.completion.pct!)}</span></div>
      )}

      <h2 className="sec">Por hábito</h2>
      {shown.map((r) => {
        const { fig, line } = detail(r);
        return (
          <div className="kv" key={r.data.habit.id}>
            <div style={{ display: 'grid', gridTemplateColumns: '20px 1fr', columnGap: 10, alignItems: 'start' }}>
              <span style={{ marginTop: 2 }}><HabitIcon habit={r.data.habit} /></span>
              <div>
                <span className="name">{r.data.habit.name}{r.data.habit.archived_at ? ' (archivado)' : ''}</span>
                <p>{line}</p>
              </div>
            </div>
            <span className="fig">{fig}</span>
          </div>
        );
      })}
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
