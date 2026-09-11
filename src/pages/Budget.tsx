import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import {
  ChevronDown,
  Plus,
  Trash2,
  BedDouble,
  Bus,
  Activity,
  Utensils,
  Info,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { Trip } from '../types/trip';
import addMembersIcon from '../assets/add-members.png';
import { tripsApi } from '../services/api';
import { mergeTripWithExtras } from '../lib/tripExtras';

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

const CATEGORY_COLORS = {
  Accommodation: '#C5283D',
  Transport: '#E9724C',
  Activities: '#FFC857',
  'Eat & Drink': '#255F85',
  Other: '#8E8E93',
};

const CATEGORY_ICONS = {
  Accommodation: <BedDouble size={14} />,
  Transport: <Bus size={14} />,
  Activities: <Activity size={14} />,
  'Eat & Drink': <Utensils size={14} />,
  Other: <Info size={14} />,
};

const CATEGORIES = Object.keys(CATEGORY_COLORS);

export function Budget() {
  const { tripId } = useParams<{ tripId: string }>();
  const budgetKey = `lakbye_budget_${tripId}`;
  const { user } = useAuth();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [budget, setBudget] = useState<BudgetData>(() => {
    // Load budget data from localStorage on initial render (stays local — no backend)
    try {
      const stored = localStorage.getItem(budgetKey);
      if (stored) return JSON.parse(stored) as BudgetData;
    } catch {
      // Corrupted data — use defaults
    }
    return { balance: 0, expenses: [] };
  });

  // Fetch trip from backend (header display only — budget data stays localStorage)
  useEffect(() => {
    if (!user || !tripId) return;

    let cancelled = false;

    const fetchTrip = async () => {
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
    };

    fetchTrip();

    return () => {
      cancelled = true;
    };
  }, [user, tripId]);

  const saveBudget = (newData: BudgetData) => {
    setBudget(newData);
    localStorage.setItem(budgetKey, JSON.stringify(newData));
  };

  const addBalance = () => {
    const amountStr = prompt('Enter amount to add to balance:');
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) return;

    saveBudget({
      ...budget,
      balance: budget.balance + amount,
    });
  };

  const addExpense = () => {
    const name = prompt('Expense name:');
    if (!name) return;
    const costStr = prompt('Cost:');
    if (!costStr) return;
    const cost = parseFloat(costStr);
    if (isNaN(cost) || cost <= 0) return;

    const newExpense: Expense = {
      id: Date.now().toString(),
      name,
      items: 1, // Defaulting to 1 item for simplicity
      category: 'Other', // Default category
      cost,
      date: new Date().toISOString().split('T')[0],
    };

    saveBudget({
      ...budget,
      expenses: [...budget.expenses, newExpense],
    });
  };

  const deleteExpense = (id: string) => {
    saveBudget({
      ...budget,
      expenses: budget.expenses.filter((e) => e.id !== id),
    });
  };

  const updateExpenseCategory = (id: string, newCategory: string) => {
    saveBudget({
      ...budget,
      expenses: budget.expenses.map((e) =>
        e.id === id ? { ...e, category: newCategory } : e,
      ),
    });
  };

  // Calculate totals per category for the pie chart
  const categoryTotals = CATEGORIES.map((cat) => ({
    name: cat,
    value: budget.expenses
      .filter((e) => e.category === cat)
      .reduce((sum, e) => sum + e.cost, 0),
  })).filter((c) => c.value > 0);

  // If no expenses, show a placeholder gray slice
  const chartData =
    categoryTotals.length > 0 ? categoryTotals : [{ name: 'Empty', value: 1 }];

  const totalSpent = budget.expenses.reduce((sum, e) => sum + e.cost, 0);

  if (!trip) {
    return (
      <div className="workspace-page">
        <div className="workspace-main-card">Loading...</div>
      </div>
    );
  }

  return (
    <div className="workspace-page">
      {/* Header Card (Reusing Planner shell) */}
      <header className="workspace-header-card animate-slide-up">
        <h1 className="workspace-trip-title">{trip.name}</h1>
        <div className="workspace-header-actions">
          <button className="workspace-pill-members">
            <img src={addMembersIcon} alt="" className="workspace-add-members-icon" />
            Add Members
          </button>
          <button className="workspace-pill-date">
            {trip.startDate} - {trip.endDate}
          </button>
          <button className="workspace-share-btn">Share</button>
        </div>
      </header>

      {/* Main Content Card */}
      <div
        className="workspace-main-card"
        style={{ display: 'flex', minHeight: '618px', padding: 0 }}
      >
        {/* LEFT ZONE: Budget Chart */}
        <div
          style={{
            flex: '0 0 243px',
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '32px',
            }}
          >
            <h2
              style={{
                fontSize: '32px',
                fontWeight: 600,
                margin: 0,
                fontFamily: 'SF Pro Rounded, sans-serif',
              }}
            >
              Budget
            </h2>
            <div
              className="input-gradient-border"
              style={{
                padding: '8px 16px',
                borderRadius: '100px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontWeight: 600 }}>PHP</span>
              <ChevronDown size={16} />
            </div>
          </div>

          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '180px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: '32px',
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  stroke="none"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.name === 'Empty'
                          ? '#E5E5EA'
                          : CATEGORY_COLORS[entry.name as keyof typeof CATEGORY_COLORS]
                      }
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div
              style={{
                position: 'absolute',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--color-neutral-500)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Total Expenses
              </div>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  fontFamily: 'SF Pro Rounded, sans-serif',
                }}
              >
                ₱{totalSpent.toLocaleString()}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {CATEGORIES.map((cat) => (
              <div
                key={cat}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '135px',
                  height: '24px',
                  backgroundColor: CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS],
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#fff',
                  margin: '0 auto',
                }}
              >
                {CATEGORY_ICONS[cat as keyof typeof CATEGORY_ICONS]}
                {cat}
              </div>
            ))}
          </div>
        </div>

        {/* Vertical Divider */}
        <div className="workspace-vertical-divider"></div>

        {/* RIGHT ZONE: Balance & Table */}
        <div style={{ flex: '1 1 0%', padding: '32px', minWidth: '400px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '32px',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '14px',
                  color: 'var(--color-neutral-500)',
                  fontWeight: 600,
                  letterSpacing: '0.5px',
                }}
              >
                YOUR BALANCE
              </div>
              <div
                style={{
                  fontSize: '48px',
                  fontWeight: 700,
                  fontFamily: 'SF Pro Rounded, sans-serif',
                  lineHeight: 1,
                }}
              >
                ₱{budget.balance.toLocaleString()}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div
                className="input-gradient-border"
                style={{ padding: '0', borderRadius: '100px' }}
              >
                <button
                  onClick={addBalance}
                  style={{
                    height: '46px',
                    padding: '0 24px',
                    borderRadius: '100px',
                    fontWeight: 600,
                    border: 'none',
                    background: '#fff',
                    color: 'var(--color-neutral-900)',
                    cursor: 'pointer',
                  }}
                >
                  Add Balance
                </button>
              </div>
              <button
                className="modal-cta-btn"
                onClick={addExpense}
                style={{
                  width: 'auto',
                  padding: '0 24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  height: '48px',
                  margin: 0,
                }}
              >
                <Plus size={18} />
                Add Expense
              </button>
            </div>
          </div>

          <div
            className="workspace-itinerary-table"
            style={{ marginTop: '0', border: 'none' }}
          >
            <div
              className="workspace-table-header-row"
              style={{
                gridTemplateColumns: '2fr 1fr 2fr 1.5fr 1fr 40px',
                padding: '16px 8px',
              }}
            >
              <div className="workspace-col-destination">Name</div>
              <div className="workspace-col-nights">Items</div>
              <div className="workspace-col-accommodation">Category</div>
              <div className="workspace-col-activities">Date</div>
              <div
                className="workspace-col-transportation"
                style={{ textAlign: 'right' }}
              >
                Cost
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button
                  onClick={addExpense}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Plus size={16} color="var(--color-neutral-500)" />
                </button>
              </div>
            </div>

            <div
              className="workspace-destination-rows"
              style={{ overflowY: 'auto', maxHeight: '400px' }}
            >
              {budget.expenses.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '48px 0',
                    color: 'var(--color-neutral-500)',
                  }}
                >
                  No expenses yet. Add one above.
                </div>
              ) : (
                budget.expenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="workspace-destination-row"
                    style={{
                      gridTemplateColumns: '2fr 1fr 2fr 1.5fr 1fr 40px',
                      padding: '16px 8px',
                      cursor: 'default',
                    }}
                  >
                    <div className="workspace-col-destination font-semibold text-slate-800 truncate">
                      {expense.name}
                    </div>
                    <div className="workspace-col-nights text-slate-600">
                      {expense.items} item(s)
                    </div>
                    <div className="workspace-col-accommodation">
                      <select
                        value={expense.category}
                        onChange={(e) =>
                          updateExpenseCategory(expense.id, e.target.value)
                        }
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          border: '1px solid var(--color-neutral-200)',
                          backgroundColor: 'transparent',
                          fontSize: '13px',
                          fontFamily: 'inherit',
                          width: '100%',
                        }}
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="workspace-col-activities text-slate-600 truncate">
                      {expense.date || '-'}
                    </div>
                    <div
                      className="workspace-col-transportation font-semibold text-slate-800"
                      style={{ textAlign: 'right' }}
                    >
                      ₱{expense.cost.toLocaleString()}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <button
                        onClick={() => deleteExpense(expense.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--color-neutral-400)',
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
