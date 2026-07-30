import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Eye,
  User,
  Send,
  Trash2,
  Edit,
  Loader2,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { postApi, commentApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import type { IPost, IComment } from '@/data/blog';

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isLoggedIn, isAdmin } = useAuth();
  const [post, setPost] = useState<IPost | null>(null);
  const [comments, setComments] = useState<IComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentPage, setCommentPage] = useState(1);
  const [commentTotal, setCommentTotal] = useState(0);

  const fetchPost = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await postApi.get(parseInt(id, 10));
      if (res.success && res.data) {
        const data = res.data as unknown as IPost;
        setPost(data);
        setLikeCount(data.like_count);
      } else {
        setError(res.message || '文章不存在');
      }
    } catch {
      setError('加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchComments = useCallback(async () => {
    if (!id) return;
    try {
      const res = await commentApi.list({
        post_id: parseInt(id, 10),
        page: commentPage,
        page_size: 50,
      });
      if (res.success) {
        setComments((res.data as unknown as IComment[]) || []);
        setCommentTotal(res.total || 0);
      }
    } catch {
      // 评论加载失败不影响文章展示
    }
  }, [id, commentPage]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleLike = async () => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    if (!post) return;
    try {
      const res = await postApi.toggleLike('post', post.id);
      if (res.success && res.data) {
        const isLiked = (res.data as unknown as { liked: boolean }).liked;
        setLiked(isLiked);
        setLikeCount((prev) => (isLiked ? prev + 1 : prev - 1));
      }
    } catch {
      toast.error('操作失败');
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    if (!post) return;

    setIsSubmitting(true);
    try {
      const res = await commentApi.create({
        post_id: post.id,
        content_md: commentText,
      });
      if (res.success) {
        setCommentText('');
        toast.success((res.data as unknown as { message: string })?.message || '评论成功');
        fetchComments();
      } else {
        toast.error(res.message || '评论失败');
      }
    } catch {
      toast.error('评论失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!post) return;
    try {
      const res = await postApi.delete(post.id);
      if (res.success) {
        toast.success('删除成功');
        navigate(-1);
      } else {
        toast.error(res.message || '删除失败');
      }
    } catch {
      toast.error('删除失败');
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      toast.success('链接已复制');
    }).catch(() => {
      toast.info('请手动复制地址栏链接');
    });
  };

  // 加载状态
  if (loading) {
    return (
      <div className="pb-20">
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border/50 bg-background/80 px-4 py-3 backdrop-blur-md">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-sm font-medium">加载中...</h1>
          <div className="w-9" />
        </header>
        <div className="space-y-4 px-4 py-6">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-3/4" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error || !post) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
        <div className="mb-3 text-4xl">😢</div>
        <p className="text-sm text-muted-foreground">{error || '文章不存在'}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate('/')}>
          返回首页
        </Button>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border/50 bg-background/80 px-4 py-3 backdrop-blur-md">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="max-w-[60%] truncate text-sm font-medium">文章详情</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(isAdmin || post.author_id === user?.id) && (
              <>
                <DropdownMenuItem onClick={() => navigate(`/post/${post.id}/edit`)}>
                  <Edit className="mr-2 h-4 w-4" />
                  编辑
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  删除
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" />
              分享
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* 文章内容 */}
      <article className="px-4 py-6">
        <div className="mb-4 flex items-center gap-2">
          {post.board_name && (
            <Badge variant="outline" className="h-6 px-2 text-xs">
              {post.board_name}
            </Badge>
          )}
          {post.tags?.map((tag, i) => (
            <Badge key={i} variant="secondary" className="h-6 px-2 text-xs font-normal">
              #{tag}
            </Badge>
          ))}
        </div>

        <h1 className="mb-4 text-2xl font-bold leading-tight">{post.title}</h1>

        {/* 作者信息 */}
        <div className="mb-6 flex items-center justify-between">
          <Link to={`/user/${post.author_id}`} className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              {(post as unknown as { author?: { avatar?: string } }).author?.avatar ? (
                <AvatarImage src={(post as unknown as { author: { avatar: string } }).author.avatar} />
              ) : null}
              <AvatarFallback>
                <User className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="text-sm font-medium">
                {post.author_nickname || post.author_username}
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(post.created_at).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            </div>
          </Link>
        </div>

        {/* 正文 */}
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content_md}</ReactMarkdown>
        </div>

        {/* 数据统计 */}
        <div className="mt-8 flex items-center justify-center gap-8 border-t border-border/50 pt-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Eye className="h-4 w-4" />
            {post.view_count} 阅读
          </span>
          <button
            className={`flex items-center gap-1.5 transition-colors ${liked ? 'text-red-500' : 'hover:text-foreground'}`}
            onClick={handleLike}
          >
            <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
            {likeCount} 点赞
          </button>
          <span className="flex items-center gap-1.5">
            <MessageCircle className="h-4 w-4" />
            {commentTotal} 评论
          </span>
        </div>
      </article>

      {/* 评论区 */}
      <section className="border-t border-border/50 px-4 py-6">
        <h2 className="mb-4 text-lg font-semibold">
          评论 <span className="text-sm font-normal text-muted-foreground">({commentTotal})</span>
        </h2>

        {/* 评论输入 */}
        <Card className="mb-6">
          <CardContent className="p-3">
            <div className="flex gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                {user?.avatar ? <AvatarImage src={user.avatar} /> : null}
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <Textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={isLoggedIn ? '写下你的评论...' : '登录后发表评论'}
                  className="min-h-[80px] resize-none text-sm"
                  disabled={!isLoggedIn || isSubmitting}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      handleSubmitComment();
                    }
                  }}
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleSubmitComment}
                    disabled={!commentText.trim() || isSubmitting}
                    className="h-8 gap-1.5 text-xs"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    发表
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 评论列表 */}
        {comments.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            暂无评论，来抢沙发吧～
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                  {comment.author?.avatar ? <AvatarImage src={comment.author.avatar} /> : null}
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {comment.author?.nickname || comment.author?.username || '匿名用户'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(comment.created_at).toLocaleDateString('zh-CN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="mt-1 text-sm leading-relaxed">
                    {comment.content_md}
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                    <button className="flex items-center gap-1 hover:text-foreground">
                      <Heart className="h-3.5 w-3.5" />
                      {comment.like_count}
                    </button>
                    <button className="hover:text-foreground">回复</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 底部操作栏 */}
      <div className="fixed bottom-16 left-0 right-0 z-40 border-t border-border/50 bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[430px] items-center gap-3 px-4 py-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="说点什么..."
              className="h-9 w-full rounded-full bg-muted px-4 text-sm outline-none"
              onFocus={() => {
                if (!isLoggedIn) navigate('/login');
              }}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmitComment();
              }}
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className={`h-9 w-9 ${liked ? 'text-red-500' : ''}`}
            onClick={handleLike}
          >
            <Heart className={`h-5 w-5 ${liked ? 'fill-current' : ''}`} />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleShare}>
            <Share2 className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
