// 认证中间件
import { verifyJwt } from './jwt';
import { errorResponse } from './utils';
import type { Env, AuthContext, PublicUser } from '../types';

export function extractToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  // 也支持 cookie
  const cookie = request.headers.get('Cookie');
  if (cookie) {
    const match = cookie.match(/token=([^;]+)/);
    if (match) return match[1];
  }
  return null;
}

export async function authMiddleware(
  request: Request,
  env: Env
): Promise<AuthContext> {
  const token = extractToken(request);
  if (!token) {
    return { user: null, userId: null, isAdmin: false, isEditor: false };
  }

  const payload = await verifyJwt(token, env.JWT_SECRET);
  if (!payload || typeof payload.userId !== 'number') {
    return { user: null, userId: null, isAdmin: false, isEditor: false };
  }

  const userId = payload.userId;

  // 内置测试管理员账号 (userId === -1)
  if (userId === -1 && payload.isBuiltin === true) {
    return {
      user: {
        id: -1,
        username: 'zmzaxg',
        nickname: '系统管理员',
        avatar: null,
        bio: null,
        role: 'admin',
        created_at: new Date().toISOString(),
      },
      userId: -1,
      isAdmin: true,
      isEditor: true,
    };
  }

  // 从数据库获取用户信息
  try {
    const result = await env.DB.prepare(
      'SELECT id, username, nickname, avatar, bio, role, created_at FROM users WHERE id = ? AND status = ?'
    )
      .bind(userId, 'active')
      .first<PublicUser>();

    if (!result) {
      return { user: null, userId: null, isAdmin: false, isEditor: false };
    }

    return {
      user: result,
      userId,
      isAdmin: result.role === 'admin',
      isEditor: result.role === 'admin' || result.role === 'editor',
    };
  } catch {
    return { user: null, userId: null, isAdmin: false, isEditor: false };
  }
}

export function requireAuth(auth: AuthContext): Response | null {
  if (!auth.userId) {
    return errorResponse('请先登录', 401, 'UNAUTHORIZED');
  }
  return null;
}

export function requireAdmin(auth: AuthContext): Response | null {
  if (!auth.userId) {
    return errorResponse('请先登录', 401, 'UNAUTHORIZED');
  }
  if (!auth.isAdmin) {
    return errorResponse('权限不足', 403, 'FORBIDDEN');
  }
  return null;
}

export function requireEditor(auth: AuthContext): Response | null {
  if (!auth.userId) {
    return errorResponse('请先登录', 401, 'UNAUTHORIZED');
  }
  if (!auth.isEditor) {
    return errorResponse('权限不足', 403, 'FORBIDDEN');
  }
  return null;
}
