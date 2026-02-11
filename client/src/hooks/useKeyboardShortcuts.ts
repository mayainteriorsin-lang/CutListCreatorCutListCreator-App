import { useEffect } from "react";

export type KeyboardShortcut = {
    key: string;
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean;
    handler: () => void;
    description: string;
};

/**
 * Check if the active element is an input field where typing should be allowed
 */
function isTypingInInput(): boolean {
    const activeElement = document.activeElement;
    if (!activeElement) return false;

    const tagName = activeElement.tagName.toLowerCase();
    const isInput = tagName === 'input' || tagName === 'textarea' || tagName === 'select';
    const isContentEditable = activeElement.getAttribute('contenteditable') === 'true';

    return isInput || isContentEditable;
}

/**
 * Keys that should be ignored when user is typing in an input field
 */
const TEXT_EDITING_KEYS = ['backspace', 'delete', 'escape', 'enter', ' '];

/**
 * Custom hook for handling keyboard shortcuts
 * @param shortcuts - Array of keyboard shortcut configurations
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const keyLower = event.key.toLowerCase();

            // If user is typing in an input and the key is a text editing key without ctrl/alt,
            // don't trigger shortcuts (allow normal text editing)
            if (isTypingInInput() && TEXT_EDITING_KEYS.includes(keyLower) && !event.ctrlKey && !event.altKey) {
                return;
            }

            for (const shortcut of shortcuts) {
                const ctrlMatch = shortcut.ctrl === undefined || shortcut.ctrl === event.ctrlKey;
                const altMatch = shortcut.alt === undefined || shortcut.alt === event.altKey;
                const shiftMatch = shortcut.shift === undefined || shortcut.shift === event.shiftKey;
                const keyMatch = keyLower === shortcut.key.toLowerCase();

                if (ctrlMatch && altMatch && shiftMatch && keyMatch) {
                    event.preventDefault();
                    shortcut.handler();
                    break;
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [shortcuts]);
}
