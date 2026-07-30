import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Bell, User, MessageCircle, Heart, Eye, Pin, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MOCK_POSTS, MOCK_BOARDS, type IPost } from '@/data/blog';
import { useAuth } from '@/context/AuthContext';
import { Image } from '@/components/ui/image';

export default function HomePage() {
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuth();
  const [keyword, setKeyword] = useState('');
  const [activeBoard, setActiveBoard] = useState<number | 'all'>('all');
  const [posts, setPosts] = useState<IPost[]>(MOCK_POSTS);

  const filteredPosts = posts.filter((post) => {
    const matchBoard = activeBoard === 'all' || post.board_id === activeBoard;
    const matchKeyword =
      !keyword ||
      post.title.toLowerCase().includes(keyword.toLowerCase()) ||
      post.summary?.toLowerCase().includes(keyword.toLowerCase());
    return matchBoard && post.status === 'published';
  });

  // 置顶帖
  const pinnedPosts = filteredPosts.filter((p) => p.is_pinned === 1);
  const normalPosts = filteredPosts.filter((p) => p.is_pinned === 0);

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
            <TabsTrigger value="all" className="h-7 text-xs" onClick={() => setActiveBoard('all')}>
              全部
            </TabsTrigger>
            {MOCK_BOARDS.map((board) => (
              <TabsTrigger
                key={board.id}
                value={board.slug}
                className="h-7 whitespace-nowrap text-xs"
                onClick={() => setActiveBoard(board.id)}
              >
                {board.icon} {board.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* 置顶帖 */}
      {pinnedPosts.length > 0 && (
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
      <div className="space-y-3 px-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">最新文章</h2>
          <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">
            查看全部 <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        {normalPosts.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            暂无相关文章
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
      </div>
    </div>
  );
}
