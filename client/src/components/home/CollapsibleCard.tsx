/**
 * CollapsibleCard Component
 * 
 * A reusable collapsible card with consistent styling.
 * Used for Design Center and other similar sections.
 */

import { forwardRef, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from 'lucide-react';

export interface CollapsibleCardProps {
    title: string;
    icon: string;
    iconGradient: string;
    headerGradient: string;
    visible: boolean;
    onToggleVisible: () => void;
    children: ReactNode;
}

export const CollapsibleCard = forwardRef<HTMLDivElement, CollapsibleCardProps>(({
    title,
    icon,
    iconGradient,
    headerGradient,
    visible,
    onToggleVisible,
    children,
}, ref) => {
    return (
        <Card ref={ref} className="bg-white/70 backdrop-blur-sm border-slate-200/60 shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden">
            <CardHeader className={`px-5 sm:px-6 py-4 bg-gradient-to-r ${headerGradient} to-transparent border-b border-slate-100`}>
                <CardTitle className="flex items-center justify-between text-slate-800">
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${iconGradient} flex items-center justify-center`}>
                            <i className={`fas ${icon} text-white text-xs`}></i>
                        </div>
                        <span className="text-base font-semibold">{title}</span>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onToggleVisible}
                        className="h-8 w-8 p-0 rounded-full hover:bg-slate-100"
                    >
                        {visible ? <EyeOff className="w-4 h-4 text-slate-500" /> : <Eye className="w-4 h-4 text-slate-500" />}
                    </Button>
                </CardTitle>
            </CardHeader>
            {visible && (
                <CardContent className="px-5 sm:px-6 py-5">
                    {children}
                </CardContent>
            )}
        </Card>
    );
});

CollapsibleCard.displayName = 'CollapsibleCard';
