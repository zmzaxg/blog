import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import NotFoundPage from "@/pages/NotFoundPage/NotFoundPage";
import HomePage from "@/pages/HomePage/HomePage";
import PostDetailPage from "@/pages/PostDetailPage/PostDetailPage";
import CreatePostPage from "@/pages/CreatePostPage/CreatePostPage";
import EditPostPage from "@/pages/EditPostPage/EditPostPage";
import BoardPage from "@/pages/BoardPage/BoardPage";
import NotificationsPage from "@/pages/NotificationsPage/NotificationsPage";
import ProfilePage from "@/pages/ProfilePage/ProfilePage";
import LoginPage from "@/pages/LoginPage/LoginPage";
import SetupPage from "@/pages/SetupPage/SetupPage";
import AdminLayout from "@/pages/AdminPage/AdminLayout";
import AdminDashboardPage from "@/pages/AdminPage/AdminDashboardPage";
import AdminPostsPage from "@/pages/AdminPage/AdminPostsPage";
import AdminCommentsPage from "@/pages/AdminPage/AdminCommentsPage";
import AdminUsersPage from "@/pages/AdminPage/AdminUsersPage";
import AdminBoardsPage from "@/pages/AdminPage/AdminBoardsPage";
import AdminStoragePage from "@/pages/AdminPage/AdminStoragePage";
import AdminPluginsPage from "@/pages/AdminPage/AdminPluginsPage";
import AdminThemesPage from "@/pages/AdminPage/AdminThemesPage";
import AdminSettingsPage from "@/pages/AdminPage/AdminSettingsPage";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/lib/theme";

function AppRoutes() {
  const { needsSetup, isLoading } = useAuth();

  // 系统未初始化时跳转到配置页面
  if (!isLoading && needsSetup) {
    return (
      <Routes>
        <Route path="/setup" element={<SetupPage />} />
        <Route path="*" element={<Navigate to="/setup" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      {/* 首次配置页面 */}
      <Route path="/setup" element={<SetupPage />} />

      {/* 前台页面 - 带底部 Tab */}
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="post/:id" element={<PostDetailPage />} />
        <Route path="post/create" element={<CreatePostPage />} />
        <Route path="post/:id/edit" element={<EditPostPage />} />
        <Route path="board/:slug" element={<BoardPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="login" element={<LoginPage />} />
      </Route>

      {/* 后台管理 - 侧边栏布局 */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="posts" element={<AdminPostsPage />} />
        <Route path="comments" element={<AdminCommentsPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="boards" element={<AdminBoardsPage />} />
        <Route path="storage" element={<AdminStoragePage />} />
        <Route path="plugins" element={<AdminPluginsPage />} />
        <Route path="themes" element={<AdminThemesPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}
