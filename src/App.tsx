import { Barbell, CalendarBlank, ChartBar, CircleHalf, DotsThree, Plus } from '@phosphor-icons/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Toaster } from 'sonner';
import { type DateStr, today as todayStr } from './domain/dates';
import { capitalize, longDate } from './domain/format';
import { requestPersistence } from './platform/device';
import { BackupSheet } from './screens/Backup';
import { Calendario, DaySheet } from './screens/Calendario';
import { DayList } from './screens/DayList';
import { Gym } from './screens/Gym';
import { GroupSheet, GymSheet, WeightSheet } from './screens/GymSheets';
import { HabitFormSheet } from './screens/HabitForm';
import { HabitSheet } from './screens/HabitSheet';
import { Hoy } from './screens/Hoy';
import { CategoriesSheet, HabitsSheet, ManageSheet, Mas } from './screens/Mas';
import { LockScreen, PrivacySheet, RevealSheet } from './screens/Privacy';
import { Reportes } from './screens/Reportes';
import { useData } from './state/data';
import type { PinRecord } from './state/pin';
import { type SheetSpec, type Tab, type UI, UICtx } from './state/ui';
import { Sheet } from './ui/Sheet';

const TABS: { id: Tab; label: string; icon: typeof Barbell }[] = [
  { id: 'hoy', label: 'Hoy', icon: CircleHalf },
  { id: 'calendario', label: 'Calendario', icon: CalendarBlank },
  { id: 'gym', label: 'Gym', icon: Barbell },
  { id: 'reportes', label: 'Reportes', icon: ChartBar },
  { id: 'mas', label: 'Más', icon: DotsThree },
];

function renderSheet(spec: SheetSpec, onClosed: () => void, today: DateStr) {
  switch (spec.t) {
    case 'habit':
      return <HabitSheet id={spec.id} date={spec.date} onClosed={onClosed} />;
    case 'day':
      return <DaySheet date={spec.date} onClosed={onClosed} />;
    case 'gym':
      return <GymSheet date={spec.date} onClosed={onClosed} />;
    case 'group':
      return <GroupSheet id={spec.id} onClosed={onClosed} />;
    case 'weight':
      return <WeightSheet date={spec.date} onClosed={onClosed} />;
    case 'quick':
      return (
        <Sheet title="Registrar" subtitle={capitalize(longDate(today))} onClosed={onClosed} full>
          <DayList date={today} />
        </Sheet>
      );
    case 'form':
      return <HabitFormSheet id={spec.id} onClosed={onClosed} />;
    case 'manage':
      return <ManageSheet id={spec.id} onClosed={onClosed} />;
    case 'habits':
      return <HabitsSheet onClosed={onClosed} />;
    case 'categories':
      return <CategoriesSheet onClosed={onClosed} />;
    case 'privacy':
      return <PrivacySheet onClosed={onClosed} />;
    case 'backup':
      return <BackupSheet onClosed={onClosed} />;
    case 'reveal':
      return <RevealSheet onClosed={onClosed} />;
  }
}

export function App() {
  const { meta } = useData();
  const [today, setToday] = useState(todayStr);
  const [date, setDate] = useState(today);
  const [tab, setTab] = useState<Tab>('hoy');
  const [sheets, setSheets] = useState<{ key: number; spec: SheetSpec }[]>([]);
  const [privateOpen, setPrivateOpen] = useState(false);
  const pin = meta.get('pin') as PinRecord | undefined;
  const lockMinutes = (meta.get('lock_minutes') as number | undefined) ?? 5;
  // Bloqueada al abrir si ya había un PIN. Crear uno a mitad de sesión no bloquea.
  const [locked, setLocked] = useState(() => Boolean(meta.get('pin')));
  const seq = useRef(0);
  const hiddenAt = useRef<number | null>(null);
  const view = useRef<HTMLDivElement>(null);

  // Tema: el del iPhone, o el elegido en Más.
  const theme = (meta.get('theme') as string | undefined) ?? 'system';
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
    const bg = getComputedStyle(root).getPropertyValue('--bg').trim();
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', bg));
  }, [theme]);

  useEffect(() => {
    void requestPersistence();
  }, []);

  // Al volver a la app: cambia el día si pasó la medianoche y bloquea si estuvo mucho tiempo sin uso.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt.current = Date.now();
        return;
      }
      const now = todayStr();
      setToday((prev) => {
        if (prev !== now) setDate(now);
        return now;
      });
      if (hiddenAt.current !== null && Date.now() - hiddenAt.current > lockMinutes * 60_000) {
        setLocked(true);
        setPrivateOpen(false);
      }
      hiddenAt.current = null;
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [lockMinutes]);

  const ui = useMemo<UI>(
    () => ({
      today,
      date,
      setDate,
      tab,
      setTab,
      open: (spec) => setSheets((s) => [...s, { key: ++seq.current, spec }]),
      privateOpen,
      setPrivateOpen,
    }),
    [today, date, tab, privateOpen],
  );

  const go = (t: Tab) => {
    if (t === 'hoy' && tab === 'hoy') setDate(today);
    setTab(t);
    view.current?.scrollTo({ top: 0 });
  };
  const fabVisible = tab !== 'hoy';

  return (
    <UICtx.Provider value={ui}>
      <div className="app">
        <main className="view" ref={view}>
          {tab === 'hoy' && <Hoy />}
          {tab === 'calendario' && <Calendario />}
          {tab === 'gym' && <Gym />}
          {tab === 'reportes' && <Reportes />}
          {tab === 'mas' && <Mas />}
        </main>
        {fabVisible && (
          <button type="button" className="fab press" aria-label="Registrar algo de hoy" onClick={() => ui.open({ t: 'quick' })}>
            <Plus size={26} weight="bold" />
          </button>
        )}
        <nav className="tabbar" aria-label="Secciones">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" className="tab" aria-current={tab === id ? 'page' : undefined} onClick={() => go(id)}>
              <Icon size={24} weight={tab === id ? 'fill' : 'bold'} />
              {label}
            </button>
          ))}
        </nav>
      </div>
      {sheets.map(({ key, spec }) => (
        <div key={key} style={{ display: 'contents' }}>
          {renderSheet(spec, () => setSheets((s) => s.filter((x) => x.key !== key)), today)}
        </div>
      ))}
      {/* Con una hoja abierta los avisos suben, para no tapar sus botones. */}
      <Toaster
        position={sheets.length > 0 ? 'top-center' : 'bottom-center'}
        visibleToasts={2}
        duration={4000}
        mobileOffset={{ top: 'calc(env(safe-area-inset-top, 0px) + 10px)', bottom: `calc(var(--tabbar-h) + env(safe-area-inset-bottom, 0px) + ${fabVisible ? 84 : 12}px)`, left: 12, right: 12 }}
        offset={{ top: 10, bottom: `calc(var(--tabbar-h) + ${fabVisible ? 84 : 12}px)` }}
        toastOptions={{ unstyled: true, classNames: { toast: 'toast', actionButton: 'toast-action' } }}
      />
      {pin && locked && <LockScreen pin={pin} onUnlock={() => setLocked(false)} />}
    </UICtx.Provider>
  );
}
