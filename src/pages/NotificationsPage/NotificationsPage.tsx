import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Heart,
  UserPlus,
  Bell,
  AtSign,
  CheckCheck,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { notificationApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import type { INotification } from '@/data/blog';

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
  const navigate = useNavigate();
  const { isLoggedIn, isLoading } = useAuth();
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      navigate('/login?redirect=/notifications');
    }
  }, [isLoading, isLoggedIn, navigate]);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = { page, page_size: 20 };
      if (activeTab === 'unread') params.unread = true;

      const res = await notificationApi.list(params);
      if (res.success) {
        setNotifications((res.data as unknown as INotification[]) || []);
        setTotalPages(res.total_pages || 1);
        setUnreadCount(res.unread_count || 0);
      } else {
        setError(res.message || '加载失败');
      }
    } catch {
      setError('网络请求失败');
    } finally {
      setLoading(false);
    }
  }, [page, activeTab]);

  useEffect(() => {
    if (isLoggedIn) fetchNotifications();
  }, [fetchNotifications, isLoggedIn]);

  const markAllRead = async () => {
    try {
      const res = await notificationApi.markAllRead();
      if (res.success) {
        setNotifications(notifications.map((n) => ({ ...n, is_read: 1 })));
        setUnreadCount(0);
        toast.success('已全部标记为已读');
      } else {
        toast.error(res.message || '操作失败');
      }
    } catch {
      toast.error('操作失败');
    }
  };

  const markRead = async (id: number) => {
    try {
      await notificationApi.markRead(id);
      setNotifications(
        notifications.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
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

  const filtered = notifications.filter((n) => {
    if (activeTab === 'unread') return n.is_read === 0;
    if (activeTab === 'system') return n.type === 'system';
    if (activeTab === 'interactions') return n.type !== 'system';
    return true;
  });

  const Icon = (type: string) => typeIcons[type] || Bell;

  if (!isLoggedIn) return null;

  return (
    <div className="space-y-4 pb-4 overflow-x-hidden">
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
          </div>
        </div>
      </div>

      {/* Tab */}
      <Tabs defaultValue="all" value={activeTab} onValueChange={(v) => { setActiveTab(v); setPage(1); }}>
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

      {/* 加载状态 */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 错误状态 */}
      {error && !loading && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col items-center py-8">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={fetchNotifications}>
              重试
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 通知列表 */}
      {!loading && !error && (
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bell className="mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {activeTab === 'unread' ? '没有未读通知' : '暂无通知'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filtered.map((notification) => {
              const IconComp = Icon(notification.type);
              return (
                <Card
                  key={notification.id}
                  className={notification.is_read === 0 ? 'border-primary/30' : ''}
                  onClick={() => {
                    if (notification.is_read === 0) markRead(notification.id);
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${typeColors[notification.type] || 'bg-muted'}`}
                      >
                        <IconComp className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm">
                            <span className="text-muted-foreground">{notification.title}</span>
                          </p>
                          {notification.is_read === 0 && (
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                          )}
                        </div>
                        {notification.content && (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {notification.content}
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
