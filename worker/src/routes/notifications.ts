// 通知与邮件路由
import { successResponse, errorResponse, parseBody, getPagination } from '../lib/utils';
import { authMiddleware, requireAuth, requireAdmin } from '../middleware/auth';
import type { Env } from '../types';

// 获取通知列表
export async function listNotificationsHandler(
  request: Request,
  env: Env
): Promise<Response> {
  const auth = await authMiddleware(request, env);
  const err = requireAuth(auth);
  if (err) return err;

  const { page, pageSize, offset } = getPagination(request.url);
  const url = new URL(request.url);
  const unreadOnly = url.searchParams.get('unread') === 'true';

  let where = 'WHERE user_id = ?';
  const params: (number | string)[] = [auth.userId!];

  if (unreadOnly) {
    where += ' AND is_read = 0';
  }

  const countResult = await env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM notifications ${where}`
  )
    .bind(...params)
    .first<{ cnt: number }>();

  const total = countResult?.cnt || 0;

  const notifications = await env.DB.prepare(
    `SELECT * FROM notifications ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  )
    .bind(...params, pageSize, offset)
    .all();

  // 未读总数
  const unreadCount = await env.DB.prepare(
    'SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0'
  )
    .bind(auth.userId!)
    .first<{ cnt: number }>();

  return new Response(
    JSON.stringify({
      success: true,
      data: notifications.results,
      total,
      page,
      page_size: pageSize,
      unread_count: unreadCount?.cnt || 0,
    }),
    {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    }
  );
}

// 标记已读
export async function markNotificationReadHandler(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  const auth = await authMiddleware(request, env);
  const err = requireAuth(auth);
  if (err) return err;

  await env.DB.prepare(
    'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?'
  )
    .bind(parseInt(id, 10), auth.userId)
    .run();

  return successResponse(null, '已标记为已读');
}

// 全部标记已读
export async function markAllReadHandler(
  request: Request,
  env: Env
): Promise<Response> {
  const auth = await authMiddleware(request, env);
  const err = requireAuth(auth);
  if (err) return err;

  await env.DB.prepare(
    'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0'
  )
    .bind(auth.userId)
    .run();

  return successResponse(null, '全部已读');
}

// 发送邮件 (管理员测试用)
export async function sendTestEmailHandler(
  request: Request,
  env: Env
): Promise<Response> {
  const auth = await authMiddleware(request, env);
  const err = requireAdmin(auth);
  if (err) return err;

  const body = await parseBody<{ to: string; subject: string; content: string }>(request);
  if (!body?.to || !body?.subject || !body?.content) {
    return errorResponse('收件人、主题和内容不能为空');
  }

  // 获取 SMTP 配置
  const settings = await env.DB.prepare(
    "SELECT key, value FROM settings WHERE key LIKE 'smtp_%'"
  ).all<{ key: string; value: string }>();

  const config: Record<string, string> = {};
  for (const row of settings.results) {
    config[row.key] = row.value;
  }

  if (!config.smtp_host || !config.smtp_user) {
    return errorResponse('SMTP 未配置');
  }

  // 使用 MailChannels API (Cloudflare 推荐的邮件发送方式)
  // 也可以用 SMTP, 但 Worker 环境下 MailChannels 更方便
  try {
    const resp = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: body.to }],
          },
        ],
        from: {
          email: config.smtp_from || config.smtp_user,
          name: '轻社区博客',
        },
        subject: body.subject,
        content: [
          {
            type: 'text/html',
            value: body.content,
          },
        ],
      }),
    });

    if (resp.ok) {
      return successResponse(null, '邮件发送成功');
    }
    const text = await resp.text();
    return errorResponse(`邮件发送失败: ${resp.status} ${text}`);
  } catch (e) {
    return errorResponse(`邮件发送失败: ${String(e)}`);
  }
}
