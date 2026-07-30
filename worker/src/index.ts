// Cloudflare Worker 主入口
import { jsonResponse, errorResponse } from './lib/utils';
import {
  registerHandler,
  loginHandler,
  meHandler,
  changePasswordHandler,
  updateProfileHandler,
  sendCodeHandler,
} from './routes/auth';
import {
  listPostsHandler,
  getPostHandler,
  createPostHandler,
  updatePostHandler,
  deletePostHandler,
  toggleLikeHandler,
} from './routes/posts';
import {
  listCommentsHandler,
  createCommentHandler,
  deleteCommentHandler,
  moderateCommentHandler,
} from './routes/comments';
import {
  listBoardsHandler,
  listBoardsAdminHandler,
  createBoardHandler,
  updateBoardHandler,
  deleteBoardHandler,
} from './routes/boards';
import {
  dashboardStatsHandler,
  listUsersHandler,
  updateUserHandler,
  getSettingsHandler,
  updateSettingsHandler,
  pendingCommentsHandler,
} from './routes/admin';
import {
  listStorageConfigsHandler,
  createStorageConfigHandler,
  updateStorageConfigHandler,
  deleteStorageConfigHandler,
  testStorageConnectionHandler,
  listStorageFilesHandler,
  saveToStorageHandler,
} from './routes/storage';
import {
  listNotificationsHandler,
  markNotificationReadHandler,
  markAllReadHandler,
  sendTestEmailHandler,
} from './routes/notifications';
import {
  setupStatusHandler,
  builtinLoginHandler,
  initDatabaseHandler,
  saveToDatabaseHandler,
} from './routes/setup';
import type { Env } from './types';

// 路由匹配辅助
function matchRoute(
  path: string,
  pattern: string
): { matched: boolean; params: Record<string, string> } {
  const pathParts = path.split('/').filter(Boolean);
  const patternParts = pattern.split('/').filter(Boolean);

  if (pathParts.length !== patternParts.length) {
    return { matched: false, params: {} };
  }

  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
    } else if (patternParts[i] !== pathParts[i]) {
      return { matched: false, params: {} };
    }
  }

  return { matched: true, params };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS 预检
    if (request.method === 'OPTIONS') {
      return jsonResponse(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // 静态文件 (前端构建产物)
    if (
      path.startsWith('/assets/') ||
      path.startsWith('/static/') ||
      path.endsWith('.js') ||
      path.endsWith('.css') ||
      path.endsWith('.svg') ||
      path.endsWith('.png') ||
      path.endsWith('.jpg') ||
      path.endsWith('.ico') ||
      path.endsWith('.webp')
    ) {
      return env.ASSETS ? env.ASSETS.fetch(request) : errorResponse('Not Found', 404);
    }

    // API 路由
    if (path.startsWith('/api/')) {
      return handleApiRoutes(request, env, path);
    }

    // 前端 SPA - 返回 index.html
    if (env.ASSETS) {
      const newRequest = new Request('/index.html', request);
      return env.ASSETS.fetch(newRequest);
    }

    return errorResponse('Not Found', 404);
  },
};

