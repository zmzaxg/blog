import { useState } from 'react';
import { Search, Check, X, MessageSquare, Trash2, MoreHorizontal } from 'lucide-react';
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
import { MOCK_COMMENTS, type IComment } from '@/data/blog';
import { toast } from 'sonner';

export default function AdminCommentsPage() {
  const [comments, setComments] = useState<IComment[]>(MOCK_COMMENTS);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('all');
  const [activeTab, setActiveTab] = useState<'all' | 'pending'>('all');

  const filteredComments = comments.filter((c) => {
    const matchKeyword =
      !keyword || c.content_md.toLowerCase().includes(keyword.toLowerCase());
    const matchStatus = status === 'all' || c.status === status;
    const matchTab = activeTab === 'all' || c.status === activeTab;
    return matchKeyword && matchStatus && matchTab;
  });

  const handleModerate = (id: number, newStatus: string) => {
    setComments(
      comments.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
    );
    toast.success('操作成功');
  };

  const handleDelete = (id: number) => {
    setComments(comments.filter((c) => c.id !== id));
    toast.success('删除成功');
  };

  const pendingCount = comments.filter((c) => c.status === 'pending').length;

  const statusColor: Record<string, string> = {
    approved: 'bg-green-500/20 text-green-500',
    pending: 'bg-yellow-500/20 text-yellow-500',
    spam: 'bg-red-500/20 text-red-500',
    deleted: 'bg-gray-500/20 text-gray-500',
  };

  const statusLabel: Record<string, string> = {
    approved: '已通过',
    pending: '待审核',
    spam: '垃圾',
    deleted: '已删除',
  };

  return (
    <div className="space-y-4">
      {/* 操作栏 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="搜索评论..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="h-9 pl-9 text-sm"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="approved">已通过</SelectItem>
              <SelectItem value="pending">待审核</SelectItem>
              <SelectItem value="spam">垃圾</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tab */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === 'all' ? 'default' : 'outline'}
          size="sm"
          className="h-8 text-xs"
          onClick={() => setActiveTab('all')}
        >
          全部
        </Button>
        <Button
          variant={activeTab === 'pending' ? 'default' : 'outline'}
          size="sm"
          className="h-8 gap-1 text-xs"
          onClick={() => setActiveTab('pending')}
        >
          待审核
          {pendingCount > 0 && (
            <Badge className="h-4 bg-red-500 px-1 text-[10px]">{pendingCount}</Badge>
          )}
        </Button>
      </div>

      {/* 列表 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            评论列表 <span className="text-sm font-normal text-muted-foreground">({filteredComments.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">内容</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">作者</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">文章</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">状态</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">时间</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredComments.map((comment) => (
                  <tr key={comment.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="max-w-[300px]">
                        <div className="line-clamp-2">{comment.content_md}</div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {comment.author?.nickname || comment.author?.username || '匿名'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      文章 #{comment.post_id}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Badge className={`text-[10px] font-normal ${statusColor[comment.status] || ''}`}>
                        {statusLabel[comment.status] || comment.status}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                      {new Date(comment.created_at).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {comment.status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-500"
                              onClick={() => handleModerate(comment.id, 'approved')}
                              title="通过"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500"
                              onClick={() => handleModerate(comment.id, 'spam')}
                              title="标记垃圾"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {comment.status !== 'approved' && (
                              <DropdownMenuItem onClick={() => handleModerate(comment.id, 'approved')}>
                                <Check className="mr-2 h-4 w-4" />
                                设为通过
                              </DropdownMenuItem>
                            )}
                            {comment.status !== 'spam' && (
                              <DropdownMenuItem onClick={() => handleModerate(comment.id, 'spam')}>
                                <X className="mr-2 h-4 w-4" />
                                标记垃圾
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => handleDelete(comment.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredComments.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              暂无评论
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
