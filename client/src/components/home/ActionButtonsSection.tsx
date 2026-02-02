/**
 * ActionButtonsSection Component
 * 
 * Extracted from home.tsx to reduce file size.
 * Contains Preview, Spreadsheet, and Clear buttons.
 */

import { Button } from "@/components/ui/button";
import { Eye, Loader2 } from 'lucide-react';

export interface ActionButtonsSectionProps {
    onSpreadsheetClick: () => void;
    onPreviewClick: () => void;
    onClearClick: () => void;
    isOptimizing: boolean;
    isDisabled: boolean;
}

export function ActionButtonsSection({
    onSpreadsheetClick,
    onPreviewClick,
    onClearClick,
    isOptimizing,
    isDisabled,
}: ActionButtonsSectionProps) {
    return (
        <div className="flex flex-wrap justify-center gap-3 my-8">
            <Button
                type="button"
                onClick={onSpreadsheetClick}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/30"
                data-testid="button-spreadsheet"
            >
                <i className="fas fa-table mr-2"></i>
                Spreadsheet
            </Button>
            <Button
                type="button"
                onClick={onPreviewClick}
                className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:shadow-violet-500/30"
                data-testid="button-preview-cabinet"
                disabled={isOptimizing || isDisabled}
            >
                {isOptimizing ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Optimizing...
                    </>
                ) : (
                    <>
                        <Eye className="w-4 h-4 mr-2" />
                        Preview
                    </>
                )}
            </Button>
            <Button
                type="button"
                variant="outline"
                onClick={onClearClick}
                className="border-slate-300 text-slate-600 hover:bg-slate-50 font-medium px-6 py-2.5 rounded-xl transition-all"
                data-testid="button-clear-preview"
            >
                <i className="fas fa-eraser mr-2 text-slate-400"></i>
                Clear
            </Button>
        </div>
    );
}
