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

  it('centers the popover horizontally against a horizontal anchor', () => {
    const result = computePopoverPosition(
      { top: 360, right: 945, bottom: 404, left: 495, width: 450, height: 44 },
      { width: 590, height: 360 },
      { width: 1440, height: 900 },
      8,
      8,
      'center',
      { top: 160, right: 983, bottom: 650, left: 457, width: 526, height: 490 },
    );
    // Modal center is 457 + 526/2 = 720.
    // Popover left should be 720 - 590/2 = 425.
    expect(result.left).toBe(425);
    expect(result.top).toBe(412);
    expect(result.placement).toBe('bottom');
  });
});
