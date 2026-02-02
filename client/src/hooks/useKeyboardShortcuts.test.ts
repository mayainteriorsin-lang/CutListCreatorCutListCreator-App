import { renderHook } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { useKeyboardShortcuts, KeyboardShortcut } from "@/hooks/useKeyboardShortcuts";

describe("useKeyboardShortcuts", () => {
    let handlersMap: Record<string, Mock>;

    beforeEach(() => {
        handlersMap = {
            ctrlN: vi.fn(),
            ctrlF: vi.fn(),
            escape: vi.fn(),
            ctrlShiftS: vi.fn(),
        };
    });

    const fireKeyboardEvent = (key: string, modifiers: { ctrl?: boolean; alt?: boolean; shift?: boolean } = {}) => {
        const event = new KeyboardEvent("keydown", {
            key,
            ctrlKey: modifiers.ctrl || false,
            altKey: modifiers.alt || false,
            shiftKey: modifiers.shift || false,
            bubbles: true,
            cancelable: true,
        });
        window.dispatchEvent(event);
        return event;
    };

    it("should trigger handler on correct key combination", () => {
        const shortcuts: KeyboardShortcut[] = [
            { key: "n", ctrl: true, handler: handlersMap.ctrlN, description: "New" },
        ];

        renderHook(() => useKeyboardShortcuts(shortcuts));

        fireKeyboardEvent("n", { ctrl: true });

        expect(handlersMap.ctrlN).toHaveBeenCalledTimes(1);
    });

    it("should not trigger handler without correct modifiers", () => {
        const shortcuts: KeyboardShortcut[] = [
            { key: "n", ctrl: true, handler: handlersMap.ctrlN, description: "New" },
        ];

        renderHook(() => useKeyboardShortcuts(shortcuts));

        fireKeyboardEvent("n"); // No Ctrl

        expect(handlersMap.ctrlN).not.toHaveBeenCalled();
    });

    it("should handle multiple shortcuts", () => {
        const shortcuts: KeyboardShortcut[] = [
            { key: "n", ctrl: true, handler: handlersMap.ctrlN, description: "New" },
            { key: "f", ctrl: true, handler: handlersMap.ctrlF, description: "Find" },
            { key: "Escape", handler: handlersMap.escape, description: "Close" },
        ];

        renderHook(() => useKeyboardShortcuts(shortcuts));

        fireKeyboardEvent("n", { ctrl: true });
        expect(handlersMap.ctrlN).toHaveBeenCalledTimes(1);
        expect(handlersMap.ctrlF).not.toHaveBeenCalled();

        fireKeyboardEvent("f", { ctrl: true });
        expect(handlersMap.ctrlF).toHaveBeenCalledTimes(1);

        fireKeyboardEvent("Escape");
        expect(handlersMap.escape).toHaveBeenCalledTimes(1);
    });

    it("should handle Ctrl+Shift combinations", () => {
        const shortcuts: KeyboardShortcut[] = [
            {
                key: "s",
                ctrl: true,
                shift: true,
                handler: handlersMap.ctrlShiftS,
                description: "Save As",
            },
        ];

        renderHook(() => useKeyboardShortcuts(shortcuts));

        // Ctrl+S (without Shift) should not trigger
        fireKeyboardEvent("s", { ctrl: true });
        expect(handlersMap.ctrlShiftS).not.toHaveBeenCalled();

        // Ctrl+Shift+S should trigger
        fireKeyboardEvent("s", { ctrl: true, shift: true });
        expect(handlersMap.ctrlShiftS).toHaveBeenCalledTimes(1);
    });

    it("should be case-insensitive for key matching", () => {
        const shortcuts: KeyboardShortcut[] = [
            { key: "n", ctrl: true, handler: handlersMap.ctrlN, description: "New" },
        ];

        renderHook(() => useKeyboardShortcuts(shortcuts));

        fireKeyboardEvent("N", { ctrl: true }); // Uppercase

        expect(handlersMap.ctrlN).toHaveBeenCalledTimes(1);
    });

    it("should prevent default browser behavior", () => {
        const shortcuts: KeyboardShortcut[] = [
            { key: "n", ctrl: true, handler: handlersMap.ctrlN, description: "New" },
        ];

        renderHook(() => useKeyboardShortcuts(shortcuts));

        const event = fireKeyboardEvent("n", { ctrl: true });

        expect(event.defaultPrevented).toBe(true);
    });

    it("should cleanup event listener on unmount", () => {
        const shortcuts: KeyboardShortcut[] = [
            { key: "n", ctrl: true, handler: handlersMap.ctrlN, description: "New" },
        ];

        const { unmount } = renderHook(() => useKeyboardShortcuts(shortcuts));

        unmount();

        fireKeyboardEvent("n", { ctrl: true });

        expect(handlersMap.ctrlN).not.toHaveBeenCalled();
    });
});
