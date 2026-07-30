-- ============================================
-- 轻社区博客系统 D1 数据库 Schema
-- ============================================

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nickname TEXT,
  avatar TEXT,
  bio TEXT,
  role TEXT NOT NULL DEFAULT 'member', -- admin / editor / member / banned
  status TEXT NOT NULL DEFAULT 'active', -- active / inactive / banned
  email_verified INTEGER NOT NULL DEFAULT 0,
  last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 板块表
CREATE TABLE IF NOT EXISTS boards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  post_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active', -- active / archived
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 文章表
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  summary TEXT,
  content_md TEXT NOT NULL, -- Markdown 原文
  content_html TEXT, -- 渲染后的 HTML（缓存）
  cover_image TEXT,
  board_id INTEGER,
  author_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'published', -- published / draft / pending / deleted
  visibility TEXT NOT NULL DEFAULT 'public', -- public / private / members
  is_pinned INTEGER NOT NULL DEFAULT 0,
  is_featured INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  like_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  tags TEXT, -- JSON 数组字符串
  storage_key TEXT, -- 外部存储 key (WebDAV 等)
  storage_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (board_id) REFERENCES boards(id),
  FOREIGN KEY (author_id) REFERENCES users(id)
);

-- 评论表
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  author_id INTEGER NOT NULL,
  parent_id INTEGER, -- 回复的父评论
  content_md TEXT NOT NULL,
  content_html TEXT,
  status TEXT NOT NULL DEFAULT 'approved', -- approved / pending / spam / deleted
  like_count INTEGER NOT NULL DEFAULT 0,
  ip_address TEXT,
  user_agent TEXT,
  storage_key TEXT,
  storage_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (post_id) REFERENCES posts(id),
  FOREIGN KEY (author_id) REFERENCES users(id),
  FOREIGN KEY (parent_id) REFERENCES comments(id)
);

-- 点赞表
CREATE TABLE IF NOT EXISTS likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  target_type TEXT NOT NULL, -- post / comment
  target_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, target_type, target_id)
);

-- 验证码表
CREATE TABLE IF NOT EXISTS verification_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL,
  target TEXT NOT NULL, -- email / phone
  target_value TEXT NOT NULL,
  type TEXT NOT NULL, -- register / login / reset_password / comment
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 会话表
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 插件表
CREATE TABLE IF NOT EXISTS plugins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT,
  description TEXT,
  version TEXT,
  author TEXT,
  status TEXT NOT NULL DEFAULT 'disabled', -- active / disabled
  config TEXT, -- JSON 配置
  installed_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 主题表
CREATE TABLE IF NOT EXISTS themes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT,
  description TEXT,
  version TEXT,
  author TEXT,
  is_active INTEGER NOT NULL DEFAULT 0,
  config TEXT, -- JSON
  installed_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 系统设置表
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 存储配置表
CREATE TABLE IF NOT EXISTS storage_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'webdav', -- webdav / s3 / local
  config TEXT NOT NULL, -- JSON 配置 (url, username, password, bucket 等)
  is_default INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 通知表
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL, -- comment / like / system / mention
  target_type TEXT,
  target_id INTEGER,
  title TEXT NOT NULL,
  content TEXT,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================
-- 索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_posts_board ON posts(board_id);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_likes_target ON likes(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- ============================================
-- 初始数据
-- ============================================
-- 默认管理员 (密码: admin123456, 需首次登录后修改)
-- password_hash 使用 bcrypt 生成，这里先放占位，初始化脚本中处理
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('site_name', '轻社区博客'),
  ('site_description', '一个基于 Cloudflare Worker + D1 的轻社区博客系统'),
  ('site_logo', ''),
  ('registration_enabled', 'true'),
  ('comment_requires_approval', 'false'),
  ('comment_requires_login', 'true'),
  ('email_verification_required', 'true'),
  ('smtp_host', ''),
  ('smtp_port', '587'),
  ('smtp_user', ''),
  ('smtp_pass', ''),
  ('smtp_from', ''),
  ('default_storage_id', ''),
  ('storage_enabled', 'false'),
  ('captcha_enabled', 'true'),
  ('max_posts_per_day', '10'),
  ('max_comments_per_day', '50');

INSERT OR IGNORE INTO boards (slug, name, description, sort_order) VALUES
  ('announcement', '公告', '社区公告与规则', 1),
  ('tech', '技术交流', '技术讨论与分享', 2),
  ('life', '生活随笔', '日常生活记录', 3),
  ('creative', '创作分享', '原创作品展示', 4);
