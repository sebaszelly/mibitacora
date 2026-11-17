import { useEffect, useState } from 'react';
import { type Backup, exportBackup, markBackupDone } from './db/backup';
import { db } from './db/db';
import { getMeta, setMeta } from './db/repo';
import { ensureSeeded } from './db/seed';
import { today } from './domain/dates';
import { isPersisted, isStandalone, offlineReady, requestPersistence } from './platform/device';
import { backupFileName, deliverFile } from './platform/share';

/**
 * Pantalla temporal para comprobar en el iPhone lo que no se puede probar en
 * una computadora. Se reemplaza por la pantalla Hoy cuando esté construida.
 */
interface State {
  standalone: boolean;
  persisted: boolean;
  offline: boolean;
  habits: number;
  saved: number;
}

const built = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(__BUILD_TIME__));

export function DeviceCheck() {
  const [s, setS] = useState<State | null>(null);
  const [backup, setBackup] = useState<Backup | null>(null);
  const [shareMsg, setShareMsg] = useState('');

  async function refresh() {
    await ensureSeeded();
    setS({
      standalone: isStandalone(),
      persisted: await isPersisted(),
      offline: await offlineReady(),
      habits: await db.habits.count(),
      saved: (await getMeta<number>(db, 'device_test_count')) ?? 0,
    });
    // El respaldo se prepara antes del toque: iOS solo abre Compartir si se llama en el mismo gesto.
    setBackup(await exportBackup());
  }

  useEffect(() => {
    void refresh();
    const t = setTimeout(() => void refresh(), 2500); // el modo sin conexión tarda un momento en quedar listo
    return () => clearTimeout(t);
  }, []);

  if (!s) return null;

  const row = (ok: boolean, title: string, good: string, bad: string) => (
    <li>
      <span className={ok ? 'mark ok' : 'mark no'} aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <p>{ok ? good : bad}</p>
      </div>
    </li>
  );

  return (
    <main>
      <h1>Prueba en el iPhone</h1>
      <p className="lead">Versión temporal. Sirve para comprobar que tu teléfono guarda los datos y hace respaldos antes de construir las pantallas.</p>

      <ol>
        {row(s.standalone, 'Abierta desde el ícono de inicio', 'Sí. Así es como debes usarla siempre.', 'No. Estás en una pestaña de Safari: toca Compartir → «Agregar a pantalla de inicio» y ábrela desde el ícono.')}
        {row(s.persisted, 'Guardado permanente', 'Concedido. iOS no borrará los datos por su cuenta.', 'Todavía no. Toca el botón de abajo para pedirlo.')}
        {row(s.offline, 'Lista para usarse sin conexión', 'Sí. Pon el modo avión, cierra la app y vuelve a abrirla: debe cargar igual.', 'Aún no. Espera unos segundos con conexión y vuelve a abrir la app.')}
        {row(s.habits === 9, 'Hábitos iniciales cargados', `Los ${s.habits} hábitos de la spec están en la base de datos.`, `Hay ${s.habits} hábitos; deberían ser 9.`)}
        {row(s.saved > 0, `Registros de prueba guardados: ${s.saved}`, 'Cierra la app del todo, o reinicia el iPhone, y vuelve a entrar: el número debe seguir igual.', 'Toca «Guardar un registro de prueba» y luego cierra y vuelve a abrir la app.')}
      </ol>

      <div className="actions">
        {!s.persisted && (
          <button
            type="button"
            onClick={async () => {
              await requestPersistence();
              await refresh();
            }}
          >
            Pedir guardado permanente
          </button>
        )}
        <button
          type="button"
          onClick={async () => {
            await setMeta(db, 'device_test_count', s.saved + 1);
            await refresh();
          }}
        >
          Guardar un registro de prueba
        </button>
        <button
          type="button"
          disabled={!backup}
          onClick={async () => {
            if (!backup) return;
            const outcome = await deliverFile(backupFileName(today()), JSON.stringify(backup, null, 2));
            if (outcome !== 'cancelled') await markBackupDone(backup);
            setShareMsg(
              outcome === 'shared'
                ? 'Se abrió Compartir. Si elegiste «Guardar en Archivos», el respaldo ya está ahí.'
                : outcome === 'downloaded'
                  ? 'Este navegador no abrió Compartir; el archivo se descargó.'
                  : 'Cancelaste. No se guardó ningún respaldo.',
            );
          }}
        >
          Probar el respaldo
        </button>
      </div>
      <p className="note" role="status">
        {shareMsg}
      </p>
      <p className="note">Versión publicada: {built}</p>
    </main>
  );
}
