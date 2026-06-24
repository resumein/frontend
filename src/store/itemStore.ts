import { create } from 'zustand';
import type { ResumeItem } from '../lib/api';

interface ItemState {
    items: ResumeItem[];
    loading: boolean;
    setItems: (items: ResumeItem[]) => void;
    addItem: (item: ResumeItem) => void;
    removeItem: (id: string) => void;
    updateItem: (item: ResumeItem) => void;
    setLoading: (loading: boolean) => void;
}

export const useItemStore = create<ItemState>((set) => ({
    items: [],
    loading: false,
    setItems: (items) => set({ items }),
    addItem: (item) => set((state) => ({ items: [item, ...state.items] })),
    removeItem: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
    updateItem: (updatedItem) => set((state) => ({
        items: state.items.map((item) => item.id === updatedItem.id ? updatedItem : item)
    })),
    setLoading: (loading) => set({ loading }),
}));
