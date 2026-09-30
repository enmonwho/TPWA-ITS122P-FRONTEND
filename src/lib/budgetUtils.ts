export interface ExpenseItem {
  id: string;
  name: string;
  cost: number;
  category: string;
  items?: number;
  date?: string;
  country_name?: string;
}

export const CANONICAL_BUDGET_CATEGORIES = [
  'Accommodation',
  'Transport',
  'Activities',
  'Eat & Drink',
  'Other',
] as const;

export type CanonicalCategory = (typeof CANONICAL_BUDGET_CATEGORIES)[number];

/**
 * Normalizes category names, specifically reconciling legacy spellings
 * (e.g. 'Accomodation' -> 'Accommodation') and variations ('Food', 'Dining' -> 'Eat & Drink').
 */
export function normalizeCategory(category: string): CanonicalCategory {
  if (!category) return 'Other';
  const norm = category.trim().toLowerCase();
  if (norm.includes('accom')) return 'Accommodation';
  if (norm.includes('trans')) return 'Transport';
  if (norm.includes('activ')) return 'Activities';
  if (
    norm.includes('eat') ||
    norm.includes('drink') ||
    norm.includes('food') ||
    norm.includes('dining')
  ) {
    return 'Eat & Drink';
  }
  return 'Other';
}

/**
 * Returns true if two category labels refer to the same logical category.
 */
export function isCategoryMatch(cat1: string, cat2: string): boolean {
  return normalizeCategory(cat1) === normalizeCategory(cat2);
}

/**
 * Calculates sum of all expenses.
 */
export function calculateTotalSpent(expenses: { cost: number }[]): number {
  return expenses.reduce((sum, e) => sum + (Number(e.cost) || 0), 0);
}

/**
 * Calculates category-by-category totals.
 */
export function calculateCategoryBreakdown(
  expenses: { cost: number; category: string }[],
): Record<CanonicalCategory, number> {
  const breakdown: Record<CanonicalCategory, number> = {
    Accommodation: 0,
    Transport: 0,
    Activities: 0,
    'Eat & Drink': 0,
    Other: 0,
  };

  for (const exp of expenses) {
    const canonical = normalizeCategory(exp.category);
    breakdown[canonical] += Number(exp.cost) || 0;
  }

  return breakdown;
}
