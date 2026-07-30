import { Outlet } from 'react-router-dom';
import BottomTabBar from '@/components/BottomTabBar';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/context/AuthContext';
import ThemeSwitcher from '@/components/ThemeSwitcher';

export const Layout = () => {
  return (
    <AuthProvider>
      <div className="mx-auto min-h-screen w-full max-w-screen-sm bg-background text-foreground">
        <main className="pb-20">
          <Outlet />
        </main>
        <BottomTabBar />
        <ThemeSwitcher />
        <Toaster position="top-center" />
      </div>
    </AuthProvider>
  );
};
