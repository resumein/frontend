import { create } from 'zustand';
import type { Resume } from '../lib/api';
import { useUserStore } from './userStore';
import type { TemplateConfig } from '../lib/templateUtils';

interface ResumeState {
  resumes: Resume[];
  selectedResumeId: string | null;
  loading: boolean;
  isCreatingResume: boolean;
  isImportModalOpen: boolean;
  activeContent: any | null;
  originalContent: any | null;
  isDirty: boolean;
  setResumes: (resumes: Resume[]) => void;
  setSelectedResumeId: (id: string | null) => void;
  addResume: (resume: Resume) => void;
  removeResume: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setIsCreatingResume: (isCreatingResume: boolean) => void;
  setIsImportModalOpen: (isImportModalOpen: boolean) => void;
  setActiveContent: (content: any) => void;
  initializeActiveContent: () => void;
  saveActiveContent: (updatedResume: Resume) => void;
  discardChanges: () => void;
  templateConfig: TemplateConfig | null;
  setTemplateConfig: (config: TemplateConfig | null) => void;
  updateTemplateConfig: (config: TemplateConfig) => void;
  initializeActiveContentWithConfig: (config: TemplateConfig) => void;
}

export const useResumeStore = create<ResumeState>((set, get) => ({
  resumes: [],
  selectedResumeId: null,
  loading: false,
  isCreatingResume: false,
  isImportModalOpen: false,
  setIsImportModalOpen: (isImportModalOpen) => set({ isImportModalOpen }),
  activeContent: null,
  originalContent: null,
  isDirty: false,
  templateConfig: null,

  setTemplateConfig: (templateConfig) => {
    const current = get().templateConfig;
    if (current && templateConfig && JSON.stringify(current) === JSON.stringify(templateConfig)) {
      return;
    }

    set({ templateConfig });
    if (templateConfig) {
      const active = get().activeContent;
      if (active && !active.templateConfig) {
        const updated = { ...active, templateConfig };
        set({ activeContent: updated, originalContent: updated });
      }
      get().initializeActiveContentWithConfig(templateConfig);
    }
  },

  updateTemplateConfig: (newConfig) => {
    const active = get().activeContent;
    if (!active) return;
    const updatedContent = { ...active, templateConfig: newConfig };
    const original = get().originalContent;
    const isDirty = JSON.stringify(updatedContent) !== JSON.stringify(original);
    set({ templateConfig: newConfig, activeContent: updatedContent, isDirty });
  },

  initializeActiveContentWithConfig: (config) => {
    const { resumes, selectedResumeId } = get();
    if (!selectedResumeId) return;
    const currentResume = resumes.find(r => r.id === selectedResumeId);
    if (!currentResume) return;

    const user = useUserStore.getState().user;
    const content = currentResume.content || {};

    const defaultContent = { ...content };

    // Dynamically initialize fields defined in the template config
    config.sections.forEach(section => {
      if (section.id === 'profile') {
        section.fields.forEach(field => {
          if (defaultContent[field.name] === undefined) {
            if (field.name === 'name') {
              defaultContent[field.name] = user?.name || 'Example Name';
            } else if (field.name === 'email') {
              defaultContent[field.name] = user?.email || 'example@example.com';
            } else if (field.name === 'phone') {
              defaultContent[field.name] = '+91 12345 67890';
            } else if (field.name === 'links') {
              defaultContent[field.name] = [
                { label: 'linkedin.com/in/example', url: 'https://linkedin.com/in/example' },
                { label: `github.com/${user?.username || 'example'}`, url: `https://github.com/${user?.username || 'example'}` }
              ];
            } else {
              defaultContent[field.name] = '';
            }
          }
        });
      } else {
        if (defaultContent[section.id] === undefined) {
          if (section.id === 'skills') {
            const projectsList = defaultContent.projects || [];
            const skillsSet = new Set<string>();
            if (Array.isArray(projectsList)) {
              projectsList.forEach((p: any) => {
                const techStr = p.tech || p.technologiesUsed || '';
                if (techStr) {
                  techStr.split(/[,;/]+/).forEach((part: string) => {
                    const cleaned = part.trim();
                    if (cleaned) skillsSet.add(cleaned);
                  });
                }
              });
            }
            const extracted = Array.from(skillsSet).join(', ');
            defaultContent.skills = extracted ? [{ category: 'Technologies Used', items: extracted }] : [];
          } else {
            defaultContent[section.id] = [];
          }
        }
      }
    });

    set({ activeContent: defaultContent, originalContent: defaultContent, isDirty: false });
  },

  setResumes: (resumes) => {
    set({ resumes });
  },

  setSelectedResumeId: (selectedResumeId) => {
    set({ selectedResumeId, templateConfig: null });
    get().initializeActiveContent();
  },

  addResume: (resume) => set((state) => ({ resumes: [resume, ...state.resumes] })),
  removeResume: (id) => set((state) => ({ resumes: state.resumes.filter((r) => r.id !== id) })),
  setLoading: (loading) => set({ loading }),
  setIsCreatingResume: (isCreatingResume) => set({ isCreatingResume }),

  setActiveContent: (content) => {
    const original = get().originalContent;
    const isDirty = JSON.stringify(content) !== JSON.stringify(original);
    set({ activeContent: content, isDirty });
  },

  initializeActiveContent: () => {
    const { resumes, selectedResumeId } = get();
    if (!selectedResumeId) {
      set({ activeContent: null, originalContent: null, isDirty: false, templateConfig: null });
      return;
    }
    const currentResume = resumes.find(r => r.id === selectedResumeId);
    if (!currentResume) {
      set({ activeContent: null, originalContent: null, isDirty: false, templateConfig: null });
      return;
    }

    const user = useUserStore.getState().user;
    const content = currentResume.content || {};

    const projectsList = content.projects || [];
    const extractedSkills = (() => {
      const skillsSet = new Set<string>();
      if (Array.isArray(projectsList)) {
        projectsList.forEach((p: any) => {
          const techStr = p.tech || p.technologiesUsed || '';
          if (techStr) {
            techStr.split(/[,;/]+/).forEach((part: string) => {
              const cleaned = part.trim();
              if (cleaned) skillsSet.add(cleaned);
            });
          }
        });
      }
      return Array.from(skillsSet).join(', ');
    })();

    const defaultContent = {
      name: content.name || user?.name || 'Example Name',
      phone: content.phone || '+91 12345 67890',
      email: content.email || user?.email || 'example@example.com',
      links: content.links || [
        { label: 'linkedin.com/in/example', url: 'https://linkedin.com/in/example' },
        { label: `github.com/${user?.username || 'example'}`, url: `https://github.com/${user?.username || 'example'}` }
      ],
      education: content.education || [],
      experience: content.experience || [],
      projects: content.projects || [],
      skills: content.skills !== undefined ? content.skills : (extractedSkills ? [{ category: 'Technologies Used', items: extractedSkills }] : []),
      certifications: content.certifications || [],
      awards: content.awards || [],
      ...content
    };

    set({ 
      activeContent: defaultContent, 
      originalContent: defaultContent, 
      isDirty: false,
      templateConfig: content.templateConfig || null
    });
  },

  saveActiveContent: (updatedResume) => {
    set((state) => ({
      resumes: state.resumes.map(r => r.id === updatedResume.id ? updatedResume : r),
      activeContent: updatedResume.content,
      originalContent: updatedResume.content,
      isDirty: false
    }));
  },

  discardChanges: () => {
    get().initializeActiveContent();
  }
}));
