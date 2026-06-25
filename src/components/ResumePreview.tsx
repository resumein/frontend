import { useEffect, useRef, useState } from 'react';
import { useResumeStore } from '../store/resumeStore';
import { parseTemplateConfig, mapItemToSectionData, DEFAULT_TEMPLATE_CONFIG, getFallbackRenderData } from '../lib/templateUtils';

interface ResumePreviewProps {
  onSectionClick: (section: string) => void;
}

export default function ResumePreview({ onSectionClick }: ResumePreviewProps) {
  const resumes = useResumeStore((state) => state.resumes);
  const selectedResumeId = useResumeStore((state) => state.selectedResumeId);
  const activeContent = useResumeStore((state) => state.activeContent);
  const setActiveContent = useResumeStore((state) => state.setActiveContent);
  const templateConfig = useResumeStore((state) => state.templateConfig);
  const setTemplateConfig = useResumeStore((state) => state.setTemplateConfig);

  const currentResume = resumes.find((r) => r.id === selectedResumeId);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [zoom, setZoom] = useState<number>(1.0); // Default zoom level to fit screen comfortably
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const lastLoadedResumeIdRef = useRef<string | null>(null);
  const iframeLoadedRef = useRef<boolean>(false);
  const dragCounterRef = useRef<number>(0);
  const lastDropTimeRef = useRef<number>(0);
  const lastDropItemIdRef = useRef<string>('');

  useEffect(() => {
    const handleGlobalDragEnd = () => {
      dragCounterRef.current = 0;
      setSectionHighlight(null);
    };
    window.addEventListener('dragend', handleGlobalDragEnd);
    return () => {
      window.removeEventListener('dragend', handleGlobalDragEnd);
    };
  }, []);

  const handleDropItem = (item: any) => {
    const now = Date.now();
    const itemStr = item ? JSON.stringify(item) : '';
    console.log('[ResumePreview] handleDropItem called with item:', item);

    if (itemStr && itemStr === lastDropItemIdRef.current && (now - lastDropTimeRef.current < 300)) {
      console.log('[ResumePreview] BLOCKED duplicate drop of the same record');
      return;
    }

    lastDropItemIdRef.current = itemStr;
    lastDropTimeRef.current = now;

    const section = templateConfig?.sections.find(s =>
      s.id === item.type || (s.dragTypes && s.dragTypes.includes(item.type))
    );

    if (!section) {
      console.warn('[ResumePreview] No matching section found in template config for item type:', item.type);
      return;
    }

    const mappedData = mapItemToSectionData(item, section);
    console.log('[ResumePreview] Mapped section data:', mappedData);

    const currentContent = { ...activeContent };
    const targetKey = section.id;
    const currentList = currentContent[targetKey] || [];

    // Check if the exact same record is already in the list to avoid duplicate rendering
    const isDuplicateData = currentList.some((existing: any) => {
      return JSON.stringify(existing) === JSON.stringify(mappedData);
    });

    if (isDuplicateData) {
      console.log('[ResumePreview] BLOCKED duplicate drop: item data already exists');
      return;
    }

    currentContent[targetKey] = [...currentList, mappedData];
    setActiveContent(currentContent);
  };

  const setSectionHighlight = (typeOrId: string | null) => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc || !templateConfig) return;

    templateConfig.sections.forEach((sec) => {
      const el = doc.querySelector(sec.selector);
      if (el) {
        el.classList.remove('section-drag-highlight');
      }
    });

    if (!typeOrId) return;

    const matchedSection = templateConfig.sections.find(s =>
      s.id === typeOrId || (s.dragTypes && s.dragTypes.includes(typeOrId))
    );

    if (matchedSection) {
      const el = doc.querySelector(matchedSection.selector);
      if (el) {
        el.classList.add('section-drag-highlight');
      }
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current++;
    const typeType = e.dataTransfer.types.find(t => t.startsWith('item-type/'));
    if (typeType) {
      const type = typeType.split('/')[1];
      setSectionHighlight(type);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    const typeType = e.dataTransfer.types.find(t => t.startsWith('item-type/'));
    if (typeType) {
      const type = typeType.split('/')[1];
      setSectionHighlight(type);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setSectionHighlight(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    dragCounterRef.current = 0;
    setSectionHighlight(null);
    try {
      const dataStr = e.dataTransfer.getData('application/json');

      if (dataStr) {
        const item = JSON.parse(dataStr);
        handleDropItem(item);
      }
    } catch (err) {
      console.error('Failed to parse dropped item in preview container:', err);
    }
  };

  // Fetch the template HTML dynamically
  useEffect(() => {
    if (!currentResume) return;
    setLoading(true);
    const templateName = currentResume.template || 'jakes';
    fetch(`/templates/${templateName}.html`)
      .then((r) => {
        if (!r.ok) {
          throw new Error('Failed to load template');
        }
        return r.text();
      })
      .then((text) => {
        // Strip out the initial rendering call so it doesn't flash the template's hardcoded sample values
        const stripped = text.replace('render(resumeData);', '');
        setHtmlContent(stripped);

        let parsed = parseTemplateConfig(text);
        if (!parsed) {
          parsed = DEFAULT_TEMPLATE_CONFIG;
        }
        setTemplateConfig(parsed);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching template:', err);
        setLoading(false);
      });
  }, [currentResume?.template, selectedResumeId]);

  const updateIframeContent = () => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow || !htmlContent || !activeContent) return;

    const win = iframe.contentWindow as any;
    const doc = iframe.contentDocument || win.document;

    const runRenderOnly = () => {
      if (win && typeof win.renderResume === 'function') {
        const enriched = getFallbackRenderData(activeContent, templateConfig);
        win.renderResume({
          ...enriched,
          templateConfig
        });

        // Re-inject dynamic style overrides to match current templateConfig selectors
        const existingStyle = doc.getElementById('preview-style-overrides');
        if (existingStyle) {
          existingStyle.remove();
        }

        const style = doc.createElement('style');
        style.id = 'preview-style-overrides';
        const hoverSelectors = templateConfig?.sections.map(s => `${s.selector}:hover`).join(', ') || '';
        const baseSelectors = templateConfig?.sections.map(s => s.selector).join(', ') || '';

        style.innerHTML = `
          ${hoverSelectors} {
            outline: 2px dashed rgba(249, 115, 22, 0.7) !important;
            outline-offset: 4px !important;
            border-radius: 4px !important;
            cursor: pointer !important;
            transition: outline-color 0.2s ease;
          }
          ${baseSelectors} {
            transition: all 0.2s ease;
          }
          .section-drag-highlight {
            outline: 2.5px dashed #e36414 !important;
            outline-offset: 4px !important;
            border-radius: 4px !important;
            background-color: rgba(227, 100, 20, 0.05) !important;
          }
          a {
            pointer-events: none !important;
            cursor: default !important;
          }
        `;
        doc.head.appendChild(style);

        // Re-bind sections click dynamically
        templateConfig?.sections.forEach((section) => {
          const el = doc.querySelector(section.selector);
          if (el) {
            el.onclick = (e: MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              onSectionClick(section.id);
            };
          }
        });
      }
    };

    // If the resume has changed, or iframe hasn't been loaded yet, write HTML
    if (lastLoadedResumeIdRef.current !== selectedResumeId || !iframeLoadedRef.current) {
      iframeLoadedRef.current = false;
      lastLoadedResumeIdRef.current = selectedResumeId;

      doc.open();
      doc.write(htmlContent);
      doc.close();

      const setupListeners = () => {
        iframeLoadedRef.current = true;

        // Drag and drop event listeners inside the iframe document
        doc.body.addEventListener('dragenter', (e: DragEvent) => {
          e.preventDefault();
          const typeType = e.dataTransfer?.types.find(t => t.startsWith('item-type/'));
          if (typeType) {
            const type = typeType.split('/')[1];
            setSectionHighlight(type);
          }
        });
        doc.body.addEventListener('dragover', (e: DragEvent) => {
          e.preventDefault();
          const typeType = e.dataTransfer?.types.find(t => t.startsWith('item-type/'));
          if (typeType) {
            const type = typeType.split('/')[1];
            setSectionHighlight(type);
          }
        });
        doc.body.addEventListener('dragleave', (e: DragEvent) => {
          e.preventDefault();
        });
        doc.body.addEventListener('drop', (e: DragEvent) => {
          e.preventDefault();
          e.stopPropagation();

          setSectionHighlight(null);
          try {
            const dataStr = e.dataTransfer?.getData('application/json');

            if (dataStr) {
              const item = JSON.parse(dataStr);
              handleDropItem(item);
            }
          } catch (err) {
            console.error('Failed to parse dropped item inside iframe:', err);
          }
        });

        // Trigger render
        runRenderOnly();
      };

      iframe.onload = setupListeners;

      if (doc.readyState === 'complete') {
        setupListeners();
      }
    } else {
      runRenderOnly();
    }
  };

  useEffect(() => {
    updateIframeContent();
  }, [htmlContent, selectedResumeId, activeContent, templateConfig]);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.1, 1.5));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.1, 0.45));
  };

  const handleResetZoom = () => {
    setZoom(1.0);
  };

  if (!currentResume) {
    return (
      <div className="preview-placeholder">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <p>No active resume selected</p>
      </div>
    );
  }

  return (
    <div className="preview-workspace" style={{ position: 'relative' }}>
      {/* Canva Document Container */}
      <div
        className="preview-canvas-container"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {loading ? (
          <div className="preview-loading">
            <div className="spinner"></div>
            <span>Loading preview...</span>
          </div>
        ) : (
          <div
            className="preview-document-wrapper"
            style={{
              width: `${8.5 * zoom}in`,
              height: `${11 * zoom}in`
            }}
          >
            <iframe
              ref={iframeRef}
              title="Resume Preview Canvas"
              className="preview-iframe"
              scrolling="no"
              style={{
                width: '8.5in',
                height: '11in',
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
                border: 'none',
                backgroundColor: '#ffffff'
              }}
            />
          </div>
        )}
      </div>

      {/* Sticky Floating Zoom Controls at Bottom Right */}
      {!loading && (
        <div className="preview-floating-zoom">
          <button
            onClick={() => onSectionClick('layout')}
            className="zoom-btn"
            title="Manage Sections Layout"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 'auto',
              padding: '0 0.5rem 0 0.25rem',
              borderRadius: '20px',
              gap: '0.35rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              backgroundColor: 'transparent',
              color: 'var(--text-primary)',
              border: 'none',
              cursor: 'pointer',
              height: '2rem'
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '0.9rem', height: '0.9rem' }}>
              <rect x="3" y="3" width="7" height="9" rx="1" />
              <rect x="14" y="3" width="7" height="5" rx="1" />
              <rect x="14" y="12" width="7" height="9" rx="1" />
              <rect x="3" y="16" width="7" height="5" rx="1" />
            </svg>
            Layout
          </button>
          
          <span style={{ width: '1px', height: '1rem', backgroundColor: 'var(--border-color)', margin: '0 0.2rem' }}></span>

          <button onClick={handleZoomOut} className="zoom-btn" title="Zoom Out">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
          <span className="zoom-indicator" onClick={handleResetZoom} title="Reset to 100%">
            {Math.round(zoom * 100)}%
          </span>
          <button onClick={handleZoomIn} className="zoom-btn" title="Zoom In">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