async function handleApiRoutes(
  request: Request,
  env: Env,
  path: string
): Promise<Response> {
  const method = request.method;
  const apiPath = path.replace(/^\/api/, '');

  // ============ 认证相关 ============
  let m = matchRoute(apiPath, '/auth/register');
  if (m.matched && method === 'POST') return registerHandler(request, env);

  m = matchRoute(apiPath, '/auth/login');
  if (m.matched && method === 'POST') return loginHandler(request, env);

  m = matchRoute(apiPath, '/auth/me');
  if (m.matched && method === 'GET') return meHandler(request, env);

  m = matchRoute(apiPath, '/auth/change-password');
  if (m.matched && method === 'POST') return changePasswordHandler(request, env);

  m = matchRoute(apiPath, '/auth/profile');
  if (m.matched && method === 'PUT') return updateProfileHandler(request, env);

  m = matchRoute(apiPath, '/auth/send-code');
  if (m.matched && method === 'POST') return sendCodeHandler(request, env);

  // ============ 文章相关 ============
  m = matchRoute(apiPath, '/posts');
  if (m.matched) {
    if (method === 'GET') return listPostsHandler(request, env);
    if (method === 'POST') return createPostHandler(request, env);
  }

  m = matchRoute(apiPath, '/posts/:id');
  if (m.matched) {
    if (method === 'GET') return getPostHandler(request, env, m.params.id);
    if (method === 'PUT') return updatePostHandler(request, env, m.params.id);
    if (method === 'DELETE') return deletePostHandler(request, env, m.params.id);
  }

  // 点赞
  m = matchRoute(apiPath, '/like/:targetType/:targetId');
  if (m.matched && method === 'POST') {
    return toggleLikeHandler(request, env, m.params.targetType, m.params.targetId);
  }

  // ============ 评论相关 ============
  m = matchRoute(apiPath, '/comments');
  if (m.matched) {
    if (method === 'GET') return listCommentsHandler(request, env);
    if (method === 'POST') return createCommentHandler(request, env);
  }

  m = matchRoute(apiPath, '/comments/:id');
  if (m.matched) {
    if (method === 'DELETE') return deleteCommentHandler(request, env, m.params.id);
  }

  m = matchRoute(apiPath, '/comments/:id/moderate');
  if (m.matched && method === 'PUT') {
    return moderateCommentHandler(request, env, m.params.id);
  }

  // ============ 板块相关 ============
  m = matchRoute(apiPath, '/boards');
  if (m.matched) {
    if (method === 'GET') return listBoardsHandler(request, env);
    if (method === 'POST') return createBoardHandler(request, env);
  }

  m = matchRoute(apiPath, '/boards/admin');
  if (m.matched && method === 'GET') return listBoardsAdminHandler(request, env);

  m = matchRoute(apiPath, '/boards/:id');
  if (m.matched) {
    if (method === 'PUT') return updateBoardHandler(request, env, m.params.id);
    if (method === 'DELETE') return deleteBoardHandler(request, env, m.params.id);
  }

  // ============ 管理后台 ============
  m = matchRoute(apiPath, '/admin/stats');
  if (m.matched && method === 'GET') return dashboardStatsHandler(request, env);

  m = matchRoute(apiPath, '/admin/users');
  if (m.matched && method === 'GET') return listUsersHandler(request, env);

  m = matchRoute(apiPath, '/admin/users/:id');
  if (m.matched && method === 'PUT') return updateUserHandler(request, env, m.params.id);

  m = matchRoute(apiPath, '/admin/settings');
  if (m.matched) {
    if (method === 'GET') return getSettingsHandler(request, env);
    if (method === 'PUT') return updateSettingsHandler(request, env);
  }

  m = matchRoute(apiPath, '/admin/comments/pending');
  if (m.matched && method === 'GET') return pendingCommentsHandler(request, env);

  // ============ 存储配置 ============
  m = matchRoute(apiPath, '/storage/configs');
  if (m.matched) {
    if (method === 'GET') return listStorageConfigsHandler(request, env);
    if (method === 'POST') return createStorageConfigHandler(request, env);
  }

  m = matchRoute(apiPath, '/storage/configs/:id');
  if (m.matched) {
    if (method === 'PUT') return updateStorageConfigHandler(request, env, m.params.id);
    if (method === 'DELETE') return deleteStorageConfigHandler(request, env, m.params.id);
  }

  m = matchRoute(apiPath, '/storage/configs/:id/test');
  if (m.matched && method === 'POST') {
    return testStorageConnectionHandler(request, env, m.params.id);
  }

  m = matchRoute(apiPath, '/storage/files');
  if (m.matched) {
    if (method === 'GET') return listStorageFilesHandler(request, env);
    if (method === 'POST') return saveToStorageHandler(request, env);
  }

  // ============ 通知 ============
  m = matchRoute(apiPath, '/notifications');
  if (m.matched) {
    if (method === 'GET') return listNotificationsHandler(request, env);
  }

  m = matchRoute(apiPath, '/notifications/:id/read');
  if (m.matched && method === 'POST') {
    return markNotificationReadHandler(request, env, m.params.id);
  }

  m = matchRoute(apiPath, '/notifications/read-all');
  if (m.matched && method === 'POST') return markAllReadHandler(request, env);

  m = matchRoute(apiPath, '/admin/email/test');
  if (m.matched && method === 'POST') return sendTestEmailHandler(request, env);

  // ============ 首次配置 (Setup) ============
  m = matchRoute(apiPath, '/setup/status');
  if (m.matched && method === 'GET') return setupStatusHandler(request, env);

  m = matchRoute(apiPath, '/setup/login');
  if (m.matched && method === 'POST') return builtinLoginHandler(request, env);

  m = matchRoute(apiPath, '/setup/init-db');
  if (m.matched && method === 'POST') return initDatabaseHandler(request, env);

  m = matchRoute(apiPath, '/setup/save');
  if (m.matched && method === 'POST') return saveToDatabaseHandler(request, env);

  // 404
  return errorResponse('API 路由不存在', 404);
}
