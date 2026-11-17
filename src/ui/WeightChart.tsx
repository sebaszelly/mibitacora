import { type DateStr, addDays, diffDays } from '../domain/dates';
import { fmtNum, shortDate } from '../domain/format';
import type { WeightPoint } from '../domain/weight';

const W = 354;
const H = 168;
const PAD = { top: 12, right: 10, bottom: 22, left: 34 };

/** Peso por día (puntos) y media móvil de 7 días (línea). El peso objetivo, si existe, va como línea de referencia. */
export function WeightChart({ series, reference, until, days = 60 }: { series: WeightPoint[]; reference: number | null; until: DateStr; days?: number }) {
  const from = addDays(until, -(days - 1));
  const pts = series.filter((p) => p.date >= from && p.date <= until);
  if (pts.length < 2) return <p className="empty">Registra tu peso al menos dos días para ver la tendencia.</p>;

  const values = pts.flatMap((p) => [p.kg, p.avg]).concat(reference !== null ? [reference] : []);
  const lo = Math.floor(Math.min(...values) - 0.5);
  const hi = Math.ceil(Math.max(...values) + 0.5);
  const x = (d: DateStr) => PAD.left + (diffDays(from, d) / (days - 1)) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom);
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.date).toFixed(1)} ${y(p.avg).toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1]!;
  const mid = (lo + hi) / 2;

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Peso de los últimos ${days} días. Último: ${fmtNum(last.kg)} kg; media de 7 días: ${fmtNum(last.avg)} kg.`}>
      {[lo, mid, hi].map((v) => (
        <g key={v}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="var(--rule)" strokeWidth="1" />
          <text x={PAD.left - 6} y={y(v) + 4} textAnchor="end">
            {fmtNum(v)}
          </text>
        </g>
      ))}
      {reference !== null && (
        <g>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(reference)} y2={y(reference)} stroke="var(--ink)" strokeWidth="1.5" strokeDasharray="4 4" />
          <text x={W - PAD.right} y={y(reference) - 5} textAnchor="end" style={{ fill: 'var(--ink)' }}>
            objetivo {fmtNum(reference)}
          </text>
        </g>
      )}
      {pts.map((p) => (
        <circle key={p.date} cx={x(p.date)} cy={y(p.kg)} r="2.5" fill="var(--muted)" />
      ))}
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(last.date)} cy={y(last.avg)} r="4.5" fill="var(--accent)" stroke="var(--bg)" strokeWidth="2" />
      <text x={PAD.left} y={H - 5}>
        {shortDate(from)}
      </text>
      <text x={W - PAD.right} y={H - 5} textAnchor="end">
        {shortDate(until)}
      </text>
    </svg>
  );
}
