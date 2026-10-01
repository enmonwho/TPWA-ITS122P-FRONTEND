import { describe, it, expect } from 'vitest';
import {
  normalizeCountry,
  getCountryCode,
  getCountryForCity,
  isSameCountry,
  deduplicateCountries,
} from './countryUtils';

describe('countryUtils', () => {
  describe('normalizeCountry', () => {
    it('normalizes Korea, South and all variants to South Korea', () => {
      expect(normalizeCountry('Korea, South')).toBe('South Korea');
      expect(normalizeCountry('South Korea')).toBe('South Korea');
      expect(normalizeCountry('Republic of Korea')).toBe('South Korea');
      expect(normalizeCountry('korea, republic of')).toBe('South Korea');
      expect(normalizeCountry('ROK')).toBe('South Korea');
      expect(normalizeCountry('korea (south)')).toBe('South Korea');
    });

    it('normalizes North Korea variants', () => {
      expect(normalizeCountry('Korea, North')).toBe('North Korea');
      expect(normalizeCountry('North Korea')).toBe('North Korea');
      expect(normalizeCountry('DPRK')).toBe('North Korea');
    });

    it('normalizes USA variants to United States', () => {
      expect(normalizeCountry('USA')).toBe('United States');
      expect(normalizeCountry('U.S.A.')).toBe('United States');
      expect(normalizeCountry('united states of america')).toBe('United States');
    });

    it('normalizes UK and UAE variants', () => {
      expect(normalizeCountry('UK')).toBe('United Kingdom');
      expect(normalizeCountry('UAE')).toBe('United Arab Emirates');
      expect(normalizeCountry('U.A.E.')).toBe('United Arab Emirates');
    });

    it('maps city mistakenly passed as country to its canonical country', () => {
      expect(normalizeCountry('Seoul')).toBe('South Korea');
      expect(normalizeCountry('tokyo')).toBe('Japan');
      expect(normalizeCountry('Paris')).toBe('France');
      expect(normalizeCountry('Manila')).toBe('Philippines');
    });
  });

  describe('getCountryCode', () => {
    it('returns stable ISO code for South Korea', () => {
      expect(getCountryCode('South Korea')).toBe('KR');
      expect(getCountryCode('Korea, South')).toBe('KR');
      expect(getCountryCode('Republic of Korea')).toBe('KR');
    });

    it('returns stable ISO codes for other canonical countries', () => {
      expect(getCountryCode('Japan')).toBe('JP');
      expect(getCountryCode('Philippines')).toBe('PH');
      expect(getCountryCode('United States')).toBe('US');
      expect(getCountryCode('USA')).toBe('US');
      expect(getCountryCode('United Kingdom')).toBe('GB');
      expect(getCountryCode('France')).toBe('FR');
    });
  });

  describe('getCountryForCity', () => {
    it('resolves Seoul to South Korea so it does not create a new country', () => {
      expect(getCountryForCity('Seoul')).toBe('South Korea');
      expect(getCountryForCity('seoul')).toBe('South Korea');
      expect(getCountryForCity('Busan')).toBe('South Korea');
      expect(getCountryForCity('Jeju Island')).toBe('South Korea');
    });

    it('resolves other major global cities', () => {
      expect(getCountryForCity('Tokyo')).toBe('Japan');
      expect(getCountryForCity('Kyoto')).toBe('Japan');
      expect(getCountryForCity('Cebu City')).toBe('Philippines');
      expect(getCountryForCity('El Nido, Palawan')).toBe('Philippines');
      expect(getCountryForCity('Paris')).toBe('France');
      expect(getCountryForCity('Rome')).toBe('Italy');
    });

    it('returns null for unknown destination names', () => {
      expect(getCountryForCity('NonExistentCity12345')).toBeNull();
    });
  });

  describe('isSameCountry', () => {
    it('identifies South Korea and Korea, South as the exact same country', () => {
      expect(isSameCountry('South Korea', 'Korea, South')).toBe(true);
      expect(isSameCountry('Korea, South', 'Republic of Korea')).toBe(true);
      expect(isSameCountry('ROK', 'South Korea')).toBe(true);
      expect(isSameCountry('USA', 'United States')).toBe(true);
      expect(isSameCountry('South Korea', 'Japan')).toBe(false);
    });
  });

  describe('deduplicateCountries', () => {
    it('removes duplicate country aliases and preserves explicit order', () => {
      const input = [
        'Korea, South',
        'Japan',
        'South Korea',
        'France',
        'Republic of Korea',
      ];
      expect(deduplicateCountries(input)).toEqual(['South Korea', 'Japan', 'France']);
    });
  });
});
