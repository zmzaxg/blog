import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Settings,
  FileText,
  Heart,
  MessageSquare,
  Bookmark,
  Shield,
  LogOut,
  ChevronRight,
  Edit,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthContext';
import { postApi } from '@/lib/api';
import { toast } from 'sonner';
import { Image } from '@/components/ui/image';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, isLoggedIn, isAdmin, logout, isLoading } = useAuth();
  const [postCount, setPostCount] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!isLoggedIn || !user) return;
    const fetchStats = async () => {
      setLoadingStats(true);
      try {
        const res = await postApi.list({ author_id: user.id, page_size: 1 });
        if (res.success) {
          setPostCount(res.total || 0);
        }
      } catch {
        // ignore
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, [isLoggedIn, user]);

  const menuItems = [
    { icon: FileText, label: '我的文章', path: '/my/posts' },
    { icon: Heart, label: '我的收藏', path: '/my/favorites' },
    { icon: MessageSquare, label: '我的评论', path: '/my/comments' },
    { icon: Bookmark, label: '浏览历史', path: '/my/history' },
  ];

  const settingsItems = [
    { icon: Settings, label: '账号设置', path: '/settings' },
    { icon: Shield, label: '隐私安全', path: '/settings/security' },
  ];

  const handleLogout = () => {
    logout();
    toast.success('已退出登录');
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
        <div className="mb-4 text-4xl">👋</div>
        <h2 className="mb-2 text-xl font-semibold">欢迎来到轻社区</h2>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          登录后可以发布文章、参与评论、收藏喜欢的内容
        </p>
        <Button onClick={() => navigate('/login')} className="h-11 w-48">
          立即登录
        </Button>
        <Button
          variant="ghost"
          className="mt-2 text-sm text-muted-foreground"
          onClick={() => navigate('/login')}
        >
          没有账号？去注册
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      {/* 顶部用户卡片 */}
      <div className="bg-gradient-to-br from-primary/10 via-card to-card px-4 pb-6 pt-8">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-primary/20">
              {user?.avatar ? (
                <AvatarImage src={user.avatar} alt="" className="object-cover" />
              ) : null}
              <AvatarFallback className="text-lg">
                <User className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold">
                {user?.nickname || user?.username}
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                @{user?.username}
              </p>
              {user?.bio && (
                <p className="mt-1 text-sm text-muted-foreground">{user.bio}</p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => navigate('/settings/profile')}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>

        {/* 数据统计 */}
        <div className="mt-6 grid grid-cols-3 gap-4 text-center">
          <div>
            {loadingStats ? (
              <Skeleton className="mx-auto h-7 w-8" />
            ) : (
              <div className="text-xl font-bold">{postCount}</div>
            )}
            <div className="text-xs text-muted-foreground">文章</div>
          </div>
          <div>
            <div className="text-xl font-bold">-</div>
            <div className="text-xs text-muted-foreground">关注</div>
          </div>
          <div>
            <div className="text-xl font-bold">-</div>
            <div className="text-xs text-muted-foreground">粉丝</div>
          </div>
        </div>
      </div>

      {/* 管理后台入口 (管理员) */}
      {isAdmin && (
        <div className="px-4">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <button
                onClick={() => navigate('/admin')}
                className="flex w-full items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium">管理后台</div>
                    <div className="text-xs text-muted-foreground">
                      文章、评论、用户、系统设置
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 我的内容 */}
      <div className="px-4">
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">我的内容</h3>
        <Card>
          <CardContent className="p-0">
            {menuItems.map((item, index) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex w-full items-center justify-between px-4 py-3.5 transition-colors hover:bg-muted/50 ${
                  index !== menuItems.length - 1 ? 'border-b border-border/50' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{item.label}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* 设置 */}
      <div className="px-4">
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">设置</h3>
        <Card>
          <CardContent className="p-0">
            {settingsItems.map((item, index) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex w-full items-center justify-between px-4 py-3.5 transition-colors hover:bg-muted/50 ${
                  index !== settingsItems.length - 1 ? 'border-b border-border/50' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{item.label}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* 退出登录 */}
      <div className="px-4">
        <Card>
          <CardContent className="p-0">
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 px-4 py-3.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              退出登录
            </button>
          </CardContent>
        </Card>
      </div>

      {/* 版本信息 */}
      <div className="pt-4 text-center text-xs text-muted-foreground">
        轻社区博客 v1.0.0
      </div>
    </div>
  );
}
