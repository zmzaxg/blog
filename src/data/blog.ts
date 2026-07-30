// EXPORTS: IPost, IComment, IBoard, IUser, INotification, IStorageConfig, ISettings

export interface IUser {
  id: number;
  username: string;
  nickname: string | null;
  avatar: string | null;
  bio: string | null;
  role: 'admin' | 'editor' | 'member' | 'banned';
  email?: string;
  is_builtin?: boolean;
  created_at: string;
}

export interface IBoard {
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

export interface IPost {
  id: number;
  title: string;
  slug: string | null;
  summary: string | null;
  content_md: string;
  content_html?: string;
  cover_image: string | null;
  board_id: number | null;
  board_name?: string | null;
  board_slug?: string | null;
  author_id: number;
  author_username?: string;
  author_nickname?: string | null;
  author_avatar?: string | null;
  author?: IUser;
  status: string;
  visibility: string;
  is_pinned: number;
  is_featured: number;
  view_count: number;
  like_count: number;
  comment_count: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface IComment {
  id: number;
  post_id: number;
  author_id: number;
  parent_id: number | null;
  content_md: string;
  content_html?: string;
  status: string;
  like_count: number;
  author?: IUser;
  created_at: string;
  updated_at: string;
}

export interface INotification {
  id: number;
  type: string;
  target_type: string | null;
  target_id: number | null;
  title: string;
  content: string | null;
  is_read: number;
  created_at: string;
}

export interface IStorageConfig {
  id: number;
  name: string;
  type: string;
  is_default: number;
  status: string;
  created_at: string;
}

export interface ISettings {
  site_name: string;
  site_description: string;
  registration_enabled: string;
  comment_requires_approval: string;
  comment_requires_login: string;
  email_verification_required: string;
  [key: string]: string;
}




