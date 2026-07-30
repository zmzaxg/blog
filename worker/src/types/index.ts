// 类型定义

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  SITE_NAME?: string;
  WEBDAV_URL?: string;
  WEBDAV_USERNAME?: string;
  WEBDAV_PASSWORD?: string;
  ASSETS?: {
    fetch: (request: Request) => Promise<Response>;
  };
}

export interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  nickname: string | null;
  avatar: string | null;
  bio: string | null;
  role: 'admin' | 'editor' | 'member' | 'banned';
  status: 'active' | 'inactive' | 'banned';
  email_verified: number;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublicUser {
  id: number;
  username: string;
  nickname: string | null;
  avatar: string | null;
  bio: string | null;
  role: string;
  created_at: string;
}

export interface Board {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  post_count: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: number;
  title: string;
  slug: string | null;
  summary: string | null;
  content_md: string;
  content_html: string | null;
  cover_image: string | null;
  board_id: number | null;
  author_id: number;
  status: string;
  visibility: string;
  is_pinned: number;
  is_featured: number;
  view_count: number;
  like_count: number;
  comment_count: number;
  tags: string | null;
  storage_key: string | null;
  storage_version: number;
  created_at: string;
  updated_at: string;
  author?: PublicUser;
  board?: Board;
}

export interface Comment {
  id: number;
  post_id: number;
  author_id: number;
  parent_id: number | null;
  content_md: string;
  content_html: string | null;
  status: string;
  like_count: number;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
  author?: PublicUser;
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
}

export interface AuthContext {
  user: PublicUser | null;
  userId: number | null;
  isAdmin: boolean;
  isEditor: boolean;
}
