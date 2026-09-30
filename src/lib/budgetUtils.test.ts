import { describe, it, expect } from 'vitest';
import {
  normalizeCategory,
  isCategoryMatch,
  calculateTotalSpent,
  calculateCategoryBreakdown,
} from './budgetUtils';

describe('budgetUtils', () => {
  describe('normalizeCategory', () => {
    it('normalizes Accomodation typo to Accommodation', () => {
      expect(normalizeCategory('Accomodation')).toBe('Accommodation');
      expect(normalizeCategory('accommodation')).toBe('Accommodation');
      expect(normalizeCategory('Accomodations')).toBe('Accommodation');
    });

    it('normalizes transport variants', () => {
      expect(normalizeCategory('Transport')).toBe('Transport');
      expect(normalizeCategory('Transportation')).toBe('Transport');
    });

    it('normalizes food and dining variants to Eat & Drink', () => {
      expect(normalizeCategory('Eat & Drink')).toBe('Eat & Drink');
      expect(normalizeCategory('Food')).toBe('Eat & Drink');
      expect(normalizeCategory('Dining')).toBe('Eat & Drink');
      expect(normalizeCategory('Drinks')).toBe('Eat & Drink');
    });

    it('normalizes activities', () => {
      expect(normalizeCategory('Activities')).toBe('Activities');
      expect(normalizeCategory('Activity')).toBe('Activities');
    });

    it('falls back to Other for unrecognized or empty strings', () => {
      expect(normalizeCategory('')).toBe('Other');
      expect(normalizeCategory('Souvenirs')).toBe('Other');
    });
  });

  describe('isCategoryMatch', () => {
    it('matches Accomodation with Accommodation', () => {
      expect(isCategoryMatch('Accomodation', 'Accommodation')).toBe(true);
      expect(isCategoryMatch('accommodation', 'Accomodation')).toBe(true);
    });

    it('matches Food with Eat & Drink', () => {
      expect(isCategoryMatch('Food', 'Eat & Drink')).toBe(true);
      expect(isCategoryMatch('Dining', 'Eat & Drink')).toBe(true);
    });

    it('does not match different categories', () => {
      expect(isCategoryMatch('Transport', 'Accommodation')).toBe(false);
      expect(isCategoryMatch('Activities', 'Other')).toBe(false);
    });
  });

  describe('calculateTotalSpent', () => {
    it('sums costs accurately', () => {
      const expenses = [{ cost: 1500 }, { cost: 250.5 }, { cost: 99.5 }];
      expect(calculateTotalSpent(expenses)).toBe(1850);
    });

    it('handles empty expenses', () => {
      expect(calculateTotalSpent([])).toBe(0);
    });
  });

  describe('calculateCategoryBreakdown', () => {
    it('aggregates expenses under canonical categories regardless of legacy spelling', () => {
      const expenses = [
        { cost: 5000, category: 'Accomodation' },
        { cost: 3000, category: 'Accommodation' },
        { cost: 1200, category: 'Food' },
        { cost: 800, category: 'Transportation' },
        { cost: 500, category: 'Activities' },
        { cost: 200, category: 'Souvenirs' },
      ];

      const breakdown = calculateCategoryBreakdown(expenses);
      expect(breakdown.Accommodation).toBe(8000);
      expect(breakdown['Eat & Drink']).toBe(1200);
      expect(breakdown.Transport).toBe(800);
      expect(breakdown.Activities).toBe(500);
      expect(breakdown.Other).toBe(200);
    });
  });
});
