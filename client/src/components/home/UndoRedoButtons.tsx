/**
 * UndoRedoButtons Component
 * 
 * Extracted from home.tsx. Provides undo/redo controls for cabinet operations.
 */

import { Button } from "@/components/ui/button";

export interface UndoRedoButtonsProps {
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
}

export function UndoRedoButtons({
    canUndo,
    canRedo,
    onUndo,
    onRedo,
}: UndoRedoButtonsProps) {
    return (
        <div className="flex gap-2 justify-end">
            <Button
                variant="outline"
                size="sm"
                disabled={!canUndo}
                onClick={onUndo}
                title="Undo (Ctrl+Z)"
                className="rounded-lg border-slate-200 text-slate-600 hover:bg-slate-50"
            >
                <i className="fas fa-undo mr-1.5 text-slate-400"></i>
                Undo
            </Button>
            <Button
                variant="outline"
                size="sm"
                disabled={!canRedo}
                onClick={onRedo}
                title="Redo (Ctrl+Y)"
                className="rounded-lg border-slate-200 text-slate-600 hover:bg-slate-50"
            >
                <i className="fas fa-redo mr-1.5 text-slate-400"></i>
                Redo
            </Button>
        </div>
    );
}
