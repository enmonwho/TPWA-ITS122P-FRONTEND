import { useEffect } from 'react';
import { canDismissModal } from '../lib/modal';

export function useModalBehavior(
  isOpen: boolean,
  onClose: () => void,
  operationInProgress = false,
) {
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && canDismissModal('escape', operationInProgress)) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [isOpen, onClose, operationInProgress]);
}
