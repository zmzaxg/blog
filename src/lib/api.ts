// API 请求封装
// scopedStorage replaced with localStorage for browser compatibility

const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('auth_token');
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

  uploadImage: async (file: File): Promise<ApiResponse<{ url: string; storage_key: string; size: number; mime: string }>> => {
    const headers: Record<string, string> = {};
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE}/storage/upload`, {
        method: 'POST',
        headers,
        body: formData,
      });
      return (await response.json()) as ApiResponse<{ url: string; storage_key: string; size: number; mime: string }>;
    } catch (error) {
      return { success: false, error: String(error), message: '上传失败' };
    }
  },

  uploadImageBase64: (data: { data: string; filename?: string; mime?: string }) =>
    request<{ url: string; storage_key: string; size: number; mime: string }>('/storage/upload', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // 浏览 WebDAV 目录
  browse: (id: number, path?: string) => {
    const params = new URLSearchParams();
    if (path) params.set('path', path);
    return request<{
      path: string;
      items: Array<{ name: string; path: string; isDir: boolean; size: number; lastModified: string }>;
      url: string;
    }>(`/storage/configs/${id}/browse?${params.toString()}`);
  },

  // 创建 WebDAV 目录
  mkdir: (id: number, path: string) =>
    request(`/storage/configs/${id}/mkdir`, {
      method: 'POST',
      body: JSON.stringify({ path }),
    }),

  // 删除 WebDAV 文件/目录
  deleteItem: (id: number, path: string) =>
    request(`/storage/configs/${id}/delete-item`, {
      method: 'POST',
      body: JSON.stringify({ path }),
    }),

  // 读取 WebDAV 文件内容
  readFile: (id: number, path: string) => {
    const params = new URLSearchParams();
    params.set('path', path);
    return request<{ path: string; content: string; content_type: string; size: number }>(
      `/storage/configs/${id}/read-file?${params.toString()}`
    );
  },

  // 获取存储统计
  getStats: (id: number) =>
    request<{ config_id: number; stats: Record<string, { count: number; size: number }> }>(
      `/storage/configs/${id}/stats`
    ),

  // 数据迁移 D1 → WebDAV
  migrate: (data: { config_id: number; type: string; limit?: number }) =>
    request<{ type: string; migrated: number; errors: number; limit: number }>('/storage/migrate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // 数据清理
  cleanup: (data: { config_id: number; type: string; keep_latest?: number }) =>
    request<{ type: string; deleted: number; kept: number }>('/storage/cleanup', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
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
