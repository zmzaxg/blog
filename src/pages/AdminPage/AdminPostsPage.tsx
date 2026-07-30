import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
  Filter,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { postApi } from '@/lib/api';
import { toast } from 'sonner';
import type { IPost } from '@/data/blog';

export default function AdminPostsPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<IPost[]>([]);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = { page, page_size: 20 };
      if (keyword) params.keyword = keyword;
      if (status !== 'all') params.status = status;

      const res = await postApi.list(params);
      if (res.success) {
        setPosts((res.data as unknown as IPost[]) || []);
        setTotalPages(res.total_pages || 1);
        setTotal(res.total || 0);
      } else {
        setError(res.message || '加载失败');
      }
    } catch {
      setError('网络请求失败');
    } finally {
      setLoading(false);
    }
  }, [page, keyword, status]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // 搜索防抖
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setKeyword(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      const res = await postApi.delete(id);
      if (res.success) {
        setPosts(posts.filter((p) => p.id !== id));
        setTotal((prev) => prev - 1);
        toast.success('删除成功');
      } else {
        toast.error(res.message || '删除失败');
      }
    } catch {
      toast.error('删除失败');
    } finally {
      setDeletingId(null);
    }
  };

  const statusColor: Record<string, string> = {
    published: 'bg-green-500/20 text-green-500',
    draft: 'bg-yellow-500/20 text-yellow-500',
    pending: 'bg-blue-500/20 text-blue-500',
    deleted: 'bg-red-500/20 text-red-500',
  };

  const statusLabel: Record<string, string> = {
    published: '已发布',
    draft: '草稿',
    pending: '待审核',
    deleted: '已删除',
  };

  return (
    <div className="space-y-4">
      {/* 操作栏 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="搜索文章..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-9 pl-9 text-sm"
            />
          </div>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-28 text-xs">
              <Filter className="mr-1 h-3.5 w-3.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="published">已发布</SelectItem>
              <SelectItem value="draft">草稿</SelectItem>
              <SelectItem value="pending">待审核</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" className="h-9 gap-1" onClick={() => navigate('/post/create')}>
          <Plus className="h-4 w-4" />
          新建文章
        </Button>
      </div>

      {/* 列表 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            文章列表 <span className="text-sm font-normal text-muted-foreground">({total})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="py-12 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={fetchPosts}>
                重试
              </Button>
            </div>
          ) : (
            <>
              <div className="w-full overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
                      <th className="whitespace-nowrap px-4 py-2.5 font-medium">标题</th>
                      <th className="whitespace-nowrap px-4 py-2.5 font-medium">作者</th>
                      <th className="whitespace-nowrap px-4 py-2.5 font-medium">板块</th>
                      <th className="whitespace-nowrap px-4 py-2.5 font-medium">状态</th>
                      <th className="whitespace-nowrap px-4 py-2.5 font-medium">浏览/评论</th>
                      <th className="whitespace-nowrap px-4 py-2.5 font-medium">发布时间</th>
                      <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posts.map((post) => (
                      <tr key={post.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="max-w-[240px]">
                            <div className="truncate font-medium">{post.title}</div>
                            <div className="truncate text-xs text-muted-foreground">
                              {post.summary}
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {post.author_nickname || post.author_username}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {post.board_name || '-'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <Badge className={`text-[10px] font-normal ${statusColor[post.status] || ''}`}>
                            {statusLabel[post.status] || post.status}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {post.view_count} / {post.comment_count}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                          {new Date(post.created_at).toLocaleDateString('zh-CN')}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/post/${post.id}`)}>
                                <Eye className="mr-2 h-4 w-4" />
                                查看
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/post/${post.id}/edit`)}>
                                <Edit className="mr-2 h-4 w-4" />
                                编辑
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(post.id)}
                                className="text-destructive"
                                disabled={deletingId === post.id}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {deletingId === post.id ? '删除中...' : '删除'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {posts.length === 0 && (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  暂无文章
                </div>
              )}

              {/* 分页 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 border-t border-border px-4 py-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    上一页
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    下一页
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
