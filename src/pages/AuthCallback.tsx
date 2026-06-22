import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BaseAPI } from '../lib/network';
import { useUserStore } from '../store/userStore';

export default function AuthCallbackPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState("Authenticating with GitHub...");
    
    const setAuth = useUserStore((state) => state.setAuth);

    useEffect(() => {
        const code = searchParams.get("code");

        if (!code) {
            setStatus("Error: No authentication code provided by GitHub.");
            return;
        }

        BaseAPI.post("/api/auth", { code })
            .then((response) => {
                const data = response.data;
                
                if (data.token) {
                    setAuth(data.token, data.user); 
                    navigate("/dashboard");
                } else {
                    setStatus("Authentication failed: No token received.");
                }
            })
            .catch((error) => {
                console.error("Auth error:", error);
                setStatus("Failed to communicate with the server.");
            });
    }, [searchParams, navigate, setAuth]);

    return (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '50px' }}>
            <h2>{status}</h2>
        </div>
    );
}