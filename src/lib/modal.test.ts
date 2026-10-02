import { describe, expect, it } from 'vitest';
import { canDismissModal } from './modal';

describe('modal dismissal', () => {
  it('allows ordinary close interactions', () => {
    expect(canDismissModal('escape')).toBe(true);
    expect(canDismissModal('backdrop')).toBe(true);
    expect(canDismissModal('close-button')).toBe(true);
    expect(canDismissModal('cancel')).toBe(true);
  });

  it('blocks dismissal during a critical operation', () => {
    expect(canDismissModal('escape', true)).toBe(false);
    expect(canDismissModal('backdrop', true)).toBe(false);
  });
});
