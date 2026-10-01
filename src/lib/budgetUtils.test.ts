import { describe, it, expect } from 'vitest';
import {
  normalizeCategory,
  isCategoryMatch,
  calculateTotalSpent,
  calculateCategoryBreakdown,
  calculateBudgetRemaining,
  calculateBudgetPercentage,
  calculateCategoryPercentage,
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

  describe('budget tracker edge cases', () => {
    it('handles calculateBudgetRemaining with surplus, exact, and overbudget deficit', () => {
      // Surplus
      expect(calculateBudgetRemaining(50000, 32000)).toBe(18000);
      // Exact
      expect(calculateBudgetRemaining(50000, 50000)).toBe(0);
      // Overbudget deficit
      expect(calculateBudgetRemaining(50000, 65000)).toBe(-15000);
      // Zero budget with expenses
      expect(calculateBudgetRemaining(0, 1200)).toBe(-1200);
      // NaN or undefined protection
      expect(calculateBudgetRemaining(NaN, 500)).toBe(-500);
    });

    it('handles calculateBudgetPercentage with zero budget, partial, and over 100%', () => {
      // 0 budget, 0 spent
      expect(calculateBudgetPercentage(0, 0)).toBe(0);
      // 0 budget, positive spent
      expect(calculateBudgetPercentage(0, 500)).toBe(100);
      // 50% spent
      expect(calculateBudgetPercentage(10000, 5000)).toBe(50);
      // 150% overbudget
      expect(calculateBudgetPercentage(10000, 15000)).toBe(150);
    });

    it('handles calculateCategoryPercentage edge cases without NaN or division by zero', () => {
      // Zero total spent
      expect(calculateCategoryPercentage(500, 0)).toBe(0);
      // Zero category cost
      expect(calculateCategoryPercentage(0, 5000)).toBe(0);
      // 100% single category
      expect(calculateCategoryPercentage(5000, 5000)).toBe(100);
      // Proportional rounding
      expect(calculateCategoryPercentage(3333, 10000)).toBe(33);
    });

    it('handles calculateTotalSpent with malformed, NaN, or non-numeric costs', () => {
      const expenses = [
        { cost: 1000 },
        { cost: NaN },
        { cost: '500' as unknown as number },
        { cost: 0 },
        { cost: undefined as unknown as number },
      ];
      expect(calculateTotalSpent(expenses)).toBe(1500);
    });
  });
});
