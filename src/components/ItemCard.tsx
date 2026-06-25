import type { ResumeItem, EducationItem, ProjectItem, ExperienceItem, CertificationItem, AwardItem } from '../lib/api';

interface ItemCardProps {
  item: ResumeItem;
  onEdit: (item: ResumeItem) => void;
  onDelete: (item: ResumeItem) => void;
  formatDate: (dateStr?: string) => string;
  isUsed?: boolean;
}

export default function ItemCard({ item, onEdit, onDelete, formatDate, isUsed = false }: ItemCardProps) {
  const handleDragStart = (e: React.DragEvent) => {
    if (isUsed) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    e.dataTransfer.setData(`item-type/${item.type}`, 'true');
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div 
      className={`item-card ${isUsed ? 'is-used' : ''}`}
      draggable={!isUsed}
      onDragStart={handleDragStart}
      style={{ cursor: isUsed ? 'not-allowed' : 'grab' }}
    >
      {/* Action buttons wrapper (visible bottom-right on hover) */}
      <div className="item-card-actions">
        <button 
          className="item-card-btn edit"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(item);
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
            onDelete(item);
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
            {(item as EducationItem).location && ` (${(item as EducationItem).location})`}
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
          {(item as ProjectItem).technologiesUsed && (
            <div className="item-card-tech">
              {(item as ProjectItem).technologiesUsed}
            </div>
          )}
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
          <div className="item-card-subtitle">
            {(item as ExperienceItem).company}
            {(item as ExperienceItem).location && ` (${(item as ExperienceItem).location})`}
          </div>
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
  );
}
