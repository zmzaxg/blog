// 用户认证路由
import { hashPassword, verifyPassword, signJwt } from '../lib/jwt';
import {
  successResponse,
  errorResponse,
  parseBody,
  generateCode,
} from '../lib/utils';
import { authMiddleware, requireAuth } from '../middleware/auth';
import type { Env } from '../types';

interface RegisterBody {
  username: string;
  email: string;
  password: string;
  nickname?: string;
  code?: string;
}

interface LoginBody {
  username?: string;
  email?: string;
  password: string;
}

interface SendCodeBody {
  email: string;
  type: 'register' | 'login' | 'reset_password' | 'comment';
}

// 发送验证码
export async function sendCodeHandler(request: Request, env: Env): Promise<Response> {
  const body = await parseBody<SendCodeBody>(request);
  if (!body || !body.email || !body.type) {
    return errorResponse('邮箱和类型不能为空');
  }

  // 检查频率限制
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
  const recent = await env.DB.prepare(
    'SELECT COUNT(*) as cnt FROM verification_codes WHERE target_value = ? AND type = ? AND created_at > ?'
  )
    .bind(body.email, body.type, oneMinuteAgo)
    .first<{ cnt: number }>();

  if (recent && recent.cnt >= 3) {
    return errorResponse('发送过于频繁，请稍后再试', 429);
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  await env.DB.prepare(
    'INSERT INTO verification_codes (code, target, target_value, type, expires_at) VALUES (?, ?, ?, ?, ?)'
  )
    .bind(code, 'email', body.email, body.type, expiresAt)
    .run();

  // TODO: 实际发送邮件 (SMTP / MailChannels)
  // 开发环境下直接返回 code，生产环境应隐藏
  const isDev = !env.SITE_NAME?.includes('prod');

  return successResponse(
    isDev ? { code, expires_at: expiresAt } : { expires_at: expiresAt },
    '验证码已发送'
  );
}

// 注册
export async function registerHandler(request: Request, env: Env): Promise<Response> {
  const body = await parseBody<RegisterBody>(request);
  if (!body) return errorResponse('无效的请求数据');

  const { username, email, password, nickname, code } = body;

  if (!username || !email || !password) {
    return errorResponse('用户名、邮箱和密码不能为空');
  }

  if (username.length < 3 || username.length > 20) {
    return errorResponse('用户名长度需在 3-20 个字符之间');
  }

  if (password.length < 6) {
    return errorResponse('密码至少 6 位');
  }

  // 邮箱格式校验
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return errorResponse('邮箱格式不正确');
  }

  // 检查是否需要邮箱验证码
  const settings = await env.DB.prepare(
    "SELECT value FROM settings WHERE key = 'email_verification_required'"
  ).first<{ value: string }>();

  if (settings?.value === 'true' && !code) {
    return errorResponse('请输入邮箱验证码');
  }

  if (settings?.value === 'true' && code) {
    const valid = await env.DB.prepare(
      "SELECT id FROM verification_codes WHERE target_value = ? AND type = 'register' AND code = ? AND used = 0 AND expires_at > datetime('now')"
    )
      .bind(email, code)
      .first<{ id: number }>();

    if (!valid) {
      return errorResponse('验证码无效或已过期');
    }

    await env.DB.prepare('UPDATE verification_codes SET used = 1 WHERE id = ?')
      .bind(valid.id)
      .run();
  }

  // 检查用户名是否已存在
  const existingUser = await env.DB.prepare(
    'SELECT id FROM users WHERE username = ? OR email = ?'
  )
    .bind(username, email)
    .first<{ id: number }>();

  if (existingUser) {
    return errorResponse('用户名或邮箱已被注册');
  }

  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();

  // 检查是否是第一个用户（自动设为管理员）
  const userCount = await env.DB.prepare('SELECT COUNT(*) as cnt FROM users').first<{
    cnt: number;
  }>();
  const role = userCount && userCount.cnt === 0 ? 'admin' : 'member';

  const result = await env.DB.prepare(
    'INSERT INTO users (username, email, password_hash, nickname, role, email_verified, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  )
    .bind(
      username,
      email,
      passwordHash,
      nickname || username,
      role,
      settings?.value === 'true' ? 1 : 0,
      now,
      now
    )
    .run();

  const userId = result.meta.last_row_id as number;

  // 生成 token
  const token = await signJwt({ userId, username }, env.JWT_SECRET);

  return successResponse(
    {
      token,
      user: {
        id: userId,
        username,
        nickname: nickname || username,
        avatar: null,
        role,
      },
    },
    '注册成功'
  );
}

// 登录
export async function loginHandler(request: Request, env: Env): Promise<Response> {
  const body = await parseBody<LoginBody>(request);
  if (!body) return errorResponse('无效的请求数据');

  const { username, email, password } = body;
  const identifier = username || email;

  if (!identifier || !password) {
    return errorResponse('账号和密码不能为空');
  }

  const user = await env.DB.prepare(
    'SELECT * FROM users WHERE username = ? OR email = ?'
  )
    .bind(identifier, identifier)
    .first();

  if (!user) {
    return errorResponse('账号或密码错误');
  }

  const u = user as { id: number; password_hash: string; status: string };

  if (u.status === 'banned') {
    return errorResponse('账号已被封禁', 403);
  }

  const valid = await verifyPassword(password, u.password_hash);
  if (!valid) {
    return errorResponse('账号或密码错误');
  }

  // 更新最后登录时间
  await env.DB.prepare('UPDATE users SET last_login_at = datetime(\"now\") WHERE id = ?')
    .bind(u.id)
    .run();

  const token = await signJwt({ userId: u.id }, env.JWT_SECRET);

  const userData = user as {
    id: number;
    username: string;
    nickname: string | null;
    avatar: string | null;
    bio: string | null;
    role: string;
  };

  return successResponse(
    {
      token,
      user: {
        id: userData.id,
        username: userData.username,
        nickname: userData.nickname,
        avatar: userData.avatar,
        bio: userData.bio,
        role: userData.role,
      },
    },
    '登录成功'
  );
}

// 获取当前用户信息
export async function meHandler(request: Request, env: Env): Promise<Response> {
  const auth = await authMiddleware(request, env);
  const err = requireAuth(auth);
  if (err) return err;

  return successResponse(auth.user);
}

// 修改密码
export async function changePasswordHandler(
  request: Request,
  env: Env
): Promise<Response> {
  const auth = await authMiddleware(request, env);
  const err = requireAuth(auth);
  if (err) return err;

  const body = await parseBody<{ old_password: string; new_password: string }>(request);
  if (!body?.old_password || !body?.new_password) {
    return errorResponse('旧密码和新密码不能为空');
  }

  if (body.new_password.length < 6) {
    return errorResponse('新密码至少 6 位');
  }

  const user = await env.DB.prepare('SELECT password_hash FROM users WHERE id = ?')
    .bind(auth.userId)
    .first<{ password_hash: string }>();

  if (!user) return errorResponse('用户不存在', 404);

  const valid = await verifyPassword(body.old_password, user.password_hash);
  if (!valid) {
    return errorResponse('旧密码错误');
  }

  const newHash = await hashPassword(body.new_password);
  await env.DB.prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\"now\") WHERE id = ?')
    .bind(newHash, auth.userId)
    .run();

  return successResponse(null, '密码修改成功');
}

// 更新用户资料
export async function updateProfileHandler(
  request: Request,
  env: Env
): Promise<Response> {
  const auth = await authMiddleware(request, env);
  const err = requireAuth(auth);
  if (err) return err;

  const body = await parseBody<{ nickname?: string; bio?: string; avatar?: string }>(request);
  if (!body) return errorResponse('无效的请求数据');

  const fields: string[] = [];
  const values: (string | number)[] = [];

  if (body.nickname !== undefined) {
    fields.push('nickname = ?');
    values.push(body.nickname);
  }
  if (body.bio !== undefined) {
    fields.push('bio = ?');
    values.push(body.bio);
  }
  if (body.avatar !== undefined) {
    fields.push('avatar = ?');
    values.push(body.avatar);
  }

  if (fields.length === 0) {
    return errorResponse('没有要更新的字段');
  }

  fields.push('updated_at = datetime(\"now\")');
  values.push(auth.userId!);

  await env.DB.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  // 返回更新后的用户
  const updated = await env.DB.prepare(
    'SELECT id, username, nickname, avatar, bio, role, created_at FROM users WHERE id = ?'
  )
    .bind(auth.userId)
    .first();

  return successResponse(updated, '资料更新成功');
}
