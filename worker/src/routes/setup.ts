// 首次配置路由 - 系统初始化与测试超管账号
import { successResponse, errorResponse, parseBody } from '../lib/utils';
import { hashPassword, signJwt } from '../lib/jwt';
import type { Env } from '../types';

// 内置测试超管账号 (仅在数据库无管理员时可用)
const BUILTIN_ADMIN = {
  username: 'zmzaxg',
  password: 'mmaA123456',
  email: 'admin@lightblog.local',
  nickname: '系统管理员',
};

// 检查系统初始化状态
export async function setupStatusHandler(
  _request: Request,
  env: Env
): Promise<Response> {
  try {
    // 检查是否有管理员用户
    const adminUser = await env.DB.prepare(
      "SELECT id, username FROM users WHERE role = 'admin' AND status = 'active' LIMIT 1"
    ).first();

    // 检查是否有设置数据
    const settingsCount = await env.DB.prepare(
      'SELECT COUNT(*) as cnt FROM settings'
    ).first<{ cnt: number }>();

    // 获取当前设置
    let settings: Record<string, string> = {};
    if (settingsCount && settingsCount.cnt > 0) {
      const result = await env.DB.prepare('SELECT key, value FROM settings').all<{
        key: string;
        value: string;
      }>();
      for (const row of result.results) {
        settings[row.key] = row.value;
      }
    }

    return successResponse({
      initialized: !!adminUser,
      has_settings: settingsCount ? settingsCount.cnt > 0 : false,
      builtin_admin: {
        username: BUILTIN_ADMIN.username,
        // 不返回密码，前端硬编码显示
      },
      settings,
    });
  } catch (e) {
    // 数据库表可能还不存在
    return successResponse({
      initialized: false,
      has_settings: false,
      builtin_admin: {
        username: BUILTIN_ADMIN.username,
      },
      settings: {},
      db_error: String(e),
    });
  }
}

// 使用内置测试账号登录 (仅首次配置可用)
export async function builtinLoginHandler(
  request: Request,
  env: Env
): Promise<Response> {
  const body = await parseBody<{ username: string; password: string }>(request);
  if (!body) return errorResponse('无效的请求数据');

  const { username, password } = body;

  if (!username || !password) {
    return errorResponse('账号和密码不能为空');
  }

  // 验证是否匹配内置测试账号
  if (username !== BUILTIN_ADMIN.username || password !== BUILTIN_ADMIN.password) {
    return errorResponse('账号或密码错误');
  }

  // 检查数据库是否已有管理员，如果有则拒绝内置登录
  try {
    const adminUser = await env.DB.prepare(
      "SELECT id FROM users WHERE role = 'admin' AND status = 'active' LIMIT 1"
    ).first();

    if (adminUser) {
      return errorResponse('系统已完成初始化，请使用数据库账号登录', 403);
    }
  } catch {
    // 数据库表可能不存在，允许继续
  }

  // 生成 token (userId 用 -1 表示内置账号)
  const token = await signJwt(
    { userId: -1, username: BUILTIN_ADMIN.username, isBuiltin: true },
    env.JWT_SECRET,
    1 // 1小时过期，配置阶段使用
  );

  return successResponse(
    {
      token,
      user: {
        id: -1,
        username: BUILTIN_ADMIN.username,
        nickname: BUILTIN_ADMIN.nickname,
        avatar: null,
        role: 'admin',
        is_builtin: true,
      },
    },
    '登录成功（测试模式）'
  );
}

