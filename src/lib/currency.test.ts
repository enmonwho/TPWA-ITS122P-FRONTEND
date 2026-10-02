import { describe, expect, it } from 'vitest';
import {
  getCurrencyInputStep,
  getCurrencyMinorUnits,
  parseCurrencyAmount,
} from './currency';

describe('currency minor-unit validation', () => {
  it('accepts whole-number JPY amounts', () => {
    expect(getCurrencyMinorUnits('JPY')).toBe(0);
    expect(getCurrencyInputStep('JPY')).toBe('1');
    expect(parseCurrencyAmount('1000', 'JPY')).toBe(1000);
  });

  it('rejects fractional JPY amounts', () => {
    expect(parseCurrencyAmount('1000.50', 'JPY')).toBeNull();
  });

  it.each(['PHP', 'USD'])('accepts two-decimal %s amounts', (currency) => {
    expect(getCurrencyMinorUnits(currency)).toBe(2);
    expect(getCurrencyInputStep(currency)).toBe('0.01');
    expect(parseCurrencyAmount('100.50', currency)).toBe(100.5);
  });

  it('rejects amounts with more minor units than the currency supports', () => {
    expect(parseCurrencyAmount('100.501', 'PHP')).toBeNull();
    expect(parseCurrencyAmount('100.501', 'USD')).toBeNull();
  });
});
