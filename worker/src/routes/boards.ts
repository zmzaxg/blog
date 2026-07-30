// 板块路由
import {
  successResponse,
  errorResponse,
  parseBody,
} from '../lib/utils';
import { authMiddleware, requireAdmin } from '../middleware/auth';
import type { Env, Board } from '../types';

// 获取所有板块
export async function listBoardsHandler(_request: Request, env: Env): Promise<Response> {
  const result = await env.DB.prepare(
    "SELECT * FROM boards WHERE status = 'active' ORDER BY sort_order ASC, id ASC"
  ).all<Board>();

  return successResponse(result.results);
}

// 获取所有板块 (含管理用字段)
export async function listBoardsAdminHandler(
  request: Request,
  env: Env
): Promise<Response> {
  const auth = await authMiddleware(request, env);
  const err = requireAdmin(auth);
  if (err) return err;

  const result = await env.DB.prepare(
    'SELECT * FROM boards ORDER BY sort_order ASC, id ASC'
  ).all<Board>();

  return successResponse(result.results);
}

// 创建板块
export async function createBoardHandler(
  request: Request,
  env: Env
): Promise<Response> {
  const auth = await authMiddleware(request, env);
  const err = requireAdmin(auth);
  if (err) return err;

  const body = await parseBody<{
    slug: string;
    name: string;
    description?: string;
    icon?: string;
    sort_order?: number;
  }>(request);

  if (!body?.slug || !body?.name) {
    return errorResponse('标识和名称不能为空');
  }

  const existing = await env.DB.prepare('SELECT id FROM boards WHERE slug = ?')
    .bind(body.slug)
    .first();
  if (existing) {
    return errorResponse('标识已存在');
  }

  const now = new Date().toISOString();
  const result = await env.DB.prepare(
    'INSERT INTO boards (slug, name, description, icon, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
    .bind(
      body.slug,
      body.name,
      body.description || null,
      body.icon || null,
      body.sort_order || 0,
      now,
      now
    )
    .run();

  return successResponse({ id: result.meta.last_row_id }, '创建成功');
}

// 更新板块
export async function updateBoardHandler(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  const auth = await authMiddleware(request, env);
  const err = requireAdmin(auth);
  if (err) return err;

  const body = await parseBody<Partial<{
    slug: string;
    name: string;
    description: string;
    icon: string;
    sort_order: number;
    status: string;
  }>>(request);

  if (!body) return errorResponse('无效的请求数据');

  const fields: string[] = [];
  const values: (string | number)[] = [];

  for (const [key, value] of Object.entries(body)) {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value as string | number);
    }
  }

  if (fields.length === 0) {
    return errorResponse('没有要更新的字段');
  }

  fields.push('updated_at = datetime(\"now\")');
  values.push(parseInt(id, 10));

  await env.DB.prepare(`UPDATE boards SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  return successResponse(null, '更新成功');
}

// 删除板块
export async function deleteBoardHandler(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  const auth = await authMiddleware(request, env);
  const err = requireAdmin(auth);
  if (err) return err;

  // 检查是否有文章
  const count = await env.DB.prepare('SELECT COUNT(*) as cnt FROM posts WHERE board_id = ?')
    .bind(parseInt(id, 10))
    .first<{ cnt: number }>();

  if (count && count.cnt > 0) {
    return errorResponse('该板块下还有文章，无法删除');
  }

  await env.DB.prepare('DELETE FROM boards WHERE id = ?')
    .bind(parseInt(id, 10))
    .run();

  return successResponse(null, '删除成功');
}
