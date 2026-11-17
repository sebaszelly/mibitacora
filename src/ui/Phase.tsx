import { useEffect, useRef, useState } from 'react';
import type { DayPhase, Status } from '../domain/rules';

export type PhaseKind = DayPhase | 'paused' | 'mark';

const LABEL: Record<PhaseKind, string> = {
  full: 'Cumplido',
  half: 'Parcial',
  none: 'No cumplido',
  pending: 'Pendiente',
  future: 'Aún no llega',
  off: 'No programado',
  paused: 'En pausa',
  mark: 'Registrado',
};

export function statusPhase(status: Status): PhaseKind {
  switch (status) {
    case 'done':
      return 'full';
    case 'partial':
      return 'half';
    case 'missed':
      return 'none';
    case 'pending':
      return 'pending';
    case 'paused':
      return 'paused';
    default:
      return 'off';
  }
}

/**
 * La fase es el lenguaje de estado de toda la app: lleno, medio o vacío,
 * siempre forma más color. Con `celebrate` se anima una sola vez al pasar a lleno.
 */
export function Phase({ kind, small, celebrate }: { kind: PhaseKind; small?: boolean; celebrate?: boolean }) {
  const prev = useRef(kind);
  const [pop, setPop] = useState(false);
  useEffect(() => {
    if (celebrate && kind === 'full' && prev.current !== 'full') setPop(true);
    prev.current = kind;
  }, [kind, celebrate]);
  return (
    <span className={`ph ${kind}${small ? ' sm' : ''}${pop ? ' pop' : ''}`} onAnimationEnd={() => setPop(false)} role="img" aria-label={LABEL[kind]} />
  );
}
