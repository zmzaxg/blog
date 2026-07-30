// 文章路由
import {
  successResponse,
  errorResponse,
  paginatedResponse,
  parseBody,
  getPagination,
  getQueryParam,
  generateSlug,
  renderMarkdown,
} from '../lib/utils';
import { authMiddleware, requireAuth, requireEditor } from '../middleware/auth';
import type { Env, Post } from '../types';

interface CreatePostBody {
  title: string;
  content_md: string;
  summary?: string;
  board_id?: number;
  cover_image?: string;
  tags?: string[];
  status?: 'published' | 'draft';
  visibility?: 'public' | 'private' | 'members';
}

interface UpdatePostBody extends Partial<CreatePostBody> {}

// 获取文章列表
export async function listPostsHandler(request: Request, env: Env): Promise<Response> {
  const { page, pageSize, offset } = getPagination(request.url);
  const boardId = getQueryParam(request.url, 'board_id');
  const authorId = getQueryParam(request.url, 'author_id');
  const keyword = getQueryParam(request.url, 'keyword');
  const status = getQueryParam(request.url, 'status') || 'published';

  let whereClause = 'WHERE p.status = ?';
  const params: (string | number)[] = [status];

  if (boardId) {
    whereClause += ' AND p.board_id = ?';
    params.push(parseInt(boardId, 10));
  }
  if (authorId) {
    whereClause += ' AND p.author_id = ?';
    params.push(parseInt(authorId, 10));
  }
  if (keyword) {
    whereClause += ' AND (p.title LIKE ? OR p.summary LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  const countResult = await env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM posts p ${whereClause}`
  )
    .bind(...params)
    .first<{ cnt: number }>();

  const total = countResult?.cnt || 0;

  const posts = await env.DB.prepare(
    `SELECT p.*, 
      u.username as author_username, u.nickname as author_nickname, u.avatar as author_avatar,
      b.name as board_name, b.slug as board_slug
     FROM posts p
     LEFT JOIN users u ON p.author_id = u.id
     LEFT JOIN boards b ON p.board_id = b.id
     ${whereClause}
     ORDER BY p.is_pinned DESC, p.created_at DESC
     LIMIT ? OFFSET ?`
  )
    .bind(...params, pageSize, offset)
    .all();

  const data = (posts.results as Post[]).map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    summary: p.summary,
    cover_image: p.cover_image,
    board_id: p.board_id,
    board_name: (p as unknown as { board_name: string }).board_name,
    board_slug: (p as unknown as { board_slug: string }).board_slug,
    author_id: p.author_id,
    author_username: (p as unknown as { author_username: string }).author_username,
    author_nickname: (p as unknown as { author_nickname: string }).author_nickname,
    author_avatar: (p as unknown as { author_avatar: string | null }).author_avatar,
    status: p.status,
    visibility: p.visibility,
    is_pinned: p.is_pinned,
    is_featured: p.is_featured,
    view_count: p.view_count,
    like_count: p.like_count,
    comment_count: p.comment_count,
    tags: p.tags ? JSON.parse(p.tags) : [],
    created_at: p.created_at,
    updated_at: p.updated_at,
  }));

  return paginatedResponse(data, total, page, pageSize);
}

