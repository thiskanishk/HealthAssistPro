import { useCallback } from 'react';

interface A11yKeyboardProps {
  onEnter?: (e: KeyboardEvent) => void;
  onSpace?: (e: KeyboardEvent) => void;
  onEscape?: (e: KeyboardEvent) => void;
  onArrowUp?: (e: KeyboardEvent) => void;
  onArrowDown?: (e: KeyboardEvent) => void;
  onArrowLeft?: (e: KeyboardEvent) => void;
  onArrowRight?: (e: KeyboardEvent) => void;
}

export const useA11yKeyboard = (props: A11yKeyboardProps) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Enter':
          props.onEnter?.(e);
          break;
        case ' ':
          props.onSpace?.(e);
          break;
        case 'Escape':
          props.onEscape?.(e);
          break;
        case 'ArrowUp':
          props.onArrowUp?.(e);
          break;
        case 'ArrowDown':
          props.onArrowDown?.(e);
          break;
        case 'ArrowLeft':
          props.onArrowLeft?.(e);
          break;
        case 'ArrowRight':
          props.onArrowRight?.(e);
          break;
      }
    },
    [props]
  );

  return { handleKeyDown };
}; 