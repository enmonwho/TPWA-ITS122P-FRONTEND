import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Trash2, X, CirclePlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { Trip } from '../types/trip';
import { tripsApi, budgetApi } from '../services/api';
import { mergeTripWithExtras, formatDateOnly } from '../lib/tripExtras';
import { STORAGE_KEYS } from '../lib/constants';
import {
  fetchExchangeRates,
  convert,
  getCurrencySymbol,
  SUPPORTED_CURRENCIES,
  formatCurrency,
} from '../lib/currency';

import bedIcon from '../assets/budget/bed.png';
import busIcon from '../assets/budget/bus.png';
import activityIcon from '../assets/budget/activity.png';
import diningIcon from '../assets/budget/dining.png';
import otherIcon from '../assets/budget/other.png';
import arrowDownIcon from '../assets/budget/arrow_down.png';

interface Expense {
  id: string;
  name: string;
  items: number;
  category: string;
  cost: number;
  date?: string;
}

interface BudgetData {
  balance: number;
  expenses: Expense[];
}

interface CategoryConfig {
  name: string;
  color: string;
  icon: string;
}

const BUDGET_CATEGORIES: CategoryConfig[] = [
  { name: 'Accomodation', color: '#C5283D', icon: bedIcon },
  { name: 'Transport', color: '#E9724C', icon: busIcon },
  { name: 'Activities', color: '#FFC857', icon: activityIcon },
  { name: 'Eat & Drink', color: '#255F85', icon: diningIcon },
  { name: 'Other', color: '#8E8E93', icon: otherIcon },
];

function getCategoryConfig(catName: string): CategoryConfig {
  const norm = catName.toLowerCase().replace(/m+/, 'm');
  const found = BUDGET_CATEGORIES.find(
    (c) => c.name.toLowerCase().replace(/m+/, 'm') === norm,
  );
  return found || BUDGET_CATEGORIES[4]; 
}

function getDonutFontSize(len: number): string {
  if (len <= 6) return '24px';
  if (len <= 8) return '21px';
  if (len <= 10) return '18px';
  if (len <= 12) return '15px';
  return '13px';
}

