import { describe, expect, it } from 'vitest';
import { checkPin, isValidPin, makePin } from './pin';

describe('PIN', () => {
  it('acepta de 4 a 6 dígitos', () => {
    expect(isValidPin('1234')).toBe(true);
    expect(isValidPin('123456')).toBe(true);
    expect(isValidPin('123')).toBe(false);
    expect(isValidPin('1234567')).toBe(false);
    expect(isValidPin('12a4')).toBe(false);
  });
  it('guarda una huella, no el PIN, y solo abre con el correcto', async () => {
    const rec = await makePin('2580');
    expect(JSON.stringify(rec)).not.toContain('2580');
    expect(rec.length).toBe(4);
    expect(await checkPin('2580', rec)).toBe(true);
    expect(await checkPin('2581', rec)).toBe(false);
  });
});
