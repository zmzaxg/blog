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

// 验证 SMTP 配置
export async function verifySmtpHandler(
  request: Request,
  env: Env
): Promise<Response> {
  const auth = await authMiddleware(request, env);
  const err = requireAdmin(auth);
  if (err) return err;

  const settings = await env.DB.prepare(
    "SELECT key, value FROM settings WHERE key LIKE 'smtp_%'"
  ).all<{ key: string; value: string }>();

  const config: Record<string, string> = {};
  for (const row of settings.results) {
    config[row.key] = row.value;
  }

  if (!config.smtp_host) {
    return successResponse({ valid: false, message: 'SMTP 服务器未配置', config: {} });
  }
  if (!config.smtp_user) {
    return successResponse({ valid: false, message: 'SMTP 用户名未配置', config: {} });
  }
  if (!config.smtp_port) {
    return successResponse({ valid: false, message: 'SMTP 端口未配置', config: {} });
  }

  return successResponse({
    valid: true,
    message: `SMTP 配置完整 (服务器: ${config.smtp_host}:${config.smtp_port})`,
    config: {
      host: config.smtp_host,
      port: config.smtp_port,
      user: config.smtp_user,
      from: config.smtp_from || '',
      has_password: !!config.smtp_pass,
    },
  });
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

  if (!body.to.includes('@')) {
    return errorResponse('收件人邮箱格式不正确');
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
    return errorResponse('SMTP 未配置，请先在「邮件设置」中配置 SMTP 服务器信息');
  }

  // 尝试通过 MailChannels API 发送（Cloudflare Workers 推荐方式）
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒超时

    const resp = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
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

    clearTimeout(timeoutId);

    if (resp.ok) {
      return successResponse({
        method: 'mailchannels',
        from: config.smtp_from || config.smtp_user,
        to: body.to,
      }, `测试邮件已发送至 ${body.to}，请检查收件箱（可能在垃圾邮件中）`);
    }

    const respText = await resp.text();
    return errorResponse(
      `邮件发送失败 (HTTP ${resp.status}): ${respText.substring(0, 200)}。` +
      `请确认 Worker 已绑定 MailChannels 或配置了正确的 DNS 记录。`
    );
  } catch (e) {
    const errMsg = String(e);
    if (errMsg.includes('abort')) {
      return errorResponse('邮件发送超时（15秒），请检查网络连接或稍后重试');
    }
    return errorResponse(`邮件发送异常: ${errMsg}`);
  }
}
