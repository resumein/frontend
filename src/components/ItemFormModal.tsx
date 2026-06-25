import React from 'react';
import type { ResumeItem, EducationItem, ProjectItem, ExperienceItem, CertificationItem, AwardItem } from '../lib/api';

interface ItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  itemToEdit: ResumeItem | null;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  submitting: boolean;
  getModalTitleLabel: (tab: string) => string;
  formatDateForInput: (dateStr?: string) => string;
}

export default function ItemFormModal({
  isOpen,
  onClose,
  activeTab,
  itemToEdit,
  onSubmit,
  submitting,
  getModalTitleLabel,
  formatDateForInput,
}: ItemFormModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            {itemToEdit ? 'Edit' : 'Add New'} {getModalTitleLabel(activeTab)}
          </h3>
          <button className="btn-modal-close" onClick={onClose} title="Close dialog">
            <svg viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <form className="item-form" onSubmit={onSubmit}>
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
                  <label className="form-label" htmlFor="location">Location *</label>
                  <input 
                    className="form-input" 
                    type="text" 
                    id="location" 
                    name="location" 
                    required 
                    placeholder="e.g. Stanford, CA" 
                    defaultValue={itemToEdit ? ((itemToEdit as EducationItem).location || '') : ''}
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
                  <label className="form-label" htmlFor="technologiesUsed">Technologies Used *</label>
                  <input 
                    className="form-input" 
                    type="text" 
                    id="technologiesUsed" 
                    name="technologiesUsed" 
                    required 
                    placeholder="e.g. Python, Flask, React" 
                    defaultValue={itemToEdit ? ((itemToEdit as ProjectItem).technologiesUsed || '') : ''}
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
                    placeholder="Describe key features and your individual contribution..." 
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
                  <label className="form-label" htmlFor="location">Location *</label>
                  <input 
                    className="form-input" 
                    type="text" 
                    id="location" 
                    name="location" 
                    required 
                    placeholder="e.g. Mountain View, CA" 
                    defaultValue={itemToEdit ? ((itemToEdit as ExperienceItem).location || '') : ''}
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
              <button className="btn-form-cancel" type="button" onClick={onClose}>
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
  );
}
