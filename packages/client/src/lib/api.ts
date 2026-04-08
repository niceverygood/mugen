const API_BASE = '/api';

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Don't set Content-Type for FormData
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

    if (res.status === 401) {
      // Try refresh
      const refreshed = await this.tryRefresh();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.getToken()}`;
        const retry = await fetch(`${API_BASE}${path}`, { ...options, headers });
        if (!retry.ok) throw new Error(await retry.text());
        return retry.json();
      }
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || res.statusText);
    }

    return res.json();
  }

  private async tryRefresh(): Promise<boolean> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      localStorage.setItem('accessToken', data.accessToken);
      return true;
    } catch {
      return false;
    }
  }

  // Auth
  async login(username: string, password: string) {
    const data = await this.request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    return data;
  }

  async getMe() {
    return this.request<any>('/auth/me');
  }

  logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  // Projects
  async getProjects(params?: { status?: string; page?: number }) {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.page) query.set('page', String(params.page));
    return this.request<any>(`/projects?${query}`);
  }

  async createProject(data: any) {
    return this.request<any>('/projects', { method: 'POST', body: JSON.stringify(data) });
  }

  async getProject(id: number) {
    return this.request<any>(`/projects/${id}`);
  }

  async updateProject(id: number, data: any) {
    return this.request<any>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteProject(id: number) {
    return this.request<any>(`/projects/${id}`, { method: 'DELETE' });
  }

  // Drawings
  async uploadDrawing(projectId: number, file: File) {
    const form = new FormData();
    form.append('file', file);
    return this.request<any>(`/projects/${projectId}/drawings/upload`, {
      method: 'POST',
      body: form,
    });
  }

  async getDrawing(projectId: number, drawingId: number) {
    return this.request<any>(`/projects/${projectId}/drawings/${drawingId}`);
  }

  getDrawingDownloadUrl(projectId: number, drawingId: number) {
    return `${API_BASE}/projects/${projectId}/drawings/${drawingId}/download`;
  }

  // Generate
  async startGenerate(data: { projectId: number; drawingId: number; presetId: number; settings: any }) {
    return this.request<{ jobId: string }>('/generate', { method: 'POST', body: JSON.stringify(data) });
  }

  async getGenerateStatus(jobId: string) {
    return this.request<any>(`/generate/${jobId}/status`);
  }

  getGenerateDownloadUrl(jobId: string) {
    return `${API_BASE}/generate/${jobId}/download`;
  }

  // Presets
  async getPresets() {
    return this.request<any[]>('/presets');
  }

  async createPreset(data: any) {
    return this.request<any>('/presets', { method: 'POST', body: JSON.stringify(data) });
  }
}

export const api = new ApiClient();
