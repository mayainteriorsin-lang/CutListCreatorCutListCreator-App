
import { create } from 'zustand';
import { apiRequest } from '@/lib/queryClient';
import { LaminateCodeGodown, MasterSettingsMemory, PlywoodBrandMemory } from '@shared/schema';

interface MaterialState {
    // Master Settings Data
    masterSettings: MasterSettingsMemory | null;
    plywoodOptions: PlywoodBrandMemory[];
    laminateOptions: LaminateCodeGodown[];

    // Loading States
    isLoadingMasterSettings: boolean;
    isLoadingMaterials: boolean;

    // Actions
    fetchMasterSettings: () => Promise<void>;
    saveMasterSettings: (settings: Partial<MasterSettingsMemory>) => Promise<void>;

    fetchMaterials: () => Promise<void>;

    // Optimistic updates + API calls
    addLaminate: (code: string, name?: string) => Promise<void>;
    addPlywood: (brand: string) => Promise<void>;
    removeLaminate: (code: string) => void;
    removePlywood: (brand: string) => void;
}

export const useMaterialStore = create<MaterialState>((set, get) => ({
    masterSettings: null,
    plywoodOptions: [],
    laminateOptions: [],

    isLoadingMasterSettings: false,
    isLoadingMaterials: false,

    fetchMasterSettings: async () => {
        set({ isLoadingMasterSettings: true });
        try {
            const response = await fetch('/api/master-settings');
            if (!response.ok) throw new Error('Failed to fetch master settings');
            const data = await response.json();
            set({ masterSettings: data });
        } catch (error) {
            console.error('Error fetching master settings:', error);
        } finally {
            set({ isLoadingMasterSettings: false });
        }
    },

    saveMasterSettings: async (settings) => {
        try {
            const current = get().masterSettings || {};
            const payload = {
                sheetWidth: settings.sheetWidth ?? (current as any).sheetWidth,
                sheetHeight: settings.sheetHeight ?? (current as any).sheetHeight,
                kerf: settings.kerf ?? (current as any).kerf,
                masterLaminateCode: settings.masterLaminateCode ?? (current as any).masterLaminateCode ?? null,
                optimizePlywoodUsage: (settings as any).optimizePlywoodUsage ?? (current as any).optimizePlywoodUsage
            };

            const response = await apiRequest('POST', '/api/master-settings', payload);
            const data = await response.json();
            set({ masterSettings: data });
        } catch (error) {
            console.error('Error saving master settings:', error);
        }
    },

    fetchMaterials: async () => {
        set({ isLoadingMaterials: true });
        try {
            const [plywoodRes, laminateRes] = await Promise.all([
                fetch('/api/godown/plywood'),
                fetch('/api/godown/laminate')
            ]);

            const plywoodData = await plywoodRes.json();
            const laminateData = await laminateRes.json();

            set({
                plywoodOptions: Array.isArray(plywoodData) ? plywoodData : [],
                laminateOptions: Array.isArray(laminateData) ? laminateData : []
            });
        } catch (error) {
            console.error('Error fetching materials:', error);
        } finally {
            set({ isLoadingMaterials: false });
        }
    },

    addLaminate: async (code, name) => {
        const codeName = name || code;
        const tempItem: LaminateCodeGodown = {
            id: -1,
            code,
            name: codeName,
            woodGrainsEnabled: 'false',
            createdAt: new Date(),
            updatedAt: new Date(),
            innerCode: null,
            supplier: null,
            thickness: null,
            description: null
        };

        set(state => ({
            laminateOptions: [...state.laminateOptions, tempItem]
        }));

        try {
            await apiRequest('POST', '/api/godown/laminate', { code: code, name: codeName });
            await get().fetchMaterials();
        } catch (error) {
            console.error('Error adding laminate:', error);
            set(state => ({
                laminateOptions: state.laminateOptions.filter(opt => opt.code !== code)
            }));
        }
    },

    addPlywood: async (brand) => {
        const tempItem: PlywoodBrandMemory = {
            id: -1,
            brand,
            createdAt: new Date()
        };

        set(state => ({
            plywoodOptions: [...state.plywoodOptions, tempItem]
        }));

        try {
            await apiRequest('POST', '/api/godown/plywood', { brand });
            await get().fetchMaterials();
        } catch (error) {
            console.error('Error adding plywood brand:', error);
            set(state => ({
                plywoodOptions: state.plywoodOptions.filter(opt => opt.brand !== brand)
            }));
        }
    },

    removeLaminate: async (code) => {
        const target = code.trim().toLowerCase();
        set(state => ({
            laminateOptions: state.laminateOptions.filter(opt => (opt.code || '').trim().toLowerCase() !== target)
        }));
        try {
            await apiRequest('DELETE', `/api/laminate-code-godown/${encodeURIComponent(code)}`);
        } catch (error) {
            console.error('Error removing laminate:', error);
            // Re-fetch to sync with server if delete failed
            get().fetchMaterials();
        }
    },

    removePlywood: async (brand) => {
        const target = brand.trim().toLowerCase();
        set(state => ({
            plywoodOptions: state.plywoodOptions.filter(opt => (opt.brand || '').trim().toLowerCase() !== target)
        }));
        try {
            await apiRequest('DELETE', `/api/plywood-brand-memory/${encodeURIComponent(brand)}`);
        } catch (error) {
            console.error('Error removing plywood:', error);
            get().fetchMaterials();
        }
    }
}));
