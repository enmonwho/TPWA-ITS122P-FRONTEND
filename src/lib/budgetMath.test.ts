import { describe, expect, it } from 'vitest';
import { calculateBudgetPercentage } from './budgetMath';

describe('budget percentage edge cases', () => {
  it.each([
    [0, 0, 0],
    [0, 100, 0],
    [50, 100, 50],
    [100, 100, 100],
    [125, 100, 100],
  ])('calculates %s spent of %s budget as %s%%', (spent, budget, expected) => {
    expect(calculateBudgetPercentage(spent, budget)).toBe(expected);
  });

  it.each([
    [Number.NaN, 100],
    [50, Number.NaN],
    [50, 0],
    [50, -100],
    [Number.POSITIVE_INFINITY, 100],
  ])('returns a safe zero for spent=%s and budget=%s', (spent, budget) => {
    expect(calculateBudgetPercentage(spent, budget)).toBe(0);
  });
});
