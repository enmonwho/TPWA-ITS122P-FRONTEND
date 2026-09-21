import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { tripsApi } from '../services/api';
import { mergeTripWithExtras } from '../lib/tripExtras';
import type { Trip } from '../types/trip';

type Category = 'Clothing' | 'Essentials' | 'Toiletries';

interface PackingItem {
  id: string;
  name: string;
  qty: number;
  packed: boolean;
  category: Category;
}

export default function TripPacking() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);

  const [activeCategory, setActiveCategory] = useState<Category>('Essentials');
  const [items, setItems] = useState<PackingItem[]>([]);
  const [newItemName, setNewItemName] = useState('');

  useEffect(() => {
    if (!tripId) return;
    const fetchTrip = async () => {
      try {
        const apiTrip = await tripsApi.getTrip(tripId);
        const merged = mergeTripWithExtras(apiTrip);
        setTrip(merged);

        // Generate a simple smart list based on trip nights
        const nights = merged.nights || 3;
        setItems([
          { id: '1', name: 'Backpack', qty: 1, packed: false, category: 'Essentials' },
          {
            id: '2',
            name: 'Passport / ID',
            qty: 1,
            packed: false,
            category: 'Essentials',
          },
          {
            id: '3',
            name: 'Cash & Cards',
            qty: 1,
            packed: false,
            category: 'Essentials',
          },
          {
            id: '4',
            name: 'Phone Charger',
            qty: 1,
            packed: false,
            category: 'Essentials',
          },

          { id: '5', name: 'T-Shirts', qty: nights, packed: false, category: 'Clothing' },
          {
            id: '6',
            name: 'Underwear',
            qty: nights + 1,
            packed: false,
            category: 'Clothing',
          },
          {
            id: '7',
            name: 'Pants / Shorts',
            qty: Math.max(1, Math.floor(nights / 2)),
            packed: false,
            category: 'Clothing',
          },

          { id: '8', name: 'Toothbrush', qty: 1, packed: false, category: 'Toiletries' },
          { id: '9', name: 'Toothpaste', qty: 1, packed: false, category: 'Toiletries' },
          { id: '10', name: 'Deodorant', qty: 1, packed: false, category: 'Toiletries' },
        ]);
      } catch (err) {
        console.error('Failed to load trip for packing list:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTrip();
  }, [tripId]);

  const togglePacked = (id: string) => {
    setItems(
      items.map((item) => (item.id === id ? { ...item, packed: !item.packed } : item)),
    );
  };

  const updateQty = (id: string, delta: number) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, qty: Math.max(1, item.qty + delta) } : item,
      ),
    );
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    setItems([
      ...items,
      {
        id: Date.now().toString(),
        name: newItemName.trim(),
        qty: 1,
        packed: false,
        category: activeCategory,
      },
    ]);
    setNewItemName('');
  };

  if (loading)
    return <div className="p-8 text-center text-slate-500">Loading packing list...</div>;
  if (!trip) return <div className="p-8 text-center text-red-500">Trip not found.</div>;

  const categories: Category[] = ['Clothing', 'Essentials', 'Toiletries'];
  const activeItems = items.filter((i) => i.category === activeCategory);

  return (
    <div className="max-w-6xl mx-auto p-6 animate-slide-up">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{trip.name} - Packing</h1>
          <p className="text-slate-500 text-sm">{trip.nights} nights planned</p>
        </div>
        <button
          onClick={() => navigate(`/trip/${tripId}`)}
          className="text-amber-600 hover:text-amber-700 font-medium"
        >
          &larr; Back to Itinerary
        </button>
      </header>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Left Column: Categories */}
        <div className="w-full md:w-1/3 space-y-4">
          <h2 className="font-semibold text-slate-700 mb-4">Categories</h2>
          <div className="grid grid-cols-2 gap-3">
            {categories.map((cat) => {
              const catItems = items.filter((i) => i.category === cat);
              const packedCount = catItems.filter((i) => i.packed).length;
              const totalCount = catItems.length;

              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    activeCategory === cat
                      ? 'border-amber-500 bg-amber-50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <h3
                    className={`font-medium ${activeCategory === cat ? 'text-amber-700' : 'text-slate-700'}`}
                  >
                    {cat}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {packedCount} / {totalCount} packed
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Checklist */}
        <div className="w-full md:w-2/3 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="mb-6 border-b border-slate-100 pb-4">
            <h2 className="text-xl font-bold text-slate-800">{activeCategory}</h2>
            <p className="text-sm text-slate-500">
              {activeItems.filter((i) => i.packed).length} of {activeItems.length} packed
            </p>
          </div>

          <div className="space-y-2 mb-6 max-h-125 overflow-y-auto pr-2">
            {activeItems.length === 0 ? (
              <p className="text-slate-400 italic">No items in this category yet.</p>
            ) : (
              activeItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg group transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={item.packed}
                      onChange={() => togglePacked(item.id)}
                      className="w-5 h-5 rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer"
                    />
                    <span
                      className={`text-slate-700 font-medium ${item.packed ? 'line-through text-slate-400' : ''}`}
                    >
                      {item.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => updateQty(item.id, -1)}
                      className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="w-6 text-center text-sm font-semibold text-slate-600">
                      {item.qty}x
                    </span>
                    <button
                      onClick={() => updateQty(item.id, 1)}
                      className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleAddItem} className="flex gap-2">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder={`Add item to ${activeCategory}...`}
              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium transition-colors"
            >
              Add +
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
