import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
  Filter,
} from 'lucide-react';
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
import { MOCK_POSTS, type IPost } from '@/data/blog';
import { toast } from 'sonner';

export default function AdminPostsPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<IPost[]>(MOCK_POSTS);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('all');
  const [boardId, setBoardId] = useState('all');

  const filteredPosts = posts.filter((post) => {
    const matchKeyword =
      !keyword ||
      post.title.toLowerCase().includes(keyword.toLowerCase());
    const matchStatus = status === 'all' || post.status === status;
    const matchBoard = boardId === 'all' || String(post.board_id) === boardId;
    return matchKeyword && matchStatus && matchBoard;
  });

  const handleDelete = (id: number) => {
    setPosts(posts.filter((p) => p.id !== id));
    toast.success('删除成功');
  };

  const statusColor: Record<string, string> = {
    published: 'bg-green-500/20 text-green-500',
    draft: 'bg-yellow-500/20 text-yellow-500',
    pending: 'bg-blue-500/20 text-blue-500',
    deleted: 'bg-red-500/20 text-red-500',
  };

  const statusLabel: Record<string, string> = {
    published: '已发布',
    draft: '草稿',
    pending: '待审核',
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
              placeholder="搜索文章..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="h-9 pl-9 text-sm"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-28 text-xs">
              <Filter className="mr-1 h-3.5 w-3.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="published">已发布</SelectItem>
              <SelectItem value="draft">草稿</SelectItem>
              <SelectItem value="pending">待审核</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" className="h-9 gap-1" onClick={() => navigate('/post/create')}>
          <Plus className="h-4 w-4" />
          新建文章
        </Button>
      </div>

      {/* 列表 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            文章列表 <span className="text-sm font-normal text-muted-foreground">({filteredPosts.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">标题</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">作者</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">板块</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">状态</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">浏览/评论</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">发布时间</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredPosts.map((post) => (
                  <tr key={post.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="max-w-[240px]">
                        <div className="truncate font-medium">{post.title}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {post.summary}
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {post.author_nickname || post.author_username}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {post.board_name || '-'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Badge className={`text-[10px] font-normal ${statusColor[post.status] || ''}`}>
                        {statusLabel[post.status] || post.status}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {post.view_count} / {post.comment_count}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                      {new Date(post.created_at).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/post/${post.id}`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            查看
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/post/${post.id}/edit`)}>
                            <Edit className="mr-2 h-4 w-4" />
                            编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(post.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredPosts.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              暂无文章
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
