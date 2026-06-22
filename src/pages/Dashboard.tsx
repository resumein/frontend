import { useState } from 'react';
import { useUserStore } from '../store/userStore';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

export default function DashboardPage() {
  const user = useUserStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<string>('education');
  
  // Initially collapsed (floating buttons only, no preselected highlights)
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  if (!user) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '3rem', 
        color: 'var(--text-secondary)',
        backgroundColor: 'var(--bg-primary)',
        minHeight: '100vh'
      }}>
        Loading user session...
      </div>
    );
  }

  // Canva-style click handler for slim sidebar tabs
  const handleTabChange = (tabId: string) => {
    if (sidebarOpen && activeTab === tabId) {
      // Toggle closed if clicking the active tab again
      setSidebarOpen(false);
    } else {
      // Open and switch tab
      setSidebarOpen(true);
      setActiveTab(tabId);
    }
  };

  // Format tab ID to a friendly header label
  const getTabLabel = (id: string) => {
    return id.charAt(0).toUpperCase() + id.slice(1);
  };

  return (
    <div className="dashboard-container">
      <Navbar />
      <div className="dashboard-body">
        
        {/* Parent container wrapping both the slim tab bar and expanded panel */}
        <div className={`editor-sidebar-container ${sidebarOpen ? '' : 'collapsed'}`}>
          {/* Leftmost: Slim tab bar (floats when container is collapsed) */}
          <Sidebar 
            activeTab={activeTab} 
            sidebarOpen={sidebarOpen} 
            onTabChange={handleTabChange} 
          />
          
          {/* Middle: Expanded sidebar panel */}
          <div className={`editor-expanded-panel ${sidebarOpen ? '' : 'collapsed'}`}>
            <div className="panel-inner-content" key={activeTab}>
              <h2 style={{ 
                fontSize: '1.15rem', 
                fontWeight: 700, 
                color: 'var(--text-primary)', 
                marginBottom: '1rem',
                letterSpacing: '-0.02em'
              }}>
                {getTabLabel(activeTab)}
              </h2>
              
              {/* Workspace is kept empty for now, per design layout requirements */}
            </div>

            {/* Absolute circular button sitting on the panel border */}
            <button 
              className="sidebar-toggle-btn"
              onClick={() => setSidebarOpen(false)}
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              {/* Left arrow icon */}
              <svg viewBox="0 0 24 24">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
          </div>
        </div>

        {/* Rightmost: Main Workspace (Canvas area) */}
        <main className="dashboard-main">
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>
            Resume Workspace / Live Preview
          </p>
        </main>
      </div>
    </div>
  );
}