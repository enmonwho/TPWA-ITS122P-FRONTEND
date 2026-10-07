import { describe, expect, it } from 'vitest';
import { getAutoFillRecommendations } from './tripAutoFill';

describe('Trip Planner activity autofill', () => {
  it('does not store a category label as a planned activity', () => {
    expect(getAutoFillRecommendations('Tokyo', 'Japan').activities).toBe('');
    expect(getAutoFillRecommendations('Boracay Island', 'Philippines').activities).toBe(
      '',
    );
  });
});
