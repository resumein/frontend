import { create } from 'zustand';
import type { Resume } from '../lib/api';
import { useUserStore } from './userStore';
import type { TemplateConfig } from '../lib/templateUtils';

interface ResumeState {
  resumes: Resume[];
  selectedResumeId: string | null;
  loading: boolean;
  isCreatingResume: boolean;
  activeContent: any | null;
  originalContent: any | null;
  isDirty: boolean;
  setResumes: (resumes: Resume[]) => void;
  setSelectedResumeId: (id: string | null) => void;
  addResume: (resume: Resume) => void;
  removeResume: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setIsCreatingResume: (isCreatingResume: boolean) => void;
  setActiveContent: (content: any) => void;
  initializeActiveContent: () => void;
  saveActiveContent: (updatedResume: Resume) => void;
  discardChanges: () => void;
  templateConfig: TemplateConfig | null;
  setTemplateConfig: (config: TemplateConfig | null) => void;
  initializeActiveContentWithConfig: (config: TemplateConfig) => void;
}

export const useResumeStore = create<ResumeState>((set, get) => ({
  resumes: [],
  selectedResumeId: null,
  loading: false,
  isCreatingResume: false,
  activeContent: null,
  originalContent: null,
  isDirty: false,
  templateConfig: null,

  setTemplateConfig: (templateConfig) => {
    set({ templateConfig });
    if (templateConfig) {
      get().initializeActiveContentWithConfig(templateConfig);
    }
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
          defaultContent[section.id] = [];
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
      set({ activeContent: null, originalContent: null, isDirty: false });
      return;
    }
    const currentResume = resumes.find(r => r.id === selectedResumeId);
    if (!currentResume) {
      set({ activeContent: null, originalContent: null, isDirty: false });
      return;
    }

    const user = useUserStore.getState().user;
    const content = currentResume.content || {};

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
      skills: content.skills || []
    };

    set({ activeContent: defaultContent, originalContent: defaultContent, isDirty: false });
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
