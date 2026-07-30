// 评论路由
import {
  successResponse,
  errorResponse,
  paginatedResponse,
  parseBody,
  getPagination,
  renderMarkdown,
} from '../lib/utils';
import { authMiddleware, requireAuth, requireEditor } from '../middleware/auth';
import type { Env } from '../types';

interface CreateCommentBody {
  post_id: number;
  content_md: string;
  parent_id?: number;
  code?: string;
}

// 获取评论列表
export async function listCommentsHandler(
  request: Request,
  env: Env
): Promise<Response> {
  const { page, pageSize, offset } = getPagination(request.url);
  const url = new URL(request.url);
  const postId = url.searchParams.get('post_id');
  const status = url.searchParams.get('status') || 'approved';

  if (!postId) {
    return errorResponse('缺少 post_id 参数');
  }

  const countResult = await env.DB.prepare(
    'SELECT COUNT(*) as cnt FROM comments WHERE post_id = ? AND status = ?'
  )
    .bind(parseInt(postId, 10), status)
    .first<{ cnt: number }>();

  const total = countResult?.cnt || 0;

  const comments = await env.DB.prepare(
    `SELECT c.*, u.username, u.nickname, u.avatar
     FROM comments c
     LEFT JOIN users u ON c.author_id = u.id
     WHERE c.post_id = ? AND c.status = ?
     ORDER BY c.created_at ASC
     LIMIT ? OFFSET ?`
  )
    .bind(parseInt(postId, 10), status, pageSize, offset)
    .all();

  const data = comments.results.map((c: Record<string, unknown>) => ({
    id: c.id,
    post_id: c.post_id,
    parent_id: c.parent_id,
    content_md: c.content_md,
    content_html: c.content_html,
    like_count: c.like_count,
    status: c.status,
    created_at: c.created_at,
    author: {
      id: c.author_id,
      username: c.username,
      nickname: c.nickname,
      avatar: c.avatar,
    },
  }));

  return paginatedResponse(data, total, page, pageSize);
}

