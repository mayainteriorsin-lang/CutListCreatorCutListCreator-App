import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useDebounce } from "@/hooks/useDebounce";

describe("useDebounce", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
    });

    it("should return initial value immediately", () => {
        const { result } = renderHook(() => useDebounce("initial", 500));
        expect(result.current).toBe("initial");
    });

    it("should debounce value changes", () => {
        const { result, rerender } = renderHook(
            ({ value, delay }) => useDebounce(value, delay),
            { initialProps: { value: "initial", delay: 500 } }
        );

        expect(result.current).toBe("initial");

        // Change value
        rerender({ value: "updated", delay: 500 });

        // Value shouldn't change immediately
        expect(result.current).toBe("initial");

        // Fast-forward time
        act(() => {
            vi.advanceTimersByTime(500);
        });

        // Now value should be updated
        expect(result.current).toBe("updated");
    });

    it("should cancel previous timer on rapid changes", () => {
        const { result, rerender } = renderHook(
            ({ value }) => useDebounce(value, 500),
            { initialProps: { value: "first" } }
        );

        rerender({ value: "second" });
        act(() => {
            vi.advanceTimersByTime(250);
        });

        rerender({ value: "third" });
        act(() => {
            vi.advanceTimersByTime(250);
        });

        // Should still be "first" because timers were cancelled
        expect(result.current).toBe("first");

        // Complete the timer
        act(() => {
            vi.advanceTimersByTime(250);
        });

        // Should now be "third"
        expect(result.current).toBe("third");
    });

    it("should use default delay of 300ms", () => {
        const { result, rerender } = renderHook(
            ({ value }) => useDebounce(value),
            { initialProps: { value: "initial" } }
        );

        rerender({ value: "updated" });

        act(() => {
            vi.advanceTimersByTime(299);
        });
        expect(result.current).toBe("initial");

        act(() => {
            vi.advanceTimersByTime(1);
        });
        expect(result.current).toBe("updated");
    });

    it("should handle number values", () => {
        const { result, rerender } = renderHook(
            ({ value }) => useDebounce(value, 300),
            { initialProps: { value: 0 } }
        );

        rerender({ value: 100 });

        act(() => {
            vi.advanceTimersByTime(300);
        });

        expect(result.current).toBe(100);
    });
});
