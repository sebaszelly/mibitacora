import { db } from '../db/db';
import { setMeta } from '../db/repo';

/**
 * El PIN es un bloqueo de pantalla, no un cifrado: evita miradas, no protege
 * los datos de quien tenga acceso al almacenamiento del teléfono. Se guarda
 * solo su huella (PBKDF2), nunca el PIN.
 */
export interface PinRecord {
  salt: string;
  hash: string;
  length: number;
}

const ITERATIONS = 120_000;
const hex = (buf: ArrayBuffer | Uint8Array): string => [...new Uint8Array(buf instanceof Uint8Array ? buf.buffer : buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const unhex = (s: string): Uint8Array<ArrayBuffer> => new Uint8Array((s.match(/../g) ?? []).map((b) => parseInt(b, 16)));

async function derive(pin: string, salt: Uint8Array<ArrayBuffer>): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS }, key, 256);
  return hex(bits);
}

export async function makePin(pin: string): Promise<PinRecord> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { salt: hex(salt), hash: await derive(pin, salt), length: pin.length };
}

export async function checkPin(pin: string, record: PinRecord): Promise<boolean> {
  return (await derive(pin, unhex(record.salt))) === record.hash;
}

export async function savePin(pin: string): Promise<void> {
  await setMeta(db, 'pin', await makePin(pin));
}

export async function removePin(): Promise<void> {
  await db.meta.delete('pin');
}

export const isValidPin = (pin: string): boolean => /^\d{4,6}$/.test(pin);
