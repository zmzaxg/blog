import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Filter, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import PostCard from '@/components/PostCard';
import { postApi, boardApi } from '@/lib/api';
import type { IPost, IBoard } from '@/data/blog';

export default function BoardPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<IPost[]>([]);
  const [board, setBoard] = useState<IBoard | null>(null);
  const [sort, setSort] = useState('latest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchData = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    try {
      // 获取板块信息
      const boardsRes = await boardApi.list();
      if (boardsRes.success && boardsRes.data) {
        const found = (boardsRes.data as unknown as IBoard[]).find((b) => b.slug === slug);
        if (found) {
          setBoard(found);
          // 获取板块文章
          const postsRes = await postApi.list({
            board_id: found.id,
            page,
            page_size: 20,
          });
          if (postsRes.success) {
            setPosts((postsRes.data as unknown as IPost[]) || []);
            setTotalPages(postsRes.total_pages || 1);
          } else {
            setError(postsRes.message || '加载文章失败');
          }
        } else {
          setError('板块不存在');
        }
      } else {
        setError(boardsRes.message || '加载板块信息失败');
      }
    } catch {
      setError('网络请求失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [slug, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-4 pb-4">
      {/* 顶部栏 */}
      <div className="sticky top-0 z-10 -mx-4 bg-background/80 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-base font-semibold">
                {board?.icon} {board?.name || '板块'}
              </h1>
              {board?.description && (
                <p className="text-xs text-muted-foreground">{board.description}</p>
              )}
            </div>
          </div>
          <Button size="sm" className="h-8 gap-1" onClick={() => navigate('/post/create')}>
            <Plus className="h-4 w-4" />
            发帖
          </Button>
        </div>
      </div>

      {/* 统计 */}
      {board && (
        <Card>
          <CardContent className="flex items-center justify-around p-4">
            <div className="text-center">
              <div className="text-lg font-bold">{board.post_count || 0}</div>
              <div className="text-xs text-muted-foreground">帖子</div>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <div className="text-lg font-bold">-</div>
              <div className="text-xs text-muted-foreground">成员</div>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <div className="text-lg font-bold">-</div>
              <div className="text-xs text-muted-foreground">今日新帖</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 筛选 */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">全部帖子</div>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="h-8 w-28 text-xs">
            <Filter className="mr-1 h-3.5 w-3.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="latest">最新发布</SelectItem>
            <SelectItem value="hot">最热讨论</SelectItem>
            <SelectItem value="top">精华优先</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 错误状态 */}
      {error && !loading && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col items-center py-8">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={fetchData}>
              重试
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 文章列表 */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))
        ) : posts.length > 0 ? (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        ) : (
          <div className="py-12 text-center text-sm text-muted-foreground">
            暂无帖子，来发布第一篇吧
          </div>
        )}
      </div>

      {/* 分页 */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
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
    </div>
  );
}
