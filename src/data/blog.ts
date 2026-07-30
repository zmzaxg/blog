// EXPORTS: IPost, IComment, IBoard, IUser, INotification, IStorageConfig, ISettings, MOCK_POSTS, MOCK_COMMENTS, MOCK_BOARDS, MOCK_USER

export interface IUser {
  id: number;
  username: string;
  nickname: string | null;
  avatar: string | null;
  bio: string | null;
  role: 'admin' | 'editor' | 'member' | 'banned';
  email?: string;
  is_builtin?: boolean;
  created_at: string;
}

export interface IBoard {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  post_count: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface IPost {
  id: number;
  title: string;
  slug: string | null;
  summary: string | null;
  content_md: string;
  content_html?: string;
  cover_image: string | null;
  board_id: number | null;
  board_name?: string | null;
  board_slug?: string | null;
  author_id: number;
  author_username?: string;
  author_nickname?: string | null;
  author_avatar?: string | null;
  author?: IUser;
  status: string;
  visibility: string;
  is_pinned: number;
  is_featured: number;
  view_count: number;
  like_count: number;
  comment_count: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface IComment {
  id: number;
  post_id: number;
  author_id: number;
  parent_id: number | null;
  content_md: string;
  content_html?: string;
  status: string;
  like_count: number;
  author?: IUser;
  created_at: string;
  updated_at: string;
}

export interface INotification {
  id: number;
  type: string;
  target_type: string | null;
  target_id: number | null;
  title: string;
  content: string | null;
  is_read: number;
  created_at: string;
}

export interface IStorageConfig {
  id: number;
  name: string;
  type: string;
  is_default: number;
  status: string;
  created_at: string;
}

export interface ISettings {
  site_name: string;
  site_description: string;
  registration_enabled: string;
  comment_requires_approval: string;
  comment_requires_login: string;
  email_verification_required: string;
  [key: string]: string;
}

export const MOCK_USER: IUser = {
  id: 1,
  username: 'admin',
  nickname: '管理员',
  avatar: null,
  bio: '社区管理员',
  role: 'admin',
  created_at: '2024-01-01T00:00:00Z',
};

export const MOCK_BOARDS: IBoard[] = [
  { id: 1, slug: 'announcement', name: '公告', description: '社区公告与规则', icon: '📢', sort_order: 1, post_count: 2, status: 'active', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: 2, slug: 'tech', name: '技术交流', description: '技术讨论与分享', icon: '💻', sort_order: 2, post_count: 5, status: 'active', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: 3, slug: 'life', name: '生活随笔', description: '日常生活记录', icon: '🌱', sort_order: 3, post_count: 3, status: 'active', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: 4, slug: 'creative', name: '创作分享', description: '原创作品展示', icon: '🎨', sort_order: 4, post_count: 2, status: 'active', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
];

export const MOCK_POSTS: IPost[] = [
  {
    id: 1,
    title: '欢迎来到轻社区博客系统',
    slug: 'welcome-to-light-community',
    summary: '这是一个基于 Cloudflare Worker + D1 构建的轻量级社区博客系统，支持文章发布、评论、板块管理、权限系统等功能。',
    content_md: `# 欢迎来到轻社区博客系统

## 系统特性

- **高性能**: 基于 Cloudflare Worker 边缘计算，全球访问快速
- **轻量级**: D1 数据库 + Markdown 存储，简洁高效
- **完整功能**: 文章管理、评论系统、板块管理、用户权限
- **可扩展**: 支持插件系统和主题切换
- **存储优化**: 支持 WebDAV 外部存储，节省数据库空间

## 快速开始

1. 注册一个账号
2. 浏览各个板块
3. 发布你的第一篇文章
4. 参与社区讨论

> 享受写作和分享的乐趣吧！`,
    cover_image: null,
    board_id: 1,
    board_name: '公告',
    board_slug: 'announcement',
    author_id: 1,
    author_username: 'admin',
    author_nickname: '管理员',
    author_avatar: null,
    status: 'published',
    visibility: 'public',
    is_pinned: 1,
    is_featured: 1,
    view_count: 128,
    like_count: 24,
    comment_count: 3,
    tags: ['公告', '欢迎'],
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  },
  {
    id: 2,
    title: 'Cloudflare Worker 开发最佳实践',
    slug: 'cloudflare-worker-best-practices',
    summary: '分享一些 Cloudflare Worker 开发中的经验和技巧，包括性能优化、错误处理、调试方法等。',
    content_md: `# Cloudflare Worker 开发最佳实践

## 1. 使用 ES Modules 格式

Worker 推荐使用 ES Modules 格式，这样可以更好地进行 tree-shaking 和代码分割。

## 2. 数据库操作优化

- 使用批量操作减少请求次数
- 合理使用索引
- 避免 N+1 查询问题

## 3. 缓存策略

利用 Cache API 和 KV 缓存热点数据，提升响应速度。

## 4. 错误处理

\`\`\`javascript
try {
  // 业务逻辑
} catch (error) {
  console.error('Error:', error);
  return new Response('Internal Server Error', { status: 500 });
}
\`\`\`

希望这些技巧对你有帮助！`,
    cover_image: null,
    board_id: 2,
    board_name: '技术交流',
    board_slug: 'tech',
    author_id: 1,
    author_username: 'admin',
    author_nickname: '管理员',
    author_avatar: null,
    status: 'published',
    visibility: 'public',
    is_pinned: 0,
    is_featured: 0,
    view_count: 89,
    like_count: 15,
    comment_count: 2,
    tags: ['Cloudflare', 'Worker', '最佳实践'],
    created_at: '2024-01-20T14:30:00Z',
    updated_at: '2024-01-22T09:15:00Z',
  },
  {
    id: 3,
    title: '我的 2024 年度目标',
    slug: 'my-2024-goals',
    summary: '新的一年开始了，分享一下我的年度目标和计划。',
    content_md: `# 我的 2024 年度目标

## 技术成长

- [ ] 深入学习 Rust
- [ ] 完成 3 个开源项目
- [ ] 写 50 篇技术博客

## 生活健康

- [ ] 每周运动 3 次
- [ ] 读完 24 本书
- [ ] 去 2 个新城市旅行

## 财务目标

- 增加被动收入
- 学习投资理财

**加油！** 💪`,
    cover_image: null,
    board_id: 3,
    board_name: '生活随笔',
    board_slug: 'life',
    author_id: 1,
    author_username: 'admin',
    author_nickname: '管理员',
    author_avatar: null,
    status: 'published',
    visibility: 'public',
    is_pinned: 0,
    is_featured: 0,
    view_count: 56,
    like_count: 8,
    comment_count: 1,
    tags: ['年度目标', '生活'],
    created_at: '2024-01-10T08:00:00Z',
    updated_at: '2024-01-10T08:00:00Z',
  },
  {
    id: 4,
    title: 'Markdown 写作指南',
    slug: 'markdown-writing-guide',
    summary: '详细介绍 Markdown 的常用语法和写作技巧，帮助你写出排版精美的文章。',
    content_md: `# Markdown 写作指南

## 标题

使用 \`#\` 表示标题，支持 1-6 级。

## 文本格式

- **粗体文字**
- *斜体文字*
- ~~删除线~~
- \`行内代码\`

## 列表

### 无序列表
- 项目一
- 项目二
  - 子项目

### 有序列表
1. 第一步
2. 第二步
3. 第三步

## 引用

> 这是一段引用文字
> 可以有多行

## 代码块

\`\`\`javascript
function hello() {
  console.log('Hello, World!');
}
\`\`\`

## 链接和图片

[链接文字](https://example.com)

## 表格

| 列1 | 列2 | 列3 |
|-----|-----|-----|
| A   | B   | C   |
| D   | E   | F   |

---

掌握这些语法，你就能写出排版精美的文章了！`,
    cover_image: null,
    board_id: 2,
    board_name: '技术交流',
    board_slug: 'tech',
    author_id: 1,
    author_username: 'admin',
    author_nickname: '管理员',
    author_avatar: null,
    status: 'published',
    visibility: 'public',
    is_pinned: 0,
    is_featured: 1,
    view_count: 234,
    like_count: 42,
    comment_count: 5,
    tags: ['Markdown', '写作', '教程'],
    created_at: '2024-01-05T16:00:00Z',
    updated_at: '2024-01-08T11:20:00Z',
  },
];

export const MOCK_COMMENTS: IComment[] = [
  {
    id: 1,
    post_id: 1,
    author_id: 1,
    parent_id: null,
    content_md: '支持！期待更多功能更新 🎉',
    status: 'approved',
    like_count: 3,
    author: MOCK_USER,
    created_at: '2024-01-15T12:00:00Z',
    updated_at: '2024-01-15T12:00:00Z',
  },
  {
    id: 2,
    post_id: 1,
    author_id: 1,
    parent_id: null,
    content_md: '界面很好看，功能也很完整！',
    status: 'approved',
    like_count: 1,
    author: MOCK_USER,
    created_at: '2024-01-16T09:30:00Z',
    updated_at: '2024-01-16T09:30:00Z',
  },
  {
    id: 3,
    post_id: 2,
    author_id: 1,
    parent_id: null,
    content_md: '很实用的分享，学到了很多！',
    status: 'approved',
    like_count: 2,
    author: MOCK_USER,
    created_at: '2024-01-21T10:00:00Z',
    updated_at: '2024-01-21T10:00:00Z',
  },
];
