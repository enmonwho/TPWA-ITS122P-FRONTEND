export function toFiniteAmount(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

export function calculateBudgetPercentage(
  spentValue: unknown,
  budgetValue: unknown,
): number {
  const spent = Math.max(0, toFiniteAmount(spentValue));
  const budget = toFiniteAmount(budgetValue);

  if (budget <= 0) return 0;

  const percentage = (spent / budget) * 100;
  if (!Number.isFinite(percentage)) return 0;
  return Math.min(100, Math.max(0, percentage));
}
