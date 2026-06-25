import { useState, useEffect } from 'react';
import { useUserStore } from '../store/userStore';
import { useItemStore } from '../store/itemStore';
import { useResumeStore } from '../store/resumeStore';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import ItemCard from '../components/ItemCard';
import ItemFormModal from '../components/ItemFormModal';
import CreateResumeModal from '../components/CreateResumeModal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import ToastContainer from '../components/ToastContainer';
import type { Toast } from '../components/ToastContainer';
import { itemService, resumeService } from '../lib/api';
import type { ResumeItem } from '../lib/api';
import ResumePreview from '../components/ResumePreview';
import ResumeEditorPanel from '../components/ResumeEditorPanel';
import { mapItemToSectionData } from '../lib/templateUtils';

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

  // Zustand resumes store state
  const resumes = useResumeStore((state) => state.resumes);
  const setResumes = useResumeStore((state) => state.setResumes);
  const selectedResumeId = useResumeStore((state) => state.selectedResumeId);
  const setSelectedResumeId = useResumeStore((state) => state.setSelectedResumeId);
  const currentResume = resumes.find(r => r.id === selectedResumeId);
  const addResume = useResumeStore((state) => state.addResume);
  const setLoadingResumes = useResumeStore((state) => state.setLoading);
  const isCreatingResume = useResumeStore((state) => state.isCreatingResume);
  const setIsCreatingResume = useResumeStore((state) => state.setIsCreatingResume);
  const isDirty = useResumeStore((state) => state.isDirty);
  const activeContent = useResumeStore((state) => state.activeContent);
  const templateConfig = useResumeStore((state) => state.templateConfig);

  const checkIfUsed = (item: ResumeItem, content: any) => {
    if (!content || !templateConfig) return false;
    
    // Find the section that matches this item type
    const section = templateConfig.sections.find(s => 
      s.id === item.type || (s.dragTypes && s.dragTypes.includes(item.type))
    );
    if (!section) return false;

    const list = content[section.id] || [];
    if (!Array.isArray(list)) return false;

    const mapped = mapItemToSectionData(item, section);

    return list.some((existing: any) => {
      return Object.keys(mapped).every(key => {
        if (key === 'bullets' || key === 'description' || !mapped[key]) return true;
        return String(existing[key] || '').trim().toLowerCase() === String(mapped[key] || '').trim().toLowerCase();
      });
    });
  };

  // Local state for modals and forms
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [itemToEdit, setItemToEdit] = useState<ResumeItem | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // State for delete confirmation modal
  const [itemToDelete, setItemToDelete] = useState<ResumeItem | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  // Resume creation states
  const [creatingResumeLoader, setCreatingResumeLoader] = useState<boolean>(false);

  // Section click active state
  const [activeEditSection, setActiveEditSection] = useState<string | null>(null);

  // Prevent unload if there are unsaved changes
  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  // Dynamically update page title to show filename - resumein
  useEffect(() => {
    if (currentResume && currentResume.filename) {
      document.title = `${currentResume.filename} - ResumeIn`;
    } else {
      document.title = 'Dashboard - ResumeIn';
    }
    return () => {
      document.title = 'ResumeIn';
    };
  }, [currentResume]);

  // Toast notifications state
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  // Fetch items and resumes in parallel on user login / mount
  useEffect(() => {
    if (user) {
      setLoadingItems(true);
      setLoadingResumes(true);

      Promise.all([
        itemService.getItems(),
        resumeService.getResumes()
      ])
        .then(([itemsData, resumesData]) => {
          setItems(itemsData);
          setResumes(resumesData);

          // If there are resumes, choose the one last updated
          if (resumesData && resumesData.length > 0) {
            const sorted = [...resumesData].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            setSelectedResumeId(sorted[0].id);
          } else {
            // Open new resume prompt if they have 0 resumes
            setIsCreatingResume(true);
          }
        })
        .catch((err) => {
          console.error("Failed to load initial user data:", err);
          showToast("Failed to load dashboard data.", "error");
        })
        .finally(() => {
          setLoadingItems(false);
          setLoadingResumes(false);
        });
    }
  }, [user, setItems, setResumes, setSelectedResumeId, setLoadingItems, setLoadingResumes, setIsCreatingResume]);

  const handleCloseForm = () => {
    setIsAdding(false);
    setItemToEdit(null);
  };

  // Escape key event listener to close modal dialogs and right side panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isAdding) {
          handleCloseForm();
        } else if (itemToDelete) {
          setItemToDelete(null);
        } else if (isCreatingResume && resumes.length > 0) {
          setIsCreatingResume(false);
        } else if (activeEditSection) {
          setActiveEditSection(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAdding, itemToDelete, isCreatingResume, resumes, activeEditSection]);

  // Click outside to collapse the right editor panel
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (activeEditSection) {
        const target = event.target as HTMLElement;
        if (target.closest('.preview-canvas-container') || target.closest('.dashboard-main')) {
          setActiveEditSection(null);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeEditSection]);

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

  const handleTabChange = (tabId: string) => {
    handleCloseForm(); // Reset form modal on tab switch
    if (sidebarOpen && activeTab === tabId) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
      setActiveTab(tabId);
    }
  };

  const getTabLabel = (id: string) => {
    return id.charAt(0).toUpperCase() + id.slice(1);
  };

  const getModalTitleLabel = (tab: string) => {
    if (tab === 'projects') return 'Project';
    if (tab === 'certifications') return 'Certification';
    if (tab === 'awards') return 'Award';
    return getTabLabel(tab);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
    } catch (e) {
      return dateStr;
    }
  };

  const formatDateForInput = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toISOString().split('T')[0];
    } catch (e) {
      return '';
    }
  };

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

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      setSubmitting(true);

      let payload: any = {
        type: activeTab === 'projects' ? 'project' :
          activeTab === 'certifications' ? 'certification' :
            activeTab === 'awards' ? 'award' : activeTab
      };

      if (activeTab === 'education') {
        payload.school = formData.get('school') as string;
        payload.degree = formData.get('degree') as string;
        payload.field = formData.get('field') as string;
        payload.location = formData.get('location') as string;

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
        payload.technologiesUsed = formData.get('technologiesUsed') as string;

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
        payload.location = formData.get('location') as string;

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

  const handleCreateResumeSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const filename = formData.get('filename') as string;
    const template = formData.get('template') as string;
    const jobDescription = formData.get('jobDescription') as string;

    try {
      setCreatingResumeLoader(true);
      const newResume = await resumeService.createResume(filename, template, jobDescription || undefined);
      addResume(newResume);
      setSelectedResumeId(newResume.id);
      setIsCreatingResume(false);
      showToast("Resume created successfully.", "success");
      form.reset();
    } catch (err) {
      console.error("Failed to create resume:", err);
      showToast("Failed to create resume. Please try again.", "error");
    } finally {
      setCreatingResumeLoader(false);
    }
  };

  return (
    <div className="dashboard-container">
      <Navbar onSaveSuccess={() => showToast("Resume saved successfully!", "success")} />
      <div className="dashboard-body">

        <div className={`editor-sidebar-container ${sidebarOpen ? '' : 'collapsed'}`}>
          <Sidebar
            activeTab={activeTab}
            sidebarOpen={sidebarOpen}
            onTabChange={handleTabChange}
          />

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
                    <ItemCard
                      key={item.id}
                      item={item}
                      isUsed={checkIfUsed(item, activeContent)}
                      onEdit={(it) => {
                        setItemToEdit(it);
                        setIsAdding(true);
                      }}
                      onDelete={(it) => setItemToDelete(it)}
                      formatDate={formatDate}
                    />
                  ))}
                </div>
              )}

            </div>

            <button
              className="sidebar-toggle-btn"
              onClick={() => setSidebarOpen(false)}
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <svg viewBox="0 0 24 24">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
          </div>
        </div>

        {/* Rightmost: Main Workspace (Canvas area) */}
        <main className={`dashboard-main ${activeEditSection ? 'panel-expanded' : ''}`}>
          <ResumePreview onSectionClick={(section) => setActiveEditSection(section)} />
        </main>

        <ResumeEditorPanel 
          section={activeEditSection} 
          onClose={() => setActiveEditSection(null)} 
        />
      </div>

      {/* Creation/Edit Modal Overlay Dialog */}
      <ItemFormModal
        isOpen={isAdding}
        onClose={handleCloseForm}
        activeTab={activeTab}
        itemToEdit={itemToEdit}
        onSubmit={handleFormSubmit}
        submitting={submitting}
        getModalTitleLabel={getModalTitleLabel}
        formatDateForInput={formatDateForInput}
      />

      {/* Delete Confirmation Modal Overlay Dialog */}
      <DeleteConfirmationModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleConfirmDelete}
        deleting={deleting}
      />

      {/* Create Resume Modal Overlay Dialog */}
      <CreateResumeModal
        isOpen={isCreatingResume}
        onClose={() => setIsCreatingResume(false)}
        onSubmit={handleCreateResumeSubmit}
        loader={creatingResumeLoader}
        hasResumes={resumes.length > 0}
      />

      {/* Toast Notifications container */}
      <ToastContainer toasts={toasts} />
    </div>
  );
}