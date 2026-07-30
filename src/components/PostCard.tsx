import { useNavigate } from 'react-router-dom';
import { Eye, MessageSquare, Heart, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { IPost } from '@/data/blog';

interface PostCardProps {
  post: IPost;
  compact?: boolean;
}

export default function PostCard({ post, compact = false }: PostCardProps) {
  const navigate = useNavigate();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return '刚刚';
    if (hours < 24) return `${hours} 小时前`;
    if (days < 7) return `${days} 天前`;
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-muted/30"
      onClick={() => navigate(`/post/${post.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className="text-xs">
              {post.author_nickname?.[0] || post.author_username?.[0] || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            {/* 作者信息 */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {post.author_nickname || post.author_username}
              </span>
              {post.board_name && (
                <>
                  <span>·</span>
                  <Badge variant="outline" className="h-4 px-1.5 text-[10px] font-normal">
                    {post.board_name}
                  </Badge>
                </>
              )}
            </div>

            {/* 标题 */}
            <h3 className="mt-1 line-clamp-2 text-sm font-medium">
              {post.title}
            </h3>

            {/* 摘要 */}
            {!compact && post.summary && (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {post.summary}
              </p>
            )}

            {/* 底部元信息 */}
            <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDate(post.created_at)}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {post.view_count}
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {post.comment_count}
              </span>
              <span className="flex items-center gap-1">
                <Heart className="h-3 w-3" />
                {post.like_count}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
