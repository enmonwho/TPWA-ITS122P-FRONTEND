import type { ClipboardEvent, FormEvent, KeyboardEvent } from 'react';

export const noWhitespaceInputProps = {
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key.length === 1 && /\s/.test(event.key)) event.preventDefault();
  },
  onBeforeInput: (event: FormEvent<HTMLInputElement>) => {
    const inputEvent = event.nativeEvent as InputEvent;
    if (inputEvent.data && /\s/.test(inputEvent.data)) event.preventDefault();
  },
  onPaste: (event: ClipboardEvent<HTMLInputElement>) => {
    if (/\s/.test(event.clipboardData.getData('text'))) event.preventDefault();
  },
};