// 获取单篇文章
export async function getPostHandler(request: Request, env: Env, id: string): Promise<Response> {
  const post = await env.DB.prepare(
    `SELECT p.*,
      u.username as author_username, u.nickname as author_nickname, u.avatar as author_avatar, u.bio as author_bio,
      b.name as board_name, b.slug as board_slug
     FROM posts p
     LEFT JOIN users u ON p.author_id = u.id
     LEFT JOIN boards b ON p.board_id = b.id
     WHERE p.id = ? AND p.status != 'deleted'`
  )
    .bind(parseInt(id, 10))
    .first();

  if (!post) {
    return errorResponse('文章不存在', 404);
  }

  const p = post as Post & {
    author_username: string;
    author_nickname: string | null;
    author_avatar: string | null;
    author_bio: string | null;
    board_name: string | null;
    board_slug: string | null;
  };

  // 增加浏览量
  await env.DB.prepare('UPDATE posts SET view_count = view_count + 1 WHERE id = ?')
    .bind(p.id)
    .run();

  return successResponse({
    id: p.id,
    title: p.title,
    slug: p.slug,
    summary: p.summary,
    content_md: p.content_md,
    content_html: p.content_html,
    cover_image: p.cover_image,
    board_id: p.board_id,
    board_name: p.board_name,
    board_slug: p.board_slug,
    author: {
      id: p.author_id,
      username: p.author_username,
      nickname: p.author_nickname,
      avatar: p.author_avatar,
      bio: p.author_bio,
    },
    status: p.status,
    visibility: p.visibility,
    is_pinned: p.is_pinned,
    is_featured: p.is_featured,
    view_count: p.view_count + 1,
    like_count: p.like_count,
    comment_count: p.comment_count,
    tags: p.tags ? JSON.parse(p.tags) : [],
    created_at: p.created_at,
    updated_at: p.updated_at,
  });
}

