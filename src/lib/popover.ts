export interface PopoverRect {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
}

export interface PopoverPosition {
  top: number;
  left: number;
  placement: 'top' | 'bottom';
}

export function computePopoverPosition(
  anchor: PopoverRect,
  popover: { width: number; height: number },
  viewport: { width: number; height: number },
  gap = 8,
  margin = 8,
  horizontalAlign: 'left' | 'center' | 'right' = 'left',
  horizontalAnchor?: PopoverRect,
): PopoverPosition {
  const availableBelow = viewport.height - anchor.bottom - margin;
  const availableAbove = anchor.top - margin;
  const placement =
    availableBelow < popover.height + gap && availableAbove > availableBelow
      ? 'top'
      : 'bottom';

  const naturalTop =
    placement === 'top' ? anchor.top - popover.height - gap : anchor.bottom + gap;
  const maxTop = Math.max(margin, viewport.height - popover.height - margin);
  const top = Math.min(Math.max(naturalTop, margin), maxTop);

  const hRef = horizontalAnchor || anchor;
  let naturalLeft: number;
  if (horizontalAlign === 'center') {
    const hCenterX = hRef.left + hRef.width / 2;
    naturalLeft = hCenterX - popover.width / 2;
  } else if (horizontalAlign === 'right') {
    naturalLeft = hRef.right - popover.width;
  } else {
    naturalLeft = hRef.left;
  }

  const maxLeft = Math.max(margin, viewport.width - popover.width - margin);
  const left = Math.min(Math.max(naturalLeft, margin), maxLeft);

  return { top, left, placement };
}
