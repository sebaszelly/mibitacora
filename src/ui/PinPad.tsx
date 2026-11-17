import { Backspace } from '@phosphor-icons/react';
import { useState } from 'react';

interface Props {
  /** Longitud conocida del PIN: se comprueba solo al completarla. Sin valor: se elige de 4 a 6 y se confirma con "Listo". */
  length?: number;
  /** Devuelve un mensaje de error para volver a intentar, o nada si se aceptó. */
  onSubmit: (pin: string) => Promise<string | void>;
}

/** Teclado numérico para ingresar o crear el PIN. */
export function PinPad({ length, onSubmit }: Props) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const max = length ?? 6;

  async function submit(value: string) {
    setBusy(true);
    const problem = await onSubmit(value);
    setBusy(false);
    if (problem) {
      setError(problem);
      setPin('');
    }
  }
  function press(d: string) {
    if (busy || pin.length >= max) return;
    const next = pin + d;
    setPin(next);
    setError('');
    if (length && next.length === length) void submit(next);
  }

  return (
    <div className="stack">
      <div className="pad stack">
        <div className="pin-dots" role="img" aria-label={`${pin.length} dígitos ingresados`}>
          {Array.from({ length: length ?? Math.max(4, pin.length) }, (_, i) => (
            <i key={i} className={i < pin.length ? 'on' : ''} />
          ))}
        </div>
        <p className="error" role="alert" style={{ minHeight: '1.4em' }}>
          {error}
        </p>
      </div>
      <div className="keypad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} type="button" onClick={() => press(d)}>
            {d}
          </button>
        ))}
        {length ? (
          <span />
        ) : (
          <button type="button" className="txt" disabled={pin.length < 4 || busy} onClick={() => void submit(pin)}>
            Listo
          </button>
        )}
        <button type="button" onClick={() => press('0')}>
          0
        </button>
        <button type="button" aria-label="Borrar dígito" onClick={() => setPin(pin.slice(0, -1))}>
          <Backspace size={26} weight="bold" />
        </button>
      </div>
    </div>
  );
}
