import {
  Barbell,
  Bathtub,
  Bed,
  Bicycle,
  BookOpen,
  Brain,
  Briefcase,
  Cards,
  ChatCircleDots,
  Circle,
  Code,
  Coffee,
  Confetti,
  CurrencyDollar,
  Drop,
  FilmSlate,
  ForkKnife,
  Heart,
  type Icon,
  Leaf,
  Lock,
  Moon,
  MusicNotes,
  PawPrint,
  PencilSimple,
  PersonSimpleRun,
  Pill,
  Scales,
  Star,
  Sun,
  Tooth,
  Users,
} from '@phosphor-icons/react';
import type { Habit } from '../domain/types';

/** Galería de íconos para hábitos. Una sola familia, un solo peso. */
export const HABIT_ICONS: Record<string, Icon> = {
  agua: Drop,
  tarjetas: Cards,
  voz: ChatCircleDots,
  pelicula: FilmSlate,
  pesa: Barbell,
  balanza: Scales,
  fiesta: Confetti,
  plato: ForkKnife,
  punto: Circle,
  libro: BookOpen,
  correr: PersonSimpleRun,
  bici: Bicycle,
  cama: Bed,
  corazon: Heart,
  sol: Sun,
  luna: Moon,
  cafe: Coffee,
  dinero: CurrencyDollar,
  musica: MusicNotes,
  hoja: Leaf,
  pastilla: Pill,
  estrella: Star,
  diente: Tooth,
  mente: Brain,
  lapiz: PencilSimple,
  codigo: Code,
  ducha: Bathtub,
  mascota: PawPrint,
  trabajo: Briefcase,
  gente: Users,
};

export const TONES = ['salud', 'estudio', 'social', 'trabajo', 'personal', 'privado'] as const;
export const toneVar = (tone: string): string => `var(--cat-${(TONES as readonly string[]).includes(tone) ? tone : 'trabajo'})`;

export function HabitIcon({ habit, discreet, size = 20, plain }: { habit: Pick<Habit, 'icon' | 'color'>; discreet?: boolean; size?: number; plain?: boolean }) {
  const Cmp = discreet ? Lock : (HABIT_ICONS[habit.icon] ?? Circle);
  return <Cmp size={size} weight="bold" color={plain ? 'currentColor' : discreet ? 'var(--cat-privado)' : toneVar(habit.color)} aria-hidden="true" />;
}
