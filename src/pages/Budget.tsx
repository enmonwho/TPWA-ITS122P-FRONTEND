import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Trash2, X, CirclePlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { Trip } from '../types/trip';
import addMembersIcon from '../assets/add-members.png';
import { tripsApi, budgetApi } from '../services/api';
import { mergeTripWithExtras, formatDateOnly } from '../lib/tripExtras';

// Figma Icons downloaded directly from Node 578:10
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

// Categories ordered and colored exactly as specified in Figma node 578:10
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
  return found || BUDGET_CATEGORIES[4]; // Default to Other
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
      // Corrupted data — fallback to defaults
    }
    return { balance: 0, expenses: [] };
  });

  // Modal States
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isAddBalanceOpen, setIsAddBalanceOpen] = useState(false);

  // Form Inputs
  const [expenseName, setExpenseName] = useState('');
  const [expenseItemRows, setExpenseItemRows] = useState<
    { name: string; quantity: string }[]
  >([
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

  // Fetch trip details & backend budget data
  useEffect(() => {
    if (!user || !tripId) return;

    let cancelled = false;

    const fetchData = async () => {
      try {
        const apiTrip = await tripsApi.getTrip(tripId);
        if (!cancelled) {
          setTrip(mergeTripWithExtras(apiTrip));
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to fetch trip for budget:', err);
        }
      }

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
      } catch (err) {
        if (!cancelled) {
          console.warn(
            'Backend budget fetch failed or not yet initialized, using local fallback:',
            err,
          );
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [user, tripId, budgetKey]);

  // Close modals on Escape key
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
    const amount = parseFloat(balanceInput);
    if (isNaN(amount) || amount <= 0) return;

    const optimisticBalance = Math.round((budget.balance + amount) * 100) / 100;
    saveBudget({
      ...budget,
      balance: optimisticBalance,
    });

    setBalanceInput('');
    setIsAddBalanceOpen(false);

    if (tripId) {
      try {
        const res = await budgetApi.addBalance(tripId, amount);
        if (res && typeof res.balance === 'number') {
          setBudget((prev) => {
            const reconciled = { ...prev, balance: res.balance };
            localStorage.setItem(budgetKey, JSON.stringify(reconciled));
            return reconciled;
          });
        }
      } catch (err) {
        console.warn('Backend addBalance failed, kept local state:', err);
      }
    }
  };

  const handleAddExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseName.trim()) return;
    const cost = parseFloat(expenseCost);
    if (isNaN(cost) || cost <= 0) return;

    const totalItems =
      expenseItemRows.reduce((sum, r) => sum + (parseInt(r.quantity, 10) || 0), 0) || 1;

    const tempId = `temp-${Date.now()}`;
    const newExpense: Expense = {
      id: tempId,
      name: expenseName.trim(),
      items: totalItems,
      category: expenseCategory,
      cost,
      date: new Date().toISOString().split('T')[0],
    };

    saveBudget({
      ...budget,
      balance: Math.round((budget.balance - cost) * 100) / 100,
      expenses: [...budget.expenses, newExpense],
    });

    setExpenseName('');
    setExpenseItemRows([
      { name: '', quantity: '1' },
      { name: '', quantity: '1' },
    ]);
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
      } catch (err) {
        console.warn('Backend addExpense failed, kept local state:', err);
      }
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
      } catch (err) {
        console.warn('Backend deleteExpense failed, kept local state:', err);
      }
    }
  };

  // Calculate totals per category for donut chart
  const categoryTotals = BUDGET_CATEGORIES.map((cat) => {
    const val = budget.expenses
      .filter((e) => {
        const normExp = e.category.toLowerCase().replace(/m+/, 'm');
        const normCat = cat.name.toLowerCase().replace(/m+/, 'm');
        return normExp === normCat;
      })
      .reduce((sum, e) => sum + e.cost, 0);

    return {
      name: cat.name,
      value: val,
      color: cat.color,
    };
  }).filter((c) => c.value > 0);

  const totalSpent = budget.expenses.reduce((sum, e) => sum + e.cost, 0);
  const formattedSpent = `₱${totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // If no expenses, show light gray placeholder circle
  const chartData =
    categoryTotals.length > 0
      ? categoryTotals
      : [{ name: 'Empty', value: 1, color: '#E5E5EA' }];

  if (!trip) {
    return (
      <div className="workspace-page">
        <div
          className="workspace-main-card"
          style={{ padding: '40px', textAlign: 'center' }}
        >
          Loading workspace...
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-page">
      {/* Top Header Card (Reusing Planner/Settings shell) */}
      <header className="workspace-header-card animate-slide-up">
        <h1 className="workspace-trip-title">{trip.name}</h1>
        <div className="workspace-header-actions">
          <button className="workspace-pill-members">
            <img src={addMembersIcon} alt="" className="workspace-add-members-icon" />
            Add Members
          </button>
          <button className="workspace-pill-date">
            {formatDateOnly(trip.startDate)} - {formatDateOnly(trip.endDate)}
          </button>
        </div>
      </header>

      {/* Main Budget Card — Exact Figma Structure */}
      <div className="budget-main-card animate-slide-up delay-150">
        {/* ================================================================ */}
        {/* LEFT ZONE: Budget Analytics & Categories (327px)                 */}
        {/* ================================================================ */}
        <div className="budget-left-zone">
          <div className="budget-left-header">
            <h2 className="budget-title">Budget</h2>
            <div className="budget-currency-pill" title="Currency">
              <span>PHP</span>
              <img src={arrowDownIcon} alt="" className="budget-currency-arrow" />
            </div>
          </div>

          {/* Donut Chart with Animated Sweep & Centered Total Expenses */}
          <div className="budget-donut-container">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  key={`donut-wheel-${budget.expenses.length}-${Math.round(totalSpent)}`}
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
                key={`amount-${totalSpent}`}
                className="budget-donut-amount"
                style={{ fontSize: getDonutFontSize(formattedSpent.length) }}
              >
                {formattedSpent}
              </div>
              <div className="budget-donut-label">total{'\n'}expenses</div>
            </div>
          </div>

          {/* By Category Subtitle */}
          <div className="budget-category-header">BY CATEGORY</div>

          {/* Category Badges (Pills) */}
          <div className="budget-category-list">
            {BUDGET_CATEGORIES.map((cat) => (
              <div
                key={cat.name}
                className="budget-category-badge"
                style={{ backgroundColor: cat.color }}
              >
                <img src={cat.icon} alt="" className="budget-category-icon" />
                <span>{cat.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Vertical Divider */}
        <div className="budget-vertical-divider" />

        {/* ================================================================ */}
        {/* RIGHT ZONE: Hero Balance & Expenses Table                        */}
        {/* ================================================================ */}
        <div className="budget-right-zone">
          {/* Centered Balance Hero Section */}
          <div className="budget-hero-section">
            <div className="budget-balance-amount">
              ₱
              {budget.balance.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div className="budget-balance-label">YOUR BALANCE</div>

            {/* Action Buttons: Add Expense & Add Balance */}
            <div className="budget-action-buttons">
              <button
                type="button"
                className="budget-btn-add-expense"
                onClick={() => setIsAddExpenseOpen(true)}
              >
                <CirclePlus size={20} color="#ffffff" strokeWidth={2.2} />
                <span>Add Expense</span>
              </button>

              <button
                type="button"
                className="budget-btn-add-balance"
                onClick={() => setIsAddBalanceOpen(true)}
              >
                <CirclePlus size={20} color="rgba(72, 42, 19, 0.85)" strokeWidth={2.2} />
                <span>Add Balance</span>
              </button>
            </div>
          </div>

          {/* Expenses Table */}
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
                  No expenses recorded yet. Click <strong>Add Expense</strong> to start
                  tracking!
                </div>
              ) : (
                budget.expenses.map((expense) => {
                  const catConfig = getCategoryConfig(expense.category);
                  return (
                    <div key={expense.id} className="budget-table-row">
                      <div style={{ fontWeight: 600 }}>{expense.name}</div>
                      <div style={{ color: 'rgba(0, 0, 0, 0.7)' }}>
                        {expense.items || 1}
                      </div>
                      <div>
                        <span
                          className="budget-row-category-badge"
                          style={{ backgroundColor: catConfig.color }}
                        >
                          <img
                            src={catConfig.icon}
                            alt=""
                            style={{
                              width: '13px',
                              height: '13px',
                              objectFit: 'contain',
                            }}
                          />
                          <span>{catConfig.name}</span>
                        </span>
                      </div>
                      <div style={{ fontWeight: 600 }}>
                        ₱
                        {expense.cost.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                      <button
                        type="button"
                        className="budget-row-delete-btn"
                        title="Delete Expense"
                        onClick={() => deleteExpense(expense.id)}
                      >
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

      {/* ================================================================ */}
      {/* MODAL: Add Expense (Exact Figma Node 537:285)                     */}
      {/* ================================================================ */}
      {isAddExpenseOpen && (
        <div
          className="budget-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-add-expense-title"
        >
          <div className="budget-modal-card">
            <h2 id="modal-add-expense-title" className="sr-only">
              Add Expense
            </h2>
            <button
              type="button"
              className="budget-modal-close-btn"
              aria-label="Close modal"
              onClick={() => setIsAddExpenseOpen(false)}
            >
              <X size={18} />
            </button>

            <form
              onSubmit={handleAddExpenseSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              {/* Section 1: Where did you spend? */}
              <div>
                <label
                  htmlFor="modal-expense-vendor"
                  className="budget-modal-section-title"
                >
                  Where did you spend?
                </label>
                <input
                  id="modal-expense-vendor"
                  type="text"
                  required
                  placeholder="Name of shop, restaurant..."
                  className="budget-modal-gradient-input budget-modal-vendor-input"
                  value={expenseName}
                  onChange={(e) => setExpenseName(e.target.value)}
                />
              </div>

              {/* Section 2: Items spent on */}
              <div>
                <span className="budget-modal-section-title">Items spent on</span>
                <div className="budget-modal-items-list">
                  {expenseItemRows.map((item, index) => (
                    <div key={index} className="budget-modal-item-row">
                      <span className="budget-modal-item-label">Item {index + 1}</span>
                      <label htmlFor={`modal-item-name-${index}`} className="sr-only">
                        Item {index + 1} Name
                      </label>
                      <input
                        id={`modal-item-name-${index}`}
                        type="text"
                        placeholder="Name"
                        className="budget-modal-gradient-input budget-modal-item-name"
                        value={item.name}
                        onChange={(e) => updateItemRow(index, 'name', e.target.value)}
                      />
                      <label htmlFor={`modal-item-qty-${index}`} className="sr-only">
                        Item {index + 1} Quantity
                      </label>
                      <input
                        id={`modal-item-qty-${index}`}
                        type="number"
                        min="1"
                        placeholder="Quantity"
                        className="budget-modal-gradient-input budget-modal-item-qty"
                        value={item.quantity}
                        onChange={(e) => updateItemRow(index, 'quantity', e.target.value)}
                      />
                      {expenseItemRows.length > 1 && (
                        <button
                          type="button"
                          className="budget-modal-item-del-btn"
                          aria-label={`Remove Item ${index + 1}`}
                          onClick={() => removeItemRow(index)}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="budget-modal-items-footer">
                  <button
                    type="button"
                    className="budget-modal-add-item-btn"
                    onClick={addItemRow}
                  >
                    <CirclePlus size={16} />
                    <span>Add item</span>
                  </button>

                  <div className="budget-modal-cost-wrap">
                    <label
                      htmlFor="modal-expense-cost"
                      className="budget-modal-cost-label"
                    >
                      Total Cost:
                    </label>
                    <input
                      id="modal-expense-cost"
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      placeholder="₱ 0.00"
                      className="budget-modal-gradient-input budget-modal-cost-input"
                      value={expenseCost}
                      onChange={(e) => setExpenseCost(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Category */}
              <div>
                <span className="budget-modal-section-title">Category</span>
                <div className="budget-modal-cat-grid">
                  {/* Row 1: Accomodation, Transportation, Activities */}
                  <div className="budget-modal-cat-row">
                    <button
                      type="button"
                      className={`budget-modal-cat-pill cat-accomodation ${expenseCategory === 'Accomodation' ? 'active' : ''}`}
                      style={
                        expenseCategory === 'Accomodation'
                          ? { backgroundColor: '#C5283D' }
                          : undefined
                      }
                      onClick={() => setExpenseCategory('Accomodation')}
                    >
                      Accomodation
                    </button>
                    <button
                      type="button"
                      className={`budget-modal-cat-pill cat-transportation ${expenseCategory === 'Transport' ? 'active' : ''}`}
                      style={
                        expenseCategory === 'Transport'
                          ? { backgroundColor: '#E9724C' }
                          : undefined
                      }
                      onClick={() => setExpenseCategory('Transport')}
                    >
                      Transportation
                    </button>
                    <button
                      type="button"
                      className={`budget-modal-cat-pill cat-activities ${expenseCategory === 'Activities' ? 'active' : ''}`}
                      style={
                        expenseCategory === 'Activities'
                          ? { backgroundColor: '#FFC857' }
                          : undefined
                      }
                      onClick={() => setExpenseCategory('Activities')}
                    >
                      Activities
                    </button>
                  </div>

                  {/* Row 2: Eat & Drink, Other */}
                  <div className="budget-modal-cat-row">
                    <button
                      type="button"
                      className={`budget-modal-cat-pill cat-dining ${expenseCategory === 'Eat & Drink' ? 'active' : ''}`}
                      style={
                        expenseCategory === 'Eat & Drink'
                          ? { backgroundColor: '#255F85' }
                          : undefined
                      }
                      onClick={() => setExpenseCategory('Eat & Drink')}
                    >
                      Eat & Drink
                    </button>
                    <button
                      type="button"
                      className={`budget-modal-cat-pill cat-other ${expenseCategory === 'Other' ? 'active' : ''}`}
                      style={
                        expenseCategory === 'Other'
                          ? { backgroundColor: '#8E8E93' }
                          : undefined
                      }
                      onClick={() => setExpenseCategory('Other')}
                    >
                      Other
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button type="submit" className="budget-modal-primary-btn">
                Add Expense
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* MODAL: Add Balance (Exact Figma Node 537:465)                     */}
      {/* ================================================================ */}
      {isAddBalanceOpen && (
        <div
          className="budget-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-add-balance-title"
        >
          <div className="budget-modal-card">
            <button
              type="button"
              className="budget-modal-close-btn"
              aria-label="Close modal"
              onClick={() => setIsAddBalanceOpen(false)}
            >
              <X size={18} />
            </button>

            <form
              onSubmit={handleAddBalanceSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
            >
              <div>
                <h3 id="modal-add-balance-title" className="budget-modal-section-title">
                  Your Current Balance
                </h3>
                <div className="budget-balance-current-display">
                  ₱
                  {budget.balance.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>

              <div>
                <label
                  htmlFor="modal-balance-amount"
                  className="budget-modal-section-title"
                >
                  Additional Balance
                </label>
                <input
                  id="modal-balance-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  placeholder="Enter an amount"
                  className="budget-modal-gradient-input budget-balance-input"
                  value={balanceInput}
                  onChange={(e) => setBalanceInput(e.target.value)}
                />
                <span className="budget-balance-helper">
                  Any additional balance entered will be automatically added to your
                  current total balance.
                </span>
              </div>

              <button
                type="submit"
                className="budget-modal-primary-btn"
                style={{ marginTop: '20px' }}
              >
                Add Balance
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
