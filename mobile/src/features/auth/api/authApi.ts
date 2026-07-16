/**
 * @file authApi.ts
 * @description API service calls and query hooks for the Authentication feature.
 */

import apiClient from '../../../shared/services/apiClient';

export interface BrandingResponse {
  id: string;
  name: string;
  subdomain: string;
  status: string;
  plan: string;
  settings: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    timezone?: string;
    companyEmail?: string;
    companyPhone?: string;
    address?: string;
  };
}

export const authApi = {
  /**
   * Fetch company tenant branding settings by subdomain or code
   */
  async fetchBranding(companyCodeOrSubdomain: string): Promise<BrandingResponse> {
    const response = await apiClient.get(`/api/public/branding/${companyCodeOrSubdomain.toUpperCase()}`);
    return response.data?.data;
  },

  /**
   * Fallback check via subdomain query param
   */
  async fetchBrandingBySubdomain(subdomain: string): Promise<BrandingResponse> {
    const response = await apiClient.get(`/api/public/branding?subdomain=${subdomain.toLowerCase()}`);
    return response.data?.data;
  },

  /**
   * Perform authentication login
   */
  async login(payload: Record<string, any>): Promise<any> {
    const response = await apiClient.post('/api/v1/auth/login', payload);
    return response.data?.data;
  },
};
export default authApi;
