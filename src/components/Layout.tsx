import { Outlet } from 'react-router-dom';
import BottomTabBar from '@/components/BottomTabBar';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/context/AuthContext';

export const Layout = () => {
  return (
    <AuthProvider>
      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-background text-foreground">
        <main className="pb-20">
          <Outlet />
        </main>
        <BottomTabBar />
        <Toaster position="top-center" />
      </div>
    </AuthProvider>
  );
};
