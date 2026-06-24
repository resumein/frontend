interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  deleting: boolean;
}

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  deleting,
}: DeleteConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '380px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Delete Item</h3>
          <button className="btn-modal-close" onClick={onClose} title="Close dialog">
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
            <button className="btn-form-cancel" type="button" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn-form-delete"
              type="button"
              onClick={onConfirm}
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
  );
}