// 创建文章
export async function createPostHandler(request: Request, env: Env): Promise<Response> {
  const auth = await authMiddleware(request, env);
  const err = requireAuth(auth);
  if (err) return err;

  const body = await parseBody<CreatePostBody>(request);
  if (!body || !body.title || !body.content_md) {
    return errorResponse('标题和内容不能为空');
  }

  if (body.title.length > 200) {
    return errorResponse('标题不能超过 200 字');
  }

  const contentHtml = renderMarkdown(body.content_md);
  const summary = body.summary || body.content_md.slice(0, 150).replace(/[#*`>\-]/g, '').trim();
  const slug = generateSlug(body.title);
  const tags = body.tags ? JSON.stringify(body.tags) : null;
  const status = body.status || 'published';
  const visibility = body.visibility || 'public';

  const now = new Date().toISOString();

  const result = await env.DB.prepare(
    `INSERT INTO posts 
     (title, slug, summary, content_md, content_html, cover_image, board_id, author_id, 
      status, visibility, tags, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      body.title,
      slug,
      summary,
      body.content_md,
      contentHtml,
      body.cover_image || null,
      body.board_id || null,
      auth.userId,
      status,
      visibility,
      tags,
      now,
      now
    )
    .run();

  const postId = result.meta.last_row_id as number;

  // 更新板块计数
  if (body.board_id) {
    await env.DB.prepare('UPDATE boards SET post_count = post_count + 1 WHERE id = ?')
      .bind(body.board_id)
      .run();
  }

  return successResponse({ id: postId, slug }, '发布成功');
}

// 更新文章
export async function updatePostHandler(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  const auth = await authMiddleware(request, env);
  const err = requireAuth(auth);
  if (err) return err;

  const post = await env.DB.prepare('SELECT * FROM posts WHERE id = ?')
    .bind(parseInt(id, 10))
    .first<Post>();

  if (!post) {
    return errorResponse('文章不存在', 404);
  }

  // 只有作者或管理员/编辑可以修改
  if (post.author_id !== auth.userId && !auth.isEditor) {
    return errorResponse('无权修改此文章', 403);
  }

  const body = await parseBody<UpdatePostBody>(request);
  if (!body) return errorResponse('无效的请求数据');

  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (body.title !== undefined) {
    fields.push('title = ?');
    values.push(body.title);
    fields.push('slug = ?');
    values.push(generateSlug(body.title));
  }
  if (body.content_md !== undefined) {
    fields.push('content_md = ?');
    values.push(body.content_md);
    fields.push('content_html = ?');
    values.push(renderMarkdown(body.content_md));
    fields.push('storage_version = storage_version + 1');
  }
  if (body.summary !== undefined) {
    fields.push('summary = ?');
    values.push(body.summary);
  }
  if (body.board_id !== undefined) {
    fields.push('board_id = ?');
    values.push(body.board_id);
  }
  if (body.cover_image !== undefined) {
    fields.push('cover_image = ?');
    values.push(body.cover_image);
  }
  if (body.tags !== undefined) {
    fields.push('tags = ?');
    values.push(JSON.stringify(body.tags));
  }
  if (body.status !== undefined) {
    fields.push('status = ?');
    values.push(body.status);
  }
  if (body.visibility !== undefined) {
    fields.push('visibility = ?');
    values.push(body.visibility);
  }

  if (fields.length === 0) {
    return errorResponse('没有要更新的字段');
  }

  fields.push('updated_at = datetime(\"now\")');
  values.push(parseInt(id, 10));

  await env.DB.prepare(`UPDATE posts SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  return successResponse({ id: parseInt(id, 10) }, '更新成功');
}

// 删除文章
export async function deletePostHandler(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  const auth = await authMiddleware(request, env);
  const err = requireAuth(auth);
  if (err) return err;

  const post = await env.DB.prepare('SELECT * FROM posts WHERE id = ?')
    .bind(parseInt(id, 10))
    .first<Post>();

  if (!post) {
    return errorResponse('文章不存在', 404);
  }

  if (post.author_id !== auth.userId && !auth.isEditor) {
    return errorResponse('无权删除此文章', 403);
  }

  // 软删除
  await env.DB.prepare(
    "UPDATE posts SET status = 'deleted', updated_at = datetime(\"now\") WHERE id = ?"
  )
    .bind(parseInt(id, 10))
    .run();

  // 更新板块计数
  if (post.board_id) {
    await env.DB.prepare('UPDATE boards SET post_count = MAX(0, post_count - 1) WHERE id = ?')
      .bind(post.board_id)
      .run();
  }

  return successResponse(null, '删除成功');
}

// 点赞/取消点赞
export async function toggleLikeHandler(
  request: Request,
  env: Env,
  targetType: string,
  targetId: string
): Promise<Response> {
  const auth = await authMiddleware(request, env);
  const err = requireAuth(auth);
  if (err) return err;

  const targetIdNum = parseInt(targetId, 10);

  // 检查目标是否存在
  if (targetType === 'post') {
    const post = await env.DB.prepare('SELECT id FROM posts WHERE id = ?')
      .bind(targetIdNum)
      .first();
    if (!post) return errorResponse('文章不存在', 404);
  } else if (targetType === 'comment') {
    const comment = await env.DB.prepare('SELECT id FROM comments WHERE id = ?')
      .bind(targetIdNum)
      .first();
    if (!comment) return errorResponse('评论不存在', 404);
  } else {
    return errorResponse('无效的目标类型');
  }

  const existing = await env.DB.prepare(
    'SELECT id FROM likes WHERE user_id = ? AND target_type = ? AND target_id = ?'
  )
    .bind(auth.userId, targetType, targetIdNum)
    .first<{ id: number }>();

  let liked: boolean;
  if (existing) {
    // 取消点赞
    await env.DB.prepare('DELETE FROM likes WHERE id = ?').bind(existing.id).run();
    liked = false;
  } else {
    // 点赞
    await env.DB.prepare(
      'INSERT INTO likes (user_id, target_type, target_id) VALUES (?, ?, ?)'
    )
      .bind(auth.userId, targetType, targetIdNum)
      .run();
    liked = true;
  }

  // 更新计数
  const table = targetType === 'post' ? 'posts' : 'comments';
  const delta = liked ? 1 : -1;
  await env.DB.prepare(
    `UPDATE ${table} SET like_count = MAX(0, like_count + ?) WHERE id = ?`
  )
    .bind(delta, targetIdNum)
    .run();

  return successResponse({ liked }, liked ? '点赞成功' : '已取消点赞');
}
