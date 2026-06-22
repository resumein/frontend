import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
    name: string;
    username: string;
    email: string;
}

interface UserState {
    token: string | null;
    user: User | null;
    setAuth: (token: string, user: User) => void;
    clearAuth: () => void;
}

export const useUserStore = create<UserState>()(
    persist(
        (set) => ({
            token: null,
            user: null,
            setAuth: (token, user) => set({ token, user }),
            clearAuth: () => set({ token: null, user: null }),
        }),
        {
            name: 'auth',
        }
    )
);