// 创建评论
export async function createCommentHandler(
  request: Request,
  env: Env
): Promise<Response> {
  const auth = await authMiddleware(request, env);

  // 检查是否需要登录
  const loginRequired = await env.DB.prepare(
    "SELECT value FROM settings WHERE key = 'comment_requires_login'"
  ).first<{ value: string }>();

  if (loginRequired?.value === 'true' && !auth.userId) {
    return errorResponse('请先登录后再评论', 401);
  }

  const body = await parseBody<CreateCommentBody>(request);
  if (!body || !body.post_id || !body.content_md) {
    return errorResponse('文章ID和内容不能为空');
  }

  if (body.content_md.length > 2000) {
    return errorResponse('评论内容不能超过 2000 字');
  }

  // 检查文章是否存在
  const post = await env.DB.prepare('SELECT id, status FROM posts WHERE id = ?')
    .bind(body.post_id)
    .first<{ id: number; status: string }>();

  if (!post || post.status !== 'published') {
    return errorResponse('文章不存在或已下架');
  }

  // 检查是否需要审核
  const approvalSetting = await env.DB.prepare(
    "SELECT value FROM settings WHERE key = 'comment_requires_approval'"
  ).first<{ value: string }>();

  const status = approvalSetting?.value === 'true' ? 'pending' : 'approved';
  const contentHtml = renderMarkdown(body.content_md);

  const now = new Date().toISOString();
  const ip = request.headers.get('CF-Connecting-IP') || null;
  const ua = request.headers.get('User-Agent') || null;

  // 未登录用户需要验证码
  if (!auth.userId) {
    const captchaEnabled = await env.DB.prepare(
      "SELECT value FROM settings WHERE key = 'captcha_enabled'"
    ).first<{ value: string }>();

    if (captchaEnabled?.value === 'true' && !body.code) {
      return errorResponse('请输入验证码');
    }
  }

  const authorId = auth.userId || 0; // 0 表示游客

  const result = await env.DB.prepare(
    `INSERT INTO comments 
     (post_id, author_id, parent_id, content_md, content_html, status, ip_address, user_agent, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      body.post_id,
      authorId,
      body.parent_id || null,
      body.content_md,
      contentHtml,
      status,
      ip,
      ua,
      now,
      now
    )
    .run();

  const commentId = result.meta.last_row_id as number;

  // 更新文章评论计数 (仅审核通过的)
  if (status === 'approved') {
    await env.DB.prepare(
      'UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?'
    )
      .bind(body.post_id)
      .run();
  }

  // 发送通知给文章作者
  if (status === 'approved') {
    const authorResult = await env.DB.prepare(
      'SELECT author_id FROM posts WHERE id = ?'
    )
      .bind(body.post_id)
      .first<{ author_id: number }>();

    if (authorResult && authorResult.author_id !== authorId) {
      await env.DB.prepare(
        `INSERT INTO notifications (user_id, type, target_type, target_id, title, content)
         VALUES (?, 'comment', 'post', ?, ?, ?)`
      )
        .bind(
          authorResult.author_id,
          body.post_id,
          '收到新评论',
          body.content_md.slice(0, 100)
        )
        .run();
    }
  }

  return successResponse(
    {
      id: commentId,
      status,
      message: status === 'pending' ? '评论已提交，等待审核' : '评论成功',
    },
    status === 'pending' ? '评论已提交，等待审核' : '评论成功'
  );
}

// 删除评论
export async function deleteCommentHandler(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  const auth = await authMiddleware(request, env);
  const err = requireAuth(auth);
  if (err) return err;

  const comment = await env.DB.prepare('SELECT * FROM comments WHERE id = ?')
    .bind(parseInt(id, 10))
    .first<{ id: number; author_id: number; post_id: number; status: string }>();

  if (!comment) {
    return errorResponse('评论不存在', 404);
  }

  if (comment.author_id !== auth.userId && !auth.isEditor) {
    return errorResponse('无权删除此评论', 403);
  }

  await env.DB.prepare(
    "UPDATE comments SET status = 'deleted', updated_at = datetime(\"now\") WHERE id = ?"
  )
    .bind(parseInt(id, 10))
    .run();

  // 更新文章计数
  if (comment.status === 'approved') {
    await env.DB.prepare(
      'UPDATE posts SET comment_count = MAX(0, comment_count - 1) WHERE id = ?'
    )
      .bind(comment.post_id)
      .run();
  }

  return successResponse(null, '删除成功');
}

// 审核评论 (管理员)
export async function moderateCommentHandler(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  const auth = await authMiddleware(request, env);
  const err = requireEditor(auth);
  if (err) return err;

  const body = await parseBody<{ status: 'approved' | 'spam' | 'deleted' }>(request);
  if (!body?.status) {
    return errorResponse('状态不能为空');
  }

  const comment = await env.DB.prepare('SELECT * FROM comments WHERE id = ?')
    .bind(parseInt(id, 10))
    .first<{ id: number; post_id: number; status: string }>();

  if (!comment) {
    return errorResponse('评论不存在', 404);
  }

  const wasApproved = comment.status === 'approved';
  const willBeApproved = body.status === 'approved';

  await env.DB.prepare(
    'UPDATE comments SET status = ?, updated_at = datetime(\"now\") WHERE id = ?'
  )
    .bind(body.status, parseInt(id, 10))
    .run();

  // 更新文章计数
  if (wasApproved && !willBeApproved) {
    await env.DB.prepare(
      'UPDATE posts SET comment_count = MAX(0, comment_count - 1) WHERE id = ?'
    )
      .bind(comment.post_id)
      .run();
  } else if (!wasApproved && willBeApproved) {
    await env.DB.prepare(
      'UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?'
    )
      .bind(comment.post_id)
      .run();
  }

  return successResponse(null, '操作成功');
}
