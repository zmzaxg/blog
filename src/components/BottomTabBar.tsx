import { NavLink, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, PenSquare, Bell, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function BottomTabBar() {
  const { pathname } = useLocation();
  const { isLoggedIn } = useAuth();

  const tabs = [
    { path: '/', label: '首页', icon: Home },
    { path: '/board/tech', label: '板块', icon: LayoutGrid },
    { path: '/post/create', label: '发布', icon: PenSquare, highlight: true },
    { path: '/notifications', label: '通知', icon: Bell },
    { path: '/profile', label: '我的', icon: User },
  ];

  // 管理后台页面不显示底部 tab
  if (pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[430px] items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            tab.path === '/'
              ? pathname === '/'
              : pathname === tab.path || pathname.startsWith(`${tab.path}/`);

          if (tab.highlight) {
            return (
              <NavLink
                key={tab.path}
                to={isLoggedIn ? tab.path : '/login?redirect=' + encodeURIComponent(tab.path)}
                className="flex flex-col items-center justify-center"
              >
                <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] text-muted-foreground">{tab.label}</span>
              </NavLink>
            );
          }

          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              end={tab.path === '/'}
              className={({ isActive: active }) =>
                `flex flex-col items-center justify-center gap-0.5 px-3 py-1 transition-colors ${
                  active ? 'text-foreground' : 'text-muted-foreground'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px]">{tab.label}</span>
            </NavLink>
          );
        })}
      </div>
      {/* 安全区占位 */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
