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
 * Custom hook for handling keyboard shortcuts
 * @param shortcuts - Array of keyboard shortcut configurations
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            for (const shortcut of shortcuts) {
                const ctrlMatch = shortcut.ctrl === undefined || shortcut.ctrl === event.ctrlKey;
                const altMatch = shortcut.alt === undefined || shortcut.alt === event.altKey;
                const shiftMatch = shortcut.shift === undefined || shortcut.shift === event.shiftKey;
                const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

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
