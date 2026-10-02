import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { computePopoverPosition } from '../lib/popover';

interface AnchoredPopoverProps {
  anchorRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  className?: string;
  onClose: () => void;
  width?: number;
  estimatedHeight?: number;
  matchAnchorWidth?: boolean;
  role?: string;
  zIndex?: number;
}

export default function AnchoredPopover({
  anchorRef,
  children,
  className,
  onClose,
  width,
  estimatedHeight = 240,
  matchAnchorWidth = false,
  role,
  zIndex = 1200,
}: AnchoredPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({ visibility: 'hidden' });

  const reposition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const anchorRect = anchor.getBoundingClientRect();
    const measured = popoverRef.current?.getBoundingClientRect();
    const targetWidth = Math.min(
      width ??
        (matchAnchorWidth ? anchorRect.width : measured?.width || anchorRect.width),
      Math.max(0, window.innerWidth - 16),
    );
    const targetHeight = measured?.height || estimatedHeight;
    const position = computePopoverPosition(
      anchorRect,
      { width: targetWidth, height: targetHeight },
      { width: window.innerWidth, height: window.innerHeight },
    );

    setStyle({
      position: 'fixed',
      top: position.top,
      left: position.left,
      width: targetWidth,
      maxHeight: Math.max(120, window.innerHeight - 16),
      zIndex,
      visibility: 'visible',
    });
  }, [anchorRef, estimatedHeight, matchAnchorWidth, width, zIndex]);

  useLayoutEffect(() => {
    reposition();
  }, [reposition, children]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!anchorRef.current?.contains(target) && !popoverRef.current?.contains(target)) {
        onClose();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [anchorRef, onClose, reposition]);

  return createPortal(
    <div ref={popoverRef} className={className} style={style} role={role}>
      {children}
    </div>,
    document.body,
  );
}
