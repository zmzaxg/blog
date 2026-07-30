import { useState, useEffect, useCallback } from 'react';
import { Search, Shield, UserCog, Ban, MoreHorizontal, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { adminApi } from '@/lib/api';
import type { IUser } from '@/data/blog';
import { toast } from 'sonner';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [role, setRole] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, page_size: 20 };
      if (keyword) params.keyword = keyword;
      if (role !== 'all') params.role = role;

      const res = await adminApi.users(params);
      if (res.success) {
        setUsers((res.data as unknown as IUser[]) || []);
        setTotalPages(res.total_pages || 1);
      } else {
        toast.error(res.message || '加载用户失败');
      }
    } catch {
      toast.error('加载用户失败');
    } finally {
      setLoading(false);
    }
  }, [page, keyword, role]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const updateRole = async (id: number, newRole: string) => {
    try {
      const res = await adminApi.updateUser(id, { role: newRole });
      if (res.success) {
        toast.success('角色已更新');
        fetchUsers();
      } else {
        toast.error(res.message || '更新失败');
      }
    } catch {
      toast.error('更新失败');
    }
  };

  const toggleBan = async (id: number) => {
    const user = users.find((u) => u.id === id);
    if (!user) return;
    const newStatus = user.role === 'banned' ? 'active' : 'banned';
    const newRole = user.role === 'banned' ? 'member' : 'banned';
    try {
      const res = await adminApi.updateUser(id, { status: newStatus, role: newRole });
      if (res.success) {
        toast.success(user.role === 'banned' ? '已解封' : '已封禁');
        fetchUsers();
      } else {
        toast.error(res.message || '操作失败');
      }
    } catch {
      toast.error('操作失败');
    }
  };

  const roleColor: Record<string, string> = {
    admin: 'bg-red-500/20 text-red-500',
    editor: 'bg-purple-500/20 text-purple-500',
    member: 'bg-blue-500/20 text-blue-500',
    banned: 'bg-gray-500/20 text-gray-500',
  };

  const roleLabel: Record<string, string> = {
    admin: '管理员',
    editor: '编辑',
    member: '普通用户',
    banned: '已封禁',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="搜索用户..."
              value={keyword}
              onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
              className="h-9 pl-9 text-sm"
            />
          </div>
          <Select value={role} onValueChange={(v) => { setRole(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部角色</SelectItem>
              <SelectItem value="admin">管理员</SelectItem>
              <SelectItem value="editor">编辑</SelectItem>
              <SelectItem value="member">普通用户</SelectItem>
              <SelectItem value="banned">已封禁</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            用户列表 <span className="text-sm font-normal text-muted-foreground">({users.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">用户</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">角色</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">邮箱</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">注册时间</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      暂无用户
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {user.nickname?.[0] || user.username[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{user.nickname || user.username}</div>
                            <div className="text-xs text-muted-foreground">@{user.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <Badge className={`text-[10px] font-normal ${roleColor[user.role] || ''}`}>
                          {roleLabel[user.role] || user.role}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {user.email || '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {user.role !== 'admin' && (
                              <DropdownMenuItem onClick={() => updateRole(user.id, 'admin')}>
                                <Shield className="mr-2 h-4 w-4" />
                                设为管理员
                              </DropdownMenuItem>
                            )}
                            {user.role !== 'editor' && user.role !== 'admin' && (
                              <DropdownMenuItem onClick={() => updateRole(user.id, 'editor')}>
                                <UserCog className="mr-2 h-4 w-4" />
                                设为编辑
                              </DropdownMenuItem>
                            )}
                            {user.role !== 'member' && user.role !== 'banned' && (
                              <DropdownMenuItem onClick={() => updateRole(user.id, 'member')}>
                                降为普通用户
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => toggleBan(user.id)}
                              className={user.role === 'banned' ? '' : 'text-destructive'}
                            >
                              <Ban className="mr-2 h-4 w-4" />
                              {user.role === 'banned' ? '解除封禁' : '封禁账号'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 border-t border-border px-4 py-3">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                上一页
              </Button>
              <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                下一页
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
