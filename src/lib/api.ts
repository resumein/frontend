import { BaseAPI, getWithToken, postWithToken, deleteWithToken, putWithToken } from './network';

export interface User {
  name: string;
  username: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface BaseItem {
  id?: string;
  type: 'education' | 'project' | 'experience' | 'certification' | 'award';
  username?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EducationItem extends BaseItem {
  type: 'education';
  school: string;
  degree: string;
  field: string;
  fromDate: string;
  toDate?: string;
  grade?: string;
}

export interface ProjectItem extends BaseItem {
  type: 'project';
  name: string;
  github: string;
  url?: string;
  description: string;
  fromDate: string;
  toDate?: string;
}

export interface ExperienceItem extends BaseItem {
  type: 'experience';
  title: string;
  company: string;
  fromDate: string;
  toDate?: string;
  description?: string;
  role?: string[];
}

export interface CertificationItem extends BaseItem {
  type: 'certification';
  title: string;
  platform: string;
  description?: string;
  url?: string;
  completedOn?: string;
  role?: string[];
}

export interface AwardItem extends BaseItem {
  type: 'award';
  title: string;
  issuer: string;
  awardType: string;
  description?: string;
  date?: string;
  role?: string[];
}

export type ResumeItem = EducationItem | ProjectItem | ExperienceItem | CertificationItem | AwardItem;

export interface Resume {
  id: string;
  username: string;
  filename: string;
  template: string;
  content: any;
  createdAt: string;
  updatedAt: string;
}

export const authService = {
  /**
   * Exchanges the GitHub OAuth temporary code for a session token and user info.
   */
  exchangeGithubCode: async (code: string): Promise<AuthResponse> => {
    const response = await BaseAPI.post<AuthResponse>('/api/auth', { code });
    return response.data;
  },
};

export const itemService = {
  /**
   * Fetches all items belonging to the authenticated user.
   */
  getItems: async (): Promise<ResumeItem[]> => {
    const response = await getWithToken('/api/item');
    return response.data;
  },

  /**
   * Creates a new resume item (project, education, experience, certification, award).
   */
  createItem: async (item: Omit<ResumeItem, 'id' | 'username' | 'createdAt' | 'updatedAt'>): Promise<ResumeItem> => {
    const response = await postWithToken('/api/item', item);
    return response.data;
  },

  /**
   * Deletes a resume item by ID.
   */
  deleteItem: async (id: string): Promise<void> => {
    await deleteWithToken(`/api/item/${id}`);
  },

  /**
   * Updates an existing resume item.
   */
  updateItem: async (id: string, item: Omit<ResumeItem, 'id' | 'username' | 'createdAt' | 'updatedAt'>): Promise<ResumeItem> => {
    const response = await putWithToken(`/api/item/${id}`, item);
    return response.data;
  }
};

export const resumeService = {
  /**
   * Fetches all resumes belonging to the authenticated user.
   */
  getResumes: async (): Promise<Resume[]> => {
    const response = await getWithToken('/api/resume');
    return response.data;
  },

  createResume: async (filename: string, template: string): Promise<Resume> => {
    const response = await postWithToken('/api/resume', {
      filename,
      template,
      content: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return response.data;
  },

  /**
   * Updates an existing resume configuration.
   */
  updateResume: async (id: string, filename: string, template: string, content?: any): Promise<Resume> => {
    const response = await putWithToken(`/api/resume/${id}`, {
      filename,
      template,
      content: content || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return response.data;
  },

  /**
   * Deletes a resume configuration.
   */
  deleteResume: async (id: string): Promise<void> => {
    await deleteWithToken(`/api/resume/${id}`);
  }
};
