import { useState } from 'react';
import {
  MessageSquare,
  Heart,
  UserPlus,
  Bell,
  AtSign,
  CheckCheck,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Notification {
  id: number;
  type: 'comment' | 'like' | 'follow' | 'mention' | 'system';
  content: string;
  from_user?: { nickname: string; username: string };
  post_title?: string;
  is_read: number;
  created_at: string;
}

const mockNotifications: Notification[] = [
  {
    id: 1,
    type: 'comment',
    content: '评论了你的文章',
    from_user: { nickname: '张三', username: 'zhangsan' },
    post_title: 'Cloudflare Worker 入门指南',
    is_read: 0,
    created_at: '2024-01-28T10:30:00Z',
  },
  {
    id: 2,
    type: 'like',
    content: '赞了你的文章',
    from_user: { nickname: '李四', username: 'lisi' },
    post_title: 'Markdown 写作技巧',
    is_read: 0,
    created_at: '2024-01-28T09:15:00Z',
  },
  {
    id: 3,
    type: 'follow',
    content: '关注了你',
    from_user: { nickname: '王五', username: 'wangwu' },
    is_read: 0,
    created_at: '2024-01-27T14:20:00Z',
  },
  {
    id: 4,
    type: 'mention',
    content: '在评论中提到了你',
    from_user: { nickname: '赵六', username: 'zhaoliu' },
    post_title: '前端性能优化实践',
    is_read: 1,
    created_at: '2024-01-26T16:45:00Z',
  },
  {
    id: 5,
    type: 'system',
    content: '你的文章《Cloudflare Worker 入门指南》已通过审核并发布',
    is_read: 1,
    created_at: '2024-01-25T08:00:00Z',
  },
  {
    id: 6,
    type: 'system',
    content: '系统将于本周六凌晨 2:00-4:00 进行维护升级',
    is_read: 1,
    created_at: '2024-01-24T10:00:00Z',
  },
];

const typeIcons: Record<string, typeof MessageSquare> = {
  comment: MessageSquare,
  like: Heart,
  follow: UserPlus,
  mention: AtSign,
  system: Bell,
};

const typeColors: Record<string, string> = {
  comment: 'bg-blue-500/20 text-blue-500',
  like: 'bg-red-500/20 text-red-500',
  follow: 'bg-purple-500/20 text-purple-500',
  mention: 'bg-yellow-500/20 text-yellow-500',
  system: 'bg-green-500/20 text-green-500',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [activeTab, setActiveTab] = useState('all');

  const filtered = notifications.filter((n) => {
    if (activeTab === 'unread') return n.is_read === 0;
    if (activeTab === 'system') return n.type === 'system';
    if (activeTab === 'interactions') return n.type !== 'system';
    return true;
  });

  const unreadCount = notifications.filter((n) => n.is_read === 0).length;

  const markAllRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, is_read: 1 })));
    toast.success('已全部标记为已读');
  };

  const clearAll = () => {
    setNotifications([]);
    toast.success('已清空通知');
  };

  const formatTime = (dateStr: string) => {
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

  const Icon = (type: string) => typeIcons[type] || Bell;

  return (
    <div className="space-y-4 pb-4">
      {/* 顶部栏 */}
      <div className="sticky top-0 z-10 -mx-4 bg-background/80 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-semibold">通知</h1>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={markAllRead}
              disabled={unreadCount === 0}
            >
              <CheckCheck className="mr-1 h-4 w-4" />
              全部已读
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-destructive"
              onClick={clearAll}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              清空
            </Button>
          </div>
        </div>
      </div>

      {/* Tab */}
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="all" className="flex-1 text-xs">
            全部
            {unreadCount > 0 && (
              <Badge className="ml-1 h-4 bg-red-500 px-1 text-[10px]">{unreadCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="unread" className="flex-1 text-xs">未读</TabsTrigger>
          <TabsTrigger value="interactions" className="flex-1 text-xs">互动</TabsTrigger>
          <TabsTrigger value="system" className="flex-1 text-xs">系统</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* 通知列表 */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bell className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">暂无通知</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((notification) => {
            const IconComp = Icon(notification.type);
            return (
              <Card
                key={notification.id}
                className={notification.is_read === 0 ? 'border-primary/30' : ''}
              >
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    {notification.from_user ? (
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback className="text-xs">
                          {notification.from_user.nickname[0]}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${typeColors[notification.type]}`}
                      >
                        <IconComp className="h-4 w-4" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm">
                          {notification.from_user && (
                            <span className="font-medium">
                              {notification.from_user.nickname}{' '}
                            </span>
                          )}
                          <span className="text-muted-foreground">{notification.content}</span>
                        </p>
                        {notification.is_read === 0 && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                        )}
                      </div>
                      {notification.post_title && (
                        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                          《{notification.post_title}》
                        </p>
                      )}
                      <p className="mt-1.5 text-[11px] text-muted-foreground">
                        {formatTime(notification.created_at)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
