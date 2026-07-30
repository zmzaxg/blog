// API 请求封装
import { scopedStorage } from '@lark-apaas/client-toolkit-lite';

const API_BASE = '/api';

function getToken(): string | null {
  return scopedStorage.getItem('auth_token');
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  total?: number;
  page?: number;
  page_size?: number;
  total_pages?: number;
  unread_count?: number;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    const data = (await response.json()) as ApiResponse<T>;
    return data;
  } catch (error) {
    return {
      success: false,
      error: String(error),
      message: '网络请求失败',
    };
  }
}

// ============ 认证 API ============
export const authApi = {
  register: (data: {
    username: string;
    email: string;
    password: string;
    nickname?: string;
    code?: string;
  }) => request<{ token: string; user: { id: number; username: string; nickname: string; role: string } }>(
    '/auth/register',
    { method: 'POST', body: JSON.stringify(data) }
  ),

  login: (data: { username?: string; email?: string; password: string }) =>
    request<{ token: string; user: { id: number; username: string; nickname: string | null; avatar: string | null; role: string } }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify(data) }
    ),

  me: () => request<{ id: number; username: string; nickname: string | null; avatar: string | null; bio: string | null; role: string; created_at: string }>('/auth/me'),

  changePassword: (data: { old_password: string; new_password: string }) =>
    request('/auth/change-password', { method: 'POST', body: JSON.stringify(data) }),

  updateProfile: (data: { nickname?: string; bio?: string; avatar?: string }) =>
    request('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),

  sendCode: (data: { email: string; type: string }) =>
    request<{ code?: string; expires_at: string }>('/auth/send-code', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ============ 文章 API ============
export const postApi = {
  list: (params: {
    page?: number;
    page_size?: number;
    board_id?: number;
    author_id?: number;
    keyword?: string;
    status?: string;
  } = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) searchParams.set(k, String(v));
    });
    return request<Array<Record<string, unknown>>>(`/posts?${searchParams.toString()}`);
  },

  get: (id: number) => request<Record<string, unknown>>(`/posts/${id}`),

  create: (data: Record<string, unknown>) =>
    request<{ id: number; slug: string }>('/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Record<string, unknown>) =>
    request(`/posts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id: number) => request(`/posts/${id}`, { method: 'DELETE' }),

  toggleLike: (targetType: string, targetId: number) =>
    request<{ liked: boolean }>(`/like/${targetType}/${targetId}`, { method: 'POST' }),
};

// ============ 评论 API ============
export const commentApi = {
  list: (params: { post_id: number; page?: number; page_size?: number; status?: string }) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) searchParams.set(k, String(v));
    });
    return request<Array<Record<string, unknown>>>(`/comments?${searchParams.toString()}`);
  },

  create: (data: { post_id: number; content_md: string; parent_id?: number; code?: string }) =>
    request<{ id: number; status: string; message: string }>('/comments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  delete: (id: number) => request(`/comments/${id}`, { method: 'DELETE' }),

  moderate: (id: number, status: string) =>
    request(`/comments/${id}/moderate`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
};

// ============ 板块 API ============
export const boardApi = {
  list: () => request<Array<Record<string, unknown>>>('/boards'),
  listAdmin: () => request<Array<Record<string, unknown>>>('/boards/admin'),
  create: (data: Record<string, unknown>) =>
    request<{ id: number }>('/boards', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Record<string, unknown>) =>
    request(`/boards/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request(`/boards/${id}`, { method: 'DELETE' }),
};

// ============ 管理后台 API ============
export const adminApi = {
  stats: () => request<Record<string, unknown>>('/admin/stats'),

  users: (params: { page?: number; page_size?: number; keyword?: string; role?: string } = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) searchParams.set(k, String(v));
    });
    return request<Array<Record<string, unknown>>>(`/admin/users?${searchParams.toString()}`);
  },

  updateUser: (id: number, data: Record<string, unknown>) =>
    request(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  getSettings: () => request<Record<string, string>>('/admin/settings'),

  updateSettings: (data: Record<string, string>) =>
    request('/admin/settings', { method: 'PUT', body: JSON.stringify(data) }),

  pendingComments: (params: { page?: number; page_size?: number } = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) searchParams.set(k, String(v));
    });
    return request<Array<Record<string, unknown>>>(
      `/admin/comments/pending?${searchParams.toString()}`
    );
  },

  sendTestEmail: (data: { to: string; subject: string; content: string }) =>
    request('/admin/email/test', { method: 'POST', body: JSON.stringify(data) }),
};

// ============ 存储 API ============
export const storageApi = {
  listConfigs: () => request<Array<Record<string, unknown>>>('/storage/configs'),

  createConfig: (data: Record<string, unknown>) =>
    request<{ id: number }>('/storage/configs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateConfig: (id: number, data: Record<string, unknown>) =>
    request(`/storage/configs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteConfig: (id: number) => request(`/storage/configs/${id}`, { method: 'DELETE' }),

  testConnection: (id: number) =>
    request<{ connected: boolean }>(`/storage/configs/${id}/test`, { method: 'POST' }),

  listFiles: (params: { function?: string } = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) searchParams.set(k, String(v));
    });
    return request<{ files: Array<{ name: string; timestamp: number }>; enabled: boolean }>(
      `/storage/files?${searchParams.toString()}`
    );
  },

  saveFile: (data: { function_name: string; content: string; reference_id?: number }) =>
    request<{ storage_key: string; storage_url: string; timestamp: number; kept_versions: number }>(
      '/storage/files',
      { method: 'POST', body: JSON.stringify(data) }
    ),
};

// ============ 首次配置 API ============
export const setupApi = {
  status: () => request<{
    initialized: boolean;
    has_settings: boolean;
    builtin_admin: { username: string };
    settings: Record<string, string>;
    db_error?: string;
  }>('/setup/status'),

  login: (data: { username: string; password: string }) =>
    request<{
      token: string;
      user: {
        id: number;
        username: string;
        nickname: string;
        avatar: string | null;
        role: string;
        is_builtin: boolean;
      };
    }>('/setup/login', { method: 'POST', body: JSON.stringify(data) }),

  initDb: () =>
    request('/setup/init-db', { method: 'POST' }),

  save: (data: {
    username?: string;
    password?: string;
    email?: string;
    nickname?: string;
    settings?: Record<string, string>;
  }) =>
    request<{
      token: string;
      user: {
        id: number;
        username: string;
        nickname: string;
        avatar: string | null;
        role: string;
      };
      message: string;
    }>('/setup/save', { method: 'POST', body: JSON.stringify(data) }),
};

// ============ 通知 API ============
export const notificationApi = {
  list: (params: { page?: number; page_size?: number; unread?: boolean } = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) searchParams.set(k, String(v));
    });
    return request<Array<Record<string, unknown>>>(
      `/notifications?${searchParams.toString()}`
    );
  },

  markRead: (id: number) =>
    request(`/notifications/${id}/read`, { method: 'POST' }),

  markAllRead: () => request('/notifications/read-all', { method: 'POST' }),
};
