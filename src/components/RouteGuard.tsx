// src/components/RouteGuards.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useUserStore } from '../store/userStore';

export function ProtectedRoute() {
    // Check if we have a token in the Zustand store
    const token = useUserStore((state) => state.token);

    // If no token, redirect them to the home page
    if (!token) {
        return <Navigate to="/" replace />;
    }

    // If token exists, render the nested child routes (the Outlet)
    return <Outlet />;
}

export function PublicRoute() {
    const token = useUserStore((state) => state.token);

    // If they already have a token, they don't need to see the Hero/Login page
    if (token) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
}