export function Budget() {
  const { tripId } = useParams<{ tripId: string }>();
  const budgetKey = `lakbye_budget_${tripId}`;
  const { user } = useAuth();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [budget, setBudget] = useState<BudgetData>(() => {
    try {
      const stored = localStorage.getItem(budgetKey);
      if (stored) return JSON.parse(stored) as BudgetData;
    } catch {
    }
    return { balance: 0, expenses: [] };
  });

  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isAddBalanceOpen, setIsAddBalanceOpen] = useState(false);

  const [displayCurrency, setDisplayCurrency] = useState<string>(() => {
    if (tripId) {
      const savedTripCurrency = localStorage.getItem(`lakbye_display_currency_${tripId}`);
      if (savedTripCurrency) return savedTripCurrency;
    }
    if (user?.id) {
      try {
        const prefsRaw = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES(user.id));
        if (prefsRaw) {
          const prefs = JSON.parse(prefsRaw);
          if (prefs.currency) return prefs.currency;
        }
      } catch {}
    }
    return 'PHP';
  });
  
  const [fxRates, setFxRates] = useState<Record<string, number>>({
    PHP: 1,
    USD: 0.0175,
    EUR: 0.0161,
    GBP: 0.0135,
    JPY: 2.65,
  });
  const [isFxStale, setIsFxStale] = useState(false);
  const [fxDate, setFxDate] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchExchangeRates('PHP')
      .then((res) => {
        if (!cancelled) {
          setFxRates(res.rates);
          setIsFxStale(res.isStale);
          setFxDate(res.date);
        }
      })
      .catch((err) => console.warn('Failed to fetch exchange rates:', err));
    return () => { cancelled = true; };
  }, []);

  const handleCurrencyChange = (newCurrency: string) => {
    setDisplayCurrency(newCurrency);
    if (tripId) {
      localStorage.setItem(`lakbye_display_currency_${tripId}`, newCurrency);
    }
  };

  const [expenseName, setExpenseName] = useState('');
  const [expenseItemRows, setExpenseItemRows] = useState<{ name: string; quantity: string }[]>([
    { name: '', quantity: '1' },
    { name: '', quantity: '1' },
  ]);
  const [expenseCategory, setExpenseCategory] = useState(BUDGET_CATEGORIES[0].name);
  const [expenseCost, setExpenseCost] = useState('');
  const [balanceInput, setBalanceInput] = useState('');

  const addItemRow = () => {
    setExpenseItemRows((prev) => [...prev, { name: '', quantity: '1' }]);
  };

  const removeItemRow = (idx: number) => {
    setExpenseItemRows((prev) =>
      prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev,
    );
  };

  const updateItemRow = (idx: number, field: 'name' | 'quantity', val: string) => {
    setExpenseItemRows((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: val } : row)),
    );
  };

  useEffect(() => {
    if (!user || !tripId) return;

    let cancelled = false;

    const fetchData = async () => {
      try {
        const apiTrip = await tripsApi.getTrip(tripId);
        if (!cancelled) {
          setTrip(mergeTripWithExtras(apiTrip));
        }
      } catch (err) {}

      try {
        const budgetData = await budgetApi.getBudget(tripId);
        if (!cancelled && budgetData) {
          const loadedBudget: BudgetData = {
            balance: typeof budgetData.balance === 'number' ? budgetData.balance : 0,
            expenses: Array.isArray(budgetData.expenses)
              ? budgetData.expenses.map((e) => ({
                  id: String(e.id),
                  name: e.name,
                  items: Number(e.items) || 1,
                  category: e.category,
                  cost: Number(e.cost) || 0,
                  date: e.date,
                }))
              : [],
          };
          setBudget(loadedBudget);
          localStorage.setItem(budgetKey, JSON.stringify(loadedBudget));
        }
      } catch (err) {}
    };

    fetchData();
    return () => { cancelled = true; };
  }, [user, tripId, budgetKey]);

  useEffect(() => {
    if (!isAddExpenseOpen && !isAddBalanceOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAddExpenseOpen(false);
        setIsAddBalanceOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddExpenseOpen, isAddBalanceOpen]);

  const saveBudget = (newData: BudgetData) => {
    setBudget(newData);
    localStorage.setItem(budgetKey, JSON.stringify(newData));
  };

  const handleAddBalanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const enteredAmount = parseFloat(balanceInput);
    if (isNaN(enteredAmount) || enteredAmount <= 0) return;

    const amountInPhp =
      displayCurrency === 'PHP'
        ? enteredAmount
        : convert(enteredAmount, displayCurrency, 'PHP', fxRates);
    const roundedPhp = Math.round(amountInPhp * 100) / 100;

    const optimisticBalance = Math.round((budget.balance + roundedPhp) * 100) / 100;
    saveBudget({
      ...budget,
      balance: optimisticBalance,
    });

    setBalanceInput('');
    setIsAddBalanceOpen(false);

    if (tripId) {
      try {
        const res = await budgetApi.addBalance(tripId, roundedPhp);
        if (res && typeof res.balance === 'number') {
          setBudget((prev) => {
            const reconciled = { ...prev, balance: res.balance };
            localStorage.setItem(budgetKey, JSON.stringify(reconciled));
            return reconciled;
          });
        }
      } catch (err) {}
    }
  };

  const handleAddExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseName.trim()) return;
    const enteredCost = parseFloat(expenseCost);
    if (isNaN(enteredCost) || enteredCost <= 0) return;

    const costInPhp =
      displayCurrency === 'PHP'
        ? enteredCost
        : convert(enteredCost, displayCurrency, 'PHP', fxRates);
    const roundedCostPhp = Math.round(costInPhp * 100) / 100;

    const totalItems =
      expenseItemRows.reduce((sum, r) => sum + (parseInt(r.quantity, 10) || 0), 0) || 1;

    const tempId = `temp-${Date.now()}`;
    const newExpense: Expense = {
      id: tempId,
      name: expenseName.trim(),
      items: totalItems,
      category: expenseCategory,
      cost: roundedCostPhp,
      date: new Date().toISOString().split('T')[0],
    };

    saveBudget({
      ...budget,
      balance: Math.round((budget.balance - roundedCostPhp) * 100) / 100,
      expenses: [...budget.expenses, newExpense],
    });

    setExpenseName('');
    setExpenseItemRows([{ name: '', quantity: '1' }, { name: '', quantity: '1' }]);
    setExpenseCategory(BUDGET_CATEGORIES[0].name);
    setExpenseCost('');
    setIsAddExpenseOpen(false);

    if (tripId) {
      try {
        const res = await budgetApi.addExpense(tripId, {
          name: newExpense.name,
          items: newExpense.items,
          category: newExpense.category,
          cost: newExpense.cost,
          date: newExpense.date,
        });
        if (res && res.expense) {
          setBudget((prev) => {
            const reconciled: BudgetData = {
              balance: typeof res.balance === 'number' ? res.balance : prev.balance,
              expenses: prev.expenses.map((item) =>
                item.id === tempId
                  ? {
                      id: String(res.expense.id),
                      name: res.expense.name,
                      items: Number(res.expense.items) || 1,
                      category: res.expense.category,
                      cost: Number(res.expense.cost) || 0,
                      date: res.expense.date,
                    }
                  : item,
              ),
            };
            localStorage.setItem(budgetKey, JSON.stringify(reconciled));
            return reconciled;
          });
        }
      } catch (err) {}
    }
  };

  const deleteExpense = async (id: string) => {
    const expenseToDelete = budget.expenses.find((e) => e.id === id);
    const refundCost = expenseToDelete ? expenseToDelete.cost : 0;

    saveBudget({
      ...budget,
      balance: Math.round((budget.balance + refundCost) * 100) / 100,
      expenses: budget.expenses.filter((e) => e.id !== id),
    });

    if (tripId && !id.startsWith('temp-')) {
      try {
        const res = await budgetApi.deleteExpense(tripId, id);
        if (res && typeof res.balance === 'number') {
          setBudget((prev) => {
            const reconciled = { ...prev, balance: res.balance };
            localStorage.setItem(budgetKey, JSON.stringify(reconciled));
            return reconciled;
          });
        }
      } catch (err) {}
    }
  };

  const categoryTotals = BUDGET_CATEGORIES.map((cat) => {
    const val = budget.expenses
      .filter((e) => {
        const normExp = e.category.toLowerCase().replace(/m+/, 'm');
        const normCat = cat.name.toLowerCase().replace(/m+/, 'm');
        return normExp === normCat;
      })
      .reduce((sum, e) => sum + Number(e.cost), 0);

    return {
      name: cat.name,
      value: convert(val, 'PHP', displayCurrency, fxRates),
      color: cat.color,
    };
  }).filter((c) => c.value > 0);

  const totalSpentPhp = budget.expenses.reduce((sum, e) => sum + Number(e.cost), 0);
  const convertedTotalSpent = convert(totalSpentPhp, 'PHP', displayCurrency, fxRates);
  const formattedSpent = formatCurrency(convertedTotalSpent, displayCurrency);

  const convertedBalance = convert(budget.balance, 'PHP', displayCurrency, fxRates);
  const currentSymbol = getCurrencySymbol(displayCurrency);

  const chartData =
    categoryTotals.length > 0
      ? categoryTotals
      : [{ name: 'Empty', value: 1, color: '#E5E5EA' }];

  if (!trip) {
    return (
      <div className="workspace-page">
        <div className="workspace-main-card" style={{ padding: '40px', textAlign: 'center' }}>
          Loading workspace...
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-page">
      <header className="workspace-header-card animate-slide-up">
        <h1 className="workspace-trip-title">{trip.name}</h1>
        <div className="workspace-header-actions">
          <div className="workspace-pill-date">
            {formatDateOnly(trip.startDate)} - {formatDateOnly(trip.endDate)}
          </div>
        </div>
      </header>

      <div className="budget-main-card animate-slide-up delay-150">
        <div className="budget-left-zone">
          <div className="budget-left-header">
            <h2 className="budget-title">Budget</h2>
            <div
              className="budget-currency-pill"
              title={`Display Currency: ${displayCurrency}. Rates updated: ${fxDate || 'today'}`}
              style={{ position: 'relative', overflow: 'hidden' }}
            >
              <label htmlFor="budget-currency-select-id" className="sr-only">Display Currency</label>
              <select
                id="budget-currency-select-id"
                value={displayCurrency}
                onChange={(e) => handleCurrencyChange(e.target.value)}
                className="budget-currency-select"
                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code} style={{ background: '#ffffff', color: '#111827' }}>
                    {c.code}
                  </option>
                ))}
              </select>
              <span style={{ pointerEvents: 'none' }}>{displayCurrency}</span>
              <img src={arrowDownIcon} alt="" className="budget-currency-arrow" aria-hidden="true" style={{ pointerEvents: 'none' }} />
            </div>
            {isFxStale && (
              <span className="budget-currency-stale-badge">Cached ({fxDate})</span>
            )}
          </div>

          <div className="budget-donut-container">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  key={`donut-wheel-${budget.expenses.length}-${Math.round(convertedTotalSpent)}-${displayCurrency}`}
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={76}
                  outerRadius={98}
                  stroke="none"
                  dataKey="value"
                  isAnimationActive={true}
                  animationBegin={0}
                  animationDuration={900}
                  animationEasing="ease-out"
                  startAngle={90}
                  endAngle={-270}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}-${entry.name}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            <div className="budget-donut-center">
              <div
                key={`amount-${convertedTotalSpent}-${displayCurrency}`}
                className="budget-donut-amount"
                style={{ fontSize: getDonutFontSize(formattedSpent.length) }}
              >
                {formattedSpent}
              </div>
              <div className="budget-donut-label">total{'\n'}expenses</div>
            </div>
          </div>

          <div className="budget-category-header">BY CATEGORY</div>

          <div className="budget-category-list">
            {BUDGET_CATEGORIES.map((cat) => (
              <div key={cat.name} className="budget-category-badge" style={{ backgroundColor: cat.color }}>
                <img src={cat.icon} alt="" className="budget-category-icon" />
                <span>{cat.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="budget-vertical-divider" />

        <div className="budget-right-zone">
          <div className="budget-hero-section">
            <div className="budget-balance-amount">
              {formatCurrency(convertedBalance, displayCurrency)}
            </div>
            {displayCurrency !== 'PHP' && (
              <div style={{ fontSize: '12px', color: 'rgba(72, 42, 19, 0.65)', marginTop: '-4px', marginBottom: '6px', fontWeight: 500 }}>
                ≈ ₱
                {budget.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} base
              </div>
            )}
            <div className="budget-balance-label">YOUR BALANCE</div>

            <div className="budget-action-buttons">
              <button type="button" className="budget-btn-add-expense" onClick={() => setIsAddExpenseOpen(true)}>
                <CirclePlus size={20} color="#ffffff" strokeWidth={2.2} />
                <span>Add Expense</span>
              </button>

              <button type="button" className="budget-btn-add-balance" onClick={() => setIsAddBalanceOpen(true)}>
                <CirclePlus size={20} color="rgba(72, 42, 19, 0.85)" strokeWidth={2.2} />
                <span>Add Balance</span>
              </button>
            </div>
          </div>

          <div className="budget-table">
            <div className="budget-table-header">
              <div>Name</div>
              <div>Items</div>
              <div>Category</div>
              <div>Cost</div>
            </div>

            <div className="budget-table-divider" />

            <div className="budget-table-rows">
              {budget.expenses.length === 0 ? (
                <div className="budget-table-empty">
                  No expenses recorded yet. Click <strong>Add Expense</strong> to start tracking!
                </div>
              ) : (
                budget.expenses.map((expense) => {
                  const catConfig = getCategoryConfig(expense.category);
                  return (
                    <div key={expense.id} className="budget-table-row">
                      <div style={{ fontWeight: 600 }}>{expense.name}</div>
                      <div style={{ color: 'rgba(0, 0, 0, 0.7)' }}>{expense.items || 1}</div>
                      <div>
                        <span className="budget-row-category-badge" style={{ backgroundColor: catConfig.color }}>
                          <img src={catConfig.icon} alt="" style={{ width: '13px', height: '13px', objectFit: 'contain' }} />
                          <span>{catConfig.name}</span>
                        </span>
                      </div>
                      <div style={{ fontWeight: 600 }}>
                        {formatCurrency(convert(expense.cost, 'PHP', displayCurrency, fxRates), displayCurrency)}
                        {displayCurrency !== 'PHP' && (
                          <span style={{ display: 'block', fontSize: '10.5px', fontWeight: 400, color: 'rgba(0, 0, 0, 0.45)' }}>
                            ≈ ₱{expense.cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                      <button type="button" className="budget-row-delete-btn" title="Delete Expense" onClick={() => deleteExpense(expense.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {isAddExpenseOpen && (
        <div className="budget-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-add-expense-title">
          <div className="budget-modal-card">
            <h2 id="modal-add-expense-title" className="sr-only">Add Expense</h2>
            <button type="button" className="budget-modal-close-btn" aria-label="Close modal" onClick={() => setIsAddExpenseOpen(false)}>
              <X size={18} />
            </button>

            <form onSubmit={handleAddExpenseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label htmlFor="modal-expense-vendor" className="budget-modal-section-title">Where did you spend?</label>
                <input id="modal-expense-vendor" type="text" required placeholder="Name of shop, restaurant..." className="budget-modal-gradient-input budget-modal-vendor-input" value={expenseName} onChange={(e) => setExpenseName(e.target.value)} />
              </div>

              <div>
                <span className="budget-modal-section-title">Items spent on</span>
                <div className="budget-modal-items-list">
                  {expenseItemRows.map((item, index) => (
                    <div key={index} className="budget-modal-item-row">
                      <span className="budget-modal-item-label">Item {index + 1}</span>
                      <label htmlFor={`modal-item-name-${index}`} className="sr-only">Item {index + 1} Name</label>
                      <input id={`modal-item-name-${index}`} type="text" placeholder="Name" className="budget-modal-gradient-input budget-modal-item-name" value={item.name} onChange={(e) => updateItemRow(index, 'name', e.target.value)} />
                      <label htmlFor={`modal-item-qty-${index}`} className="sr-only">Item {index + 1} Quantity</label>
                      <input id={`modal-item-qty-${index}`} type="number" min="1" placeholder="Quantity" className="budget-modal-gradient-input budget-modal-item-qty" value={item.quantity} onChange={(e) => updateItemRow(index, 'quantity', e.target.value)} />
                      {expenseItemRows.length > 1 && (
                        <button type="button" className="budget-modal-item-del-btn" aria-label={`Remove Item ${index + 1}`} onClick={() => removeItemRow(index)}>
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="budget-modal-items-footer">
                  <button type="button" className="budget-modal-add-item-btn" onClick={addItemRow}>
                    <CirclePlus size={16} /><span>Add item</span>
                  </button>

                  <div className="budget-modal-cost-wrap" style={{ flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label htmlFor="modal-expense-cost" className="budget-modal-cost-label">Total Cost:</label>
                      <input id="modal-expense-cost" type="number" min="0.01" step={displayCurrency === 'JPY' ? '1' : '0.01'} required placeholder={`${currentSymbol} 0.00`} className="budget-modal-gradient-input budget-modal-cost-input" value={expenseCost} onChange={(e) => setExpenseCost(e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <span className="budget-modal-section-title">Category</span>
                <div className="budget-modal-cat-grid">
                  <div className="budget-modal-cat-row">
                    <button type="button" className={`budget-modal-cat-pill cat-accomodation ${expenseCategory === 'Accomodation' ? 'active' : ''}`} style={expenseCategory === 'Accomodation' ? { backgroundColor: '#C5283D' } : undefined} onClick={() => setExpenseCategory('Accomodation')}>Accomodation</button>
                    <button type="button" className={`budget-modal-cat-pill cat-transportation ${expenseCategory === 'Transport' ? 'active' : ''}`} style={expenseCategory === 'Transport' ? { backgroundColor: '#E9724C' } : undefined} onClick={() => setExpenseCategory('Transport')}>Transportation</button>
                    <button type="button" className={`budget-modal-cat-pill cat-activities ${expenseCategory === 'Activities' ? 'active' : ''}`} style={expenseCategory === 'Activities' ? { backgroundColor: '#FFC857' } : undefined} onClick={() => setExpenseCategory('Activities')}>Activities</button>
                  </div>
                  <div className="budget-modal-cat-row">
                    <button type="button" className={`budget-modal-cat-pill cat-dining ${expenseCategory === 'Eat & Drink' ? 'active' : ''}`} style={expenseCategory === 'Eat & Drink' ? { backgroundColor: '#255F85' } : undefined} onClick={() => setExpenseCategory('Eat & Drink')}>Eat & Drink</button>
                    <button type="button" className={`budget-modal-cat-pill cat-other ${expenseCategory === 'Other' ? 'active' : ''}`} style={expenseCategory === 'Other' ? { backgroundColor: '#8E8E93' } : undefined} onClick={() => setExpenseCategory('Other')}>Other</button>
                  </div>
                </div>
              </div>

              <button type="submit" className="budget-modal-primary-btn">Add Expense</button>
            </form>
          </div>
        </div>
      )}

      {isAddBalanceOpen && (
        <div className="budget-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-add-balance-title">
          <div className="budget-modal-card">
            <button type="button" className="budget-modal-close-btn" aria-label="Close modal" onClick={() => setIsAddBalanceOpen(false)}>
              <X size={18} />
            </button>

            <form onSubmit={handleAddBalanceSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <h3 id="modal-add-balance-title" className="budget-modal-section-title">Your Current Balance</h3>
                <div className="budget-balance-current-display">
                  {formatCurrency(convertedBalance, displayCurrency)}
                  {displayCurrency !== 'PHP' && (
                    <div style={{ fontSize: '12px', fontWeight: 400, color: 'rgba(0, 0, 0, 0.45)', marginTop: '2px' }}>
                      (₱{budget.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} base)
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="modal-balance-amount" className="budget-modal-section-title">Additional Balance ({displayCurrency})</label>
                <input id="modal-balance-amount" type="number" min="0.01" step={displayCurrency === 'JPY' ? '1' : '0.01'} required placeholder={`Amount in ${displayCurrency} (${currentSymbol})`} className="budget-modal-gradient-input budget-balance-input" value={balanceInput} onChange={(e) => setBalanceInput(e.target.value)} />
                <span className="budget-balance-helper">Any additional balance entered will be automatically added to your current total balance.</span>
              </div>

              <button type="submit" className="budget-modal-primary-btn" style={{ marginTop: '20px' }}>Add Balance</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}