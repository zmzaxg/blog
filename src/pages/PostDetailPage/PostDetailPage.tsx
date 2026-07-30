import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MOCK_POSTS, MOCK_COMMENTS, type IPost, type IComment } from '@/data/blog';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

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

  useEffect(() => {
    const postId = parseInt(id || '0', 10);
    const found = MOCK_POSTS.find((p) => p.id === postId);
    if (found) {
      setPost(found);
      setLikeCount(found.like_count);
    }
    const postComments = MOCK_COMMENTS.filter((c) => c.post_id === postId);
    setComments(postComments);
  }, [id]);

  const handleLike = () => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    setLiked(!liked);
    setLikeCount((prev) => (liked ? prev - 1 : prev + 1));
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }

    setIsSubmitting(true);
    // 模拟提交
    await new Promise((r) => setTimeout(r, 500));

    const newComment: IComment = {
      id: Date.now(),
      post_id: post?.id || 0,
      author_id: user?.id || 0,
      parent_id: null,
      content_md: commentText,
      status: 'approved',
      like_count: 0,
      author: user || undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setComments([...comments, newComment]);
    setCommentText('');
    setIsSubmitting(false);
    toast.success('评论成功');
  };

  const handleDelete = () => {
    toast.success('删除成功');
    navigate(-1);
  };

  if (!post) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-sm text-muted-foreground">加载中...</div>
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
            <DropdownMenuItem onClick={() => toast.success('已复制链接')}>
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
          {post.tags.map((tag, i) => (
            <Badge key={i} variant="secondary" className="h-6 px-2 text-xs font-normal">
              #{tag}
            </Badge>
          ))}
        </div>

        <h1 className="mb-4 text-2xl font-bold leading-tight">{post.title}</h1>

        {/* 作者信息 */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to={`/user/${post.author_id}`}
            className="flex items-center gap-3"
          >
            <Avatar className="h-10 w-10">
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
          <span className="flex items-center gap-1.5">
            <Heart className="h-4 w-4" />
            {likeCount} 点赞
          </span>
          <span className="flex items-center gap-1.5">
            <MessageCircle className="h-4 w-4" />
            {comments.length} 评论
          </span>
        </div>
      </article>

      {/* 评论区 */}
      <section className="border-t border-border/50 px-4 py-6">
        <h2 className="mb-4 text-lg font-semibold">
          评论 <span className="text-sm font-normal text-muted-foreground">({comments.length})</span>
        </h2>

        {/* 评论输入 */}
        <Card className="mb-6">
          <CardContent className="p-3">
            <div className="flex gap-3">
              <Avatar className="h-8 w-8 shrink-0">
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
                    <Send className="h-3.5 w-3.5" />
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
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Share2 className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
