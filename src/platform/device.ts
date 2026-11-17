/** Lo que el iPhone le concede a la app. Todo se comprueba, nada se supone. */

/** Abierta desde el ícono de la pantalla de inicio, no desde una pestaña de Safari. */
export function isStandalone(): boolean {
  const iosFlag = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosFlag || window.matchMedia('(display-mode: standalone)').matches;
}

/** ¿El navegador prometió no borrar los datos por su cuenta? */
export async function isPersisted(): Promise<boolean> {
  return (await navigator.storage?.persisted?.()) ?? false;
}

/** Pide almacenamiento persistente. iOS lo concede a las apps instaladas en la pantalla de inicio. */
export async function requestPersistence(): Promise<boolean> {
  if (await isPersisted()) return true;
  return (await navigator.storage?.persist?.()) ?? false;
}

/** La app ya puede abrirse sin conexión. */
export async function offlineReady(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  return Boolean(reg?.active);
}
