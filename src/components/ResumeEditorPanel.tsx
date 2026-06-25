import { useState, useEffect } from 'react';
import { useResumeStore } from '../store/resumeStore';
import { mapItemToSectionData, DEFAULT_TEMPLATE_CONFIG } from '../lib/templateUtils';
import { resumeService } from '../lib/api';
import { getErrorMessage } from '../lib/network';

export const mapItemToResumeSchema = (item: any) => {
  const section = DEFAULT_TEMPLATE_CONFIG.sections.find(s => 
    s.id === item.type || (s.dragTypes && s.dragTypes.includes(item.type))
  );
  if (!section) return null;
  return {
    type: section.id,
    data: mapItemToSectionData(item, section)
  };
};

interface ResumeEditorPanelProps {
  section: string | null;
  onClose: () => void;
}

export default function ResumeEditorPanel({ section, onClose }: ResumeEditorPanelProps) {
  const activeContent = useResumeStore((state) => state.activeContent);
  const setActiveContent = useResumeStore((state) => state.setActiveContent);
  const templateConfig = useResumeStore((state) => state.templateConfig);
  const updateTemplateConfig = useResumeStore((state) => state.updateTemplateConfig);

  // Resume store states for resume details editing
  const resumes = useResumeStore((state) => state.resumes);
  const selectedResumeId = useResumeStore((state) => state.selectedResumeId);
  const saveActiveContent = useResumeStore((state) => state.saveActiveContent);
  const removeResume = useResumeStore((state) => state.removeResume);
  const setSelectedResumeId = useResumeStore((state) => state.setSelectedResumeId);
  const setIsCreatingResume = useResumeStore((state) => state.setIsCreatingResume);

  const currentResume = resumes.find((r) => r.id === selectedResumeId);

  // Local state for editing filename and job description
  const [editFilename, setEditFilename] = useState('');
  const [editJobDescription, setEditJobDescription] = useState('');
  const [savingDetails, setSavingDetails] = useState(false);
  const [deletingResume, setDeletingResume] = useState(false);

  useEffect(() => {
    if (section === 'details' && currentResume) {
      setEditFilename(currentResume.filename || '');
      setEditJobDescription(currentResume.jobDescription || '');
    }
  }, [section, selectedResumeId, currentResume?.filename, currentResume?.jobDescription]);

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResumeId || !currentResume) return;
    setSavingDetails(true);
    try {
      const updated = await resumeService.updateResume(
        selectedResumeId,
        editFilename,
        currentResume.template,
        activeContent,
        editJobDescription
      );
      saveActiveContent(updated);
      alert('Resume details saved successfully!');
    } catch (err) {
      console.error('Failed to save resume details:', err);
      alert(getErrorMessage(err, 'Failed to save resume details'));
    } finally {
      setSavingDetails(false);
    }
  };

  const handleDeleteResume = async () => {
    if (!selectedResumeId) return;
    const confirmDelete = window.confirm('Are you sure you want to delete this resume? This action cannot be undone.');
    if (!confirmDelete) return;

    setDeletingResume(true);
    try {
      await resumeService.deleteResume(selectedResumeId);
      removeResume(selectedResumeId);
      
      const remainingResumes = resumes.filter(r => r.id !== selectedResumeId);
      if (remainingResumes.length > 0) {
        setSelectedResumeId(remainingResumes[0].id);
      } else {
        setSelectedResumeId(null);
        setIsCreatingResume(true);
      }
      onClose();
    } catch (err) {
      console.error('Failed to delete resume:', err);
      alert(getErrorMessage(err, 'Failed to delete resume'));
    } finally {
      setDeletingResume(false);
    }
  };

  const [dragOver, setDragOver] = useState(false);
  const [draggedSectionIndex, setDraggedSectionIndex] = useState<number | null>(null);
  const [newSecTitle, setNewSecTitle] = useState('');
  const [newSecAcceptType, setNewSecAcceptType] = useState('experience');

  const isDashboardItemSection = (sectionId: string) => {
    const dbSections = ['education', 'experience', 'projects', 'certifications', 'awards'];
    return dbSections.includes(sectionId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (!dataStr || !section || !templateConfig) return;
      const item = JSON.parse(dataStr);

      const sectionConfig = templateConfig.sections.find(s => s.id === section);
      if (!sectionConfig) return;

      const mappedData = mapItemToSectionData(item, sectionConfig);
      if (!mappedData) return;

      const currentContent = { ...activeContent };
      const currentList = currentContent[section] || [];

      const isDuplicate = currentList.some((existing: any) => 
        JSON.stringify(existing) === JSON.stringify(mappedData)
      );
      if (isDuplicate) return;

      currentContent[section] = [...currentList, mappedData];
      setActiveContent(currentContent);
    } catch (err) {
      console.error('Failed to handle drop in editor panel:', err);
    }
  };

  if (!activeContent || !templateConfig) return null;

  const sectionConfig = section ? templateConfig.sections.find(s => s.id === section) : undefined;

  const getSectionTitle = () => {
    if (section === 'layout') return 'Manage Layout';
    if (section === 'details') return 'Edit Resume Details';
    return sectionConfig?.title || 'Editor';
  };

  // Form handlers
  const handleProfileChange = (field: string, value: string) => {
    setActiveContent({
      ...activeContent,
      [field]: value
    });
  };

  const handleLinkChange = (index: number, key: 'label' | 'url', value: string) => {
    const links = [...(activeContent.links || [])];
    if (!links[index]) {
      links[index] = { label: '', url: '' };
    }
    links[index] = { ...links[index], [key]: value };
    setActiveContent({
      ...activeContent,
      links
    });
  };

  const handleItemChange = (sectionId: string, index: number, field: string, value: string) => {
    const list = [...(activeContent[sectionId] || [])];
    if (!list[index]) {
      list[index] = {};
    }
    list[index] = { ...list[index], [field]: value };
    setActiveContent({ ...activeContent, [sectionId]: list });
  };

  const removeItem = (sectionId: string, index: number) => {
    const list = (activeContent[sectionId] || []).filter((_: any, i: number) => i !== index);
    setActiveContent({ ...activeContent, [sectionId]: list });
  };

  const handleBulletChange = (sectionId: string, index: number, field: string, bulletIdx: number, value: string) => {
    const list = [...(activeContent[sectionId] || [])];
    if (!list[index]) {
      list[index] = {};
    }
    const bullets = [...(list[index][field] || [])];
    bullets[bulletIdx] = value;
    list[index] = { ...list[index], [field]: bullets };
    setActiveContent({ ...activeContent, [sectionId]: list });
  };

  const addBullet = (sectionId: string, index: number, field: string) => {
    const list = [...(activeContent[sectionId] || [])];
    if (!list[index]) {
      list[index] = {};
    }
    const bullets = [...(list[index][field] || []), ''];
    list[index] = { ...list[index], [field]: bullets };
    setActiveContent({ ...activeContent, [sectionId]: list });
  };

  const removeBullet = (sectionId: string, index: number, field: string, bulletIdx: number) => {
    const list = [...(activeContent[sectionId] || [])];
    if (!list[index]) return;
    const bullets = (list[index][field] || []).filter((_: any, i: number) => i !== bulletIdx);
    list[index] = { ...list[index], [field]: bullets };
    setActiveContent({ ...activeContent, [sectionId]: list });
  };

  // Layout Manager Actions
  const handleLayoutDragStart = (_e: React.DragEvent, index: number) => {
    setDraggedSectionIndex(index);
  };

  const handleLayoutDrop = (_e: React.DragEvent, dropIndex: number) => {
    if (draggedSectionIndex === null || draggedSectionIndex === dropIndex) return;
    const sections = [...templateConfig.sections];
    const [draggedItem] = sections.splice(draggedSectionIndex, 1);
    sections.splice(dropIndex, 0, draggedItem);
    
    updateTemplateConfig({ ...templateConfig, sections });
    setDraggedSectionIndex(null);
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const sections = [...templateConfig.sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;
    
    const temp = sections[index];
    sections[index] = sections[targetIndex];
    sections[targetIndex] = temp;
    
    updateTemplateConfig({ ...templateConfig, sections });
  };

  const deleteSection = (sectionId: string) => {
    if (sectionId === 'profile') return;
    const sections = templateConfig.sections.filter(s => s.id !== sectionId);
    
    const currentContent = { ...activeContent };
    delete currentContent[sectionId];
    
    updateTemplateConfig({ ...templateConfig, sections });
    setActiveContent(currentContent);
    onClose();
  };

  const handleAddCustomSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSecTitle.trim()) return;
    
    const title = newSecTitle.trim();
    const id = title.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    
    if (templateConfig.sections.some(s => s.id === id)) {
      alert('A section with this name already exists.');
      return;
    }

    const fields = [
      { name: 'title', label: 'Item Title', type: 'text' as const, placeholder: 'e.g. Volunteer Guide', fromKey: ['title', 'name'] },
      { name: 'tech', label: 'Context / Technology / Subtitle', type: 'text' as const, placeholder: 'e.g. Red Cross', fromKey: ['tech', 'platform', 'issuer'] },
      { name: 'dates', label: 'Dates / Duration', type: 'text' as const, placeholder: 'e.g. 2021', fromKey: ['formattedDates'] },
      { name: 'bullets', label: 'Description', type: 'bullets' as const, placeholder: 'e.g. Assisted local nursing team...', fromKey: ['bullets', 'role', 'description'] }
    ];

    const newSection = {
      id,
      title,
      selector: `#section-${id}`,
      type: 'custom_list' as const,
      fields,
      dragTypes: [newSecAcceptType]
    };

    const sections = [...templateConfig.sections, newSection];
    updateTemplateConfig({ ...templateConfig, sections });

    const currentContent = { ...activeContent };
    if (currentContent[id] === undefined) {
      currentContent[id] = [];
    }
    setActiveContent(currentContent);
    
    setNewSecTitle('');
  };

  return (
    <div className={`resume-editor-panel ${section ? 'expanded' : ''}`}>

      {section && (
        <div className="panel-inner-wrapper">
        <div className="panel-header">
          <h3>{getSectionTitle()}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {section === 'details' && (
              <button 
                onClick={handleDeleteResume} 
                disabled={deletingResume}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ef4444',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'opacity 0.2s',
                  marginRight: '0.25rem'
                }}
                title="Delete Resume File"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '1.2rem', height: '1.2rem' }}>
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            )}
            <button onClick={onClose} className="panel-close-btn" title="Close Panel">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        <div
          className="panel-body"
          onDragOver={section !== 'layout' && section !== 'details' ? handleDragOver : undefined}
          onDragLeave={section !== 'layout' && section !== 'details' ? handleDragLeave : undefined}
          onDrop={section !== 'layout' && section !== 'details' ? handleDrop : undefined}
        >
          {section === 'layout' ? (
            /* Layout Manager Panel View */
            <div className="layout-manager-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Drag and drop sections to rearrange their order on the resume canvas, or use the arrow buttons.
              </p>
              
              <div className="layout-sections-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {templateConfig.sections.map((sec, idx) => (
                  <div
                    key={sec.id}
                    draggable={sec.id !== 'profile'}
                    onDragStart={(e) => handleLayoutDragStart(e, idx)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleLayoutDrop(e, idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      cursor: sec.id === 'profile' ? 'default' : 'grab',
                      opacity: draggedSectionIndex === idx ? 0.4 : 1,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {/* Drag Grip Handle */}
                    {sec.id !== 'profile' ? (
                      <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '1.1rem', height: '1.1rem' }}>
                          <circle cx="9" cy="5" r="1" />
                          <circle cx="9" cy="12" r="1" />
                          <circle cx="9" cy="19" r="1" />
                          <circle cx="15" cy="5" r="1" />
                          <circle cx="15" cy="12" r="1" />
                          <circle cx="15" cy="19" r="1" />
                        </svg>
                      </div>
                    ) : (
                      <div style={{ width: '1.1rem' }}></div>
                    )}

                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>
                      {sec.title}
                    </span>

                    {/* Reorder Buttons Up/Down */}
                    {sec.id !== 'profile' && (
                      <div style={{ display: 'flex', gap: '0.2rem' }}>
                        <button
                          disabled={idx <= 1}
                          onClick={() => moveSection(idx, 'up')}
                          style={{
                            border: 'none',
                            background: 'none',
                            cursor: idx <= 1 ? 'not-allowed' : 'pointer',
                            color: idx <= 1 ? 'var(--text-secondary)' : 'var(--text-primary)',
                            padding: '0.25rem',
                            opacity: idx <= 1 ? 0.3 : 1
                          }}
                          title="Move Up"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '1rem', height: '1rem' }}>
                            <polyline points="18 15 12 9 6 15"></polyline>
                          </svg>
                        </button>
                        <button
                          disabled={idx === templateConfig.sections.length - 1}
                          onClick={() => moveSection(idx, 'down')}
                          style={{
                            border: 'none',
                            background: 'none',
                            cursor: idx === templateConfig.sections.length - 1 ? 'not-allowed' : 'pointer',
                            color: idx === templateConfig.sections.length - 1 ? 'var(--text-secondary)' : 'var(--text-primary)',
                            padding: '0.25rem',
                            opacity: idx === templateConfig.sections.length - 1 ? 0.3 : 1
                          }}
                          title="Move Down"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '1rem', height: '1rem' }}>
                            <polyline points="6 9 12 15 18 9"></polyline>
                          </svg>
                        </button>
                      </div>
                    )}

                    {/* Delete Section Action */}
                    {sec.id !== 'profile' && (
                      <button
                        onClick={() => deleteSection(sec.id)}
                        style={{
                          border: 'none',
                          background: 'none',
                          cursor: 'pointer',
                          color: '#ef4444',
                          padding: '0.25rem',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title="Delete Section"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '0.95rem', height: '0.95rem' }}>
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Custom Section Form */}
              <form onSubmit={handleAddCustomSection} style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>+ Add Custom Section</h4>
                
                <div className="form-item" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.7rem' }}>Section Title</label>
                  <input
                    type="text"
                    value={newSecTitle}
                    onChange={(e) => setNewSecTitle(e.target.value)}
                    placeholder="e.g. Volunteer Work"
                    required
                  />
                </div>

                <div className="form-item" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.7rem' }}>Accept items from sidebar tab:</label>
                  <select
                    value={newSecAcceptType}
                    onChange={(e) => setNewSecAcceptType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      borderRadius: '6px',
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '0.8rem',
                      outline: 'none'
                    }}
                  >
                    <option value="experience">Work Experience</option>
                    <option value="project">Projects</option>
                    <option value="education">Education</option>
                    <option value="certification">Certifications</option>
                    <option value="award">Awards</option>
                  </select>
                </div>

                <button
                  type="submit"
                  style={{
                    backgroundColor: 'var(--accent-color)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.6rem 1rem',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    transition: 'opacity 0.2s',
                    marginTop: '0.25rem'
                  }}
                >
                  Create Custom Section
                </button>
              </form>
            </div>
          ) : section === 'details' ? (
            <div className="details-editor-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <form onSubmit={handleSaveDetails} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-item">
                  <label htmlFor="edit-filename">Resume Filename *</label>
                  <input
                    id="edit-filename"
                    type="text"
                    value={editFilename}
                    onChange={(e) => setEditFilename(e.target.value)}
                    placeholder="e.g. Software Engineer Resume 2026"
                    required
                  />
                </div>

                <div className="form-item">
                  <label htmlFor="edit-job-description" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Job Description</label>
                  <textarea
                    id="edit-job-description"
                    value={editJobDescription}
                    onChange={(e) => setEditJobDescription(e.target.value)}
                    placeholder="Paste the target job description here..."
                    style={{
                      minHeight: '220px',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      padding: '0.65rem',
                      fontSize: '0.85rem',
                      width: '100%',
                      borderRadius: '6px',
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      outline: 'none',
                      lineHeight: '1.4'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingDetails}
                  style={{
                    backgroundColor: 'var(--color-brand-terracotta)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'opacity 0.2s',
                    width: '100%',
                    marginTop: '0.5rem'
                  }}
                >
                  {savingDetails ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>
          ) : sectionConfig ? (
            /* Section Fields Editor View */
            <div className="editor-group">
              {sectionConfig.type === 'profile' ? (
                <div>
                  {sectionConfig.fields.map((field) => {
                    if (field.name === 'links') {
                      return (
                        <div key={field.name} className="links-editor-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>{field.label || 'Links'}</label>
                          {(activeContent.links || []).map((link: any, linkIdx: number) => (
                            <div key={linkIdx} className="link-item-row" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: '6px', marginBottom: '0.5rem' }}>
                              <div className="form-item">
                                <label style={{ fontSize: '0.65rem' }}>Label</label>
                                <input
                                  type="text"
                                  value={link.label || ''}
                                  onChange={(e) => handleLinkChange(linkIdx, 'label', e.target.value)}
                                  placeholder="e.g. github.com/username"
                                />
                              </div>
                              <div className="form-item">
                                <label style={{ fontSize: '0.65rem' }}>URL</label>
                                <input
                                  type="text"
                                  value={link.url || ''}
                                  onChange={(e) => handleLinkChange(linkIdx, 'url', e.target.value)}
                                  placeholder="https://..."
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    }

                    return (
                      <div key={field.name} className="form-item">
                        <label>{field.label}</label>
                        <input
                          type="text"
                          value={activeContent[field.name] || ''}
                          onChange={(e) => handleProfileChange(field.name, e.target.value)}
                          placeholder={field.placeholder || ''}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div>
                  {isDashboardItemSection(sectionConfig.id) && (!activeContent[sectionConfig.id] || activeContent[sectionConfig.id].length === 0) ? (
                    <div
                      className={`panel-dropzone ${dragOver ? 'dragover' : ''}`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      <p>Drag & drop credentials here</p>
                    </div>
                  ) : (
                    <div>
                      {(() => {
                        const rawList = activeContent[sectionConfig.id] || [];
                        const list = rawList.length === 0 ? [{}] : rawList;

                        return list.map((item: any, idx: number) => (
                          <div key={idx} className="editor-card">
                            <div className="card-header">
                              <span>Item #{idx + 1}</span>
                              {((isDashboardItemSection(sectionConfig.id) && list.length > 1) || 
                                (!isDashboardItemSection(sectionConfig.id) && rawList.length > 0)) && (
                                <button onClick={(e) => { e.stopPropagation(); removeItem(sectionConfig.id, idx); }} className="card-delete-btn" title="Delete">
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                  </svg>
                                </button>
                              )}
                            </div>

                            {sectionConfig.fields.map((field) => {
                              if (field.type === 'bullets') {
                                return (
                                  <div key={field.name} className="form-item">
                                    <label>{field.label}</label>
                                    {(item[field.name] || []).map((bullet: string, bulletIdx: number) => (
                                      <div key={bulletIdx} className="bullet-input-row" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                                        <input
                                          type="text"
                                          value={bullet}
                                          onChange={(e) => handleBulletChange(sectionConfig.id, idx, field.name, bulletIdx, e.target.value)}
                                          placeholder={field.placeholder || "Describe..."}
                                          style={{ flex: 1 }}
                                        />
                                        <button onClick={() => removeBullet(sectionConfig.id, idx, field.name, bulletIdx)} className="bullet-delete-btn" title="Remove Bullet">
                                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '14px', height: '14px' }}>
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                          </svg>
                                        </button>
                                      </div>
                                    ))}
                                    <button onClick={() => addBullet(sectionConfig.id, idx, field.name)} className="bullet-add-btn">
                                      + Add Bullet
                                    </button>
                                  </div>
                                );
                              }

                              return (
                                <div key={field.name} className="form-item">
                                  <label>{field.label}</label>
                                  <input
                                      type="text"
                                      value={item[field.name] || ''}
                                      onChange={(e) => handleItemChange(sectionConfig.id, idx, field.name, e.target.value)}
                                      placeholder={field.placeholder || ''}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        ));
                      })()}

                      {!isDashboardItemSection(sectionConfig.id) && (
                        <button
                          onClick={() => {
                            const list = [...(activeContent[sectionConfig.id] || [])];
                            const newItem: any = {};
                            sectionConfig.fields.forEach(f => {
                              newItem[f.name] = f.type === 'bullets' ? [''] : '';
                            });
                            setActiveContent({ ...activeContent, [sectionConfig.id]: [...list, newItem] });
                          }}
                          className="bullet-add-btn"
                          style={{
                            marginTop: '1rem',
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.6rem',
                            border: '1.5px dashed var(--border-color)',
                            backgroundColor: 'transparent',
                            color: 'var(--text-secondary)',
                            fontWeight: 600,
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          + Add Item
                        </button>
                      )}
                    </div>
                  )}

                  {/* Delete Section Button */}
                  {sectionConfig.id !== 'profile' && (
                    <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center' }}>
                      <button
                        onClick={() => deleteSection(sectionConfig.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          backgroundColor: 'rgba(239, 68, 68, 0.08)',
                          color: '#ef4444',
                          border: '1.5px solid rgba(239, 68, 68, 0.15)',
                          padding: '0.65rem 1.25rem',
                          borderRadius: '8px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          transition: 'all 0.2s ease',
                          width: '100%',
                          justifyContent: 'center'
                        }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '0.95rem', height: '0.95rem' }}>
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        Delete Section
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
      )}
    </div>
  );
}
