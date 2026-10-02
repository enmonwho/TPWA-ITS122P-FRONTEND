import { describe, expect, it } from 'vitest';
import {
  filterPackingItems,
  getPackingCountryScopes,
  isValidPackingScope,
  normalizePackingQuantity,
} from './packing';

const items = [
  { id: 1, category: 'Essentials', packed: false, destination: 'Overall Trip' },
  { id: 2, category: 'Clothing', packed: true, destination: 'Country: Japan' },
  { id: 3, category: 'Clothing', packed: false, destination: 'Country: South Korea' },
];

describe('packing filters and add-item validation', () => {
  it('uses canonical trip countries for scope values', () => {
    const scopes = getPackingCountryScopes([
      { countryId: 'japan', name: 'Japan', order: 1 },
      { countryId: 'south-korea', name: 'South Korea', order: 0 },
      'Korea, South',
    ]);
    expect(scopes).toEqual(['Country: South Korea', 'Country: Japan']);
    expect(isValidPackingScope('Country: Spain', scopes)).toBe(false);
    expect(isValidPackingScope('Overall Trip', scopes)).toBe(true);
  });

  it('filters by live status and scope without retaining stale items', () => {
    expect(
      filterPackingItems(items, 'All Items', 'Packed', 'All').map((item) => item.id),
    ).toEqual([2]);
    expect(filterPackingItems(items, 'All Items', 'Unpacked', 'Country: Japan')).toEqual(
      [],
    );
    expect(
      filterPackingItems(items, 'Clothing', 'Unpacked', 'Country: South Korea').map(
        (item) => item.id,
      ),
    ).toEqual([3]);
  });

  it('prevents invalid or negative quantities', () => {
    expect(normalizePackingQuantity(-4)).toBe(1);
    expect(normalizePackingQuantity(Number.NaN)).toBe(1);
    expect(normalizePackingQuantity(2.9)).toBe(2);
  });
});
