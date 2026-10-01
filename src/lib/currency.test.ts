import { describe, it, expect } from 'vitest';
import {
  isZeroDecimalCurrency,
  getCurrencyInputStep,
  getCurrencyInputMin,
  validateCurrencyAmount,
  formatCurrency,
} from './currency';

describe('Currency rules & JPY validation', () => {
  it('correctly identifies zero-decimal currencies', () => {
    expect(isZeroDecimalCurrency('JPY')).toBe(true);
    expect(isZeroDecimalCurrency('jpy')).toBe(true);
    expect(isZeroDecimalCurrency('PHP')).toBe(false);
    expect(isZeroDecimalCurrency('USD')).toBe(false);
    expect(isZeroDecimalCurrency('EUR')).toBe(false);
  });

  it('provides matching min and step for HTML input elements', () => {
    expect(getCurrencyInputMin('JPY')).toBe('1');
    expect(getCurrencyInputStep('JPY')).toBe('1');

    expect(getCurrencyInputMin('PHP')).toBe('0.01');
    expect(getCurrencyInputStep('PHP')).toBe('0.01');

    expect(getCurrencyInputMin('USD')).toBe('0.01');
    expect(getCurrencyInputStep('USD')).toBe('0.01');
  });

  it('validates integer amounts for JPY correctly', () => {
    // Valid whole number JPY
    expect(validateCurrencyAmount(1000, 'JPY').isValid).toBe(true);
    expect(validateCurrencyAmount('500', 'JPY').isValid).toBe(true);
    expect(validateCurrencyAmount(1, 'JPY').isValid).toBe(true);

    // Invalid decimal JPY
    const decimalRes1 = validateCurrencyAmount(1000.5, 'JPY');
    expect(decimalRes1.isValid).toBe(false);
    expect(decimalRes1.error).toContain('whole numbers');

    const decimalRes2 = validateCurrencyAmount('1000.01', 'JPY');
    expect(decimalRes2.isValid).toBe(false);

    // Invalid non-positive JPY
    expect(validateCurrencyAmount(0, 'JPY').isValid).toBe(false);
    expect(validateCurrencyAmount(-50, 'JPY').isValid).toBe(false);
  });

  it('validates standard decimal currencies (PHP, USD, EUR)', () => {
    expect(validateCurrencyAmount(100.5, 'PHP').isValid).toBe(true);
    expect(validateCurrencyAmount('0.01', 'USD').isValid).toBe(true);
    expect(validateCurrencyAmount(2500, 'EUR').isValid).toBe(true);

    expect(validateCurrencyAmount(0, 'PHP').isValid).toBe(false);
    expect(validateCurrencyAmount(-10, 'USD').isValid).toBe(false);
  });

  it('formats JPY with no decimal places and PHP/USD with 2 decimal places', () => {
    expect(formatCurrency(1500, 'JPY')).toBe('¥ 1,500');
    expect(formatCurrency(1500.75, 'PHP')).toBe('₱ 1,500.75');
    expect(formatCurrency(100, 'USD')).toBe('$ 100.00');
  });
});
