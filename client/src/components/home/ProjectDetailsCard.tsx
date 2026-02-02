/**
 * ProjectDetailsCard Component
 * 
 * Extracted from home.tsx to reduce file size and improve maintainability.
 * Handles client name and room selection for projects.
 */

import { forwardRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff } from 'lucide-react';

export interface ProjectDetailsCardProps {
    visible: boolean;
    onToggleVisible: () => void;
    clientName: string;
    setClientName: (v: string) => void;
    selectedRoom: string;
    setSelectedRoom: (v: string) => void;
    customRoomName: string;
    setCustomRoomName: (v: string) => void;
    onSave: () => void;
    canSave: boolean;
    disabled?: boolean;
}

export const ProjectDetailsCard = forwardRef<HTMLDivElement, ProjectDetailsCardProps>(({
    visible,
    onToggleVisible,
    clientName,
    setClientName,
    selectedRoom,
    setSelectedRoom,
    customRoomName,
    setCustomRoomName,
    onSave,
    canSave,
    disabled = false,
}, ref) => {
    return (
        <Card ref={ref} className="bg-white/70 backdrop-blur-sm border-slate-200/60 shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden">
            <CardHeader className="px-5 sm:px-6 py-4 bg-gradient-to-r from-blue-50 to-transparent border-b border-slate-100">
                <CardTitle className="flex items-center justify-between text-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                            <i className="fas fa-folder-open text-white text-xs"></i>
                        </div>
                        <span className="text-base font-semibold">Project Details</span>
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
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                            <div className="space-y-2">
                                <Label>Client Name</Label>
                                <Input
                                    type="text"
                                    value={clientName}
                                    onChange={(e) => setClientName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && canSave) {
                                            onSave();
                                        }
                                    }}
                                    placeholder="Enter client name (press Enter to save)"
                                    disabled={disabled}
                                    className="text-sm"
                                    data-testid="input-client-name"
                                />
                                {clientName.trim() && (
                                    <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                                        <i className="fas fa-folder text-blue-500"></i>
                                        <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                                            /clients/{clientName.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')}/
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label>Room</Label>
                                <div className="flex space-x-1">
                                    <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                                        <SelectTrigger className="text-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Kitchen">Kitchen</SelectItem>
                                            <SelectItem value="Bedroom">Bedroom</SelectItem>
                                            <SelectItem value="Living Room">Living Room</SelectItem>
                                            <SelectItem value="Bathroom">Bathroom</SelectItem>
                                            <SelectItem value="Office">Office</SelectItem>
                                            <SelectItem value="Custom">Custom</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {selectedRoom === 'Custom' && (
                                        <Input
                                            type="text"
                                            value={customRoomName}
                                            onChange={(e) => setCustomRoomName(e.target.value)}
                                            placeholder="Room name"
                                            className="text-sm"
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            )}
        </Card>
    );
});

ProjectDetailsCard.displayName = 'ProjectDetailsCard';
