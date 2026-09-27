import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import {
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  RotateCcw,
  X,
  Check,
  Shirt,
  Briefcase,
  Sparkles,
  Smartphone,
  FileText,
  Layers,
  Baby,
  Palmtree,
  Tent,
  Luggage,
  Activity,
  Bike,
  Wine,
  Utensils,
  Dumbbell,
  Mountain,
  Wind,
  Compass,
  Music,
  Camera,
  Footprints,
  Waves,
  Snowflake,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { tripsApi } from '../services/api';
import { mergeTripWithExtras, formatTripDateRange } from '../lib/tripExtras';
import { getCachedTrip, setCachedTrip } from '../lib/tripCache';
import type { TripWorkspaceOutletContext } from '../layouts/TripWorkspaceLayout';
import type { Trip } from '../types/trip';

export interface PackingItem {
  id: string;
  name: string;
  qty: number;
  packed: boolean;
  category: string;
}

const BUILTIN_CATEGORIES = [
  'Clothing',
  'Essentials',
  'Toiletries',
  'Electronics',
  'Documents',
];

export interface PredefinedCategory {
  name: string;
  icon: React.ElementType;
  defaultItems: { name: string; qty: number }[];
}

const PREDEFINED_CATEGORIES: PredefinedCategory[] = [
  {
    name: 'Baby',
    icon: Baby,
    defaultItems: [
      { name: 'Diapers & Changing Mat', qty: 10 },
      { name: 'Baby Wipes & Rash Cream', qty: 1 },
      { name: 'Baby Bottles & Formula / Milk', qty: 3 },
      { name: 'Pacifiers & Clips', qty: 2 },
      { name: 'Extra Onesies & Outfits', qty: 5 },
      { name: 'Baby Blanket / Swaddle', qty: 2 },
      { name: 'Stroller / Baby Carrier', qty: 1 },
    ],
  },
  {
    name: 'Beach',
    icon: Palmtree,
    defaultItems: [
      { name: 'Beach Towel', qty: 2 },
      { name: 'Swimsuit / Trunks', qty: 2 },
      { name: 'Sunscreen SPF 50+', qty: 1 },
      { name: 'Sunglasses & Sun Hat', qty: 1 },
      { name: 'Flip Flops / Water Shoes', qty: 1 },
      { name: 'Waterproof Phone Pouch', qty: 1 },
      { name: 'Snorkel & Mask', qty: 1 },
    ],
  },
  {
    name: 'Business',
    icon: Briefcase,
    defaultItems: [
      { name: 'Business Suit / Blazer', qty: 2 },
      { name: 'Dress Shirts / Blouses', qty: 3 },
      { name: 'Formal Shoes & Belt', qty: 1 },
      { name: 'Laptop & Charger', qty: 1 },
      { name: 'Business Cards & Pen', qty: 1 },
      { name: 'Portfolio / Notebook', qty: 1 },
    ],
  },
  {
    name: 'Camping',
    icon: Tent,
    defaultItems: [
      { name: 'Tent & Ground Stakes', qty: 1 },
      { name: 'Sleeping Bag & Sleeping Pad', qty: 1 },
      { name: 'Headlamp / Flashlight & Extra Batteries', qty: 1 },
      { name: 'Portable Camp Stove & Fuel', qty: 1 },
      { name: 'Multi-tool / Pocket Knife', qty: 1 },
      { name: 'Insect Repellent & Matches', qty: 1 },
    ],
  },
  {
    name: 'Carry-on',
    icon: Luggage,
    defaultItems: [
      { name: 'Travel Neck Pillow', qty: 1 },
      { name: 'Noise-Cancelling Headphones', qty: 1 },
      { name: 'Eye Mask & Earplugs', qty: 1 },
      { name: 'Disinfecting Surface Wipes', qty: 1 },
      { name: 'TSA Liquid Toiletries (<100ml)', qty: 1 },
      { name: 'Change of Clothes (Spare)', qty: 1 },
    ],
  },
  {
    name: 'Crossfit',
    icon: Activity,
    defaultItems: [
      { name: 'Crossfit / Training Shoes', qty: 1 },
      { name: 'Gym Grips & Wrist Wraps', qty: 1 },
      { name: 'Speed Jump Rope', qty: 1 },
      { name: 'Knee Sleeves', qty: 1 },
      { name: 'Shaker Bottle & Supplements', qty: 1 },
      { name: 'Moisture-Wicking Athletic Tops', qty: 3 },
    ],
  },
  {
    name: 'Cycling',
    icon: Bike,
    defaultItems: [
      { name: 'Cycling Helmet', qty: 1 },
      { name: 'Cycling Jersey & Padded Bibs', qty: 2 },
      { name: 'Bike Water Bottles & Electrolytes', qty: 2 },
      { name: 'Mini Hand Pump & Spare Inner Tube', qty: 1 },
      { name: 'Bike Multi-tool & Tire Levers', qty: 1 },
      { name: 'Cycling Gloves & Sunglasses', qty: 1 },
    ],
  },
  {
    name: 'Electronics',
    icon: Smartphone,
    defaultItems: [
      { name: 'Smartphone & Heavy-duty Cable', qty: 1 },
      { name: 'High-Capacity Power Bank', qty: 1 },
      { name: 'Universal Travel Power Adapter', qty: 1 },
      { name: 'Wireless Headphones / Earbuds', qty: 1 },
      { name: 'Laptop / Tablet & Charger', qty: 1 },
    ],
  },
  {
    name: 'Fancy Dinner',
    icon: Wine,
    defaultItems: [
      { name: 'Cocktail Dress / Formal Suit', qty: 1 },
      { name: 'Dress Shoes / High Heels', qty: 1 },
      { name: 'Fine Jewelry / Luxury Watch', qty: 1 },
      { name: 'Perfume / Cologne (Travel Size)', qty: 1 },
      { name: 'Clutch / Evening Handbag', qty: 1 },
    ],
  },
  {
    name: 'Food',
    icon: Utensils,
    defaultItems: [
      { name: 'Reusable Travel Cutlery & Straw', qty: 1 },
      { name: 'Collapsible Food Containers', qty: 2 },
      { name: 'Healthy Travel Snacks / Protein Bars', qty: 5 },
      { name: 'Insulated Thermal Lunch Bag', qty: 1 },
      { name: 'Ziploc Bags & Wet Wipes', qty: 1 },
    ],
  },
  {
    name: 'Gym',
    icon: Dumbbell,
    defaultItems: [
      { name: 'Workout Tops & Shorts', qty: 3 },
      { name: 'Training Sneakers & Athletic Socks', qty: 1 },
      { name: 'Microfiber Gym Towel', qty: 1 },
      { name: 'Stainless Water Bottle', qty: 1 },
      { name: 'Locker Combination Padlock', qty: 1 },
    ],
  },
  {
    name: 'Hiking',
    icon: Mountain,
    defaultItems: [
      { name: 'Hiking Boots / Trail Runners', qty: 1 },
      { name: 'Merino Wool Hiking Socks', qty: 3 },
      { name: 'Trekking Poles', qty: 1 },
      { name: 'Hydration Bladder / Canteen (2L)', qty: 1 },
      { name: 'Waterproof Rain Shell / Poncho', qty: 1 },
      { name: 'Trail First-Aid Kit & Whistle', qty: 1 },
    ],
  },
  {
    name: 'Kitesurfing',
    icon: Wind,
    defaultItems: [
      { name: 'Kite & Control Bar', qty: 1 },
      { name: 'TwinTip or Surf Board', qty: 1 },
      { name: 'Waist / Seat Harness', qty: 1 },
      { name: 'Wetsuit & Impact Vest', qty: 1 },
      { name: 'Kite Pump with Pressure Gauge', qty: 1 },
      { name: 'Water-resistant Mineral Sunscreen', qty: 1 },
    ],
  },
  {
    name: 'Make-up',
    icon: Sparkles,
    defaultItems: [
      { name: 'Foundation, Concealer & Powder', qty: 1 },
      { name: 'Eyeshadow Palette & Mascara', qty: 1 },
      { name: 'Lipstick & Lip Glosses', qty: 2 },
      { name: 'Make-up Brushes & Beauty Blender', qty: 1 },
      { name: 'Micellar Water / Make-up Wipes', qty: 1 },
      { name: 'Compact LED Mirror', qty: 1 },
    ],
  },
  {
    name: 'Motorcycling',
    icon: Compass,
    defaultItems: [
      { name: 'DOT/ECE Certified Helmet', qty: 1 },
      { name: 'Armored Riding Jacket & Pants', qty: 1 },
      { name: 'Reinforced Riding Boots & Gloves', qty: 1 },
      { name: 'Waterproof Rain Over-Suit', qty: 1 },
      { name: 'Motorcycle Phone Mount & USB Cable', qty: 1 },
      { name: 'Tire Pressure Gauge & Patch Kit', qty: 1 },
    ],
  },
  {
    name: 'Music Festival',
    icon: Music,
    defaultItems: [
      { name: 'Festival Outfits & Costumes', qty: 2 },
      { name: 'High-Fidelity Earplugs (Musicians)', qty: 1 },
      { name: 'Fanny Pack / Anti-theft Crossbody', qty: 1 },
      { name: 'Hydration Backpack', qty: 1 },
      { name: 'Body Glitter & Face Gems', qty: 1 },
      { name: 'Bandana / Dust Mask & Sunglasses', qty: 1 },
    ],
  },
  {
    name: 'Photography',
    icon: Camera,
    defaultItems: [
      { name: 'DSLR / Mirrorless Camera Body', qty: 1 },
      { name: 'Prime / Zoom Lenses', qty: 2 },
      { name: 'Extra Rechargeable Batteries & Charger', qty: 2 },
      { name: 'High-Speed SD Cards & Case', qty: 2 },
      { name: 'Compact Carbon Fiber Tripod', qty: 1 },
      { name: 'Lens Blower & Microfiber Cloths', qty: 1 },
    ],
  },
  {
    name: 'Running',
    icon: Footprints,
    defaultItems: [
      { name: 'Running Shoes & Anti-Blister Socks', qty: 2 },
      { name: 'Lightweight Running Tops & Shorts', qty: 3 },
      { name: 'GPS Running Watch & Heart Rate Strap', qty: 1 },
      { name: 'Running Waist Belt / Handheld Bottle', qty: 1 },
      { name: 'Anti-Chafing Balm', qty: 1 },
    ],
  },
  {
    name: 'Swimming',
    icon: Waves,
    defaultItems: [
      { name: 'Competition / Lap Swimsuit', qty: 2 },
      { name: 'Anti-Fog Swimming Goggles', qty: 1 },
      { name: 'Silicone Swim Cap', qty: 1 },
      { name: 'Quick-Dry Microfiber Towel', qty: 1 },
      { name: 'Waterproof Dry Bag', qty: 1 },
      { name: 'Earplugs & Nose Clip', qty: 1 },
    ],
  },
  {
    name: 'Winter Sports',
    icon: Snowflake,
    defaultItems: [
      { name: 'Waterproof Ski / Snowboard Jacket & Pants', qty: 1 },
      { name: 'Thermal Base Layer Tops & Bottoms', qty: 2 },
      { name: 'Ski Goggles & Helmet', qty: 1 },
      { name: 'Insulated Waterproof Gloves / Mittens', qty: 1 },
      { name: 'Balaclava / Neck Gaiter', qty: 1 },
      { name: 'Merino Wool Ski Socks', qty: 2 },
      { name: 'Hand & Toe Warmers', qty: 4 },
    ],
  },
];

function getCategoryIcon(cat: string): React.ElementType {
  switch (cat.toLowerCase()) {
    case 'clothing':
      return Shirt;
    case 'essentials':
      return Briefcase;
    case 'toiletries':
      return Sparkles;
    case 'electronics':
      return Smartphone;
    case 'documents':
      return FileText;
    case 'baby':
      return Baby;
    case 'beach':
      return Palmtree;
    case 'business':
      return Briefcase;
    case 'camping':
      return Tent;
    case 'carry-on':
      return Luggage;
    case 'crossfit':
      return Activity;
    case 'cycling':
      return Bike;
    case 'fancy dinner':
      return Wine;
    case 'food':
      return Utensils;
    case 'gym':
      return Dumbbell;
    case 'hiking':
      return Mountain;
    case 'kitesurfing':
      return Wind;
    case 'make-up':
      return Sparkles;
    case 'motorcycling':
      return Compass;
    case 'music festival':
      return Music;
    case 'photography':
      return Camera;
    case 'running':
      return Footprints;
    case 'swimming':
      return Waves;
    case 'winter sports':
      return Snowflake;
    default:
      return Layers;
  }
}

function generateDefaultItems(nights: number): PackingItem[] {
  const safeNights = Math.max(1, nights || 3);
  return [
    // Clothing
    { id: 'c-1', name: 'Belt(s)', qty: 1, packed: false, category: 'Clothing' },
    { id: 'c-2', name: 'Boots', qty: 1, packed: false, category: 'Clothing' },
    {
      id: 'c-3',
      name: 'Bra(s)',
      qty: Math.max(2, safeNights),
      packed: false,
      category: 'Clothing',
    },
    { id: 'c-4', name: 'Dress', qty: 2, packed: false, category: 'Clothing' },
    { id: 'c-5', name: 'Flip Flops', qty: 1, packed: false, category: 'Clothing' },
    { id: 'c-6', name: 'Hat', qty: 1, packed: false, category: 'Clothing' },
    { id: 'c-7', name: 'Heels', qty: 1, packed: false, category: 'Clothing' },
    { id: 'c-8', name: 'Hoodie', qty: 1, packed: false, category: 'Clothing' },
    { id: 'c-9', name: 'Jacket', qty: 1, packed: false, category: 'Clothing' },
    { id: 'c-10', name: 'Jeans', qty: 2, packed: false, category: 'Clothing' },
    { id: 'c-11', name: 'Pants', qty: 2, packed: false, category: 'Clothing' },
    {
      id: 'c-12',
      name: 'T-Shirts / Casual Tops',
      qty: safeNights,
      packed: false,
      category: 'Clothing',
    },
    {
      id: 'c-13',
      name: 'Underwear & Socks',
      qty: safeNights + 1,
      packed: false,
      category: 'Clothing',
    },
    {
      id: 'c-14',
      name: 'Sleepwear / Pajamas',
      qty: 2,
      packed: false,
      category: 'Clothing',
    },
    { id: 'c-15', name: 'Swimwear', qty: 1, packed: false, category: 'Clothing' },
    { id: 'c-16', name: 'Walking Shoes', qty: 1, packed: false, category: 'Clothing' },

    // Essentials
    {
      id: 'e-1',
      name: 'Passport / Government ID',
      qty: 1,
      packed: false,
      category: 'Essentials',
    },
    {
      id: 'e-2',
      name: 'Cash & Credit / Debit Cards',
      qty: 1,
      packed: false,
      category: 'Essentials',
    },
    {
      id: 'e-3',
      name: 'Daypack or Travel Backpack',
      qty: 1,
      packed: false,
      category: 'Essentials',
    },
    {
      id: 'e-4',
      name: 'Reusable Water Bottle',
      qty: 1,
      packed: false,
      category: 'Essentials',
    },
    {
      id: 'e-5',
      name: 'House & Luggage Keys',
      qty: 1,
      packed: false,
      category: 'Essentials',
    },
    {
      id: 'e-6',
      name: 'Emergency Contacts & Copies',
      qty: 1,
      packed: false,
      category: 'Essentials',
    },

    // Toiletries
    {
      id: 't-1',
      name: 'Toothbrush & Travel Toothpaste',
      qty: 1,
      packed: false,
      category: 'Toiletries',
    },
    {
      id: 't-2',
      name: 'Shampoo & Body Soap',
      qty: 1,
      packed: false,
      category: 'Toiletries',
    },
    { id: 't-3', name: 'Deodorant', qty: 1, packed: false, category: 'Toiletries' },
    {
      id: 't-4',
      name: 'Sunscreen & Lip Balm',
      qty: 1,
      packed: false,
      category: 'Toiletries',
    },
    {
      id: 't-5',
      name: 'Hairbrush & Styling Essentials',
      qty: 1,
      packed: false,
      category: 'Toiletries',
    },
    {
      id: 't-6',
      name: 'Hand Sanitizer & Wet Wipes',
      qty: 1,
      packed: false,
      category: 'Toiletries',
    },
    {
      id: 't-7',
      name: 'Personal Medication & First Aid',
      qty: 1,
      packed: false,
      category: 'Toiletries',
    },

    // Electronics
    {
      id: 'el-1',
      name: 'Smartphone & Charging Cable',
      qty: 1,
      packed: false,
      category: 'Electronics',
    },
    {
      id: 'el-2',
      name: 'High-Capacity Power Bank',
      qty: 1,
      packed: false,
      category: 'Electronics',
    },
    {
      id: 'el-3',
      name: 'Universal Travel Adapter Plug',
      qty: 1,
      packed: false,
      category: 'Electronics',
    },
    {
      id: 'el-4',
      name: 'Earphones / Headphones',
      qty: 1,
      packed: false,
      category: 'Electronics',
    },

    // Documents
    {
      id: 'd-1',
      name: 'Flight Boarding Passes / E-Tickets',
      qty: 1,
      packed: false,
      category: 'Documents',
    },
    {
      id: 'd-2',
      name: 'Hotel & Tour Booking Vouchers',
      qty: 1,
      packed: false,
      category: 'Documents',
    },
    {
      id: 'd-3',
      name: 'Travel Insurance Documents',
      qty: 1,
      packed: false,
      category: 'Documents',
    },
    {
      id: 'd-4',
      name: 'Driver’s License / International Permit',
      qty: 1,
      packed: false,
      category: 'Documents',
    },
  ];
}

export default function TripPacking() {
  const { tripId } = useParams<{ tripId: string }>();
  const outlet = useOutletContext<TripWorkspaceOutletContext | undefined>();
  const cachedTrip = outlet?.trip || (tripId ? getCachedTrip(tripId) : null);

  const [trip, setTrip] = useState<Trip | null>(() => cachedTrip);
  const [loading, setLoading] = useState(() => !cachedTrip);

  const [activeCategory, setActiveCategory] = useState<string>('Clothing');
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    if (!tripId) return [];
    try {
      const stored = localStorage.getItem(`lakbye_packing_custom_cats_${tripId}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [items, setItems] = useState<PackingItem[]>(() => {
    if (!tripId) return [];
    try {
      const stored = localStorage.getItem(`lakbye_packing_items_${tripId}`);
      if (stored) return JSON.parse(stored);
      if (cachedTrip) return generateDefaultItems(cachedTrip.nights || 3);
    } catch {
      /* ignore */
    }
    return cachedTrip ? generateDefaultItems(cachedTrip.nights || 3) : [];
  });

  // Add Item / Category inputs
  const [newItemName, setNewItemName] = useState('');
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Export State
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportSuccess, setIsExportSuccess] = useState(false);

  const storageKey = `lakbye_packing_items_${tripId}`;
  const customCatKey = `lakbye_packing_custom_cats_${tripId}`;

  // 1. Fetch Trip Data
  useEffect(() => {
    if (!tripId) return;
    let cancelled = false;

    const fetchTrip = async () => {
      if (!cachedTrip) {
        setLoading(true);
      }
      try {
        const apiTrip = await tripsApi.getTrip(tripId);
        if (cancelled) return;
        const merged = mergeTripWithExtras(apiTrip);
        setCachedTrip(tripId, merged);
        setTrip(merged);
        if (outlet?.setTrip) outlet.setTrip(merged);

        // Load custom categories
        const storedCats = localStorage.getItem(customCatKey);
        if (storedCats) {
          try {
            setCustomCategories(JSON.parse(storedCats));
          } catch {
            setCustomCategories([]);
          }
        }

        // Load or initialize packing items
        const storedItems = localStorage.getItem(storageKey);
        if (storedItems) {
          try {
            setItems(JSON.parse(storedItems));
          } catch {
            setItems(generateDefaultItems(merged.nights || 3));
          }
        } else {
          const defaults = generateDefaultItems(merged.nights || 3);
          setItems(defaults);
          localStorage.setItem(storageKey, JSON.stringify(defaults));
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to fetch trip for packing:', err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTrip();
    return () => {
      cancelled = true;
    };
  }, [tripId, storageKey, customCatKey, cachedTrip, outlet]);

  const allCategories = useMemo(() => {
    return [...BUILTIN_CATEGORIES, ...customCategories];
  }, [customCategories]);

  // Persist items
  const persistItems = (updated: PackingItem[]) => {
    setItems(updated);
    if (tripId) {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    }
  };

  // Toggle item packed status
  const handleToggleItem = (id: string) => {
    const updated = items.map((i) => (i.id === id ? { ...i, packed: !i.packed } : i));
    persistItems(updated);
  };

  // Update item quantity
  const handleUpdateQty = (id: string, delta: number) => {
    const updated = items.map((i) => {
      if (i.id === id) {
        const newQty = Math.max(1, i.qty + delta);
        return { ...i, qty: newQty };
      }
      return i;
    });
    persistItems(updated);
  };

  // Delete item
  const handleDeleteItem = (id: string) => {
    const updated = items.filter((i) => i.id !== id);
    persistItems(updated);
  };

  // Add Item
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newItemName.trim();
    if (!cleanName) return;

    const newItem: PackingItem = {
      id: `item-${Date.now()}`,
      name: cleanName,
      qty: 1,
      packed: false,
      category: activeCategory,
    };

    const updated = [...items, newItem];
    persistItems(updated);
    setNewItemName('');
  };

  // Select Predefined Category from Modal
  const handleSelectPredefinedCategory = (cat: PredefinedCategory) => {
    if (!allCategories.includes(cat.name)) {
      const updatedCats = [...customCategories, cat.name];
      setCustomCategories(updatedCats);
      if (tripId) {
        localStorage.setItem(customCatKey, JSON.stringify(updatedCats));
      }

      // Add default items for this category
      const newItems: PackingItem[] = cat.defaultItems.map((item, idx) => ({
        id: `${cat.name.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now()}-${idx}`,
        name: item.name,
        qty: item.qty,
        packed: false,
        category: cat.name,
      }));

      const updatedItems = [...items, ...newItems];
      persistItems(updatedItems);
    }

    setActiveCategory(cat.name);
    setNewCategoryName('');
    setShowCustomInput(false);
    setIsAddCategoryModalOpen(false);
  };

  // Add Custom Category / List
  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCat = newCategoryName.trim();
    if (!cleanCat) return;

    if (!allCategories.includes(cleanCat)) {
      const updatedCats = [...customCategories, cleanCat];
      setCustomCategories(updatedCats);
      if (tripId) {
        localStorage.setItem(customCatKey, JSON.stringify(updatedCats));
      }
    }
    setActiveCategory(cleanCat);
    setNewCategoryName('');
    setShowCustomInput(false);
    setIsAddCategoryModalOpen(false);
  };

  // Delete Custom Category
  const handleDeleteCategory = (catToDelete: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete the list "${catToDelete}" and all its items?`,
      )
    ) {
      return;
    }
    const updatedCats = customCategories.filter((c) => c !== catToDelete);
    setCustomCategories(updatedCats);
    if (tripId) {
      localStorage.setItem(customCatKey, JSON.stringify(updatedCats));
    }
    const updatedItems = items.filter((i) => i.category !== catToDelete);
    persistItems(updatedItems);
    setActiveCategory(BUILTIN_CATEGORIES[0]);
  };

  // Reset category items to defaults
  const handleResetCategory = () => {
    if (!window.confirm(`Reset "${activeCategory}" to recommended items?`)) return;
    const defaults = generateDefaultItems(trip?.nights || 3).filter(
      (i) => i.category === activeCategory,
    );
    const otherItems = items.filter((i) => i.category !== activeCategory);
    const updated = [...otherItems, ...defaults];
    persistItems(updated);
  };

  // Progress Calculations
  const totalItemsCount = items.length;
  const packedItemsCount = items.filter((i) => i.packed).length;
  const overallProgress =
    totalItemsCount > 0 ? Math.round((packedItemsCount / totalItemsCount) * 100) : 0;

  const categoryItems = useMemo(() => {
    return items.filter((i) => i.category === activeCategory);
  }, [items, activeCategory]);

  const categoryPackedCount = categoryItems.filter((i) => i.packed).length;
  const categoryProgress =
    categoryItems.length > 0
      ? Math.round((categoryPackedCount / categoryItems.length) * 100)
      : 0;

  // PDF Export Function
  const handleExportPdf = () => {
    if (!trip) return;
    setIsExportingPdf(true);

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const primaryColor: [number, number, number] = [197, 40, 61]; // #c5283d
      const darkColor: [number, number, number] = [15, 23, 42];

      // Top brand bar
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, 210, 8, 'F');

      // Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(...darkColor);
      doc.text('LakBye Travel Planner', 15, 22);

      doc.setFontSize(14);
      doc.setTextColor(...primaryColor);
      doc.text('Packing Checklist & Inventory', 15, 30);

      // Trip details
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...darkColor);
      doc.text(`Trip: ${trip.name}`, 15, 42);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      const datesStr =
        trip.startDate && trip.endDate
          ? `${formatTripDateRange(trip.startDate, trip.endDate)} (${trip.nights || 0} nights)`
          : `${trip.nights || 0} nights planned`;
      doc.text(`Travel Dates: ${datesStr}`, 15, 48);
      doc.text(
        `Progress: ${packedItemsCount} of ${totalItemsCount} Packed (${overallProgress}%)`,
        15,
        54,
      );

      // Table of items
      const tableRows = items.map((item, idx) => [
        (idx + 1).toString(),
        item.category,
        item.name,
        `${item.qty}x`,
        item.packed ? '[X] Packed' : '[ ] Unpacked',
      ]);

      autoTable(doc, {
        startY: 60,
        head: [['#', 'Category', 'Item Name', 'Qty', 'Status']],
        body: tableRows,
        theme: 'striped',
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
        },
        styles: {
          font: 'helvetica',
          fontSize: 8.5,
          cellPadding: 3,
        },
      });

      const safeFilename = `${trip.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_Packing_List.pdf`;
      doc.save(safeFilename);
      setIsExportSuccess(true);
      setTimeout(() => setIsExportSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to generate packing PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (loading && !trip) {
    return (
      <div className="workspace-page packing-workspace-page">
        <div
          className="workspace-main-card"
          style={{ padding: '40px', textAlign: 'center' }}
        >
          Loading packing checklist...
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div
        className="workspace-page"
        style={{ justifyContent: 'center', alignItems: 'center', display: 'flex' }}
      >
        <div className="dashboard-empty-state">
          <h3 className="dashboard-empty-title">Trip Not Found</h3>
          <p className="dashboard-empty-text">The requested trip could not be loaded.</p>
          <Link to="/dashboard" className="btn-create-trip dashboard-btn-create">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-page packing-workspace-page">
      {/* Workspace Header matching Planner & Budget pages */}
      <header className="workspace-header-card animate-slide-up">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shrink-0"></span>
          <h1 className="workspace-trip-title">{trip.name}</h1>
        </div>

        <div className="workspace-header-actions">
          <div className="workspace-pill-date">
            {formatTripDateRange(trip.startDate, trip.endDate)}
          </div>

          <button
            type="button"
            onClick={handleExportPdf}
            className="workspace-share-btn"
            title="Export packing checklist to PDF"
          >
            {isExportSuccess
              ? 'Exported!'
              : isExportingPdf
                ? 'Exporting...'
                : 'Export PDF'}
          </button>
        </div>
      </header>

      {/* Main Two-Zone Card */}
      <div className="workspace-main-card packing-main-card animate-slide-up delay-150">
        {/* Left Zone: Packing Lists / Categories */}
        <div className="packing-left-zone">
          <div className="packing-left-header">
            <h2 className="packing-section-title">Packing list</h2>
            <button
              type="button"
              onClick={() => {
                setShowCustomInput(false);
                setNewCategoryName('');
                setIsAddCategoryModalOpen(true);
              }}
              className="packing-new-list-btn"
            >
              <Plus size={14} /> New list
            </button>
          </div>

          {/* Overall Progress Bar */}
          <div className="packing-progress-container">
            <div className="packing-progress-info">
              <span className="packing-progress-percentage">{overallProgress}%</span>
            </div>
            <div className="packing-progress-track">
              <div
                className="packing-progress-fill"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>

          {/* Categories Grid */}
          <div className="packing-categories-grid">
            {allCategories.map((cat) => {
              const isSelected = activeCategory === cat;
              const catItems = items.filter((i) => i.category === cat);
              const packedCatItems = catItems.filter((i) => i.packed);
              const IconComponent = getCategoryIcon(cat);

              return (
                <div
                  key={cat}
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveCategory(cat)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setActiveCategory(cat);
                    }
                  }}
                  className={`packing-category-card ${isSelected ? 'active' : ''}`}
                >
                  <div className="packing-cat-icon-wrap">
                    <IconComponent size={19} />
                  </div>
                  <h3 className="packing-cat-title" title={cat}>
                    {cat}
                  </h3>
                  <span className="packing-cat-count">
                    {packedCatItems.length} / {catItems.length}
                  </span>
                </div>
              );
            })}

            {/* Add a list Card */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                setShowCustomInput(false);
                setNewCategoryName('');
                setIsAddCategoryModalOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setShowCustomInput(false);
                  setNewCategoryName('');
                  setIsAddCategoryModalOpen(true);
                }
              }}
              className="packing-category-card packing-category-card--add"
            >
              <div className="packing-cat-icon-wrap packing-cat-icon-wrap--add">
                <Plus size={18} />
              </div>
              <h3 className="packing-cat-title">New list</h3>
              <span className="packing-cat-subtext">Add a list</span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="workspace-vertical-divider"></div>

        {/* Right Zone: Items Checklist */}
        <div className="packing-right-zone">
          <div className="packing-right-header">
            <div>
              <h2 className="packing-right-title">{activeCategory}</h2>
              <span className="packing-right-subtitle">
                {categoryPackedCount} of {categoryItems.length} packed
              </span>
            </div>

            <div className="packing-right-actions">
              <button
                type="button"
                onClick={handleResetCategory}
                className="packing-icon-btn"
                title="Reset recommended items in this category"
                aria-label="Reset items"
              >
                <RotateCcw size={15} />
              </button>

              {!BUILTIN_CATEGORIES.includes(activeCategory) && (
                <button
                  type="button"
                  onClick={() => handleDeleteCategory(activeCategory)}
                  className="packing-icon-btn packing-icon-btn--danger"
                  title="Delete this custom list"
                  aria-label="Delete list"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>

          {/* Category Progress Bar */}
          <div className="packing-progress-container">
            <div className="packing-progress-info">
              <span className="packing-progress-percentage">{categoryProgress}%</span>
            </div>
            <div className="packing-progress-track">
              <div
                className="packing-progress-fill"
                style={{ width: `${categoryProgress}%` }}
              />
            </div>
          </div>

          {/* Items Checklist List */}
          <div className="packing-items-scroll-area">
            {categoryItems.map((item) => (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                className={`packing-item-row ${item.packed ? 'packed' : ''}`}
                onClick={() => handleToggleItem(item.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleToggleItem(item.id);
                  }
                }}
              >
                <div className="packing-item-checkbox">
                  {item.packed ? (
                    <CheckCircle2 size={19} className="text-emerald-600 shrink-0" />
                  ) : (
                    <Circle size={19} className="text-slate-300 shrink-0" />
                  )}
                </div>

                <span className="packing-item-name">{item.name}</span>

                <span className="packing-item-qty-badge">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUpdateQty(item.id, -1);
                    }}
                    className="packing-qty-stepper-btn"
                    title="Decrease quantity"
                  >
                    -
                  </button>
                  <span>{item.qty}x</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUpdateQty(item.id, 1);
                    }}
                    className="packing-qty-stepper-btn"
                    title="Increase quantity"
                  >
                    +
                  </button>
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteItem(item.id);
                  }}
                  className="packing-item-delete-btn"
                  title="Delete item"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}

            {categoryItems.length === 0 && (
              <div className="packing-empty-state">
                <p>No items in {activeCategory} yet. Add one below!</p>
              </div>
            )}
          </div>

          {/* Bottom Add Item Input */}
          <form onSubmit={handleAddItem} className="packing-add-item-form">
            <Plus size={16} className="packing-add-item-icon" />
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder={`Add item to ${activeCategory}...`}
              className="packing-add-item-input"
            />
            {newItemName.trim() && (
              <button type="submit" className="workspace-add-btn">
                Add +
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Select Categories / Create New List Modal */}
      {isAddCategoryModalOpen && (
        <div
          className="packing-modal-overlay animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="select-categories-title"
        >
          <div
            className="packing-modal-backdrop"
            onClick={() => setIsAddCategoryModalOpen(false)}
            aria-hidden="true"
          />

          <div className="packing-category-modal-card animate-slide-up">
            {/* Modal Header */}
            <div className="packing-cat-modal-header">
              <h3 id="select-categories-title" className="packing-cat-modal-title">
                Select categories
              </h3>

              <div className="packing-cat-modal-header-actions">
                <button
                  type="button"
                  onClick={() => setShowCustomInput((prev) => !prev)}
                  className="packing-create-custom-btn"
                >
                  <Plus size={15} />
                  <span>Create custom list</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsAddCategoryModalOpen(false)}
                  className="packing-cat-modal-close-btn"
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Inline Custom List Form (when toggled) */}
            {showCustomInput && (
              <form
                onSubmit={handleCreateCategory}
                className="packing-custom-list-inline-form animate-fade-in"
              >
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Enter custom list name (e.g. Scuba Diving)..."
                  className="packing-custom-list-input"
                />
                <button
                  type="submit"
                  disabled={!newCategoryName.trim()}
                  className="packing-custom-list-submit-btn"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomInput(false);
                    setNewCategoryName('');
                  }}
                  className="packing-custom-list-cancel-btn"
                >
                  Cancel
                </button>
              </form>
            )}

            {/* Predefined Categories 2-Column Grid matching reference image */}
            <div className="packing-predefined-grid">
              {PREDEFINED_CATEGORIES.map((cat) => {
                const isAdded = allCategories.includes(cat.name);
                const IconComp = cat.icon;

                return (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => handleSelectPredefinedCategory(cat)}
                    className={`packing-predefined-item ${isAdded ? 'is-added' : ''}`}
                  >
                    <div className="packing-predefined-left">
                      <IconComp size={18} className="packing-predefined-icon" />
                      <span className="packing-predefined-name">{cat.name}</span>
                    </div>

                    <div className="packing-predefined-action">
                      {isAdded ? (
                        <span className="packing-predefined-badge added">
                          <Check size={12} /> added
                        </span>
                      ) : (
                        <span className="packing-predefined-badge select">select</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
