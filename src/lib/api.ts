import { BaseAPI } from './network';

export interface User {
  name: string;
  username: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: User;
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

export const resumeService = {
  // Placeholder for future resume backend integration endpoints
  // e.g. fetchBlocks, saveBlocks, etc.
};
