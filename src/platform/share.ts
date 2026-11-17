export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled';

/**
 * Entrega un archivo al usuario. En el iPhone abre el menú Compartir, donde
 * está "Guardar en Archivos" (iCloud Drive incluido). Donde no existe ese
 * menú, lo descarga.
 *
 * Tiene que llamarse directamente desde un toque: iOS no deja compartir si
 * pasó demasiado tiempo desde el gesto.
 */
export async function deliverFile(name: string, content: string, mime = 'application/json'): Promise<ShareOutcome> {
  // Algunos navegadores solo aceptan compartir ciertos tipos; texto plano es el más admitido.
  for (const type of [mime, 'text/plain']) {
    const file = new File([content], name, { type });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return 'shared';
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
        break;
      }
    }
  }
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}

/** Nombre del archivo de respaldo, ordenable por fecha. */
export function backupFileName(day: string): string {
  return `mibitacora-respaldo-${day}.json`;
}
