import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import {
  CirclePlus,
  Download,
  Trash2,
  X,
  Check,
  Package,
  Sparkles,
  Shirt,
  FolderOpen,
  Smartphone,
  Star,
  MoreHorizontal,
  Plus,
  Minus,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { tripsApi } from '../services/api';
import { mergeTripWithExtras, formatTripDateRange } from '../lib/tripExtras';
import type { Trip } from '../types/trip';
import arrowDownIcon from '../assets/budget/arrow_down.png';

export type PackingCategory =
  'Essentials' | 'Clothing' | 'Toiletries' | 'Electronics' | 'Documents' | 'Other';

export interface PackingItem {
  id: string;
  name: string;
  qty: number;
  packed: boolean;
  category: PackingCategory;
  destination?: string; // 'Overall Trip' | 'Country: Japan' | 'Place: Tokyo' | custom
}

interface CategoryConfig {
  name: PackingCategory | 'All Items';
  color: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const CATEGORY_CONFIGS: CategoryConfig[] = [
  { name: 'All Items', color: '#475569', icon: Package },
  { name: 'Essentials', color: '#E9724C', icon: Star },
  { name: 'Clothing', color: '#255F85', icon: Shirt },
  { name: 'Toiletries', color: '#10B981', icon: Sparkles },
  { name: 'Electronics', color: '#7C3AED', icon: Smartphone },
  { name: 'Documents', color: '#C5283D', icon: FolderOpen },
  { name: 'Other', color: '#8E8E93', icon: MoreHorizontal },
];

function getCategoryColor(cat: string): string {
  const found = CATEGORY_CONFIGS.find((c) => c.name.toLowerCase() === cat.toLowerCase());
  return found ? found.color : '#8E8E93';
}

const QUICK_SUGGESTIONS = [
  { name: 'Passport & ID', category: 'Essentials' as PackingCategory },
  { name: 'Underwear & Socks', category: 'Clothing' as PackingCategory },
  { name: 'Toothbrush & Paste', category: 'Toiletries' as PackingCategory },
  { name: 'Phone Charger', category: 'Electronics' as PackingCategory },
  { name: 'Boarding Passes', category: 'Documents' as PackingCategory },
  { name: 'Personal Medication', category: 'Essentials' as PackingCategory },
];

export default function TripPacking() {
  const { tripId } = useParams<{ tripId: string }>();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);

  const [activeCategory, setActiveCategory] = useState<string>('All Items');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Unpacked' | 'Packed'>('All');
  const [scopeFilter, setScopeFilter] = useState<string>('All');

  // Destination / Place / Country options loaded from planner
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [availablePlaces, setAvailablePlaces] = useState<
    { name: string; country?: string }[]
  >([]);

  const [items, setItems] = useState<PackingItem[]>([]);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemCategory, setNewItemCategory] = useState<PackingCategory>('Essentials');
  const [newItemScope, setNewItemScope] = useState<string>('Overall Trip');

  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportSuccess, setIsExportSuccess] = useState(false);

  // Storage key scoped to this trip
  const storageKey = `lakbye_packing_${tripId}`;

  // Load trip and persistent packing items (Starts EMPTY - never forces 21 items)
  useEffect(() => {
    if (!tripId) return;

    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      try {
        const apiTrip = await tripsApi.getTrip(tripId);
        if (cancelled) return;

        const merged = mergeTripWithExtras(apiTrip);
        setTrip(merged);

        // Load items from localStorage
        const raw = localStorage.getItem(storageKey);
        let loadedItems: PackingItem[] = [];
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              // If the saved data was the legacy 21 dummy items with all unpacked, reset to empty
              const isLegacy21Dummy =
                parsed.length === 21 &&
                parsed.every((it) => !it.packed) &&
                parsed[0]?.name === 'Passport / Government ID' &&
                parsed[20]?.name === 'First Aid Kit & Personal Medication';

              if (!isLegacy21Dummy) {
                loadedItems = parsed;
              }
            }
          } catch {
            loadedItems = [];
          }
        }

        setItems(loadedItems);
      } catch (err) {
        console.error('Failed to load trip for packing list:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [tripId, storageKey]);

  // Load available countries and places from Trip and Planner
  useEffect(() => {
    if (!tripId) return;

    try {
      const countrySet = new Set<string>();
      if (trip?.countries) {
        trip.countries.forEach((c) => c && countrySet.add(c.trim()));
      }

      // Check extra countries added in Route Planner
      const extraCountriesRaw = localStorage.getItem(
        `lakbye_workspace_countries_${tripId}`,
      );
      if (extraCountriesRaw) {
        try {
          const parsed = JSON.parse(extraCountriesRaw);
          if (Array.isArray(parsed)) {
            parsed.forEach((c: string) => c && countrySet.add(c.trim()));
          }
        } catch {
          // ignore
        }
      }

      // Check destinations added in Route Planner
      const destsRaw = localStorage.getItem(`lakbye_workspace_dests_${tripId}`);
      const placesList: { name: string; country?: string }[] = [];
      if (destsRaw) {
        try {
          const dests = JSON.parse(destsRaw);
          if (Array.isArray(dests)) {
            dests.forEach((d: any) => {
              if (d.country) countrySet.add(d.country.trim());
              if (d.name && d.name.trim() !== d.country?.trim()) {
                placesList.push({
                  name: d.name.trim(),
                  country: d.country?.trim(),
                });
              }
            });
          }
        } catch {
          // ignore
        }
      }

      setAvailableCountries(Array.from(countrySet));
      setAvailablePlaces(placesList);
    } catch {
      // ignore
    }
  }, [tripId, trip?.countries]);

  // Persist items on change
  const saveItems = (updated: PackingItem[]) => {
    setItems(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to persist packing items:', err);
    }
  };

  const togglePacked = (id: string) => {
    saveItems(
      items.map((item) => (item.id === id ? { ...item, packed: !item.packed } : item)),
    );
  };

  const updateQty = (id: string, delta: number) => {
    saveItems(
      items.map((item) =>
        item.id === id ? { ...item, qty: Math.max(1, item.qty + delta) } : item,
      ),
    );
  };

  const deleteItem = (id: string) => {
    saveItems(items.filter((item) => item.id !== id));
  };

  const handleAddItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const newItem: PackingItem = {
      id: `item-${Date.now()}`,
      name: newItemName.trim(),
      qty: Math.max(1, newItemQty),
      packed: false,
      category: newItemCategory,
      destination: newItemScope,
    };

    saveItems([...items, newItem]);
    setNewItemName('');
    setNewItemQty(1);
    setIsAddItemOpen(false);
  };

  const handleAddEssentialsPreset = () => {
    const starterItems: PackingItem[] = [
      {
        id: `preset-1-${Date.now()}`,
        name: 'Passport & Government ID',
        qty: 1,
        packed: false,
        category: 'Essentials',
        destination: 'Overall Trip',
      },
      {
        id: `preset-2-${Date.now()}`,
        name: 'Credit Cards & Cash',
        qty: 1,
        packed: false,
        category: 'Essentials',
        destination: 'Overall Trip',
      },
      {
        id: `preset-3-${Date.now()}`,
        name: 'Underwear & Daily Clothes',
        qty: Math.max(2, trip?.nights || 3),
        packed: false,
        category: 'Clothing',
        destination: 'Overall Trip',
      },
      {
        id: `preset-4-${Date.now()}`,
        name: 'Toothbrush & Toiletries',
        qty: 1,
        packed: false,
        category: 'Toiletries',
        destination: 'Overall Trip',
      },
      {
        id: `preset-5-${Date.now()}`,
        name: 'Phone Charger & Power Bank',
        qty: 1,
        packed: false,
        category: 'Electronics',
        destination: 'Overall Trip',
      },
    ];

    saveItems([...items, ...starterItems]);
  };

  // Calculations
  const totalItemsCount = items.length;
  const packedItemsCount = items.filter((i) => i.packed).length;
  const remainingCount = totalItemsCount - packedItemsCount;
  const progressPercent =
    totalItemsCount > 0 ? Math.round((packedItemsCount / totalItemsCount) * 100) : 0;

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { 'All Items': items.length };
    CATEGORY_CONFIGS.forEach((c) => {
      if (c.name !== 'All Items') {
        counts[c.name] = items.filter((i) => i.category === c.name).length;
      }
    });
    return counts;
  }, [items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Category filter
      if (activeCategory !== 'All Items' && item.category !== activeCategory) {
        return false;
      }
      // Status filter
      if (statusFilter === 'Packed' && !item.packed) return false;
      if (statusFilter === 'Unpacked' && item.packed) return false;
      // Scope filter
      if (scopeFilter !== 'All') {
        const itemScope = item.destination || 'Overall Trip';
        if (scopeFilter === 'Overall Trip' && itemScope !== 'Overall Trip') return false;
        if (scopeFilter !== 'Overall Trip' && itemScope !== scopeFilter) return false;
      }
      return true;
    });
  }, [items, activeCategory, statusFilter, scopeFilter]);

  // Donut chart data (Clean progress ring)
  const chartData = useMemo(() => {
    if (totalItemsCount === 0) {
      return [{ name: 'Empty', value: 1, color: '#E2E8F0' }];
    }
    const data = [];
    if (packedItemsCount > 0) {
      data.push({ name: 'Packed', value: packedItemsCount, color: '#10B981' });
    }
    if (remainingCount > 0) {
      data.push({ name: 'Remaining', value: remainingCount, color: '#E2E8F0' });
    }
    return data;
  }, [totalItemsCount, packedItemsCount, remainingCount]);

  // Export PDF functionality
  const handleExportPdf = () => {
    if (!trip) return;
    setIsExportingPdf(true);

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const primaryColor: [number, number, number] = [234, 88, 12];
      const darkColor: [number, number, number] = [15, 23, 42];
      const lightGray: [number, number, number] = [248, 250, 252];

      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, 210, 8, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(...darkColor);
      doc.text('LakBye Travel Planner', 15, 22);

      doc.setFontSize(14);
      doc.setTextColor(...primaryColor);
      doc.text('Packing Checklist', 15, 30);

      doc.setFillColor(...lightGray);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(15, 38, 180, 28, 3, 3, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...darkColor);
      doc.text(`Trip: ${trip.name}`, 20, 46);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(71, 85, 105);
      const datesStr =
        trip.startDate && trip.endDate
          ? `${formatTripDateRange(trip.startDate, trip.endDate)} (${trip.nights || 0} nights)`
          : `${trip.nights || 0} nights planned`;
      doc.text(`Travel Dates: ${datesStr}`, 20, 53);
      doc.text(
        `Packing Status: ${packedItemsCount} of ${totalItemsCount} Packed (${progressPercent}%)`,
        20,
        60,
      );

      const tableRows = items.map((item, idx) => [
        (idx + 1).toString(),
        item.category,
        item.name,
        item.destination
          ? item.destination.replace(/^(Country:|Place:)\s*/, '')
          : 'Overall Trip',
        `${item.qty}x`,
        item.packed ? '[ X ] Packed' : '[   ] To Pack',
      ]);

      autoTable(doc, {
        startY: 72,
        head: [
          ['#', 'Category', 'Item Name', 'Scope / Destination', 'Qty', 'Packing Status'],
        ],
        body: tableRows,
        theme: 'striped',
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9.5,
        },
        bodyStyles: {
          fontSize: 9,
          textColor: [30, 41, 59],
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 30, fontStyle: 'bold' },
          2: { cellWidth: 55 },
          3: { cellWidth: 40 },
          4: { cellWidth: 16, halign: 'center' },
          5: { cellWidth: 29, fontStyle: 'bold' },
        },
        margin: { left: 15, right: 15 },
      });

      const safeFilename = `${trip.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_Packing_List.pdf`;
      doc.save(safeFilename);

      setIsExportSuccess(true);
      setTimeout(() => setIsExportSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to generate packing PDF:', err);
      alert('Unable to export packing PDF. Please try again.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-stone-500">
        <Package className="w-10 h-10 animate-bounce text-amber-500" />
        <p className="text-sm font-semibold">Loading packing list...</p>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center">
        <h2 className="text-xl font-bold text-stone-800 mb-2">Trip Not Found</h2>
        <p className="text-stone-500 text-sm mb-4">
          The requested trip could not be loaded.
        </p>
        <Link to="/dashboard" className="btn-lakbye-gradient text-xs py-2 px-4">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="workspace-page">
      {/* Top Header Card (Matching Budget & Workspace design) */}
      <header className="workspace-header-card animate-slide-up">
        <h1 className="workspace-trip-title">{trip.name}</h1>
        <div className="workspace-header-actions">
          <div className="workspace-pill-date">
            {formatTripDateRange(trip.startDate, trip.endDate)}
          </div>
        </div>
      </header>

      {/* Main Card (2-Zone layout normalized to Budget page) */}
      <div className="budget-main-card animate-slide-up delay-150">
        {/* Left Zone: Analytics, Donut Chart, and Category Badges */}
        <div className="budget-left-zone">
          <div className="budget-left-header flex items-center justify-between gap-2 flex-wrap">
            <h2 className="budget-title">Packing</h2>

            {/* Filter Controls (Status & Scope) */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* Status Filter Pill */}
              <div
                className="budget-currency-pill"
                style={{
                  width: '86px',
                  flexShrink: 0,
                  padding: '0 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
                title="Filter by packing status"
              >
                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as 'All' | 'Unpacked' | 'Packed')
                  }
                  className="budget-currency-select"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0,
                    cursor: 'pointer',
                    width: '100%',
                    height: '100%',
                  }}
                >
                  <option value="All">All Status</option>
                  <option value="Unpacked">To Pack</option>
                  <option value="Packed">Packed</option>
                </select>
                <span style={{ pointerEvents: 'none' }} className="truncate max-w-[54px]">
                  {statusFilter === 'All'
                    ? 'All'
                    : statusFilter === 'Unpacked'
                      ? 'To Pack'
                      : 'Packed'}
                </span>
                <img
                  src={arrowDownIcon}
                  alt=""
                  className="budget-currency-arrow"
                  aria-hidden="true"
                  style={{ pointerEvents: 'none' }}
                />
              </div>

              {/* Destination / Scope Filter Pill */}
              <div
                className="budget-currency-pill"
                style={{
                  width: '112px',
                  flexShrink: 0,
                  padding: '0 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
                title="Filter by Country, Place, or Overall Trip"
              >
                <select
                  value={scopeFilter}
                  onChange={(e) => setScopeFilter(e.target.value)}
                  className="budget-currency-select"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0,
                    cursor: 'pointer',
                    width: '100%',
                    height: '100%',
                  }}
                >
                  <option value="All">All Scopes</option>
                  <option value="Overall Trip">Overall Trip</option>
                  {availableCountries.length > 0 && (
                    <optgroup label="Countries">
                      {availableCountries.map((c) => (
                        <option key={`filter-c-${c}`} value={`Country: ${c}`}>
                          Country: {c}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {availablePlaces.length > 0 && (
                    <optgroup label="Places / Cities">
                      {availablePlaces.map((p) => (
                        <option key={`filter-p-${p.name}`} value={`Place: ${p.name}`}>
                          Place: {p.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <span style={{ pointerEvents: 'none' }} className="truncate max-w-[76px]">
                  {scopeFilter === 'All'
                    ? 'Scope: All'
                    : scopeFilter.replace(/^(Country:|Place:)\s*/, '')}
                </span>
                <img
                  src={arrowDownIcon}
                  alt=""
                  className="budget-currency-arrow"
                  aria-hidden="true"
                  style={{ pointerEvents: 'none' }}
                />
              </div>
            </div>
          </div>

          {/* Donut Progress Chart */}
          <div className="budget-donut-container">
            <ResponsiveContainer width={210} height={210} minWidth={210} minHeight={210}>
              <PieChart width={210} height={210} style={{ overflow: 'visible' }}>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={76}
                  outerRadius={98}
                  stroke="none"
                  dataKey="value"
                  isAnimationActive={true}
                  animationDuration={800}
                  startAngle={90}
                  endAngle={-270}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            <div className="budget-donut-center">
              <div className="budget-donut-amount">
                {totalItemsCount === 0 ? '0%' : `${progressPercent}%`}
              </div>
              <div className="budget-donut-label">
                {totalItemsCount === 0
                  ? 'no items\nyet'
                  : `${packedItemsCount} of ${totalItemsCount}\npacked`}
              </div>
            </div>
          </div>

          {/* Category Filter Header */}
          <div className="budget-category-header">BY CATEGORY</div>

          {/* Category Pills (Click to filter) */}
          <div className="budget-category-list">
            {CATEGORY_CONFIGS.map((cat) => {
              const count = categoryCounts[cat.name] || 0;
              const isActive = activeCategory === cat.name;
              const Icon = cat.icon;

              return (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setActiveCategory(cat.name)}
                  className={`budget-category-badge packing-category-badge-btn ${
                    isActive ? 'active' : ''
                  }`}
                  style={{ backgroundColor: cat.color }}
                  title={`Filter by ${cat.name}`}
                >
                  <Icon size={16} className="shrink-0" />
                  <span className="flex-1 text-left">{cat.name}</span>
                  <span className="text-[11px] bg-black/20 px-2 py-0.5 rounded-full font-bold">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Vertical Divider */}
        <div className="budget-vertical-divider" />

        {/* Right Zone: Hero Section, Action Buttons, and Items Table */}
        <div className="budget-right-zone">
          {/* Hero Section */}
          <div className="budget-hero-section">
            <div className="budget-balance-amount">
              {totalItemsCount === 0 ? '0' : `${packedItemsCount} / ${totalItemsCount}`}
            </div>
            <div className="budget-balance-label">
              {totalItemsCount === 0
                ? 'ITEMS PACKED'
                : `${progressPercent}% ITEMS PACKED (${remainingCount} REMAINING)`}
            </div>

            {/* Action Buttons */}
            <div className="budget-action-buttons">
              <button
                type="button"
                className="budget-btn-add-expense"
                onClick={() => setIsAddItemOpen(true)}
              >
                <CirclePlus size={20} color="#ffffff" strokeWidth={2.2} />
                <span>Add Item</span>
              </button>

              <button
                type="button"
                className="budget-btn-add-balance"
                onClick={handleExportPdf}
                disabled={isExportingPdf || items.length === 0}
                style={{
                  opacity: items.length === 0 ? 0.6 : 1,
                  cursor: items.length === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                {isExportSuccess ? (
                  <>
                    <Check size={18} color="#10B981" />
                    <span>PDF Downloaded!</span>
                  </>
                ) : (
                  <>
                    <Download size={18} color="rgba(72, 42, 19, 0.85)" />
                    <span>Export PDF</span>
                  </>
                )}
              </button>
            </div>

            {/* Helpful 1-click Preset Option if 0 items */}
            {items.length === 0 && (
              <div className="mt-8 pt-1 text-center">
                <button
                  type="button"
                  onClick={handleAddEssentialsPreset}
                  className="text-xs font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3.5 py-1.5 rounded-full transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Sparkles size={13} />
                  <span>Optional: Add 5 Travel Essentials to start</span>
                </button>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="budget-table" style={{ marginTop: '36px' }}>
            <div className="packing-table-header">
              <div className="text-center font-bold">Status</div>
              <div className="text-left font-bold pl-2">Item Name & Scope</div>
              <div className="font-bold">Category</div>
              <div className="font-bold">Quantity</div>
              <div className="font-bold">Action</div>
            </div>

            <div className="budget-table-divider" />

            <div className="budget-table-rows" style={{ maxHeight: '420px' }}>
              {filteredItems.length === 0 ? (
                <div className="budget-table-empty">
                  {totalItemsCount === 0 ? (
                    <>
                      No packing items yet. Click <strong>Add Item</strong> to start
                      preparing!
                    </>
                  ) : (
                    <>No items found matching your current filter.</>
                  )}
                </div>
              ) : (
                filteredItems.map((item) => {
                  const catColor = getCategoryColor(item.category);

                  return (
                    <div
                      key={item.id}
                      className="packing-table-row group"
                      onClick={() => togglePacked(item.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      {/* Large, Elderly-Friendly Tap Checkbox */}
                      <div
                        className="flex items-center justify-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePacked(item.id);
                        }}
                      >
                        <button
                          type="button"
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                            item.packed
                              ? 'bg-emerald-500 text-white shadow-xs'
                              : 'border-2 border-stone-300 hover:border-emerald-500 bg-white'
                          }`}
                          title={item.packed ? 'Mark as to pack' : 'Mark as packed'}
                          aria-label={item.packed ? 'Mark as to pack' : 'Mark as packed'}
                        >
                          {item.packed && <Check size={16} strokeWidth={3} />}
                        </button>
                      </div>

                      {/* Item Name & Destination Tag */}
                      <div className="text-left pl-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`font-semibold text-base transition-colors ${
                              item.packed
                                ? 'line-through text-stone-400 font-normal'
                                : 'text-stone-900'
                            }`}
                          >
                            {item.name}
                          </span>
                          {item.destination && item.destination !== 'Overall Trip' ? (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
                              {item.destination.replace(/^(Country:|Place:)\s*/, '')}
                            </span>
                          ) : (
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                              Overall Trip
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Category Badge */}
                      <div>
                        <span
                          className="budget-row-category-badge"
                          style={{
                            backgroundColor: catColor,
                            opacity: item.packed ? 0.7 : 1,
                          }}
                        >
                          {item.category}
                        </span>
                      </div>

                      {/* Quantity Stepper */}
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center justify-center"
                      >
                        <div className="packing-qty-stepper">
                          <button
                            type="button"
                            onClick={() => updateQty(item.id, -1)}
                            className="packing-qty-btn"
                            title="Decrease quantity"
                            aria-label="Decrease quantity"
                          >
                            <Minus size={12} strokeWidth={3} />
                          </button>
                          <span className="font-bold text-stone-800 text-sm min-w-[20px] text-center">
                            {item.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQty(item.id, 1)}
                            className="packing-qty-btn"
                            title="Increase quantity"
                            aria-label="Increase quantity"
                          >
                            <Plus size={12} strokeWidth={3} />
                          </button>
                        </div>
                      </div>

                      {/* Delete Action */}
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center justify-center"
                      >
                        <button
                          type="button"
                          onClick={() => deleteItem(item.id)}
                          className="text-stone-400 hover:text-rose-600 p-1.5 rounded transition-colors"
                          title="Remove item"
                          aria-label="Remove item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Item Modal (Clean, Elderly-Friendly, High Contrast) */}
      {isAddItemOpen && (
        <div
          className="budget-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-add-item-title"
          onClick={() => setIsAddItemOpen(false)}
        >
          <div
            className="budget-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '500px' }}
          >
            <h2 id="modal-add-item-title" className="sr-only">
              Add Packing Item
            </h2>
            <button
              type="button"
              className="budget-modal-close-btn"
              aria-label="Close modal"
              onClick={() => setIsAddItemOpen(false)}
            >
              <X size={20} />
            </button>

            <div style={{ marginBottom: '16px' }}>
              <h3 className="text-xl font-bold text-stone-900">Add Packing Item</h3>
              <p className="text-xs text-stone-500 mt-1">
                Enter an item and choose if it is for a country, place, or overall trip.
              </p>
            </div>

            <form
              onSubmit={handleAddItemSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              {/* Item Name */}
              <div>
                <label
                  htmlFor="modal-item-name"
                  className="budget-modal-section-title"
                  style={{ display: 'block', marginBottom: '6px' }}
                >
                  Item Name
                </label>
                <input
                  id="modal-item-name"
                  type="text"
                  required
                  placeholder="e.g. Passport, Sneakers, Jacket..."
                  className="budget-modal-gradient-input"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    fontSize: '15px',
                  }}
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Quick Tap Suggestions */}
              <div>
                <span className="text-xs font-semibold text-stone-500 block mb-1.5">
                  Quick Suggestions (Tap to fill):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_SUGGESTIONS.map((sug) => (
                    <button
                      key={sug.name}
                      type="button"
                      onClick={() => {
                        setNewItemName(sug.name);
                        setNewItemCategory(sug.category);
                      }}
                      className="text-xs px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900 border border-stone-200 transition-colors cursor-pointer"
                    >
                      + {sug.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Destination / Scope Selector (Only Trip Countries, Places, or Overall Trip) */}
              <div>
                <label
                  htmlFor="modal-item-scope"
                  className="budget-modal-section-title"
                  style={{ display: 'block', marginBottom: '6px' }}
                >
                  Packed for:
                </label>
                <select
                  id="modal-item-scope"
                  className="budget-modal-gradient-input"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    backgroundColor: '#ffffff',
                    border: '1px solid rgba(72, 42, 19, 0.2)',
                    fontSize: '15px',
                    color: '#334155',
                  }}
                  value={newItemScope}
                  onChange={(e) => setNewItemScope(e.target.value)}
                >
                  <option value="Overall Trip">Overall Trip</option>

                  {availableCountries.length > 0 && (
                    <optgroup label="Countries in Itinerary">
                      {availableCountries.map((c) => (
                        <option key={`country-${c}`} value={`Country: ${c}`}>
                          {c} (Country)
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {availablePlaces.length > 0 && (
                    <optgroup label="Places / Cities in Itinerary">
                      {availablePlaces.map((p) => (
                        <option key={`place-${p.name}`} value={`Place: ${p.name}`}>
                          {p.name} {p.country ? `(${p.country})` : ''}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Category Selector */}
              <div>
                <label
                  htmlFor="modal-item-category"
                  className="budget-modal-section-title"
                  style={{ display: 'block', marginBottom: '6px' }}
                >
                  Category
                </label>
                <select
                  id="modal-item-category"
                  className="budget-modal-gradient-input"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    backgroundColor: '#ffffff',
                    border: '1px solid rgba(72, 42, 19, 0.2)',
                    fontSize: '15px',
                    color: '#334155',
                  }}
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value as PackingCategory)}
                >
                  {CATEGORY_CONFIGS.filter((c) => c.name !== 'All Items').map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity Stepper */}
              <div>
                <label
                  htmlFor="modal-item-qty"
                  className="budget-modal-section-title"
                  style={{ display: 'block', marginBottom: '6px' }}
                >
                  Quantity
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setNewItemQty((q) => Math.max(1, q - 1))}
                    className="w-10 h-10 rounded-xl bg-stone-100 hover:bg-stone-200 flex items-center justify-center font-bold text-stone-700 text-lg border border-stone-300"
                  >
                    –
                  </button>
                  <input
                    id="modal-item-qty"
                    type="number"
                    min="1"
                    className="w-20 text-center font-bold text-lg py-2 border border-stone-300 rounded-xl outline-none"
                    value={newItemQty}
                    onChange={(e) =>
                      setNewItemQty(Math.max(1, parseInt(e.target.value) || 1))
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setNewItemQty((q) => q + 1)}
                    className="w-10 h-10 rounded-xl bg-stone-100 hover:bg-stone-200 flex items-center justify-center font-bold text-stone-700 text-lg border border-stone-300"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div style={{ marginTop: '10px' }}>
                <button
                  type="submit"
                  className="budget-btn-add-expense"
                  style={{ width: '100%', height: '48px', fontSize: '15px' }}
                >
                  <Plus size={18} color="#ffffff" strokeWidth={2.5} />
                  <span>Add to Packing List</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
