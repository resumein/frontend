import { useState, useRef, useEffect } from 'react';
import { aiService, itemService } from '../lib/api';
import type { ResumeItem } from '../lib/api';
import { getErrorMessage } from '../lib/network';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

// Check if a general item is valid
function isItemValid(item: ResumeItem): boolean {
  if (!item) return false;
  switch (item.type) {
    case 'education':
      return !!(item.school?.trim() && item.degree?.trim() && item.field?.trim() && item.fromDate);
    case 'experience':
      return !!(item.title?.trim() && item.company?.trim() && item.fromDate);
    case 'project':
      return !!(item.name?.trim() && item.description?.trim() && item.fromDate);
    case 'certification':
      return !!(item.title?.trim() && item.platform?.trim());
    case 'award':
      return !!(item.title?.trim() && item.issuer?.trim() && item.awardType?.trim());
    default:
      return false;
  }
}

// Utility to dynamically load a script from a CDN with global caching
function loadScript(url: string, globalName: string): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any)[globalName]) {
      resolve((window as any)[globalName]);
      return;
    }
    const existing = document.querySelector(`script[src="${url}"]`);
    if (existing) {
      const handleLoad = () => resolve((window as any)[globalName]);
      const handleError = (e: any) => reject(e);
      existing.addEventListener('load', handleLoad);
      existing.addEventListener('error', handleError);
      return;
    }
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.onload = () => resolve((window as any)[globalName]);
    script.onerror = (e) => reject(e);
    document.body.appendChild(script);
  });
}

// Browser-based OCR and PDF parsing function
async function parseResumeFile(
  file: File,
  onProgress: (progress: number, statusText: string) => void
): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  if (extension === 'txt') {
    onProgress(100, 'Reading text file...');
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read text file'));
      reader.readAsText(file);
    });
  }

  if (extension === 'pdf') {
    onProgress(5, 'Loading PDF engine...');
    const pdfjsLib = await loadScript(
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js',
      'pdfjsLib'
    );
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

    onProgress(10, 'Reading PDF file structure...');
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;
    let fullText = '';

    for (let i = 1; i <= numPages; i++) {
      onProgress(10 + Math.floor((i / numPages) * 30), `Extracting PDF text page ${i} of ${numPages}...`);
      const page = await pdf.getPage(i);
      
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      
      if (pageText.trim().length > 100) {
        fullText += pageText + '\n';
      } else {
        onProgress(10 + Math.floor((i / numPages) * 30), `Running local OCR on page ${i} of ${numPages}...`);
        
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (context) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await page.render({ canvasContext: context, viewport }).promise;
          
          const Tesseract = await loadScript(
            'https://unpkg.com/tesseract.js@5.0.3/dist/tesseract.min.js',
            'Tesseract'
          );
          
          const result = await Tesseract.recognize(canvas, 'eng');
          fullText += result.data.text + '\n';
        }
      }
    }
    return fullText;
  }

  if (['png', 'jpg', 'jpeg', 'webp'].includes(extension || '')) {
    onProgress(15, 'Loading OCR engine...');
    const Tesseract = await loadScript(
      'https://unpkg.com/tesseract.js@5.0.3/dist/tesseract.min.js',
      'Tesseract'
    );
    
    onProgress(35, 'Running OCR on image...');
    const result = await Tesseract.recognize(file, 'eng');
    onProgress(100, 'OCR completed successfully!');
    return result.data.text;
  }

  throw new Error('Unsupported file format. Please upload PDF, TXT, or Image.');
}

