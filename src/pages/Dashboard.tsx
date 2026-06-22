import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/userStore'; // Adjust path based on your folder structure

export default function DashboardPage() {
    const navigate = useNavigate();

    // 1. Extract exactly what you need from the store
    const user = useUserStore((state) => state.user);
    const clearAuth = useUserStore((state) => state.clearAuth);

    // 2. Handle the logout flow
    const handleLogout = () => {
        clearAuth();      // This wipes the token and user from memory AND localStorage instantly
        navigate('/');    // Send them back to the public homepage
    };

    // 3. TypeScript safety check
    // Even though your <ProtectedRoute /> ensures they have a token to get here,
    // TypeScript still knows `user` could theoretically be null based on your interface.
    if (!user) {
        return <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading user data...</div>;
    }

    // 4. Render the UI
    return (
        <main style={{ padding: '2rem', maxWidth: '600px', margin: '40px auto', fontFamily: 'sans-serif' }}>
            <h1>Dashboard</h1>
            
            <section style={{ 
                border: '1px solid #e5e7eb', 
                padding: '1.5rem', 
                borderRadius: '8px',
                marginTop: '1.5rem',
                backgroundColor: '#f9fafb'
            }}>
                <h2 style={{ marginTop: 0 }}>Welcome back, {user.name}!</h2>
                
                <div style={{ marginTop: '1rem', lineHeight: '1.6' }}>
                    <p style={{ margin: 0 }}>
                        <strong>Username:</strong> @{user.username}
                    </p>
                    <p style={{ margin: 0 }}>
                        <strong>Email:</strong> {user.email}
                    </p>
                </div>
            </section>

            <button 
                onClick={handleLogout}
                style={{ 
                    marginTop: '2rem', 
                    padding: '0.5rem 1rem', 
                    backgroundColor: '#ef4444', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '4px',
                    cursor: 'pointer'
                }}
            >
                Log Out
            </button>
        </main>
    );
}