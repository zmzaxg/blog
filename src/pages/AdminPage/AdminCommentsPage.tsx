import { useState, useEffect, useCallback } from 'react';
import { Search, Check, X, Trash2, MoreHorizontal, Loader2 } from 'lucide-react';
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
import { adminApi, commentApi } from '@/lib/api';
import type { IComment } from '@/data/blog';
import { toast } from 'sonner';

export default function AdminCommentsPage() {
  const [comments, setComments] = useState<IComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('all');
  const [activeTab, setActiveTab] = useState<'all' | 'pending'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pendingCount, setPendingCount] = useState(0);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'pending') {
        const res = await adminApi.pendingComments({ page, page_size: 20 });
        if (res.success) {
          setComments((res.data as unknown as IComment[]) || []);
          setTotalPages(res.total_pages || 1);
        }
      } else {
        // 获取所有评论
        const params: Record<string, unknown> = { page, page_size: 20 };
        if (status !== 'all') params.status = status;
        if (keyword) params.keyword = keyword;
        const res = await adminApi.allComments(params);
        if (res.success) {
          setComments((res.data as unknown as IComment[]) || []);
          setTotalPages(res.total_pages || 1);
        }
      }

      // 获取待审核数量
      const statsRes = await adminApi.stats();
      if (statsRes.success && statsRes.data) {
        setPendingCount((statsRes.data as Record<string, unknown>).pending_comments as number || 0);
      }
    } catch {
      toast.error('加载评论失败');
    } finally {
      setLoading(false);
    }
  }, [page, activeTab, status, keyword]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleModerate = async (id: number, newStatus: string) => {
    try {
      const res = await commentApi.moderate(id, newStatus);
      if (res.success) {
        toast.success('操作成功');
        fetchComments();
      } else {
        toast.error(res.message || '操作失败');
      }
    } catch {
      toast.error('操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await commentApi.delete(id);
      if (res.success) {
        toast.success('删除成功');
        fetchComments();
      } else {
        toast.error(res.message || '删除失败');
      }
    } catch {
      toast.error('删除失败');
    }
  };

  const statusColor: Record<string, string> = {
    approved: 'bg-green-500/20 text-green-500',
    pending: 'bg-yellow-500/20 text-yellow-500',
    spam: 'bg-red-500/20 text-red-500',
    deleted: 'bg-gray-500/20 text-gray-500',
  };

  const statusLabel: Record<string, string> = {
    approved: '已通过',
    pending: '待审核',
    spam: '垃圾',
    deleted: '已删除',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 overflow-x-hidden">
      {/* 操作栏 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="搜索评论..."
              value={keyword}
              onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
              className="h-9 pl-9 text-sm"
            />
          </div>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="approved">已通过</SelectItem>
              <SelectItem value="pending">待审核</SelectItem>
              <SelectItem value="spam">垃圾</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tab */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === 'all' ? 'default' : 'outline'}
          size="sm"
          className="h-8 text-xs"
          onClick={() => { setActiveTab('all'); setPage(1); }}
        >
          全部
        </Button>
        <Button
          variant={activeTab === 'pending' ? 'default' : 'outline'}
          size="sm"
          className="h-8 gap-1 text-xs"
          onClick={() => { setActiveTab('pending'); setPage(1); }}
        >
          待审核
          {pendingCount > 0 && (
            <Badge className="h-4 bg-red-500 px-1 text-[10px]">{pendingCount}</Badge>
          )}
        </Button>
      </div>

      {/* 列表 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            评论列表 <span className="text-sm font-normal text-muted-foreground">({comments.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">内容</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">作者</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">文章</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">状态</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">时间</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {comments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      暂无评论
                    </td>
                  </tr>
                ) : (
                  comments.map((comment) => (
                    <tr key={comment.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="max-w-[300px]">
                          <div className="line-clamp-2">{comment.content_md}</div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {comment.author?.nickname || comment.author?.username || '匿名'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        文章 #{comment.post_id}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <Badge className={`text-[10px] font-normal ${statusColor[comment.status] || ''}`}>
                          {statusLabel[comment.status] || comment.status}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                        {new Date(comment.created_at).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {comment.status === 'pending' && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-green-500"
                                onClick={() => handleModerate(comment.id, 'approved')}
                                title="通过"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500"
                                onClick={() => handleModerate(comment.id, 'spam')}
                                title="标记垃圾"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {comment.status !== 'approved' && (
                                <DropdownMenuItem onClick={() => handleModerate(comment.id, 'approved')}>
                                  <Check className="mr-2 h-4 w-4" />
                                  设为通过
                                </DropdownMenuItem>
                              )}
                              {comment.status !== 'spam' && (
                                <DropdownMenuItem onClick={() => handleModerate(comment.id, 'spam')}>
                                  <X className="mr-2 h-4 w-4" />
                                  标记垃圾
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => handleDelete(comment.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                删除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 border-t border-border px-4 py-3">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                上一页
              </Button>
              <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                下一页
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
