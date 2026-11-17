import { useState } from 'react';
import { toast } from 'sonner';
import { db } from '../db/db';
import { setMeta } from '../db/repo';
import { useData } from '../state/data';
import { type PinRecord, checkPin, removePin, savePin } from '../state/pin';
import { useUI } from '../state/ui';
import { PinPad } from '../ui/PinPad';
import { Sheet, useClose } from '../ui/Sheet';

const LOCK_OPTIONS = [1, 5, 15, 60];

export function PrivacySheet({ onClosed }: { onClosed: () => void }) {
  return (
    <Sheet title="Privacidad" subtitle="PIN de la app y categoría Privado" onClosed={onClosed} full>
      <PrivacyBody />
    </Sheet>
  );
}

function PrivacyBody() {
  const { meta } = useData();
  const pin = meta.get('pin') as PinRecord | undefined;
  const lockMinutes = (meta.get('lock_minutes') as number | undefined) ?? 5;
  const [step, setStep] = useState<'idle' | 'new' | 'confirm' | 'remove'>('idle');
  const [first, setFirst] = useState('');

  if (step === 'new')
    return (
      <div className="stack">
        <p className="pad"><strong>Elige un PIN de 4 a 6 dígitos</strong> y toca Listo.</p>
        <PinPad key="new" onSubmit={async (p) => { setFirst(p); setStep('confirm'); }} />
      </div>
    );
  if (step === 'confirm')
    return (
      <div className="stack">
        <p className="pad"><strong>Repite el PIN</strong> para confirmarlo.</p>
        <PinPad
          key="confirm"
          length={first.length}
          onSubmit={async (p) => {
            if (p !== first) return 'No coincide. Escríbelo otra vez.';
            await savePin(p);
            toast('PIN activado');
            setStep('idle');
          }}
        />
      </div>
    );
  if (step === 'remove' && pin)
    return (
      <div className="stack">
        <p className="pad"><strong>Ingresa tu PIN actual</strong> para quitarlo.</p>
        <PinPad
          key="remove"
          length={pin.length}
          onSubmit={async (p) => {
            if (!(await checkPin(p, pin))) return 'PIN incorrecto.';
            await removePin();
            toast('PIN quitado');
            setStep('idle');
          }}
        />
      </div>
    );

  return (
    <div className="pad stack lg">
      <p className="help">
        El PIN es un bloqueo de pantalla: evita que alguien abra la app o vea los hábitos privados. No cifra los datos, y el respaldo JSON incluye los registros privados sin protección. Si lo olvidas, se recupera borrando los datos e importando un respaldo.
      </p>
      {pin ? (
        <>
          <div className="field">
            <span className="legend">Bloquear tras estar sin uso</span>
            <div className="seg" role="group" aria-label="Minutos sin uso antes de bloquear">
              {LOCK_OPTIONS.map((m) => (
                <button key={m} type="button" aria-pressed={lockMinutes === m} onClick={() => void setMeta(db, 'lock_minutes', m)}>
                  {m} min
                </button>
              ))}
            </div>
          </div>
          <button type="button" className="btn block press" onClick={() => setStep('new')}>Cambiar PIN</button>
          <button type="button" className="btn danger block press" onClick={() => setStep('remove')}>Quitar PIN</button>
        </>
      ) : (
        <button type="button" className="btn primary block press" onClick={() => setStep('new')}>Crear PIN</button>
      )}
    </div>
  );
}

/** "Mostrar privados" en Calendario y Reportes: pide el PIN. */
export function RevealSheet({ onClosed }: { onClosed: () => void }) {
  return (
    <Sheet title="Mostrar privados" onClosed={onClosed}>
      <RevealBody />
    </Sheet>
  );
}

function RevealBody() {
  const { meta } = useData();
  const { setPrivateOpen, open } = useUI();
  const close = useClose();
  const pin = meta.get('pin') as PinRecord | undefined;
  if (!pin)
    return (
      <div className="pad stack">
        <p className="help">No tienes un PIN. Sin PIN, cualquiera que abra la app puede mostrar los privados.</p>
        <button type="button" className="btn primary block press" onClick={() => { close(); open({ t: 'privacy' }); }}>Crear PIN</button>
        <button type="button" className="btn block press" onClick={() => { setPrivateOpen(true); close(); }}>Mostrar sin PIN</button>
      </div>
    );
  return (
    <PinPad
      length={pin.length}
      onSubmit={async (p) => {
        if (!(await checkPin(p, pin))) return 'PIN incorrecto.';
        setPrivateOpen(true);
        close();
      }}
    />
  );
}

/** Pantalla de bloqueo al abrir la app. */
export function LockScreen({ pin, onUnlock }: { pin: PinRecord; onUnlock: () => void }) {
  const [fails, setFails] = useState(0);
  const [forgot, setForgot] = useState(false);
  const [armed, setArmed] = useState(false);
  return (
    <div className="lock" role="dialog" aria-modal="true" aria-label="App bloqueada">
      <div className="lock-top">
        <h1>Mi Bitácora</h1>
        {forgot ? (
          <div className="stack">
            <p className="help">Sin el PIN no se puede entrar. La salida es borrar los datos de este teléfono y luego importar tu último respaldo desde Más → Respaldo. Lo que no esté en el respaldo se pierde.</p>
            <button type="button" className={armed ? 'btn danger press' : 'btn press'} onClick={async () => { if (!armed) return setArmed(true); await db.delete(); location.reload(); }}>
              {armed ? 'Sí, borrar todos los datos' : 'Borrar los datos de este teléfono'}
            </button>
            <button type="button" className="link" style={{ justifySelf: 'start', paddingLeft: 0 }} onClick={() => { setForgot(false); setArmed(false); }}>Volver</button>
          </div>
        ) : (
          <>
            <p className="help">Ingresa tu PIN.</p>
            {fails >= 3 && <button type="button" className="link" style={{ paddingLeft: 0 }} onClick={() => setForgot(true)}>Olvidé mi PIN</button>}
          </>
        )}
      </div>
      {!forgot && (
        <PinPad
          length={pin.length}
          onSubmit={async (p) => {
            if (await checkPin(p, pin)) return onUnlock();
            setFails((n) => n + 1);
            return 'PIN incorrecto.';
          }}
        />
      )}
    </div>
  );
}
