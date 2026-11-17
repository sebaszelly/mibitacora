import { createContext, useContext } from 'react';
import type { DateStr } from '../domain/dates';
import type { Habit } from '../domain/types';

export type Tab = 'hoy' | 'calendario' | 'gym' | 'reportes' | 'mas';

export type SheetSpec =
  | { t: 'habit'; id: string; date: DateStr }
  | { t: 'day'; date: DateStr }
  | { t: 'gym'; date: DateStr }
  | { t: 'group'; id: string }
  | { t: 'weight'; date: DateStr }
  | { t: 'quick' }
  | { t: 'form'; id?: string }
  | { t: 'manage'; id: string }
  | { t: 'habits' }
  | { t: 'categories' }
  | { t: 'privacy' }
  | { t: 'backup' }
  | { t: 'reveal' };

export interface UI {
  today: DateStr;
  /** Día que se está viendo en Hoy. */
  date: DateStr;
  setDate: (d: DateStr) => void;
  tab: Tab;
  setTab: (t: Tab) => void;
  open: (spec: SheetSpec) => void;
  /** Los privados están a la vista (se ingresó el PIN en esta sesión). */
  privateOpen: boolean;
  setPrivateOpen: (v: boolean) => void;
}

export const UICtx = createContext<UI | null>(null);

export function useUI(): UI {
  const ui = useContext(UICtx);
  if (!ui) throw new Error('useUI fuera de la app');
  return ui;
}

/** En Hoy los hábitos privados llevan un nombre discreto. */
export const displayName = (habit: Habit, privateOpen: boolean): string => (habit.is_private && !privateOpen ? 'Privado' : habit.name);
