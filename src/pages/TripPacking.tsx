import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Download,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Package,
  ArrowLeft,
  Sparkles,
  RotateCcw,
  Check,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { tripsApi } from '../services/api';
import { mergeTripWithExtras, formatDateOnly } from '../lib/tripExtras';
import type { Trip } from '../types/trip';

export type PackingCategory =
  'Essentials' | 'Clothing' | 'Toiletries' | 'Electronics' | 'Documents';

export interface PackingItem {
  id: string;
  name: string;
  qty: number;
  packed: boolean;
  category: PackingCategory;
}

const CATEGORIES: PackingCategory[] = [
  'Essentials',
  'Clothing',
  'Toiletries',
  'Electronics',
  'Documents',
];

const CATEGORY_COLORS: Record<
  PackingCategory,
  { bg: string; text: string; border: string }
> = {
  Essentials: { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
  Clothing: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  Toiletries: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  Electronics: { bg: '#faf5ff', text: '#7e22ce', border: '#e9d5ff' },
  Documents: { bg: '#fff1f2', text: '#be123c', border: '#fecdd3' },
};

function generateDefaultItems(nights: number): PackingItem[] {
  const safeNights = Math.max(1, nights || 3);
  return [
    // Essentials
    {
      id: 'item-1',
      name: 'Passport / Government ID',
      qty: 1,
      packed: false,
      category: 'Essentials',
    },
    {
      id: 'item-2',
      name: 'Cash & Credit / Debit Cards',
      qty: 1,
      packed: false,
      category: 'Essentials',
    },
    {
      id: 'item-3',
      name: 'Daypack or Travel Backpack',
      qty: 1,
      packed: false,
      category: 'Essentials',
    },
    {
      id: 'item-4',
      name: 'Reusable Water Bottle',
      qty: 1,
      packed: false,
      category: 'Essentials',
    },

    // Clothing
    {
      id: 'item-5',
      name: 'T-Shirts / Casual Tops',
      qty: safeNights,
      packed: false,
      category: 'Clothing',
    },
    {
      id: 'item-6',
      name: 'Underwear & Socks',
      qty: safeNights + 1,
      packed: false,
      category: 'Clothing',
    },
    {
      id: 'item-7',
      name: 'Shorts / Lightweight Pants',
      qty: Math.max(2, Math.floor(safeNights / 2)),
      packed: false,
      category: 'Clothing',
    },
    {
      id: 'item-8',
      name: 'Sleepwear / Loungewear',
      qty: Math.max(1, Math.floor(safeNights / 3)),
      packed: false,
      category: 'Clothing',
    },
    {
      id: 'item-9',
      name: 'Comfortable Walking Shoes',
      qty: 1,
      packed: false,
      category: 'Clothing',
    },
    {
      id: 'item-10',
      name: 'Light Windbreaker or Jacket',
      qty: 1,
      packed: false,
      category: 'Clothing',
    },

    // Toiletries
    {
      id: 'item-11',
      name: 'Toothbrush & Travel Toothpaste',
      qty: 1,
      packed: false,
      category: 'Toiletries',
    },
    {
      id: 'item-12',
      name: 'Shampoo & Body Soap',
      qty: 1,
      packed: false,
      category: 'Toiletries',
    },
    { id: 'item-13', name: 'Deodorant', qty: 1, packed: false, category: 'Toiletries' },
    {
      id: 'item-14',
      name: 'Sunscreen & Lip Balm',
      qty: 1,
      packed: false,
      category: 'Toiletries',
    },

    // Electronics
    {
      id: 'item-15',
      name: 'Smartphone & Charging Cable',
      qty: 1,
      packed: false,
      category: 'Electronics',
    },
    {
      id: 'item-16',
      name: 'High-Capacity Power Bank',
      qty: 1,
      packed: false,
      category: 'Electronics',
    },
    {
      id: 'item-17',
      name: 'Universal Travel Adapter Plug',
      qty: 1,
      packed: false,
      category: 'Electronics',
    },
    {
      id: 'item-18',
      name: 'Earphones / Headphones',
      qty: 1,
      packed: false,
      category: 'Electronics',
    },

    // Documents
    {
      id: 'item-19',
      name: 'Flight Boarding Passes / E-Tickets',
      qty: 1,
      packed: false,
      category: 'Documents',
    },
    {
      id: 'item-20',
      name: 'Hotel & Tour Booking Vouchers',
      qty: 1,
      packed: false,
      category: 'Documents',
    },
    {
      id: 'item-21',
      name: 'First Aid Kit & Personal Medication',
      qty: 1,
      packed: false,
      category: 'Documents',
    },
  ];
}

export default function TripPacking() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);

  const [activeCategory, setActiveCategory] = useState<PackingCategory | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Packed' | 'Unpacked'>('All');

  const [items, setItems] = useState<PackingItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemCategory, setNewItemCategory] = useState<PackingCategory>('Essentials');

  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportSuccess, setIsExportSuccess] = useState(false);

  // Storage key scoped to this trip
  const storageKey = `lakbye_packing_${tripId}`;

  // Load trip and persistent packing items
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

        // Load cached items or generate defaults
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setItems(parsed);
              setLoading(false);
              return;
            }
          } catch {
            // fall back to generation
          }
        }

        const defaults = generateDefaultItems(merged.nights || 3);
        setItems(defaults);
        localStorage.setItem(storageKey, JSON.stringify(defaults));
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

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const targetCategory = activeCategory === 'All' ? newItemCategory : activeCategory;

    const newItem: PackingItem = {
      id: `custom-${Date.now()}`,
      name: newItemName.trim(),
      qty: Math.max(1, newItemQty),
      packed: false,
      category: targetCategory,
    };

    saveItems([...items, newItem]);
    setNewItemName('');
    setNewItemQty(1);
  };

  const handleResetDefaults = () => {
    if (
      window.confirm(
        'Reset packing checklist to smart recommendations? Any custom items will be replaced.',
      )
    ) {
      const defaults = generateDefaultItems(trip?.nights || 3);
      saveItems(defaults);
    }
  };

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (activeCategory !== 'All' && item.category !== activeCategory) return false;
      if (statusFilter === 'Packed' && !item.packed) return false;
      if (statusFilter === 'Unpacked' && item.packed) return false;
      return true;
    });
  }, [items, activeCategory, statusFilter]);

  // Overall Statistics
  const totalItemsCount = items.length;
  const packedItemsCount = items.filter((i) => i.packed).length;
  const progressPercent =
    totalItemsCount > 0 ? Math.round((packedItemsCount / totalItemsCount) * 100) : 0;

  // Category counts
  const categoryStats = useMemo(() => {
    const stats: Record<string, { total: number; packed: number }> = {};
    CATEGORIES.forEach((cat) => {
      const catItems = items.filter((i) => i.category === cat);
      stats[cat] = {
        total: catItems.length,
        packed: catItems.filter((i) => i.packed).length,
      };
    });
    return stats;
  }, [items]);

  // Client-Side PDF Export using jsPDF and jspdf-autotable
  const handleExportPdf = () => {
    if (!trip) return;
    setIsExportingPdf(true);

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const primaryColor: [number, number, number] = [234, 88, 12]; // Brand Amber / Orange
      const darkColor: [number, number, number] = [15, 23, 42]; // Slate 900
      const lightGray: [number, number, number] = [248, 250, 252]; // Slate 50

      // 1. Top Decorative Brand Banner
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, 210, 8, 'F');

      // 2. Header Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(...darkColor);
      doc.text('LakBye Travel Planner', 15, 22);

      doc.setFontSize(14);
      doc.setTextColor(...primaryColor);
      doc.text('Packing Checklist & Inventory', 15, 30);

      // Tagline
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text('Saan aabot ang LakBye mo?', 15, 36);

      // 3. Trip Details Box
      doc.setFillColor(...lightGray);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(15, 42, 180, 32, 3, 3, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...darkColor);
      doc.text(`Trip: ${trip.name}`, 20, 50);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(71, 85, 105);

      const locationStr =
        trip.countries && trip.countries.length > 0
          ? trip.countries.join(', ')
          : 'Philippines';
      doc.text(`Destination: ${locationStr}`, 20, 57);

      const datesStr =
        trip.startDate && trip.endDate
          ? `${formatDateOnly(trip.startDate)} to ${formatDateOnly(trip.endDate)} (${trip.nights || 0} nights)`
          : `${trip.nights || 0} nights planned`;
      doc.text(`Travel Dates: ${datesStr}`, 20, 64);

      // Progress Summary in Box Right
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...primaryColor);
      doc.text(
        `Status: ${packedItemsCount} of ${totalItemsCount} Packed (${progressPercent}%)`,
        120,
        50,
      );

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Generated on: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`,
        120,
        57,
      );
      doc.text('Track your baggage checklist before departure', 120, 64);

      // 4. Categorized Items Table
      const tableRows = items.map((item, idx) => [
        (idx + 1).toString(),
        item.category,
        item.name,
        `${item.qty}x`,
        item.packed ? '[ X ] Packed' : '[   ] To Pack',
      ]);

      autoTable(doc, {
        startY: 80,
        head: [['#', 'Category', 'Item Name', 'Qty', 'Packing Status']],
        body: tableRows,
        theme: 'striped',
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9.5,
          halign: 'left',
        },
        bodyStyles: {
          fontSize: 9,
          textColor: [30, 41, 59],
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 35, fontStyle: 'bold' },
          2: { cellWidth: 80 },
          3: { cellWidth: 18, halign: 'center' },
          4: { cellWidth: 37, fontStyle: 'bold' },
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 4) {
            const rawVal = String(data.cell.raw);
            if (rawVal.includes('Packed')) {
              data.cell.styles.textColor = [22, 101, 52]; // Dark green
            } else {
              data.cell.styles.textColor = [194, 65, 12]; // Orange / Needs pack
            }
          }
        },
        margin: { left: 15, right: 15 },
      });

      // 5. Printable Footer Note
      const pageCount = (
        doc as unknown as { internal: { getNumberOfPages: () => number } }
      ).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `LakBye Travel Planner • Page ${i} of ${pageCount} • Have a safe and memorable journey!`,
          105,
          290,
          { align: 'center' },
        );
      }

      // 6. Trigger Download
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
        <p className="text-sm font-semibold">Loading packing checklist...</p>
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
    <div className="w-full max-w-6xl mx-auto p-4 md:p-8 animate-fade-in-up">
      {/* Top Header & Breadcrumb Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button
              type="button"
              onClick={() => navigate(`/trip/${tripId}`)}
              className="text-stone-500 hover:text-stone-900 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <ArrowLeft size={14} /> Back to Itinerary
            </button>
            <span className="text-stone-300">•</span>
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
              Packing Checklist
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-stone-900 tracking-tight">
            {trip.name}
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            {trip.startDate && trip.endDate
              ? `${formatDateOnly(trip.startDate)} - ${formatDateOnly(trip.endDate)} • `
              : ''}
            {trip.nights || 0} nights planned • Smart Baggage Tracker
          </p>
        </div>

        {/* Toolbar Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleResetDefaults}
            title="Reset to recommended packing list"
            className="px-3 py-2 rounded-xl bg-white border border-stone-200 text-stone-600 hover:text-stone-900 hover:border-stone-300 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <RotateCcw size={14} />
            <span className="hidden sm:inline">Reset Smart List</span>
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer ${
              isExportSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white'
            }`}
          >
            {isExportSuccess ? (
              <>
                <Check size={15} />
                <span>Downloaded!</span>
              </>
            ) : isExportingPdf ? (
              <>
                <Sparkles size={15} className="animate-spin" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Download size={15} />
                <span>Export PDF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Overview Stat Cards & Progress Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Package size={20} />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block">
              Total Items
            </span>
            <span className="text-xl font-extrabold text-stone-900">
              {totalItemsCount}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block">
              Packed
            </span>
            <span className="text-xl font-extrabold text-emerald-600">
              {packedItemsCount}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
            <Circle size={20} />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block">
              Remaining
            </span>
            <span className="text-xl font-extrabold text-stone-800">
              {totalItemsCount - packedItemsCount}
            </span>
          </div>
        </div>

        {/* Progress Card */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-center">
          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
            <span className="text-stone-600">Progress</span>
            <span className="text-amber-600">{progressPercent}%</span>
          </div>
          <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Category Tabs Sidebar + Checklist Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Categories Navigation (4 cols on lg) */}
        <div className="lg:col-span-4 bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400">
              Categories
            </h2>
            <span className="text-[11px] font-semibold text-stone-500">
              {packedItemsCount}/{totalItemsCount} done
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            {/* "All Categories" Tab */}
            <button
              type="button"
              onClick={() => setActiveCategory('All')}
              className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                activeCategory === 'All'
                  ? 'border-amber-500 bg-amber-50/50 shadow-xs'
                  : 'border-transparent hover:bg-stone-50 text-stone-700'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-bold text-stone-900">All Items</span>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                {totalItemsCount}
              </span>
            </button>

            {/* Individual Category Tabs */}
            {CATEGORIES.map((cat) => {
              const stat = categoryStats[cat] || { total: 0, packed: 0 };
              const isSelected = activeCategory === cat;
              const isComplete = stat.total > 0 && stat.packed === stat.total;

              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50/50 shadow-xs'
                      : 'border-transparent hover:bg-stone-50 text-stone-700'
                  }`}
                >
                  <div>
                    <span className="text-sm font-semibold text-stone-900 block">
                      {cat}
                    </span>
                    <span className="text-[11px] text-stone-400">
                      {stat.packed} of {stat.total} packed
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isComplete && (
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">
                        ✓
                      </span>
                    )}
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                      {stat.total}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick Filter: All vs Packed vs Unpacked */}
          <div className="mt-5 pt-4 border-t border-stone-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-2 px-1">
              Checklist Filter
            </span>
            <div className="grid grid-cols-3 gap-1 bg-stone-100 p-1 rounded-xl">
              {(['All', 'Unpacked', 'Packed'] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setStatusFilter(filter)}
                  className={`py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    statusFilter === filter
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Items List & Add Form (8 cols on lg) */}
        <div className="lg:col-span-8 bg-white p-5 md:p-6 rounded-2xl border border-stone-200 shadow-xs">
          {/* Header of Active List */}
          <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-4">
            <div>
              <h2 className="text-lg font-bold text-stone-900">
                {activeCategory === 'All' ? 'All Packing Items' : activeCategory}
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Showing {filteredItems.length}{' '}
                {filteredItems.length === 1 ? 'item' : 'items'}
                {statusFilter !== 'All' ? ` (${statusFilter})` : ''}
              </p>
            </div>

            <div className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              {filteredItems.filter((i) => i.packed).length} / {filteredItems.length}{' '}
              packed
            </div>
          </div>

          {/* Items Checklist Rows */}
          <div className="space-y-2 mb-6 max-h-[460px] overflow-y-auto pr-1 no-scrollbar">
            {filteredItems.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center text-stone-400 gap-2">
                <Package size={36} className="text-stone-300" />
                <p className="text-sm font-medium">No items match your filter.</p>
                <p className="text-xs text-stone-400">
                  Add a new item below or change your selected category.
                </p>
              </div>
            ) : (
              filteredItems.map((item) => {
                const colors =
                  CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Essentials;

                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                      item.packed
                        ? 'bg-stone-50/60 border-stone-200/80 opacity-75'
                        : 'bg-white border-stone-200 hover:border-amber-300 shadow-xs'
                    }`}
                  >
                    {/* Left: Checkbox + Name + Category badge */}
                    <button
                      type="button"
                      className="flex items-center gap-3.5 min-w-0 cursor-pointer select-none text-left bg-transparent border-0 p-0 focus:outline-none"
                      onClick={() => togglePacked(item.id)}
                    >
                      <span
                        className={`w-5 h-5 rounded-md flex items-center justify-center transition-all shrink-0 ${
                          item.packed
                            ? 'bg-emerald-500 text-white shadow-xs'
                            : 'border-2 border-stone-300 hover:border-amber-500 bg-white'
                        }`}
                        aria-hidden="true"
                      >
                        {item.packed && <Check size={13} strokeWidth={3} />}
                      </span>

                      <div className="min-w-0">
                        <span
                          className={`text-sm font-semibold block truncate ${
                            item.packed ? 'line-through text-stone-400' : 'text-stone-800'
                          }`}
                        >
                          {item.name}
                        </span>
                        {activeCategory === 'All' && (
                          <span
                            className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-md border mt-0.5"
                            style={{
                              backgroundColor: colors.bg,
                              color: colors.text,
                              borderColor: colors.border,
                            }}
                          >
                            {item.category}
                          </span>
                        )}
                      </div>
                    </button>

                    {/* Right: Quantity modifiers + Delete */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-0.5 border border-stone-200">
                        <button
                          type="button"
                          onClick={() => updateQty(item.id, -1)}
                          className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-stone-600 hover:bg-white transition-colors cursor-pointer"
                          aria-label="Decrease quantity"
                        >
                          -
                        </button>
                        <span className="w-6 text-center text-xs font-extrabold text-stone-800">
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQty(item.id, 1)}
                          className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-stone-600 hover:bg-white transition-colors cursor-pointer"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => deleteItem(item.id)}
                        className="p-1.5 text-stone-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50 cursor-pointer"
                        title="Delete item"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Add Item Form */}
          <form
            onSubmit={handleAddItem}
            className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex flex-col sm:flex-row items-center gap-2.5"
          >
            <input
              type="text"
              required
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder={`Add an item to ${activeCategory === 'All' ? newItemCategory : activeCategory}...`}
              className="flex-1 w-full px-3.5 py-2 text-xs bg-white border border-stone-200 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-xs"
            />

            {/* Category dropdown if on "All" */}
            {activeCategory === 'All' && (
              <select
                value={newItemCategory}
                onChange={(e) => setNewItemCategory(e.target.value as PackingCategory)}
                className="w-full sm:w-auto px-2.5 py-2 text-xs font-semibold bg-white border border-stone-200 rounded-xl text-stone-700 cursor-pointer"
                aria-label="Item Category"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}

            {/* Quantity */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[11px] font-semibold text-stone-500">Qty:</span>
              <input
                type="number"
                min="1"
                max="99"
                value={newItemQty}
                onChange={(e) =>
                  setNewItemQty(Math.max(1, parseInt(e.target.value, 10) || 1))
                }
                className="w-14 px-2 py-2 text-xs text-center font-bold bg-white border border-stone-200 rounded-xl"
              />
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer shrink-0"
            >
              <Plus size={14} />
              <span>Add Item</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
