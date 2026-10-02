export type ModalDismissReason = 'escape' | 'backdrop' | 'close-button' | 'cancel';

export function canDismissModal(
  _reason: ModalDismissReason,
  operationInProgress = false,
): boolean {
  return !operationInProgress;
}
