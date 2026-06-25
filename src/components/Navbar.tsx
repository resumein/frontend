import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/userStore';
import { useResumeStore } from '../store/resumeStore';
import { resumeService } from '../lib/api';
import { getErrorMessage } from '../lib/network';

interface NavbarProps {
  onSaveSuccess?: () => void;
}

export default function Navbar({ onSaveSuccess }: NavbarProps) {
  const navigate = useNavigate();
  const user = useUserStore((state) => state.user);
  const clearAuth = useUserStore((state) => state.clearAuth);

  const resumes = useResumeStore((state) => state.resumes);
  const selectedResumeId = useResumeStore((state) => state.selectedResumeId);
  const setSelectedResumeId = useResumeStore((state) => state.setSelectedResumeId);
  const setIsCreatingResume = useResumeStore((state) => state.setIsCreatingResume);

  const isDirty = useResumeStore((state) => state.isDirty);
  const activeContent = useResumeStore((state) => state.activeContent);
  const saveActiveContent = useResumeStore((state) => state.saveActiveContent);
  const [savingChanges, setSavingChanges] = useState(false);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [resumeDropdownOpen, setResumeDropdownOpen] = useState(false);
  const resumeDropdownRef = useRef<HTMLDivElement>(null);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'light';
  });

  const currentResume = resumes.find(r => r.id === selectedResumeId);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);

  // Click outside to close dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (resumeDropdownRef.current && !resumeDropdownRef.current.contains(event.target as Node)) {
        setResumeDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleLogout = () => {
    clearAuth();
    navigate('/');
  };

  const handlePrint = () => {
    const iframe = document.querySelector('.preview-iframe') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } else {
      alert('Could not find resume preview to print.');
    }
  };

  const handleSave = async () => {
    if (!selectedResumeId || !activeContent || !currentResume) return;
    setSavingChanges(true);
    try {
      const updated = await resumeService.updateResume(
        selectedResumeId,
        currentResume.filename,
        currentResume.template,
        activeContent,
        currentResume.jobDescription
      );
      saveActiveContent(updated);
      if (onSaveSuccess) {
        onSaveSuccess();
      }
    } catch (err) {
      console.error('Failed to save resume content:', err);
      alert(getErrorMessage(err, 'Failed to save resume content'));
    } finally {
      setSavingChanges(false);
    }
  };

  return (
    <nav className="navbar">
      <div className="logo-section-container" style={{ display: 'flex', alignItems: 'center', gap: '2.5rem' }}>
        <a href="/" className="logo" style={{ textDecoration: 'none' }}>
          resume<span>in</span>
        </a>

        {user && resumes.length > 0 && (
          <div className="resume-selector-container" ref={resumeDropdownRef}>
            <button
              className="resume-selector-btn"
              onClick={() => setResumeDropdownOpen(!resumeDropdownOpen)}
              aria-expanded={resumeDropdownOpen}
              aria-haspopup="true"
            >
              <svg className="resume-selector-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span className="resume-selector-name">{currentResume?.filename || 'Select Resume'}</span>
              <svg className={`resume-selector-arrow ${resumeDropdownOpen ? 'open' : ''}`} viewBox="0 0 24 24">
                <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {resumeDropdownOpen && (
              <div className="resume-selector-dropdown">
                <div className="dropdown-label">Select Resume</div>
                <div className="resume-list-scrollable">
                  {resumes.map((resume) => (
                    <button
                      key={resume.id}
                      className={`resume-dropdown-item ${resume.id === selectedResumeId ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedResumeId(resume.id);
                        setResumeDropdownOpen(false);
                      }}
                    >
                      <svg className="resume-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      <span className="resume-item-name">{resume.filename}</span>
                      {resume.id === selectedResumeId && (
                        <svg className="resume-item-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
                <hr className="dropdown-divider" />
                <button
                  className="resume-dropdown-item create-new"
                  onClick={() => {
                    setIsCreatingResume(true);
                    setResumeDropdownOpen(false);
                  }}
                >
                  <svg className="resume-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Create New Resume
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="nav-links">
        {isDirty && (
          <button
            onClick={handleSave}
            className="save-changes-btn"
            disabled={savingChanges}
          >
            {savingChanges ? 'Publishing...' : 'Publish'}
          </button>
        )}

        {selectedResumeId && (
          <button
            onClick={handlePrint}
            className="print-btn"
            title="Print or Save Resume as PDF"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '1rem', height: '1rem' }}>
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            Print
          </button>
        )}

        <button
          onClick={toggleTheme}
          className="theme-toggle-btn"
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? (
            /* Moon SVG */
            <svg viewBox="0 0 24 24">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
            </svg>
          ) : (
            /* Sun SVG */
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="4"></circle>
              <path d="M12 2v2"></path>
              <path d="M12 20v2"></path>
              <path d="M4.93 4.93l1.41 1.41"></path>
              <path d="M17.66 17.66l1.41 1.41"></path>
              <path d="M2 12h2"></path>
              <path d="M20 12h2"></path>
              <path d="M6.34 17.66l-1.41 1.41"></path>
              <path d="M19.07 4.93l-1.41 1.41"></path>
            </svg>
          )}
        </button>

        {user ? (
          /* Logged In - Profile Dropdown */
          <div className="profile-container" ref={dropdownRef}>
            <button
              className="profile-btn"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
            >
              <img
                src={`https://github.com/${user.username}.png`}
                alt={user.name}
                className="profile-avatar"
                onError={(e) => {
                  // Fallback avatar if GitHub user image fails
                  (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}`;
                }}
              />
            </button>

            {dropdownOpen && (
              <div className="dropdown-menu">
                <div className="dropdown-header">
                  <div className="dropdown-user-name">{user.name}</div>
                  <div className="dropdown-user-email">@{user.username}</div>
                </div>
                <hr className="dropdown-divider" />

                <button className="dropdown-item" onClick={() => console.log('Profile clicked')}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="dropdown-item-icon">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  Profile
                </button>

                <button className="dropdown-item" onClick={() => console.log('Settings clicked')}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="dropdown-item-icon">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                  </svg>
                  Settings
                </button>

                <hr className="dropdown-divider" />

                <button className="dropdown-item dropdown-item-logout" onClick={handleLogout}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="dropdown-item-icon">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  Log Out
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Public / Logged Out - GitHub Link */
          <a
            href="https://github.com/resumein"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-link-github"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.646.64.699 1.026 1.592 1.026 2.683 0 3.842-2.337 4.687-4.565 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
            <span>GitHub</span>
          </a>
        )}
      </div>
    </nav>
  );
}
