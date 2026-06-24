import { useState, useEffect } from 'react';
import { useUserStore } from '../store/userStore';
import { useItemStore } from '../store/itemStore';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { itemService } from '../lib/api';
import type {
  ResumeItem,
  EducationItem,
  ProjectItem,
  ExperienceItem,
  CertificationItem,
  AwardItem
} from '../lib/api';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function DashboardPage() {
  const user = useUserStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<string>('education');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // Zustand items store state
  const items = useItemStore((state) => state.items);
  const setItems = useItemStore((state) => state.setItems);
  const addItem = useItemStore((state) => state.addItem);
  const removeItem = useItemStore((state) => state.removeItem);
  const updateItem = useItemStore((state) => state.updateItem);
  const loadingItems = useItemStore((state) => state.loading);
  const setLoadingItems = useItemStore((state) => state.setLoading);

  // Local state for modals and forms
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [itemToEdit, setItemToEdit] = useState<ResumeItem | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // State for delete confirmation modal
  const [itemToDelete, setItemToDelete] = useState<ResumeItem | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  // Toast notifications state
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  // Fetch items on user login / mount
  useEffect(() => {
    if (user) {
      setLoadingItems(true);
      itemService.getItems()
        .then((data) => {
          setItems(data);
        })
        .catch((err) => {
          console.error("Failed to load user items:", err);
          showToast("Failed to load your resume items.", "error");
        })
        .finally(() => {
          setLoadingItems(false);
        });
    }
  }, [user, setItems, setLoadingItems]);

  const handleCloseForm = () => {
    setIsAdding(false);
    setItemToEdit(null);
  };

  // Escape key event listener to close modal dialogs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isAdding) {
          handleCloseForm();
        } else if (itemToDelete) {
          setItemToDelete(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAdding, itemToDelete]);

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
    handleCloseForm(); // Reset form modal on tab switch
    if (sidebarOpen && activeTab === tabId) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
      setActiveTab(tabId);
    }
  };

  // Format tab ID to a friendly header label
  const getTabLabel = (id: string) => {
    return id.charAt(0).toUpperCase() + id.slice(1);
  };

  // Format tab ID to a friendly singular modal title label
  const getModalTitleLabel = (tab: string) => {
    if (tab === 'projects') return 'Project';
    if (tab === 'certifications') return 'Certification';
    if (tab === 'awards') return 'Award';
    return getTabLabel(tab);
  };

  // Format Date string for display
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
    } catch (e) {
      return dateStr;
    }
  };

  // Format ISO date string into input tag value format (YYYY-MM-DD)
  const formatDateForInput = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toISOString().split('T')[0];
    } catch (e) {
      return '';
    }
  };

  // Filter items matching active category tab
  const activeItems = items.filter(item => {
    if (activeTab === 'projects') {
      return item.type === 'project';
    }
    if (activeTab === 'certifications') {
      return item.type === 'certification';
    }
    if (activeTab === 'awards') {
      return item.type === 'award';
    }
    return item.type === activeTab;
  });

  // Form submission handler (Creates or Updates an item)
  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      setSubmitting(true);

      // Map activeTab to payload type ('projects' -> 'project', etc.)
      let payload: any = {
        type: activeTab === 'projects' ? 'project' :
          activeTab === 'certifications' ? 'certification' :
            activeTab === 'awards' ? 'award' : activeTab
      };

      if (activeTab === 'education') {
        payload.school = formData.get('school') as string;
        payload.degree = formData.get('degree') as string;
        payload.field = formData.get('field') as string;

        const fromVal = formData.get('fromDate') as string;
        payload.fromDate = fromVal ? new Date(fromVal).toISOString() : '';

        const toVal = formData.get('toDate') as string;
        if (toVal) {
          payload.toDate = new Date(toVal).toISOString();
        }

        const gradeVal = formData.get('grade') as string;
        if (gradeVal) {
          payload.grade = gradeVal;
        }
      } else if (activeTab === 'projects') {
        payload.name = formData.get('name') as string;
        payload.github = formData.get('github') as string;

        const urlVal = formData.get('url') as string;
        if (urlVal) {
          payload.url = urlVal;
        }

        payload.description = formData.get('description') as string;

        const fromVal = formData.get('fromDate') as string;
        payload.fromDate = fromVal ? new Date(fromVal).toISOString() : '';

        const toVal = formData.get('toDate') as string;
        if (toVal) {
          payload.toDate = new Date(toVal).toISOString();
        }
      } else if (activeTab === 'experience') {
        payload.title = formData.get('title') as string;
        payload.company = formData.get('company') as string;

        const fromVal = formData.get('fromDate') as string;
        payload.fromDate = fromVal ? new Date(fromVal).toISOString() : '';

        const toVal = formData.get('toDate') as string;
        if (toVal) {
          payload.toDate = new Date(toVal).toISOString();
        }

        const descVal = formData.get('description') as string;
        if (descVal) {
          payload.description = descVal;
        }
        payload.role = [];
      } else if (activeTab === 'certifications') {
        payload.title = formData.get('title') as string;
        payload.platform = formData.get('platform') as string;

        const urlVal = formData.get('url') as string;
        if (urlVal) {
          payload.url = urlVal;
        }

        const descVal = formData.get('description') as string;
        if (descVal) {
          payload.description = descVal;
        }

        const completedVal = formData.get('completedOn') as string;
        if (completedVal) {
          payload.completedOn = new Date(completedVal).toISOString();
        }
        payload.role = [];
      } else if (activeTab === 'awards') {
        payload.title = formData.get('title') as string;
        payload.issuer = formData.get('issuer') as string;
        payload.awardType = formData.get('awardType') as string;

        const descVal = formData.get('description') as string;
        if (descVal) {
          payload.description = descVal;
        }

        const dateVal = formData.get('date') as string;
        if (dateVal) {
          payload.date = new Date(dateVal).toISOString();
        }
        payload.role = [];
      }

      let result;
      if (itemToEdit && itemToEdit.id) {
        result = await itemService.updateItem(itemToEdit.id, payload);
        updateItem(result);
        showToast('Item updated successfully.', 'success');
      } else {
        result = await itemService.createItem(payload);
        addItem(result);
        showToast('Item added successfully.', 'success');
      }

      handleCloseForm();
      form.reset();
    } catch (err) {
      console.error("Failed to save item:", err);
      showToast('Failed to save item. Please verify all entries.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm and delete transaction handler
  const handleConfirmDelete = async () => {
    if (!itemToDelete || !itemToDelete.id) return;

    try {
      setDeleting(true);
      await itemService.deleteItem(itemToDelete.id);
      removeItem(itemToDelete.id);
      setItemToDelete(null);
      showToast('Item deleted successfully.', 'success');
    } catch (err) {
      console.error("Failed to delete item:", err);
      showToast('Failed to delete item. Please try again.', 'error');
    } finally {
      setDeleting(false);
    }
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

              <div className="panel-header-row">
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  {getTabLabel(activeTab)}
                </h2>
                <button
                  className="btn-add-item"
                  onClick={() => {
                    setItemToEdit(null);
                    setIsAdding(true);
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Add New
                </button>
              </div>

              {loadingItems ? (
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <div className="spinner" style={{ width: '1.75rem', height: '1.75rem' }}></div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Loading items...</span>
                </div>
              ) : activeItems.length === 0 ? (
                <div className="empty-state">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <h3>No items yet</h3>
                  <p>Add credentials to start constructing your resume layout.</p>
                </div>
              ) : (
                <div className="items-list">
                  {activeItems.map((item) => (
                    <div key={item.id} className="item-card">

                      {/* Action buttons wrapper (visible bottom-right on hover) */}
                      <div className="item-card-actions">
                        <button
                          className="item-card-btn edit"
                          onClick={(e) => {
                            e.stopPropagation();
                            setItemToEdit(item);
                            setIsAdding(true);
                          }}
                          title="Edit item"
                          aria-label="Edit item"
                        >
                          <svg viewBox="0 0 24 24">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5Z"></path>
                          </svg>
                        </button>
                        <button
                          className="item-card-btn delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            setItemToDelete(item);
                          }}
                          title="Delete item"
                          aria-label="Delete item"
                        >
                          <svg viewBox="0 0 24 24">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                          </svg>
                        </button>
                      </div>

                      {item.type === 'education' && (
                        <>
                          <div className="item-card-title">{(item as EducationItem).school}</div>
                          <div className="item-card-subtitle">
                            {(item as EducationItem).degree} in {(item as EducationItem).field}
                          </div>
                          {(item as EducationItem).grade && (
                            <span className="item-card-badge">Grade: {(item as EducationItem).grade}</span>
                          )}
                          <div className="item-card-dates">
                            <svg style={{ width: '0.8rem', height: '0.8rem', opacity: 0.7 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                              <line x1="16" y1="2" x2="16" y2="6"></line>
                              <line x1="8" y1="2" x2="8" y2="6"></line>
                              <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            <span>{formatDate(item.fromDate)} – {item.toDate ? formatDate(item.toDate) : 'Present'}</span>
                          </div>
                        </>
                      )}

                      {item.type === 'project' && (
                        <>
                          <div className="item-card-title">{(item as ProjectItem).name}</div>
                          <p className="item-card-description">{(item as ProjectItem).description}</p>
                          <div className="item-card-links">
                            <a href={(item as ProjectItem).github} target="_blank" rel="noopener noreferrer" className="item-card-link">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
                              </svg>
                              GitHub
                            </a>
                            {(item as ProjectItem).url && (
                              <a href={(item as ProjectItem).url} target="_blank" rel="noopener noreferrer" className="item-card-link">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                  <polyline points="15 3 21 3 21 9"></polyline>
                                  <line x1="10" y1="14" x2="21" y2="3"></line>
                                </svg>
                                Live
                              </a>
                            )}
                          </div>
                          <div className="item-card-dates">
                            <svg style={{ width: '0.8rem', height: '0.8rem', opacity: 0.7 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                              <line x1="16" y1="2" x2="16" y2="6"></line>
                              <line x1="8" y1="2" x2="8" y2="6"></line>
                              <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            <span>{formatDate(item.fromDate)} – {item.toDate ? formatDate(item.toDate) : 'Present'}</span>
                          </div>
                        </>
                      )}

                      {item.type === 'experience' && (
                        <>
                          <div className="item-card-title">{(item as ExperienceItem).title}</div>
                          <div className="item-card-subtitle">{(item as ExperienceItem).company}</div>
                          {(item as ExperienceItem).description && (
                            <p className="item-card-description">{(item as ExperienceItem).description}</p>
                          )}
                          <div className="item-card-dates">
                            <svg style={{ width: '0.8rem', height: '0.8rem', opacity: 0.7 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                              <line x1="16" y1="2" x2="16" y2="6"></line>
                              <line x1="8" y1="2" x2="8" y2="6"></line>
                              <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            <span>{formatDate(item.fromDate)} – {item.toDate ? formatDate(item.toDate) : 'Present'}</span>
                          </div>
                        </>
                      )}

                      {item.type === 'certification' && (
                        <>
                          <div className="item-card-title">{(item as CertificationItem).title}</div>
                          <div className="item-card-subtitle">{(item as CertificationItem).platform}</div>
                          {(item as CertificationItem).description && (
                            <p className="item-card-description">{(item as CertificationItem).description}</p>
                          )}
                          {(item as CertificationItem).url && (
                            <div className="item-card-links" style={{ marginTop: '0.2rem' }}>
                              <a href={(item as CertificationItem).url} target="_blank" rel="noopener noreferrer" className="item-card-link">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                  <polyline points="15 3 21 3 21 9"></polyline>
                                  <line x1="10" y1="14" x2="21" y2="3"></line>
                                </svg>
                                View Credential
                              </a>
                            </div>
                          )}
                          {(item as CertificationItem).completedOn && (
                            <div className="item-card-dates">
                              <svg style={{ width: '0.8rem', height: '0.8rem', opacity: 0.7 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                              </svg>
                              <span>Completed: {formatDate((item as CertificationItem).completedOn)}</span>
                            </div>
                          )}
                        </>
                      )}

                      {item.type === 'award' && (
                        <>
                          <div className="item-card-title">{(item as AwardItem).title}</div>
                          <div className="item-card-subtitle">{(item as AwardItem).issuer}</div>
                          {(item as AwardItem).description && (
                            <p className="item-card-description">{(item as AwardItem).description}</p>
                          )}
                          {(item as AwardItem).awardType && (
                            <span className="item-card-badge">{(item as AwardItem).awardType}</span>
                          )}
                          {(item as AwardItem).date && (
                            <div className="item-card-dates">
                              <svg style={{ width: '0.8rem', height: '0.8rem', opacity: 0.7 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                              </svg>
                              <span>Date: {formatDate((item as AwardItem).date)}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

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

      {/* Creation/Edit Modal Overlay Dialog */}
      {isAdding && (
        <div className="modal-overlay" onClick={handleCloseForm}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {itemToEdit ? 'Edit' : 'Add New'} {getModalTitleLabel(activeTab)}
              </h3>
              <button className="btn-modal-close" onClick={handleCloseForm} title="Close dialog">
                <svg viewBox="0 0 24 24">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <form className="item-form" onSubmit={handleFormSubmit}>
                {activeTab === 'education' && (
                  <>
                    <div className="form-group">
                      <label className="form-label" htmlFor="school">School / Institution *</label>
                      <input
                        className="form-input"
                        type="text"
                        id="school"
                        name="school"
                        required
                        placeholder="e.g. Stanford University"
                        defaultValue={itemToEdit ? (itemToEdit as EducationItem).school : ''}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="degree">Degree *</label>
                      <input
                        className="form-input"
                        type="text"
                        id="degree"
                        name="degree"
                        required
                        placeholder="e.g. Bachelor of Science"
                        defaultValue={itemToEdit ? (itemToEdit as EducationItem).degree : ''}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="field">Field of Study *</label>
                      <input
                        className="form-input"
                        type="text"
                        id="field"
                        name="field"
                        required
                        placeholder="e.g. Computer Science"
                        defaultValue={itemToEdit ? (itemToEdit as EducationItem).field : ''}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="grade">Grade / GPA (Optional)</label>
                      <input
                        className="form-input"
                        type="text"
                        id="grade"
                        name="grade"
                        placeholder="e.g. 3.9 / 4.0 or First Class"
                        defaultValue={itemToEdit ? ((itemToEdit as EducationItem).grade || '') : ''}
                      />
                    </div>
                  </>
                )}

                {activeTab === 'projects' && (
                  <>
                    <div className="form-group">
                      <label className="form-label" htmlFor="name">Project Name *</label>
                      <input
                        className="form-input"
                        type="text"
                        id="name"
                        name="name"
                        required
                        placeholder="e.g. Resume Builder Web App"
                        defaultValue={itemToEdit ? (itemToEdit as ProjectItem).name : ''}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="github">GitHub Repository URL *</label>
                      <input
                        className="form-input"
                        type="url"
                        id="github"
                        name="github"
                        required
                        placeholder="https://github.com/username/project"
                        defaultValue={itemToEdit ? (itemToEdit as ProjectItem).github : ''}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="url">Live Project URL (Optional)</label>
                      <input
                        className="form-input"
                        type="url"
                        id="url"
                        name="url"
                        placeholder="https://myproject.com"
                        defaultValue={itemToEdit ? ((itemToEdit as ProjectItem).url || '') : ''}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="description">Description *</label>
                      <textarea
                        className="form-textarea"
                        id="description"
                        name="description"
                        required
                        placeholder="Describe key features, technologies used, and your individual contribution..."
                        defaultValue={itemToEdit ? (itemToEdit as ProjectItem).description : ''}
                      />
                    </div>
                  </>
                )}

                {activeTab === 'experience' && (
                  <>
                    <div className="form-group">
                      <label className="form-label" htmlFor="title">Job Title *</label>
                      <input
                        className="form-input"
                        type="text"
                        id="title"
                        name="title"
                        required
                        placeholder="e.g. Software Engineer"
                        defaultValue={itemToEdit ? (itemToEdit as ExperienceItem).title : ''}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="company">Company / Organization *</label>
                      <input
                        className="form-input"
                        type="text"
                        id="company"
                        name="company"
                        required
                        placeholder="e.g. Google"
                        defaultValue={itemToEdit ? (itemToEdit as ExperienceItem).company : ''}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="description">Description (Optional)</label>
                      <textarea
                        className="form-textarea"
                        id="description"
                        name="description"
                        placeholder="Summarize your tasks, achievements, and technology stack..."
                        defaultValue={itemToEdit ? ((itemToEdit as ExperienceItem).description || '') : ''}
                      />
                    </div>
                  </>
                )}

                {activeTab === 'certifications' && (
                  <>
                    <div className="form-group">
                      <label className="form-label" htmlFor="title">Certification Name *</label>
                      <input
                        className="form-input"
                        type="text"
                        id="title"
                        name="title"
                        required
                        placeholder="e.g. AWS Certified Solutions Architect"
                        defaultValue={itemToEdit ? (itemToEdit as CertificationItem).title : ''}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="platform">Platform / Issuer *</label>
                      <input
                        className="form-input"
                        type="text"
                        id="platform"
                        name="platform"
                        required
                        placeholder="e.g. Amazon Web Services"
                        defaultValue={itemToEdit ? (itemToEdit as CertificationItem).platform : ''}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="url">Certificate Credential URL (Optional)</label>
                      <input
                        className="form-input"
                        type="url"
                        id="url"
                        name="url"
                        placeholder="https://creds.com/cert/123"
                        defaultValue={itemToEdit ? ((itemToEdit as CertificationItem).url || '') : ''}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="description">Description (Optional)</label>
                      <textarea
                        className="form-textarea"
                        id="description"
                        name="description"
                        placeholder="Detail the skills validated or credentials earned..."
                        defaultValue={itemToEdit ? ((itemToEdit as CertificationItem).description || '') : ''}
                      />
                    </div>
                  </>
                )}

                {activeTab === 'awards' && (
                  <>
                    <div className="form-group">
                      <label className="form-label" htmlFor="title">Award / Honor Title *</label>
                      <input
                        className="form-input"
                        type="text"
                        id="title"
                        name="title"
                        required
                        placeholder="e.g. Dean's List or Hackathon Winner"
                        defaultValue={itemToEdit ? (itemToEdit as AwardItem).title : ''}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="issuer">Issuer / Presenter *</label>
                      <input
                        className="form-input"
                        type="text"
                        id="issuer"
                        name="issuer"
                        required
                        placeholder="e.g. Stanford University"
                        defaultValue={itemToEdit ? (itemToEdit as AwardItem).issuer : ''}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="awardType">Award Level / Type *</label>
                      <input
                        className="form-input"
                        type="text"
                        id="awardType"
                        name="awardType"
                        required
                        placeholder="e.g. Academic, Professional, 1st Place"
                        defaultValue={itemToEdit ? (itemToEdit as AwardItem).awardType : ''}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="description">Description (Optional)</label>
                      <textarea
                        className="form-textarea"
                        id="description"
                        name="description"
                        placeholder="Details about selection criteria or project highlights..."
                        defaultValue={itemToEdit ? ((itemToEdit as AwardItem).description || '') : ''}
                      />
                    </div>
                  </>
                )}

                {/* Conditional Date inputs based on active tab category */}
                {activeTab === 'certifications' ? (
                  <div className="form-group">
                    <label className="form-label" htmlFor="completedOn">Date Completed (Optional)</label>
                    <input
                      className="form-input"
                      type="date"
                      id="completedOn"
                      name="completedOn"
                      defaultValue={itemToEdit ? formatDateForInput((itemToEdit as CertificationItem).completedOn) : ''}
                    />
                  </div>
                ) : activeTab === 'awards' ? (
                  <div className="form-group">
                    <label className="form-label" htmlFor="date">Date Received (Optional)</label>
                    <input
                      className="form-input"
                      type="date"
                      id="date"
                      name="date"
                      defaultValue={itemToEdit ? formatDateForInput((itemToEdit as AwardItem).date) : ''}
                    />
                  </div>
                ) : (
                  /* Standard Date ranges for Education, Projects, and Experience */
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label" htmlFor="fromDate">Start Date *</label>
                      <input
                        className="form-input"
                        type="date"
                        id="fromDate"
                        name="fromDate"
                        required
                        defaultValue={itemToEdit && 'fromDate' in itemToEdit ? formatDateForInput(itemToEdit.fromDate) : ''}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="toDate">End Date (Optional)</label>
                      <input
                        className="form-input"
                        type="date"
                        id="toDate"
                        name="toDate"
                        defaultValue={itemToEdit && 'toDate' in itemToEdit ? formatDateForInput(itemToEdit.toDate) : ''}
                      />
                    </div>
                  </div>
                )}

                <div className="form-actions">
                  <button className="btn-form-cancel" type="button" onClick={handleCloseForm}>
                    Cancel
                  </button>
                  <button className="btn-form-save" type="submit" disabled={submitting}>
                    {submitting ? 'Saving...' : itemToEdit ? 'Save Changes' : 'Save Item'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal Overlay Dialog */}
      {itemToDelete && (
        <div className="modal-overlay" onClick={() => setItemToDelete(null)}>
          <div className="modal-card" style={{ maxWidth: '380px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Delete Item</h3>
              <button className="btn-modal-close" onClick={() => setItemToDelete(null)} title="Close dialog">
                <svg viewBox="0 0 24 24">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body" style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                Are you sure you want to permanently delete this item? This action cannot be undone.
              </p>
              <div className="form-actions" style={{ justifyContent: 'center', gap: '0.75rem' }}>
                <button className="btn-form-cancel" type="button" onClick={() => setItemToDelete(null)}>
                  Cancel
                </button>
                <button
                  className="btn-form-delete"
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  style={{
                    backgroundColor: '#DC2626',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '0.5rem 1.25rem',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'opacity 0.2s ease',
                    opacity: deleting ? 0.7 : 1
                  }}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications container */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast-notification toast-${toast.type}`}>
            <div className="toast-icon">
              {toast.type === 'success' && (
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {toast.type === 'error' && (
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {toast.type === 'info' && (
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}