import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../lib/api';
import { useUserStore } from '../store/userStore';
import { getErrorMessage } from '../lib/network';
import Navbar from '../components/Navbar';

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

    authService.exchangeGithubCode(code)
      .then((data) => {
        if (data.token) {
          setAuth(data.token, data.user); 
          navigate("/dashboard");
        } else {
          setStatus("Authentication failed: No token received.");
        }
      })
      .catch((error) => {
        console.error("Auth error:", error);
        setStatus(getErrorMessage(error, "Failed to authenticate with GitHub"));
      });
  }, [searchParams, navigate, setAuth]);

  return (
    <div className="dashboard-container">
      <Navbar />
      <main className="dashboard-main" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '3rem 1.5rem'
      }}>
        <div style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          padding: '2.5rem 2rem',
          borderRadius: '10px',
          boxShadow: '0 8px 30px var(--shadow-color)',
          textAlign: 'center',
          maxWidth: '420px',
          width: '100%',
          transition: 'background-color var(--transition-speed) ease, border-color var(--transition-speed) ease, box-shadow var(--transition-speed) ease'
        }}>
          {status.startsWith("Error") || status.startsWith("Failed") || status.startsWith("Authentication failed") ? (
            /* Error Icon */
            <svg viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '3rem', height: '3rem', margin: '0 auto 1.25rem auto' }}>
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          ) : (
            /* Loading Spinner */
            <div className="spinner"></div>
          )}
          
          <h2 style={{ 
            fontSize: '1.35rem', 
            fontWeight: 700, 
            color: 'var(--text-primary)', 
            marginBottom: '0.5rem',
            letterSpacing: '-0.02em'
          }}>
            {status.startsWith("Error") || status.startsWith("Failed") || status.startsWith("Authentication failed") ? "Authentication Issue" : "Signing In"}
          </h2>
          <p style={{ 
            color: 'var(--text-secondary)', 
            fontSize: '0.9rem', 
            lineHeight: 1.5 
          }}>
            {status}
          </p>
        </div>
      </main>
    </div>
  );
}