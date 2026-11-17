import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { type Backup, BackupError, daysSinceBackup, exportBackup, importBackup, markBackupDone, parseBackup } from '../db/backup';
import { capitalize, longDate } from '../domain/format';
import { fromDate } from '../domain/dates';
import { isPersisted, requestPersistence } from '../platform/device';
import { backupFileName, deliverFile } from '../platform/share';
import { useData } from '../state/data';
import { useUI } from '../state/ui';
import { Sheet } from '../ui/Sheet';

export function BackupSheet({ onClosed }: { onClosed: () => void }) {
  return (
    <Sheet title="Respaldo" subtitle="Tus datos viven solo en este teléfono" onClosed={onClosed} full>
      <BackupBody />
    </Sheet>
  );
}

function BackupBody() {
  const { meta, logs } = useData();
  const { today } = useUI();
  const [ready, setReady] = useState<Backup | null>(null);
  const [incoming, setIncoming] = useState<Backup | null>(null);
  const [error, setError] = useState('');
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const last = meta.get('last_backup_at') as string | undefined;
  const days = daysSinceBackup(last);

  // El archivo se prepara antes del toque: iOS solo abre Compartir dentro del mismo gesto.
  useEffect(() => {
    let alive = true;
    void exportBackup().then((b) => alive && setReady(b));
    void isPersisted().then((p) => alive && setPersisted(p));
    return () => {
      alive = false;
    };
  }, [logs.length]);

  async function share() {
    if (!ready) return;
    const outcome = await deliverFile(backupFileName(today), JSON.stringify(ready));
    if (outcome === 'cancelled') return;
    await markBackupDone(ready);
    toast(outcome === 'shared' ? 'Respaldo listo. Guárdalo en Archivos o iCloud Drive.' : 'Respaldo descargado');
  }

  async function pick(f: File | undefined) {
    setError('');
    if (!f) return;
    try {
      setIncoming(parseBackup(await f.text()));
    } catch (e) {
      setError(e instanceof BackupError ? e.message : 'No se pudo leer el archivo.');
    }
    if (file.current) file.current.value = '';
  }

  if (incoming) {
    const t = incoming.tables;
    return (
      <div className="pad stack lg">
        <p>
          <strong>Este respaldo es del {longDate(fromDate(new Date(incoming.exported_at)))}.</strong> Tiene {t.habits?.length ?? 0} hábitos y {t.habit_logs?.length ?? 0} registros.
        </p>
        <p className="help">Importarlo reemplaza todo lo que hay ahora en este teléfono. Si tienes datos nuevos, expórtalos antes.</p>
        <button
          type="button"
          className="btn danger block press"
          onClick={async () => {
            await importBackup(incoming);
            setIncoming(null);
            toast('Respaldo importado');
          }}
        >
          Reemplazar mis datos
        </button>
        <button type="button" className="btn block press" onClick={() => setIncoming(null)}>
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <div className="pad stack lg">
      <div>
        <p><strong>{last ? `Último respaldo: ${days === 0 ? 'hoy' : days === 1 ? 'ayer' : `hace ${days} días`}` : 'Aún no has hecho un respaldo'}</strong></p>
        {last && <p className="help">{capitalize(longDate(fromDate(new Date(last))))}</p>}
      </div>
      <p className="help">Si borras el ícono de la pantalla de inicio o limpias los datos de Safari, iOS elimina la información. Haz un respaldo cada semana y guárdalo en Archivos o iCloud Drive.</p>
      <button type="button" className="btn primary block press" disabled={!ready} onClick={() => void share()}>
        Exportar respaldo
      </button>
      <input ref={file} id="backup-file" type="file" accept=".json,application/json,text/plain" className="sr-only" onChange={(e) => void pick(e.target.files?.[0])} />
      <button type="button" className="btn block press" onClick={() => file.current?.click()}>
        Importar desde un archivo
      </button>
      {error && <p className="error" role="alert">{error}</p>}
      <div>
        <p><strong>Guardado permanente: {persisted === null ? 'comprobando' : persisted ? 'concedido' : 'no concedido'}</strong></p>
        <p className="help">{persisted ? 'iOS no borrará los datos por su cuenta.' : 'Abre la app desde el ícono de inicio y vuelve a pedirlo.'}</p>
        {persisted === false && (
          <button type="button" className="link" style={{ paddingLeft: 0 }} onClick={async () => setPersisted(await requestPersistence())}>
            Pedir guardado permanente
          </button>
        )}
      </div>
    </div>
  );
}
