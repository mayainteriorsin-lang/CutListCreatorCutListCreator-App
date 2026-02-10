/**
 * HomeHeader
 * 
 * Header component for the home page with navigation and user actions.
 * Extracted from home.tsx to reduce complexity.
 */

import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface HomeHeaderProps {
    onLogout: () => void;
}

export function HomeHeader({ onLogout }: HomeHeaderProps) {
    const navigate = useNavigate();

    return (
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo & Brand */}
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                            <i className="fas fa-layer-group text-white text-sm"></i>
                        </div>
                        <div className="hidden sm:block">
                            <h1 className="text-lg font-bold text-slate-900 tracking-tight">CutList Pro</h1>
                            <p className="text-[10px] text-slate-500 -mt-0.5 font-medium">Precision Cutting Made Easy</p>
                        </div>
                    </div>

                    {/* Center Navigation */}
                    <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 rounded-full p-1">
                        <button
                            onClick={() => navigate("/visual-quotation")}
                            className="px-4 py-1.5 rounded-full text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-white transition-all duration-200"
                        >
                            <i className="fas fa-cube mr-2"></i>
                            Visual Quotation
                        </button>
                        <button
                            onClick={() => navigate("/crm")}
                            className="px-4 py-1.5 rounded-full text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-white transition-all duration-200"
                        >
                            <i className="fas fa-users mr-2"></i>
                            CRM
                        </button>
                        <button
                            onClick={() => navigate("/library")}
                            className="px-4 py-1.5 rounded-full text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-white transition-all duration-200"
                        >
                            <i className="fas fa-book mr-2"></i>
                            Library
                        </button>
                        <button
                            className="px-4 py-1.5 rounded-full text-sm font-medium bg-white text-blue-600 shadow-sm"
                        >
                            <i className="fas fa-layer-group mr-2"></i>
                            CutList
                        </button>
                    </nav>

                    {/* Right Actions */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate("/settings")}
                            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all duration-200"
                        >
                            <i className="fas fa-cog"></i>
                            <span className="hidden lg:inline">Settings</span>
                        </button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onLogout}
                            className="text-slate-600 hover:text-red-600 hover:bg-red-50"
                        >
                            <i className="fas fa-sign-out-alt mr-2"></i>
                            <span className="hidden sm:inline">Logout</span>
                        </Button>
                    </div>
                </div>
            </div>
        </header>
    );
}
