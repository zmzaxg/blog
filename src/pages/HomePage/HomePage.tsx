import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, User, MessageCircle, Heart, Eye, Pin, ChevronRight, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { postApi, boardApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Image } from '@/components/ui/image';
import type { IPost, IBoard } from '@/data/blog';

export default function HomePage() {
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuth();
  const [keyword, setKeyword] = useState('');
  const [activeBoard, setActiveBoard] = useState<number | 'all'>('all');
  const [posts, setPosts] = useState<IPost[]>([]);
  const [boards, setBoards] = useState<IBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchDebounce, setSearchDebounce] = useState('');

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounce(keyword);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  // 获取板块列表
  useEffect(() => {
    const fetchBoards = async () => {
      try {
        const res = await boardApi.list();
        if (res.success && res.data) {
          setBoards(res.data as unknown as IBoard[]);
        }
      } catch {
        // 板块加载失败不影响文章展示
      }
    };
    fetchBoards();
  }, []);

  // 获取文章列表
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = {
        page,
        page_size: 20,
      };
      if (activeBoard !== 'all') params.board_id = activeBoard;
      if (searchDebounce) params.keyword = searchDebounce;

      const res = await postApi.list(params);
      if (res.success) {
        setPosts((res.data as unknown as IPost[]) || []);
        setTotalPages(res.total_pages || 1);
      } else {
        setError(res.message || '加载失败');
      }
    } catch {
      setError('网络请求失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [page, activeBoard, searchDebounce]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // 置顶帖
  const pinnedPosts = posts.filter((p) => p.is_pinned === 1);
  const normalPosts = posts.filter((p) => p.is_pinned === 0);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-4 pb-4">
      {/* 顶部栏 */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="搜索文章..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="h-10 rounded-full bg-muted pl-9 text-sm"
              />
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-full"
            onClick={() => navigate(isLoggedIn ? '/notifications' : '/login')}
          >
            <Bell className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-full"
            onClick={() => navigate(isLoggedIn ? '/profile' : '/login')}
          >
            {user?.avatar ? (
              <Image src={user.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <User className="h-5 w-5" />
            )}
          </Button>
        </div>
      </header>

      {/* 板块切换 */}
      <div className="px-4">
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="h-9 w-full gap-1 overflow-x-auto bg-muted/50">
            <TabsTrigger value="all" className="h-7 text-xs" onClick={() => { setActiveBoard('all'); setPage(1); }}>
              全部
            </TabsTrigger>
            {boards.map((board) => (
              <TabsTrigger
                key={board.id}
                value={board.slug}
                className="h-7 whitespace-nowrap text-xs"
                onClick={() => { setActiveBoard(board.id); setPage(1); }}
              >
                {board.icon} {board.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="space-y-3 px-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 错误状态 */}
      {error && !loading && (
        <div className="px-4">
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="flex flex-col items-center py-8">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={fetchPosts}>
                重试
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 置顶帖 */}
      {!loading && !error && pinnedPosts.length > 0 && (
        <div className="space-y-2 px-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Pin className="h-4 w-4 text-primary" />
            <span>置顶</span>
          </div>
          {pinnedPosts.map((post) => (
            <Card
              key={post.id}
              className="cursor-pointer border-border/50 bg-card/80 transition-colors hover:bg-card"
              onClick={() => navigate(`/post/${post.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <Pin className="mt-1 h-3.5 w-3.5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-medium text-foreground">{post.title}</h3>
                    <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                      {post.summary}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 文章列表 */}
      {!loading && !error && (
        <div className="space-y-3 px-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">最新文章</h2>
            {totalPages > 1 && (
              <span className="text-xs text-muted-foreground">
                第 {page} / {totalPages} 页
              </span>
            )}
          </div>

          {normalPosts.length === 0 && pinnedPosts.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mb-2 text-4xl">📝</div>
              <p className="text-sm text-muted-foreground">
                {searchDebounce ? '没有找到匹配的文章' : '暂无文章'}
              </p>
              {isLoggedIn && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => navigate('/post/create')}
                >
                  写第一篇文章
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {normalPosts.map((post) => (
                <Card
                  key={post.id}
                  className="cursor-pointer border-border/50 bg-card/80 transition-all hover:bg-card hover:shadow-sm"
                  onClick={() => navigate(`/post/${post.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          {post.board_name && (
                            <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal">
                              {post.board_name}
                            </Badge>
                          )}
                          {post.is_featured === 1 && (
                            <Badge className="h-5 bg-primary/10 px-1.5 text-[10px] font-normal text-primary">
                              精选
                            </Badge>
                          )}
                        </div>
                        <h3 className="line-clamp-2 text-base font-medium leading-snug">
                          {post.title}
                        </h3>
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {post.summary}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {post.author_nickname || post.author_username}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {post.view_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            {post.like_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" />
                            {post.comment_count}
                          </span>
                          <span>{formatDate(post.created_at)}</span>
                        </div>
                      </div>
                      {post.cover_image && (
                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                          <Image
                            src={post.cover_image}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* 分页 */}
          {totalPages > 1 && (
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
      )}
    </div>
  );
}
