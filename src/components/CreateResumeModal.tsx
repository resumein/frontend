import React from 'react';

interface CreateResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  loader: boolean;
  hasResumes: boolean;
}

export default function CreateResumeModal({
  isOpen,
  onClose,
  onSubmit,
  loader,
  hasResumes,
}: CreateResumeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 100 }} onClick={() => hasResumes && onClose()}>
      <div className="modal-card" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            {hasResumes ? 'Create New Resume' : 'Create Your First Resume'}
          </h3>
          {hasResumes && (
            <button className="btn-modal-close" onClick={onClose} title="Close dialog">
              <svg viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>
        <div className="modal-body" style={{ padding: '1.5rem' }}>
          <form className="item-form" onSubmit={onSubmit}>
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" htmlFor="filename">Resume Filename *</label>
              <input 
                className="form-input" 
                type="text" 
                id="filename" 
                name="filename" 
                required 
                placeholder="e.g. Software Engineer Resume 2026" 
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" htmlFor="template">Choose Template *</label>
              <select 
                className="form-input" 
                id="template" 
                name="template" 
                required
              >
                <option value="jakes">Jake's resume</option>
              </select>
            </div>

            <div className="form-actions" style={{ marginTop: '1.5rem' }}>
              {hasResumes && (
                <button className="btn-form-cancel" type="button" onClick={onClose}>
                  Cancel
                </button>
              )}
              <button 
                className="btn-form-save" 
                type="submit" 
                disabled={loader}
                style={{ width: hasResumes ? 'auto' : '100%' }}
              >
                {loader ? 'Creating...' : 'Create Resume'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