export default function ImportModal({ isOpen, onClose, onImportComplete }: ImportModalProps) {
  const [step, setStep] = useState<'upload' | 'parsing' | 'review'>('upload');
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [extractedItems, setExtractedItems] = useState<ResumeItem[]>([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form edit states for reviewed item
  const [itemType, setItemType] = useState<ResumeItem['type']>('education');
  const [formData, setFormData] = useState<any>({});

  // Escape key close handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    setStep('parsing');
    setProgress(0);
    setStatusText('Preparing file...');
    setErrorMsg('');

    try {
      // 1. Local Parsing/OCR
      const parsedText = await parseResumeFile(file, (prog, text) => {
        setProgress(prog * 0.7); // Local OCR takes up first 70% of the bar
        setStatusText(text);
      });

      if (!parsedText.trim()) {
        throw new Error('No readable text content could be extracted from this document.');
      }

      // 2. Classifying via API
      setProgress(75);
      setStatusText('Analyzing content with AI parser...');
      const response = await aiService.scanResume(parsedText);
      setProgress(100);
      setStatusText('Classification complete!');

      if (response && Array.isArray(response.items) && response.items.length > 0) {
        setExtractedItems(response.items);
        setCurrentItemIndex(0);
        loadItemIntoForm(response.items[0]);
        setStep('review');
      } else {
        throw new Error('AI could not find any structured items (education, projects, experience, etc.) in the text.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(getErrorMessage(err, 'Failed to import resume. Please try again.'));
      setStep('upload');
    }
  };

  const loadItemIntoForm = (item: ResumeItem) => {
    setItemType(item.type);
    
    // Normalize properties
    const data: any = { ...item };
    
    // Format dates to YYYY-MM-DD for input fields if present
    const formatDate = (d: any) => {
      if (!d) return '';
      const dateObj = new Date(d);
      if (isNaN(dateObj.getTime())) return '';
      return dateObj.toISOString().split('T')[0];
    };

    if (data.fromDate) data.fromDate = formatDate(data.fromDate);
    if (data.toDate) data.toDate = formatDate(data.toDate);
    if (data.completedOn) data.completedOn = formatDate(data.completedOn);
    if (data.date) data.date = formatDate(data.date);

    // Format roles (array to newline string)
    if (Array.isArray(data.role)) {
      data.roleText = data.role.join('\n');
    } else {
      data.roleText = '';
    }

    setFormData(data);
  };

  const saveCurrentFormChanges = () => {
    // Process roleText back into array
    const processedItem = { ...formData, type: itemType };
    delete processedItem.roleText;
    
    if (formData.roleText) {
      processedItem.role = formData.roleText
        .split('\n')
        .map((r: string) => r.trim())
        .filter((r: string) => r.length > 0);
    } else if (itemType === 'experience' || itemType === 'certification' || itemType === 'award') {
      processedItem.role = [];
    }

    // Clean up null and empty values so Zod is completely satisfied
    Object.keys(processedItem).forEach(key => {
      if (processedItem[key] === null || processedItem[key] === '') {
        delete processedItem[key];
      }
    });

    const updated = [...extractedItems];
    updated[currentItemIndex] = processedItem as ResumeItem;
    setExtractedItems(updated);
  };

  const handleNext = () => {
    saveCurrentFormChanges();
    if (currentItemIndex < extractedItems.length - 1) {
      const nextIndex = currentItemIndex + 1;
      setCurrentItemIndex(nextIndex);
      loadItemIntoForm(extractedItems[nextIndex]);
    }
  };

  const handlePrev = () => {
    saveCurrentFormChanges();
    if (currentItemIndex > 0) {
      const prevIndex = currentItemIndex - 1;
      setCurrentItemIndex(prevIndex);
      loadItemIntoForm(extractedItems[prevIndex]);
    }
  };

  const handleDeleteItem = () => {
    const updated = extractedItems.filter((_, idx) => idx !== currentItemIndex);
    setExtractedItems(updated);
    if (updated.length === 0) {
      setStep('upload');
      return;
    }
    const nextIndex = Math.min(currentItemIndex, updated.length - 1);
    setCurrentItemIndex(nextIndex);
    loadItemIntoForm(updated[nextIndex]);
  };

  const handleImportSubmit = async () => {
    saveCurrentFormChanges();
    setImporting(true);
    try {
      // Strip frontend helper keys like roleText
      const finalItems = extractedItems.map((item: any) => {
        const copy = { ...item };
        delete copy.roleText;
        return copy;
      });

      await itemService.bulkInsertItems(finalItems);
      onImportComplete();
      onClose();
    } catch (err: any) {
      console.error(err);
      alert(getErrorMessage(err, 'Failed to import items into database'));
    } finally {
      setImporting(false);
    }
  };

  // Check if current form is valid
  const isCurrentFormValid = (): boolean => {
    switch (itemType) {
      case 'education':
        return !!(formData.school?.trim() && formData.degree?.trim() && formData.field?.trim() && formData.fromDate);
      case 'experience':
        return !!(formData.title?.trim() && formData.company?.trim() && formData.fromDate);
      case 'project':
        return !!(formData.name?.trim() && formData.description?.trim() && formData.fromDate);
      case 'certification':
        return !!(formData.title?.trim() && formData.platform?.trim());
      case 'award':
        return !!(formData.title?.trim() && formData.issuer?.trim() && formData.awardType?.trim());
      default:
        return false;
    }
  };

  // Check if there are any invalid items in the entire extraction array
  const hasAnyInvalidItems = (): boolean => {
    return extractedItems.some((item, idx) => {
      if (idx === currentItemIndex) {
        return !isCurrentFormValid();
      }
      return !isItemValid(item);
    });
  };

  // Visual feedback border for missing required fields
  const getRequiredInputStyle = (val: string | undefined | null) => {
    if (!val || !val.trim()) {
      return {
        borderColor: 'rgba(239, 68, 68, 0.5)',
        boxShadow: '0 0 0 1px rgba(239, 68, 68, 0.1)'
      };
    }
    return {};
  };

  const renderFormFields = () => {
    const handleFieldChange = (key: string, val: any) => {
      setFormData((prev: any) => ({ ...prev, [key]: val }));
    };

    switch (itemType) {
      case 'education':
        return (
          <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <input
              className="form-input"
              style={{ gridColumn: 'span 2', ...getRequiredInputStyle(formData.school) }}
              type="text"
              placeholder="School / Institution *"
              value={formData.school || ''}
              onChange={(e) => handleFieldChange('school', e.target.value)}
              required
            />
            <input
              className="form-input"
              style={getRequiredInputStyle(formData.degree)}
              type="text"
              placeholder="Degree *"
              value={formData.degree || ''}
              onChange={(e) => handleFieldChange('degree', e.target.value)}
              required
            />
            <input
              className="form-input"
              style={getRequiredInputStyle(formData.field)}
              type="text"
              placeholder="Field of Study *"
              value={formData.field || ''}
              onChange={(e) => handleFieldChange('field', e.target.value)}
              required
            />
            <input
              className="form-input"
              style={getRequiredInputStyle(formData.fromDate)}
              type="date"
              placeholder="Start Date *"
              value={formData.fromDate || ''}
              onChange={(e) => handleFieldChange('fromDate', e.target.value)}
              required
            />
            <input
              className="form-input"
              type="date"
              placeholder="End Date (Optional)"
              value={formData.toDate || ''}
              onChange={(e) => handleFieldChange('toDate', e.target.value)}
            />
            <input
              className="form-input"
              type="text"
              placeholder="Grade / GPA (Optional)"
              value={formData.grade || ''}
              onChange={(e) => handleFieldChange('grade', e.target.value)}
            />
            <input
              className="form-input"
              type="text"
              placeholder="Location (Optional)"
              value={formData.location || ''}
              onChange={(e) => handleFieldChange('location', e.target.value)}
            />
          </div>
        );

      case 'experience':
        return (
          <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <input
              className="form-input"
              style={getRequiredInputStyle(formData.title)}
              type="text"
              placeholder="Role Title *"
              value={formData.title || ''}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              required
            />
            <input
              className="form-input"
              style={getRequiredInputStyle(formData.company)}
              type="text"
              placeholder="Company *"
              value={formData.company || ''}
              onChange={(e) => handleFieldChange('company', e.target.value)}
              required
            />
            <input
              className="form-input"
              style={getRequiredInputStyle(formData.fromDate)}
              type="date"
              placeholder="Start Date *"
              value={formData.fromDate || ''}
              onChange={(e) => handleFieldChange('fromDate', e.target.value)}
              required
            />
            <input
              className="form-input"
              type="date"
              placeholder="End Date (Optional)"
              value={formData.toDate || ''}
              onChange={(e) => handleFieldChange('toDate', e.target.value)}
            />
            <input
              className="form-input"
              style={{ gridColumn: 'span 2' }}
              type="text"
              placeholder="Location (Optional)"
              value={formData.location || ''}
              onChange={(e) => handleFieldChange('location', e.target.value)}
            />
            <textarea
              className="form-input"
              style={{ gridColumn: 'span 2', height: '160px', overflowY: 'auto', resize: 'none' }}
              placeholder="Key Accomplishments (One per line)&#10;- Led a team of 4 engineers&#10;- Increased performance by 15%"
              value={formData.roleText || ''}
              onChange={(e) => handleFieldChange('roleText', e.target.value)}
            />
          </div>
        );

      case 'project':
        return (
          <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <input
              className="form-input"
              style={{ gridColumn: 'span 2', ...getRequiredInputStyle(formData.name) }}
              type="text"
              placeholder="Project Name *"
              value={formData.name || ''}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              required
            />
            <input
              className="form-input"
              type="text"
              placeholder="GitHub Repository URL"
              value={formData.github || ''}
              onChange={(e) => handleFieldChange('github', e.target.value)}
            />
            <input
              className="form-input"
              type="text"
              placeholder="Demo URL (Optional)"
              value={formData.url || ''}
              onChange={(e) => handleFieldChange('url', e.target.value)}
            />
            <input
              className="form-input"
              style={getRequiredInputStyle(formData.fromDate)}
              type="date"
              placeholder="Start Date *"
              value={formData.fromDate || ''}
              onChange={(e) => handleFieldChange('fromDate', e.target.value)}
              required
            />
            <input
              className="form-input"
              type="date"
              placeholder="End Date (Optional)"
              value={formData.toDate || ''}
              onChange={(e) => handleFieldChange('toDate', e.target.value)}
            />
            <input
              className="form-input"
              style={{ gridColumn: 'span 2' }}
              type="text"
              placeholder="Technologies Used (Comma-separated, e.g. React, Node.js)"
              value={formData.technologiesUsed || ''}
              onChange={(e) => handleFieldChange('technologiesUsed', e.target.value)}
            />
            <textarea
              className="form-input"
              style={{ gridColumn: 'span 2', height: '120px', overflowY: 'auto', resize: 'none', ...getRequiredInputStyle(formData.description) }}
              placeholder="Project Description *"
              value={formData.description || ''}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              required
            />
          </div>
        );

      case 'certification':
        return (
          <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <input
              className="form-input"
              style={getRequiredInputStyle(formData.title)}
              type="text"
              placeholder="Certification Title *"
              value={formData.title || ''}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              required
            />
            <input
              className="form-input"
              style={getRequiredInputStyle(formData.platform)}
              type="text"
              placeholder="Platform / Issuer *"
              value={formData.platform || ''}
              onChange={(e) => handleFieldChange('platform', e.target.value)}
              required
            />
            <input
              className="form-input"
              type="date"
              placeholder="Completed On"
              value={formData.completedOn || ''}
              onChange={(e) => handleFieldChange('completedOn', e.target.value)}
            />
            <input
              className="form-input"
              type="text"
              placeholder="Verification URL (Optional)"
              value={formData.url || ''}
              onChange={(e) => handleFieldChange('url', e.target.value)}
            />
            <textarea
              className="form-input"
              style={{ gridColumn: 'span 2', height: '180px', overflowY: 'auto', resize: 'none' }}
              placeholder="Certification Details (One per line)&#10;- Advanced React patterns&#10;- Redux state management"
              value={formData.roleText || ''}
              onChange={(e) => handleFieldChange('roleText', e.target.value)}
            />
          </div>
        );

      case 'award':
        return (
          <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <input
              className="form-input"
              style={getRequiredInputStyle(formData.title)}
              type="text"
              placeholder="Award Title *"
              value={formData.title || ''}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              required
            />
            <input
              className="form-input"
              style={getRequiredInputStyle(formData.issuer)}
              type="text"
              placeholder="Issuer *"
              value={formData.issuer || ''}
              onChange={(e) => handleFieldChange('issuer', e.target.value)}
              required
            />
            <input
              className="form-input"
              style={getRequiredInputStyle(formData.awardType)}
              type="text"
              placeholder="Award Type *"
              value={formData.awardType || ''}
              onChange={(e) => handleFieldChange('awardType', e.target.value)}
              required
            />
            <input
              className="form-input"
              type="date"
              placeholder="Date"
              value={formData.date || ''}
              onChange={(e) => handleFieldChange('date', e.target.value)}
            />
            <textarea
              className="form-input"
              style={{ gridColumn: 'span 2', height: '180px', overflowY: 'auto', resize: 'none' }}
              placeholder="Award Details (One per line)&#10;- First place out of 50 teams"
              value={formData.roleText || ''}
              onChange={(e) => handleFieldChange('roleText', e.target.value)}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 100 }}>
      <div 
        className="modal-card" 
        style={{ 
          maxWidth: '650px', 
          width: '90%',
          height: step === 'review' ? '570px' : 'auto',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title">
            Import Resume Items {step === 'review' && `(${currentItemIndex + 1} of ${extractedItems.length})`}
          </h3>
          <button className="btn-modal-close" onClick={onClose} title="Close dialog">
            <svg viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div 
          className="modal-body" 
          style={{ 
            padding: '1.5rem', 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            overflow: 'hidden' 
          }}
        >
          {step === 'upload' && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
                Upload your existing resume to extract and import your education, experience, and projects.
              </p>

              {errorMsg && (
                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'rgb(239, 68, 68)', padding: '0.75rem', borderRadius: '6px', marginBottom: '1.5rem', fontSize: '0.85rem', textAlign: 'left' }}>
                  {errorMsg}
                </div>
              )}

              <div
                className="dropzone"
                onDragOver={handleDragOver}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed var(--border-color)',
                  borderRadius: '8px',
                  padding: '3rem 2rem',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                  backgroundColor: 'var(--bg-primary)'
                }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept=".pdf,.txt,.png,.jpg,.jpeg,.webp"
                  onChange={handleFileSelect}
                />
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '3rem', height: '3rem', color: 'var(--color-brand-terracotta)', marginBottom: '1rem', marginInline: 'auto' }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                <p style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)', margin: '0 0 0.5rem 0' }}>Drag and drop your file here</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>Supports PDF, TXT, PNG, JPG, WebP</p>
              </div>
            </div>
          )}

          {step === 'parsing' && (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <h2 className="modal-title" style={{ marginBottom: '1.5rem' }}>Extracting Resume Content</h2>
              <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden', marginBottom: '1.5rem' }}>
                <div
                  style={{
                    width: `${progress}%`,
                    height: '100%',
                    backgroundColor: 'var(--color-brand-terracotta)',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
              <p style={{ fontWeight: 600, color: 'var(--color-brand-terracotta)', marginBottom: '0.5rem' }}>
                {Math.round(progress)}% Complete
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '2rem' }}>
                {statusText}
              </p>
              <button className="btn-form-cancel" style={{ width: '100%' }} onClick={() => setStep('upload')}>
                Cancel Parsing
              </button>
            </div>
          )}

          {step === 'review' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <select
                  className="form-input"
                  value={itemType}
                  onChange={(e) => setItemType(e.target.value as ResumeItem['type'])}
                  style={{ fontWeight: 600, width: '100%', margin: 0 }}
                >
                  <option value="education">Education</option>
                  <option value="experience">Experience</option>
                  <option value="project">Project</option>
                  <option value="certification">Certification</option>
                  <option value="award">Award</option>
                </select>
              </div>

              <div style={{ flex: 1, overflow: 'hidden' }}>
                {renderFormFields()}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', alignItems: 'center' }}>
                <button
                  className="btn-form-save"
                  onClick={handleImportSubmit}
                  disabled={currentItemIndex === extractedItems.length - 1 || importing || hasAnyInvalidItems()}
                  style={{
                    margin: 0,
                    backgroundColor: (currentItemIndex === extractedItems.length - 1 || hasAnyInvalidItems()) ? 'var(--border-color)' : 'rgba(219, 91, 55, 0.1)',
                    borderColor: (currentItemIndex === extractedItems.length - 1 || hasAnyInvalidItems()) ? 'var(--border-color)' : 'rgba(219, 91, 55, 0.3)',
                    color: (currentItemIndex === extractedItems.length - 1 || hasAnyInvalidItems()) ? 'var(--text-muted)' : 'var(--color-brand-terracotta)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    padding: '0.5rem 1.2rem',
                    whiteSpace: 'nowrap',
                    opacity: (currentItemIndex === extractedItems.length - 1 || hasAnyInvalidItems()) ? 0.5 : 1,
                    cursor: (currentItemIndex === extractedItems.length - 1 || hasAnyInvalidItems()) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                  title={hasAnyInvalidItems() ? "Please fix all invalid items (marked with red borders) before importing" : "Skip verification and bulk import all items directly"}
                >
                  Skip to Import All →
                </button>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    className="btn-form-cancel"
                    onClick={handleDeleteItem}
                    style={{
                      color: 'rgb(239, 68, 68)',
                      borderColor: 'rgba(239, 68, 68, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      margin: 0
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '0.9rem', height: '0.9rem' }}>
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    Delete
                  </button>

                  <button
                    className="btn-form-cancel"
                    onClick={handlePrev}
                    disabled={currentItemIndex === 0}
                    style={{
                      opacity: currentItemIndex === 0 ? 0.5 : 1,
                      cursor: currentItemIndex === 0 ? 'not-allowed' : 'pointer',
                      margin: 0
                    }}
                  >
                    Previous
                  </button>

                  {currentItemIndex < extractedItems.length - 1 ? (
                    <button 
                      className="btn-form-save" 
                      onClick={handleNext} 
                      style={{ margin: 0 }}
                      disabled={!isCurrentFormValid()}
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      className="btn-form-save"
                      onClick={handleImportSubmit}
                      disabled={importing || hasAnyInvalidItems()}
                      style={{
                        margin: 0,
                        backgroundColor: hasAnyInvalidItems() ? 'var(--border-color)' : 'var(--color-brand-terracotta)',
                        borderColor: hasAnyInvalidItems() ? 'var(--border-color)' : 'var(--color-brand-terracotta)',
                        color: hasAnyInvalidItems() ? 'var(--text-muted)' : '#fff',
                        opacity: hasAnyInvalidItems() ? 0.5 : 1,
                        cursor: hasAnyInvalidItems() ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {importing ? 'Importing...' : 'Import'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
