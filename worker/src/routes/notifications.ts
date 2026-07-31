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

// 验证 SMTP 连接配置
async function verifySmtpConfig(config: Record<string, string>): Promise<{ valid: boolean; message: string }> {
  if (!config.smtp_host) {
    return { valid: false, message: 'SMTP 服务器未配置' };
  }
  if (!config.smtp_user) {
    return { valid: false, message: 'SMTP 用户名未配置' };
  }
  if (!config.smtp_port) {
    return { valid: false, message: 'SMTP 端口未配置' };
  }

  // 尝试通过 TCP 连接验证 SMTP 服务器可达性
  try {
    const port = parseInt(config.smtp_port, 10);
    const host = config.smtp_host;
    // 使用 Cloudflare Workers TCP socket API (connect)
    // @ts-ignore - Cloudflare Workers specific API
    if (typeof globalThis.connect === 'function') {
      // @ts-ignore
      const socket = await globalThis.connect(host, port);
      await socket.close();
      return { valid: true, message: `SMTP 服务器 ${host}:${port} 连接可达` };
    }
    // 如果没有 TCP socket API，仅做基础验证
    return { valid: true, message: `SMTP 配置格式正确 (服务器: ${host}:${port})` };
  } catch (e) {
    return { valid: false, message: `SMTP 服务器连接失败: ${String(e)}` };
  }
}

// 通过 SMTP 发送邮件 (使用 Cloudflare Workers TCP Socket)
async function sendViaSmtp(
  config: Record<string, string>,
  to: string,
  subject: string,
  htmlContent: string
): Promise<{ success: boolean; message: string }> {
  const host = config.smtp_host;
  const port = parseInt(config.smtp_port || '587', 10);
  const user = config.smtp_user;
  const pass = config.smtp_pass;
  const from = config.smtp_from || user;

  // @ts-ignore - Cloudflare Workers TCP socket API
  if (typeof globalThis.connect !== 'function') {
    return { success: false, message: '当前环境不支持 TCP Socket，请升级 Cloudflare Workers 到最新版本' };
  }

  try {
    // @ts-ignore
    const socket = await globalThis.connect(host, port);
    const writer = socket.writable.getWriter();
    const reader = socket.readable.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    async function readResponse(): Promise<string> {
      const { value } = await reader.read();
      return decoder.decode(value);
    }

    async function sendCommand(cmd: string): Promise<string> {
      await writer.write(encoder.encode(cmd + '\r\n'));
      return readResponse();
    }

    // 读取欢迎消息
    const welcome = await readResponse();
    if (!welcome.startsWith('220')) {
      await socket.close();
      return { success: false, message: `SMTP 服务器响应异常: ${welcome.substring(0, 100)}` };
    }

    // EHLO
    const ehloResp = await sendCommand(`EHLO ${host}`);
    if (!ehloResp.startsWith('250')) {
      await socket.close();
      return { success: false, message: `EHLO 失败: ${ehloResp.substring(0, 100)}` };
    }

    // STARTTLS (如果端口是 587)
    if (port === 587) {
      const starttlsResp = await sendCommand('STARTTLS');
      if (!starttlsResp.startsWith('220')) {
        await socket.close();
        return { success: false, message: `STARTTLS 失败: ${starttlsResp.substring(0, 100)}` };
      }
      // TLS 升级需要在 Cloudflare Workers 中使用不同的方式
      // 这里简化处理
    }

    // AUTH LOGIN
    const authResp = await sendCommand('AUTH LOGIN');
    if (!authResp.startsWith('334')) {
      await socket.close();
      return { success: false, message: `AUTH 失败: ${authResp.substring(0, 100)}` };
    }

    // 发送用户名 (Base64)
    const userResp = await sendCommand(btoa(user));
    if (!userResp.startsWith('334')) {
      await socket.close();
      return { success: false, message: `用户名验证失败: ${userResp.substring(0, 100)}` };
    }

    // 发送密码 (Base64)
    const passResp = await sendCommand(btoa(pass));
    if (!passResp.startsWith('235')) {
      await socket.close();
      return { success: false, message: `密码验证失败: ${passResp.substring(0, 100)}` };
    }

    // MAIL FROM
    const mailFromResp = await sendCommand(`MAIL FROM:<${from}>`);
    if (!mailFromResp.startsWith('250')) {
      await socket.close();
      return { success: false, message: `MAIL FROM 失败: ${mailFromResp.substring(0, 100)}` };
    }

    // RCPT TO
    const rcptToResp = await sendCommand(`RCPT TO:<${to}>`);
    if (!rcptToResp.startsWith('250')) {
      await socket.close();
      return { success: false, message: `RCPT TO 失败: ${rcptToResp.substring(0, 100)}` };
    }

    // DATA
    const dataResp = await sendCommand('DATA');
    if (!dataResp.startsWith('354')) {
      await socket.close();
      return { success: false, message: `DATA 命令失败: ${dataResp.substring(0, 100)}` };
    }

    // 邮件内容
    const date = new Date().toUTCString();
    const boundary = `----=_Part_${Date.now()}`;
    const mailContent = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `Date: ${date}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      '',
      btoa(unescape(encodeURIComponent(htmlContent))),
      `--${boundary}--`,
      '.',
    ].join('\r\n');

    await writer.write(encoder.encode(mailContent + '\r\n'));
    const sendResp = await readResponse();
    if (!sendResp.startsWith('250')) {
      await socket.close();
      return { success: false, message: `邮件发送失败: ${sendResp.substring(0, 100)}` };
    }

    // QUIT
    await sendCommand('QUIT');
    await socket.close();

    return { success: true, message: '邮件发送成功' };
  } catch (e) {
    return { success: false, message: `SMTP 连接失败: ${String(e)}` };
  }
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
    return errorResponse('SMTP 未配置，请先配置 SMTP 服务器信息');
  }

  // 先验证 SMTP 配置
  const verification = await verifySmtpConfig(config);
  if (!verification.valid) {
    return errorResponse(`SMTP 配置验证失败: ${verification.message}`);
  }

  // 优先尝试通过 SMTP 直接发送
  const smtpResult = await sendViaSmtp(config, body.to, body.subject, body.content);
  if (smtpResult.success) {
    return successResponse({
      method: 'smtp',
      smtp_host: config.smtp_host,
      smtp_port: config.smtp_port,
    }, smtpResult.message);
  }

  // SMTP 发送失败时，回退到 MailChannels API
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
      return successResponse({
        method: 'mailchannels',
        smtp_error: smtpResult.message,
        note: 'SMTP 发送失败，已通过备用通道发送。请检查 SMTP 配置。',
      }, '邮件发送成功（通过备用通道）');
    }
    const text = await resp.text();
    return errorResponse(`邮件发送失败: SMTP 错误: ${smtpResult.message}; 备用通道错误: ${resp.status} ${text}`);
  } catch (e) {
    return errorResponse(`邮件发送失败: SMTP 错误: ${smtpResult.message}; 备用通道错误: ${String(e)}`);
  }
}

// 验证 SMTP 配置 (供前端调用)
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

  const result = await verifySmtpConfig(config);
  return successResponse({
    valid: result.valid,
    message: result.message,
    config: {
      host: config.smtp_host || '',
      port: config.smtp_port || '',
      user: config.smtp_user || '',
      from: config.smtp_from || '',
      has_password: !!config.smtp_pass,
    },
  });
}
