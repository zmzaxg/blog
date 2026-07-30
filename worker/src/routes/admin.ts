// 管理后台路由
import {
  successResponse,
  errorResponse,
  paginatedResponse,
  parseBody,
  getPagination,
} from '../lib/utils';
import { authMiddleware, requireAdmin } from '../middleware/auth';
import type { Env } from '../types';

// 获取仪表盘统计
export async function dashboardStatsHandler(
  request: Request,
  env: Env
): Promise<Response> {
  const auth = await authMiddleware(request, env);
  const err = requireAdmin(auth);
  if (err) return err;

  const [totalPosts, totalComments, totalUsers, totalBoards] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) as cnt FROM posts WHERE status != 'deleted'").first<{ cnt: number }>(),
    env.DB.prepare("SELECT COUNT(*) as cnt FROM comments WHERE status != 'deleted'").first<{ cnt: number }>(),
    env.DB.prepare("SELECT COUNT(*) as cnt FROM users WHERE status != 'banned'").first<{ cnt: number }>(),
    env.DB.prepare("SELECT COUNT(*) as cnt FROM boards WHERE status = 'active'").first<{ cnt: number }>(),
  ]);

  // 最近 7 天的发布趋势
  const trend = await env.DB.prepare(
    `SELECT DATE(created_at) as date, COUNT(*) as count
     FROM posts
     WHERE status = 'published' AND created_at >= datetime('now', '-7 days')
     GROUP BY DATE(created_at)
     ORDER BY date ASC`
  ).all<{ date: string; count: number }>();

  // 待审核评论
  const pendingComments = await env.DB.prepare(
    "SELECT COUNT(*) as cnt FROM comments WHERE status = 'pending'"
  ).first<{ cnt: number }>();

  return successResponse({
    total_posts: totalPosts?.cnt || 0,
    total_comments: totalComments?.cnt || 0,
    total_users: totalUsers?.cnt || 0,
    total_boards: totalBoards?.cnt || 0,
    pending_comments: pendingComments?.cnt || 0,
    trend: trend.results,
  });
}

// 用户管理 - 列表
export async function listUsersHandler(
  request: Request,
  env: Env
): Promise<Response> {
  const auth = await authMiddleware(request, env);
  const err = requireAdmin(auth);
  if (err) return err;

  const { page, pageSize, offset } = getPagination(request.url);
  const url = new URL(request.url);
  const keyword = url.searchParams.get('keyword');
  const role = url.searchParams.get('role');

  let where = 'WHERE 1=1';
  const params: (string | number)[] = [];

  if (keyword) {
    where += ' AND (username LIKE ? OR email LIKE ? OR nickname LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (role) {
    where += ' AND role = ?';
    params.push(role);
  }

  const countResult = await env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM users ${where}`
  )
    .bind(...params)
    .first<{ cnt: number }>();

  const total = countResult?.cnt || 0;

  const users = await env.DB.prepare(
    `SELECT id, username, email, nickname, avatar, bio, role, status, email_verified, last_login_at, created_at
     FROM users ${where}
     ORDER BY id DESC
     LIMIT ? OFFSET ?`
  )
    .bind(...params, pageSize, offset)
    .all();

  return paginatedResponse(users.results, total, page, pageSize);
}

// 用户管理 - 更新角色/状态
export async function updateUserHandler(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  const auth = await authMiddleware(request, env);
  const err = requireAdmin(auth);
  if (err) return err;

  const body = await parseBody<{ role?: string; status?: string }>(request);
  if (!body) return errorResponse('无效的请求数据');

  const fields: string[] = [];
  const values: (string | number)[] = [];

  if (body.role !== undefined) {
    fields.push('role = ?');
    values.push(body.role);
  }
  if (body.status !== undefined) {
    fields.push('status = ?');
    values.push(body.status);
  }

  if (fields.length === 0) {
    return errorResponse('没有要更新的字段');
  }

  fields.push('updated_at = datetime(\"now\")');
  values.push(parseInt(id, 10));

  await env.DB.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  return successResponse(null, '更新成功');
}

// 系统设置 - 获取
export async function getSettingsHandler(
  request: Request,
  env: Env
): Promise<Response> {
  const auth = await authMiddleware(request, env);
  const err = requireAdmin(auth);
  if (err) return err;

  const result = await env.DB.prepare('SELECT key, value FROM settings').all<{
    key: string;
    value: string;
  }>();

  const settings: Record<string, string> = {};
  for (const row of result.results) {
    settings[row.key] = row.value;
  }

  return successResponse(settings);
}

// 系统设置 - 更新
export async function updateSettingsHandler(
  request: Request,
  env: Env
): Promise<Response> {
  const auth = await authMiddleware(request, env);
  const err = requireAdmin(auth);
  if (err) return err;

  const body = await parseBody<Record<string, string>>(request);
  if (!body) return errorResponse('无效的请求数据');

  const entries = Object.entries(body);
  if (entries.length === 0) {
    return errorResponse('没有要更新的设置');
  }

  for (const [key, value] of entries) {
    await env.DB.prepare(
      'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime(\"now\")) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime(\"now\")'
    )
      .bind(key, value)
      .run();
  }

  return successResponse(null, '设置已更新');
}

// 所有评论列表（支持筛选）
export async function listAllCommentsHandler(
  request: Request,
  env: Env
): Promise<Response> {
  const auth = await authMiddleware(request, env);
  const err = requireAdmin(auth);
  if (err) return err;

  const { page, pageSize, offset } = getPagination(request.url);
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const keyword = url.searchParams.get('keyword');

  let where = 'WHERE 1=1';
  const params: (string | number)[] = [];

  if (status && status !== 'all') {
    where += ' AND c.status = ?';
    params.push(status);
  } else {
    // 排除已删除
    where += " AND c.status != 'deleted'";
  }

  if (keyword) {
    where += ' AND c.content_md LIKE ?';
    params.push(`%${keyword}%`);
  }

  const countResult = await env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM comments c ${where}`
  ).bind(...params).first<{ cnt: number }>();

  const total = countResult?.cnt || 0;

  const comments = await env.DB.prepare(
    `SELECT c.*, p.title as post_title, u.username, u.nickname, u.avatar as author_avatar
     FROM comments c
     LEFT JOIN posts p ON c.post_id = p.id
     LEFT JOIN users u ON c.author_id = u.id
     ${where}
     ORDER BY c.created_at DESC
     LIMIT ? OFFSET ?`
  ).bind(...params, pageSize, offset).all();

  return paginatedResponse(comments.results, total, page, pageSize);
}

// 待审核评论列表
export async function pendingCommentsHandler(
  request: Request,
  env: Env
): Promise<Response> {
  const auth = await authMiddleware(request, env);
  const err = requireAdmin(auth);
  if (err) return err;

  const { page, pageSize, offset } = getPagination(request.url);

  const countResult = await env.DB.prepare(
    "SELECT COUNT(*) as cnt FROM comments WHERE status = 'pending'"
  ).first<{ cnt: number }>();

  const total = countResult?.cnt || 0;

  const comments = await env.DB.prepare(
    `SELECT c.*, p.title as post_title, u.username, u.nickname
     FROM comments c
     LEFT JOIN posts p ON c.post_id = p.id
     LEFT JOIN users u ON c.author_id = u.id
     WHERE c.status = 'pending'
     ORDER BY c.created_at DESC
     LIMIT ? OFFSET ?`
  )
    .bind(pageSize, offset)
    .all();

  return paginatedResponse(comments.results, total, page, pageSize);
}
