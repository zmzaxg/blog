// 工具函数

export function jsonResponse<T>(data: T, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      ...init.headers,
    },
  });
}

export function successResponse<T>(data?: T, message = 'ok'): Response {
  return jsonResponse({ success: true, message, data });
}

export function errorResponse(message: string, status = 400, error?: string): Response {
  return jsonResponse(
    { success: false, message, error: error || message },
    { status }
  );
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number
): Response {
  const totalPages = Math.ceil(total / pageSize);
  return jsonResponse({
    success: true,
    data,
    total,
    page,
    page_size: pageSize,
    total_pages: totalPages,
  });
}

export async function parseBody<T>(request: Request): Promise<T | null> {
  try {
    const text = await request.text();
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function getQueryParam(url: string, key: string): string | null {
  const u = new URL(url);
  return u.searchParams.get(key);
}

export function getPagination(url: string): { page: number; pageSize: number; offset: number } {
  const u = new URL(url);
  const page = Math.max(1, parseInt(u.searchParams.get('page') || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(u.searchParams.get('page_size') || '20', 10)));
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset };
}

// 简单的 slug 生成
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 100) || `post-${Date.now()}`;
}

// 生成随机 ID
export function generateId(prefix = ''): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// 生成 6 位数字验证码
export function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 简单 Markdown 渲染 (基础版，生产环境建议用 marked/markdown-it)
export function renderMarkdown(md: string): string {
  let html = md
    // 转义 HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 标题
  html = html.replace(/^###### (.*)$/gm, '<h6>$1</h6>');
  html = html.replace(/^##### (.*)$/gm, '<h5>$1</h5>');
  html = html.replace(/^#### (.*)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.*)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*)$/gm, '<h1>$1</h1>');

  // 粗体
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // 斜体
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // 代码行
  html = html.replace(/`(.+?)`/g, '<code>$1</code>');
  // 链接
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  // 图片
  html = html.replace(/!\[(.+?)\]\((.+?)\)/g, '<img src="$2" alt="$1" loading="lazy" />');

  // 代码块
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="lang-$1">$2</code></pre>');

  // 引用
  html = html.replace(/^> (.*)$/gm, '<blockquote>$1</blockquote>');

  // 无序列表
  html = html.replace(/^[-*] (.*)$/gm, '<li>$1</li>');
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

  // 有序列表
  html = html.replace(/^\d+\. (.*)$/gm, '<li>$1</li>');

  // 段落
  html = html.replace(/\n{2,}/g, '</p><p>');
  html = `<p>${html}</p>`;
  html = html.replace(/<p><h/g, '<h');
  html = html.replace(/<\/h\d><\/p>/g, (m) => m.replace('</p>', ''));

  // 换行
  html = html.replace(/\n/g, '<br />');

  return html;
}

// 存储 key 生成: userId_function_timestamp
export function generateStorageKey(
  userId: number | string,
  functionName: string,
  timestamp?: number
): string {
  const ts = timestamp || Date.now();
  return `${userId}_${functionName}_${ts}.md`;
}

// 从存储 key 解析信息
export function parseStorageKey(key: string): {
  userId: string;
  functionName: string;
  timestamp: number;
} | null {
  const match = key.match(/^(\w+)_(\w+)_(\d+)\.md$/);
  if (!match) return null;
  return {
    userId: match[1],
    functionName: match[2],
    timestamp: parseInt(match[3], 10),
  };
}
