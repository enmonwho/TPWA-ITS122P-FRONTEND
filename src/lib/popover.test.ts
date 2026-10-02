import { describe, expect, it } from 'vitest';
import { computePopoverPosition } from './popover';

describe('anchored popover positioning', () => {
  it('opens above when the viewport has insufficient room below', () => {
    expect(
      computePopoverPosition(
        { top: 700, right: 980, bottom: 730, left: 950, width: 30, height: 30 },
        { width: 180, height: 160 },
        { width: 1024, height: 768 },
      ),
    ).toEqual({ top: 532, left: 836, placement: 'top' });
  });

  it('clamps the panel inside a narrow viewport', () => {
    const result = computePopoverPosition(
      { top: 40, right: 370, bottom: 70, left: 350, width: 20, height: 30 },
      { width: 320, height: 200 },
      { width: 375, height: 667 },
    );
    expect(result.left).toBe(47);
    expect(result.placement).toBe('bottom');
  });
});
