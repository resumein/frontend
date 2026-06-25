import { useEffect, useRef, useState, useCallback } from 'react';
import { useResumeStore } from '../store/resumeStore';
import { parseTemplateConfig, mapItemToSectionData, DEFAULT_TEMPLATE_CONFIG, getFallbackRenderData } from '../lib/templateUtils';

interface ResumePreviewProps {
  onSectionClick: (section: string) => void;
  activeSection: string | null;
}

const PAGE_W_IN = 8.5;
const PAGE_H_IN = 11;
const PAGE_H_PX = PAGE_H_IN * 96; // 1056px @ 96dpi
const PAGE_MARGIN_PX = Math.round(0.5 * 96); // 48px = 0.5in — matches #page padding in template

// Vertical padding inside canvas area (top/bottom) in px
const CANVAS_PAD = 32;
// Gap between page cards in px
const PAGE_GAP = 28;

export default function ResumePreview({ onSectionClick, activeSection }: ResumePreviewProps) {
  const resumes = useResumeStore((s) => s.resumes);
  const selectedResumeId = useResumeStore((s) => s.selectedResumeId);
  const activeContent = useResumeStore((s) => s.activeContent);
  const templateConfig = useResumeStore((s) => s.templateConfig);
  const setTemplateConfig = useResumeStore((s) => s.setTemplateConfig);

  const currentResume = resumes.find((r) => r.id === selectedResumeId);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [zoom, setZoom] = useState(1.0);
  const [htmlContent, setHtmlContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [pageCount, setPageCount] = useState(1);

  const lastResumeIdRef = useRef<string | null>(null);
  const iframeReadyRef = useRef(false);
  const dragCounterRef = useRef(0);
  const lastDropTimeRef = useRef(0);
  const lastDropItemRef = useRef('');
  const roRef = useRef<ResizeObserver | null>(null);
  const injectingRef = useRef(false);    // prevents ResizeObserver re-entrancy
  const rawContentBottomRef = useRef(0); // cache: content height before spacers (set by injectPageBreakSpacers)

  /* ─── drag-end cleanup ───────────────────────────────────────── */
  useEffect(() => {
    const handler = () => { dragCounterRef.current = 0; setSectionHighlight(null); };
    window.addEventListener('dragend', handler);
    return () => window.removeEventListener('dragend', handler);
  }, []);

  /* ─── drop handler ───────────────────────────────────────────── */
  const handleDropItem = (item: any) => {
    const now = Date.now();
    const key = item ? JSON.stringify(item) : '';
    if (key && key === lastDropItemRef.current && now - lastDropTimeRef.current < 300) return;
    lastDropItemRef.current = key;
    lastDropTimeRef.current = now;

    const store = useResumeStore.getState();
    const section = store.templateConfig?.sections.find(
      (s) => s.id === item.type || s.dragTypes?.includes(item.type)
    );
    if (!section) return;

    const mapped = mapItemToSectionData(item, section);
    const content = { ...store.activeContent };
    const list: any[] = content[section.id] || [];
    if (list.some((x: any) => JSON.stringify(x) === JSON.stringify(mapped))) return;

    const isEmpty = (o: any) =>
      !o || typeof o !== 'object' ||
      Object.keys(o).every((k) => { const v = o[k]; return !v || (Array.isArray(v) && (v.length === 0 || (v.length === 1 && !v[0]))); });

    content[section.id] = list.length === 1 && isEmpty(list[0]) ? [mapped] : [...list, mapped];
    store.setActiveContent(content);
  };

  /* ─── highlight helper ───────────────────────────────────────── */
  const setSectionHighlight = (typeOrId: string | null) => {
    const doc = iframeRef.current?.contentDocument;
    const tc = useResumeStore.getState().templateConfig;
    if (!doc || !tc) return;
    tc.sections.forEach((s) => doc.querySelector(s.selector)?.classList.remove('section-drag-highlight'));
    if (!typeOrId) return;
    const sec = tc.sections.find((s) => s.id === typeOrId || s.dragTypes?.includes(typeOrId));
    if (sec) doc.querySelector(sec.selector)?.classList.add('section-drag-highlight');
  };

  /* ─── outer drag events ──────────────────────────────────────── */
  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault(); dragCounterRef.current++;
    const t = e.dataTransfer.types.find((x) => x.startsWith('item-type/'));
    if (t) setSectionHighlight(t.split('/')[1]);
  };
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    const t = e.dataTransfer.types.find((x) => x.startsWith('item-type/'));
    if (t) setSectionHighlight(t.split('/')[1]);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault(); dragCounterRef.current--;
    if (dragCounterRef.current === 0) setSectionHighlight(null);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounterRef.current = 0; setSectionHighlight(null);
    try { const d = e.dataTransfer.getData('application/json'); if (d) handleDropItem(JSON.parse(d)); }
    catch { /* noop */ }
  };

  /* ─── fetch template HTML ────────────────────────────────────── */
  useEffect(() => {
    if (!currentResume) return;
    setLoading(true);
    fetch(`/templates/${currentResume.template || 'jakes'}.html`)
      .then((r) => { if (!r.ok) throw new Error('404'); return r.text(); })
      .then((text) => {
        setHtmlContent(text.replace('render(resumeData);', ''));
        const store = useResumeStore.getState();
        if (!store.templateConfig) {
          setTemplateConfig(parseTemplateConfig(text) ?? DEFAULT_TEMPLATE_CONFIG);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [currentResume?.template, selectedResumeId]);

  /* ─── measure page count ─────────────────────────────────────────── */
  // Reads rawContentBottomRef (set by injectPageBreakSpacers) — NO DOM mutations,
  // so it never triggers ResizeObserver and cannot cause oscillation.
  const measurePages = useCallback(() => {
    const rawBottom = rawContentBottomRef.current;
    if (rawBottom <= 0) return;
    const totalH = rawBottom + PAGE_MARGIN_PX;
    setPageCount(Math.max(1, Math.ceil(totalH / PAGE_H_PX)));
  }, []);

  /* ─── inject spacers at page break boundaries ────────────────── */
  const injectPageBreakSpacers = useCallback((doc: Document) => {
    if (injectingRef.current) return;
    injectingRef.current = true;

    const MARGIN = PAGE_MARGIN_PX;

    // 1. Remove all previous spacers and page-break-before classes
    doc.querySelectorAll('.page-break-spacer').forEach((el) => el.remove());
    doc.querySelectorAll('.page-break-before').forEach((el) => el.classList.remove('page-break-before'));

    const pageEl = doc.getElementById('page');
    if (!pageEl) {
      requestAnimationFrame(() => requestAnimationFrame(() => { injectingRef.current = false; }));
      return;
    }

    // 2. Snapshot ALL child positions NOW — before any spacer insertions
    //    (reading live offsetTop after earlier siblings get spacers causes double-counting)
    const snapshot = Array.from(pageEl.children)
      .filter(el => !el.classList.contains('page-break-spacer'))
      .map(el => ({
        el: el as HTMLElement,
        top: (el as HTMLElement).offsetTop,
        height: (el as HTMLElement).offsetHeight,
      }));

    // 3. Compute raw content bottom BEFORE any insertions — cache for measurePages
    let rawBottom = 0;
    for (const { top, height } of snapshot) {
      const b = top + height;
      if (b > rawBottom) rawBottom = b;
    }
    rawContentBottomRef.current = rawBottom;

    // 4. Update page count from raw content
    const rawTotal = rawBottom + MARGIN;
    setPageCount(Math.max(1, Math.ceil(rawTotal / PAGE_H_PX)));

    // 5. If single page, no spacers needed — release guard and return
    if (rawTotal <= PAGE_H_PX) {
      requestAnimationFrame(() => requestAnimationFrame(() => { injectingRef.current = false; }));
      return;
    }

    const makeSpacerEl = (h: number) => {
      const s = doc.createElement('div');
      s.className = 'page-break-spacer';
      s.style.cssText = `height:${h}px;display:block;visibility:hidden;flex-shrink:0;pointer-events:none;`;
      return s;
    };

    // 6. Walk snapshot positions and insert spacers using accumulated extraOffset
    let extraOffset = 0;
    for (const { el: child, top: rawTop, height } of snapshot) {
      const childTop = rawTop + extraOffset;  // effective position accounting for spacers we've added
      const childBottom = childTop + height;
      const pageOfTop = Math.floor(childTop / PAGE_H_PX);
      const pageOfBottom = Math.floor(Math.max(0, childBottom - 1) / PAGE_H_PX);

      if (pageOfBottom > pageOfTop) {
        // Child straddles a page break — push it entirely to the next page
        const pageEndY = (pageOfTop + 1) * PAGE_H_PX;
        const spacerH = Math.max(0, (pageEndY - childTop) + MARGIN);
        pageEl.insertBefore(makeSpacerEl(spacerH), child);
        extraOffset += spacerH;
        child.classList.add('page-break-before'); // for print CSS
      } else {
        // Bottom margin: pad section away from page end
        const pageEndY = (pageOfBottom + 1) * PAGE_H_PX;
        const distToEnd = pageEndY - childBottom;
        if (distToEnd > 0 && distToEnd < MARGIN) {
          child.insertAdjacentElement('afterend', makeSpacerEl(distToEnd));
          extraOffset += distToEnd;
        }
        // Top margin: ensure section doesn't start flush with page top
        if (pageOfTop > 0) {
          const distFromTop = childTop - pageOfTop * PAGE_H_PX;
          if (distFromTop < MARGIN) {
            pageEl.insertBefore(makeSpacerEl(MARGIN - distFromTop), child);
            extraOffset += MARGIN - distFromTop;
          }
        }
      }
    }

    // 7. Release guard after 2 extra frames to absorb async ResizeObserver callbacks
    requestAnimationFrame(() => requestAnimationFrame(() => { injectingRef.current = false; }));
  }, []);

  /* ─── inject style overrides into iframe ────────────────────── */
  const injectStyles = useCallback((doc: Document) => {
    const tc = useResumeStore.getState().templateConfig;
    if (!tc) return;
    doc.getElementById('preview-style-overrides')?.remove();
    const style = doc.createElement('style');
    style.id = 'preview-style-overrides';
    const hover = tc.sections.map((s) => `${s.selector}:hover`).join(', ');
    const base = tc.sections.map((s) => s.selector).join(', ');
    style.innerHTML = `
      #page { height: auto !important; min-height: ${PAGE_H_IN}in !important; overflow: visible !important; padding: 0.5in 0.6in !important; box-sizing: border-box !important; }
      /* Lock html+body to 816px so template never reflows to mobile layout on narrow devices */
      html, body { overflow: visible !important; height: auto !important; width: 816px !important; min-width: 816px !important; }
      ${hover} { outline: 2px dashed rgba(249,115,22,0.7) !important; outline-offset: 4px !important; border-radius: 4px !important; cursor: pointer !important; transition: outline-color 0.2s ease; }
      ${base} { transition: all 0.2s ease; }
      .section-drag-highlight { outline: 2.5px dashed #e36414 !important; outline-offset: 4px !important; border-radius: 4px !important; background-color: rgba(227,100,20,0.05) !important; }
      .section-selected-highlight { outline: 2.5px solid #e36414 !important; outline-offset: 4px !important; border-radius: 4px !important; background-color: rgba(227,100,20,0.03) !important; }
      a { pointer-events: none !important; cursor: default !important; }
      .page-break-spacer { display: block; visibility: hidden; }
      @media print {
        /* Lock page to letter size with no browser margins so natural breaks align with our 1056px grid */
        @page { size: 8.5in 11in; margin: 0; }
        html, body { margin: 0 !important; padding: 0 !important; }
        /* Keep #page auto-height so it flows across multiple print pages */
        #page { height: auto !important; min-height: 0 !important; overflow: visible !important; padding: 0.5in 0.6in !important; box-sizing: border-box !important; }
        /* KEEP spacers visible so layout matches preview exactly.
           With @page margin:0, browser breaks at exactly 11in = 1056px,
           which is where our spacers push each section to start. */
        .page-break-spacer { display: block !important; visibility: hidden !important; }
        .section-selected-highlight,.section-drag-highlight,${base},${hover} { outline: none !important; outline-offset: 0 !important; background-color: transparent !important; box-shadow: none !important; }
      }
    `;
    doc.head.appendChild(style);
  }, []);

  /* ─── bind section click handlers ───────────────────────────── */
  const bindHandlers = useCallback((doc: Document) => {
    const tc = useResumeStore.getState().templateConfig;
    if (!tc) return;
    tc.sections.forEach((sec) => {
      const el = doc.querySelector(sec.selector) as HTMLElement | null;
      if (el) {
        el.onclick = (e: MouseEvent) => { e.preventDefault(); e.stopPropagation(); onSectionClick(sec.id); };
      }
    });
  }, [onSectionClick]);

  /* ─── main iframe update ─────────────────────────────────────── */
  const updateIframe = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow || !htmlContent || !activeContent) return;
    const win = iframe.contentWindow as any;
    const doc = iframe.contentDocument || win.document;

    const render = () => {
      if (typeof win.renderResume !== 'function') return;
      win.renderResume({ ...getFallbackRenderData(activeContent), templateConfig });
      injectStyles(doc);
      bindHandlers(doc);
      // Wait two frames for layout, then inject page-break spacers
      requestAnimationFrame(() => requestAnimationFrame(() => {
        injectPageBreakSpacers(doc);
        measurePages();
      }));
    };

    if (lastResumeIdRef.current !== selectedResumeId || !iframeReadyRef.current) {
      iframeReadyRef.current = false;
      lastResumeIdRef.current = selectedResumeId;
      doc.open(); doc.write(htmlContent); doc.close();

      // Force the iframe to always render at 816px (8.5in desktop width) regardless of device.
      // The outer React component scales it via CSS transform, so content is always desktop-layout.
      const existingVp = doc.querySelector('meta[name="viewport"]');
      if (existingVp) existingVp.setAttribute('content', 'width=816');
      else {
        const vp = doc.createElement('meta');
        vp.name = 'viewport';
        vp.content = 'width=816';
        doc.head.appendChild(vp);
      }

      const setup = () => {
        iframeReadyRef.current = true;

        doc.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Escape')
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true }));
        });
        doc.body.addEventListener('dragenter', (e: DragEvent) => {
          e.preventDefault();
          const t = e.dataTransfer?.types.find((x) => x.startsWith('item-type/'));
          if (t) setSectionHighlight(t.split('/')[1]);
        });
        doc.body.addEventListener('dragover', (e: DragEvent) => {
          e.preventDefault();
          const t = e.dataTransfer?.types.find((x) => x.startsWith('item-type/'));
          if (t) setSectionHighlight(t.split('/')[1]);
        });
        doc.body.addEventListener('dragleave', (e: DragEvent) => { e.preventDefault(); });
        doc.body.addEventListener('drop', (e: DragEvent) => {
          e.preventDefault(); e.stopPropagation(); setSectionHighlight(null);
          try { const d = e.dataTransfer?.getData('application/json'); if (d) handleDropItem(JSON.parse(d)); } catch { /* noop */ }
        });

        roRef.current?.disconnect();
        const pageEl = doc.getElementById('page');
        if (pageEl) {
          roRef.current = new ResizeObserver(() => {
            // Re-evaluate spacers only when we are not mid-injection
            // (measurePages is now DOM-free so no oscillation risk)
            if (!injectingRef.current) {
              requestAnimationFrame(() => injectPageBreakSpacers(doc));
            }
          });
          roRef.current.observe(pageEl);
        }
        render();
      };

      iframe.onload = setup;
      if (doc.readyState === 'complete') setup();
    } else {
      render();
    }
  }, [htmlContent, selectedResumeId, activeContent, templateConfig, injectStyles, bindHandlers, injectPageBreakSpacers]);

  useEffect(() => { updateIframe(); }, [updateIframe]);

  /* ─── active section highlight ───────────────────────────────── */
  useEffect(() => {
    const doc = iframeRef.current?.contentDocument ?? iframeRef.current?.contentWindow?.document;
    if (!doc || !templateConfig) return;
    templateConfig.sections.forEach((s) => doc.querySelector(s.selector)?.classList.remove('section-selected-highlight'));
    if (activeSection) {
      const sec = templateConfig.sections.find((s) => s.id === activeSection);
      const el = sec ? doc.querySelector(sec.selector) : null;
      if (el) { el.classList.add('section-selected-highlight'); el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
    }
  }, [activeSection, templateConfig, htmlContent]);

  const handleZoomIn = () => setZoom((p) => Math.min(p + 0.1, 1.5));
  const handleZoomOut = () => setZoom((p) => Math.max(p - 0.1, 0.45));
  const handleResetZoom = () => setZoom(1.0);

  /* ─── empty state ────────────────────────────────────────────── */
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

  /* ─── layout calculations ────────────────────────────────────── */
  const PAGE_W_PX = PAGE_W_IN * 96; // 816px @ 96dpi
  const scaledPageW = PAGE_W_PX * zoom; // px, after zoom
  const scaledPageH = PAGE_H_PX * zoom; // px, after zoom

  // The iframe is rendered at natural size (8.5in wide, auto-tall) and scaled via transform.
  // It sits inside a tall absolute container. Each page card sits below the previous card
  // and uses overflow:hidden to clip its vertical slice.
  //
  // Strategy:
  //   - One <div class="page-stack"> with position:relative, sized to hold all page cards.
  //   - The single <iframe> is positioned absolute inside page-stack, top=0 left=0, scaled.
  //   - Page cards are rendered as sibling divs with overflow:hidden; each card is positioned
  //     so its top aligns with pageIndex*(scaledPageH + PAGE_GAP) + CANVAS_PAD.
  //   - Since the iframe is absolute inside page-stack (which is in the scroll container),
  //     the cards naturally clip the correct slice of the iframe.

  const totalStackH = CANVAS_PAD + pageCount * scaledPageH + (pageCount - 1) * PAGE_GAP + CANVAS_PAD;

  return (
    <div className="preview-workspace" style={{ position: 'relative' }}>
      <div
        className="preview-canvas-container"
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {loading ? (
          <div className="preview-loading">
            <div className="spinner" />
            <span>Loading preview…</span>
          </div>
        ) : (
          /* ── page stack ── */
          <div
            style={{
              position: 'relative',
              width: `${scaledPageW}px`,
              height: `${totalStackH}px`,
              flexShrink: 0,
              margin: '0 auto',
            }}
          >
            {/* Single real iframe — absolutely positioned, scaled, full document height */}
            <iframe
              ref={iframeRef}
              id="resume-preview-iframe"
              className="preview-iframe"
              title="Resume Preview Canvas"
              scrolling="no"
              style={{
                position: 'absolute',
                top: `${CANVAS_PAD}px`,
                left: 0,
                width: `${PAGE_W_IN}in`,
                // Tall enough for all pages (unscaled; transform handles visual size)
                height: `${PAGE_H_IN * pageCount}in`,
                border: 'none',
                backgroundColor: '#ffffff',
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
                pointerEvents: 'auto',
                zIndex: 1,
              }}
            />

            {/* Page cards — clipping windows over the iframe */}
            {Array.from({ length: pageCount }).map((_, i) => {
              const cardTop = CANVAS_PAD + i * (scaledPageH + PAGE_GAP);
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    top: `${cardTop}px`,
                    left: 0,
                    width: `${scaledPageW}px`,
                    height: `${scaledPageH}px`,
                    overflow: 'hidden',
                    borderRadius: '3px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.16), 0 1px 4px rgba(0,0,0,0.08)',
                    pointerEvents: 'none', // let iframe handle all pointer events
                    zIndex: 2,
                  }}
                >
                  {/* Page label */}
                  {pageCount > 1 && (
                    <div style={{
                      position: 'absolute',
                      top: '-1.5rem',
                      left: 0, right: 0,
                      textAlign: 'center',
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      letterSpacing: '0.07em',
                      textTransform: 'uppercase',
                      color: 'var(--text-secondary)',
                      opacity: 0.6,
                      pointerEvents: 'none',
                      zIndex: 10,
                    }}>
                      Page {i + 1}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Separator bars between pages — canvas background covers iframe at page boundaries */}
            {Array.from({ length: pageCount - 1 }).map((_, i) => {
              const sepTop = CANVAS_PAD + (i + 1) * scaledPageH + i * PAGE_GAP;
              return (
                <div
                  key={`sep-${i}`}
                  style={{
                    position: 'absolute',
                    top: `${sepTop}px`,
                    left: `-40px`, // extend beyond page edges for cleaner look
                    width: `calc(${scaledPageW}px + 80px)`,
                    height: `${PAGE_GAP}px`,
                    backgroundColor: 'var(--preview-canvas-bg, #E5E7EB)',
                    zIndex: 5,
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div style={{
                    width: `${scaledPageW}px`,
                    borderTop: '1.5px dashed rgba(120,120,120,0.25)',
                  }} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Floating zoom controls ── */}
      {!loading && (
        <div className="preview-floating-zoom">
          <button
            onClick={() => onSectionClick('details')}
            className="zoom-btn"
            title="Edit Resume Details"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 'auto', padding: '0 0.5rem 0 0.25rem', borderRadius: '20px',
              gap: '0.35rem', fontSize: '0.75rem', fontWeight: 700,
              backgroundColor: activeSection === 'details' ? 'rgba(227, 100, 20, 0.08)' : 'transparent',
              color: 'var(--text-primary)',
              border: activeSection === 'details' ? '1.5px solid var(--color-brand-terracotta)' : '1.5px solid transparent',
              cursor: 'pointer', height: '2rem',
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '0.9rem', height: '0.9rem' }}>
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit
          </button>

          <span style={{ width: '1px', height: '1rem', backgroundColor: 'var(--border-color)', margin: '0 0.2rem' }} />

          <button
            onClick={() => onSectionClick('layout')}
            className="zoom-btn"
            title="Manage Sections Layout"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 'auto', padding: '0 0.5rem 0 0.25rem', borderRadius: '20px',
              gap: '0.35rem', fontSize: '0.75rem', fontWeight: 700,
              backgroundColor: activeSection === 'layout' ? 'rgba(227, 100, 20, 0.08)' : 'transparent',
              color: 'var(--text-primary)',
              border: activeSection === 'layout' ? '1.5px solid var(--color-brand-terracotta)' : '1.5px solid transparent',
              cursor: 'pointer', height: '2rem',
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

          <span style={{ width: '1px', height: '1rem', backgroundColor: 'var(--border-color)', margin: '0 0.2rem' }} />

          <button onClick={handleZoomOut} className="zoom-btn" title="Zoom Out">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <span className="zoom-indicator" onClick={handleResetZoom} title="Reset to 100%">
            {Math.round(zoom * 100)}%
          </span>
          <button onClick={handleZoomIn} className="zoom-btn" title="Zoom In">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