// 初始化数据库表结构
export async function initDatabaseHandler(
  _request: Request,
  env: Env
): Promise<Response> {
  try {
    // 执行建表 SQL
    const schemaSQL = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nickname TEXT,
  avatar TEXT,
  bio TEXT,
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'active',
  email_verified INTEGER NOT NULL DEFAULT 0,
  last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS boards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  post_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  summary TEXT,
  content_md TEXT NOT NULL,
  content_html TEXT,
  cover_image TEXT,
  board_id INTEGER,
  author_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'published',
  visibility TEXT NOT NULL DEFAULT 'public',
  is_pinned INTEGER NOT NULL DEFAULT 0,
  is_featured INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  like_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  tags TEXT,
  storage_key TEXT,
  storage_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (board_id) REFERENCES boards(id),
  FOREIGN KEY (author_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  author_id INTEGER NOT NULL,
  parent_id INTEGER,
  content_md TEXT NOT NULL,
  content_html TEXT,
  status TEXT NOT NULL DEFAULT 'approved',
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

CREATE TABLE IF NOT EXISTS likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  target_type TEXT NOT NULL,
  target_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, target_type, target_id)
);

CREATE TABLE IF NOT EXISTS verification_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL,
  target TEXT NOT NULL,
  target_value TEXT NOT NULL,
  type TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

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

CREATE TABLE IF NOT EXISTS plugins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT,
  description TEXT,
  version TEXT,
  author TEXT,
  status TEXT NOT NULL DEFAULT 'disabled',
  config TEXT,
  installed_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS themes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT,
  description TEXT,
  version TEXT,
  author TEXT,
  is_active INTEGER NOT NULL DEFAULT 0,
  config TEXT,
  installed_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS storage_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'webdav',
  config TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  target_type TEXT,
  target_id INTEGER,
  title TEXT NOT NULL,
  content TEXT,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

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
`;

    // D1 不支持多语句 exec，需要逐条执行
    const statements = schemaSQL
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      await env.DB.prepare(stmt + ';').run();
    }

    // 插入默认设置
    const defaultSettings: [string, string][] = [
      ['site_name', '轻社区博客'],
      ['site_description', '一个基于 Cloudflare Worker + D1 的轻社区博客系统'],
      ['site_logo', ''],
      ['registration_enabled', 'true'],
      ['comment_requires_approval', 'false'],
      ['comment_requires_login', 'true'],
      ['email_verification_required', 'true'],
      ['smtp_host', ''],
      ['smtp_port', '587'],
      ['smtp_user', ''],
      ['smtp_pass', ''],
      ['smtp_from', ''],
      ['default_storage_id', ''],
      ['storage_enabled', 'false'],
      ['captcha_enabled', 'true'],
      ['max_posts_per_day', '10'],
      ['max_comments_per_day', '50'],
    ];

    for (const [key, value] of defaultSettings) {
      await env.DB.prepare(
        'INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES (?, ?, datetime("now"))'
      )
        .bind(key, value)
        .run();
    }

    // 插入默认板块
    const defaultBoards: [string, string, string, number][] = [
      ['announcement', '公告', '社区公告与规则', 1],
      ['tech', '技术交流', '技术讨论与分享', 2],
      ['life', '生活随笔', '日常生活记录', 3],
      ['creative', '创作分享', '原创作品展示', 4],
    ];

    for (const [slug, name, desc, sort] of defaultBoards) {
      await env.DB.prepare(
        'INSERT OR IGNORE INTO boards (slug, name, description, sort_order) VALUES (?, ?, ?, ?)'
      )
        .bind(slug, name, desc, sort)
        .run();
    }

    return successResponse(null, '数据库初始化成功');
  } catch (e) {
    return errorResponse(`数据库初始化失败: ${String(e)}`, 500);
  }
}

// 保存管理员账号和设置到数据库
export async function saveToDatabaseHandler(
  request: Request,
  env: Env
): Promise<Response> {
  const body = await parseBody<{
    username?: string;
    password?: string;
    email?: string;
    nickname?: string;
    settings?: Record<string, string>;
  }>(request);

  if (!body) return errorResponse('无效的请求数据');

  try {
    // 确保表存在
    const tableCheck = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
    ).first();

    if (!tableCheck) {
      return errorResponse('数据库尚未初始化，请先初始化数据库', 400);
    }

    // 检查是否已有管理员
    const existingAdmin = await env.DB.prepare(
      "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
    ).first();

    if (existingAdmin) {
      return errorResponse('管理员账号已存在，不可重复写入', 400);
    }

    // 创建管理员账号
    const adminUsername = body.username || BUILTIN_ADMIN.username;
    const adminPassword = body.password || BUILTIN_ADMIN.password;
    const adminEmail = body.email || BUILTIN_ADMIN.email;
    const adminNickname = body.nickname || BUILTIN_ADMIN.nickname;

    const passwordHash = await hashPassword(adminPassword);
    const now = new Date().toISOString();

    const result = await env.DB.prepare(
      'INSERT INTO users (username, email, password_hash, nickname, role, status, email_verified, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
      .bind(adminUsername, adminEmail, passwordHash, adminNickname, 'admin', 'active', 1, now, now)
      .run();

    const adminId = result.meta.last_row_id as number;

    // 保存设置
    if (body.settings) {
      for (const [key, value] of Object.entries(body.settings)) {
        await env.DB.prepare(
          'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime("now")) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime("now")'
        )
          .bind(key, value)
          .run();
      }
    }

    // 生成正式 token
    const token = await signJwt(
      { userId: adminId, username: adminUsername },
      env.JWT_SECRET
    );

    return successResponse(
      {
        token,
        user: {
          id: adminId,
          username: adminUsername,
          nickname: adminNickname,
          avatar: null,
          role: 'admin',
        },
        message: '管理员账号已写入数据库，测试账号已失效，系统初始化完成',
      },
      '初始化完成'
    );
  } catch (e) {
    return errorResponse(`保存失败: ${String(e)}`, 500);
  }
}
