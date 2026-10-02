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
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && canDismissModal('escape', operationInProgress)) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose, operationInProgress]);
}
