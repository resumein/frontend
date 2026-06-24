import { useState } from 'react';
import { useResumeStore } from '../store/resumeStore';
import { mapItemToSectionData, DEFAULT_TEMPLATE_CONFIG } from '../lib/templateUtils';

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

  const [dragOver, setDragOver] = useState(false);

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

  if (!activeContent || !section || !templateConfig) return null;

  const sectionConfig = templateConfig.sections.find(s => s.id === section);
  if (!sectionConfig) return null;

  const getSectionTitle = () => {
    return sectionConfig.title || 'Editor';
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
    list[index] = { ...list[index], [field]: value };
    setActiveContent({ ...activeContent, [sectionId]: list });
  };

  const removeItem = (sectionId: string, index: number) => {
    const list = (activeContent[sectionId] || []).filter((_: any, i: number) => i !== index);
    setActiveContent({ ...activeContent, [sectionId]: list });
  };

  const handleBulletChange = (sectionId: string, index: number, field: string, bulletIdx: number, value: string) => {
    const list = [...(activeContent[sectionId] || [])];
    const bullets = [...(list[index][field] || [])];
    bullets[bulletIdx] = value;
    list[index] = { ...list[index], [field]: bullets };
    setActiveContent({ ...activeContent, [sectionId]: list });
  };

  const addBullet = (sectionId: string, index: number, field: string) => {
    const list = [...(activeContent[sectionId] || [])];
    const bullets = [...(list[index][field] || []), ''];
    list[index] = { ...list[index], [field]: bullets };
    setActiveContent({ ...activeContent, [sectionId]: list });
  };

  const removeBullet = (sectionId: string, index: number, field: string, bulletIdx: number) => {
    const list = [...(activeContent[sectionId] || [])];
    const bullets = (list[index][field] || []).filter((_: any, i: number) => i !== bulletIdx);
    list[index] = { ...list[index], [field]: bullets };
    setActiveContent({ ...activeContent, [sectionId]: list });
  };

  return (
    <div className={`resume-editor-panel expanded`}>
      <button
        className="panel-toggle-btn"
        onClick={onClose}
        title="Collapse editor"
        aria-label="Collapse editor"
      >
        <svg viewBox="0 0 24 24">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>
      <div className="panel-inner-wrapper">
        <div className="panel-header">
          <h3>{getSectionTitle()}</h3>
          <button onClick={onClose} className="panel-close-btn" title="Close Panel">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div
          className="panel-body"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {sectionConfig.type === 'profile' ? (
            <div className="editor-group">
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
            <div className="editor-group">
              {(!activeContent[sectionConfig.id] || activeContent[sectionConfig.id].length === 0) ? (
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
                (activeContent[sectionConfig.id] || []).map((item: any, idx: number) => (
                  <div key={idx} className="editor-card">
                    <div className="card-header">
                      <span>Item #{idx + 1}</span>
                      <button onClick={(e) => { e.stopPropagation(); removeItem(sectionConfig.id, idx); }} className="card-delete-btn" title="Delete">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
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
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
