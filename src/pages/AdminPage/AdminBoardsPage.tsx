import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { boardApi } from '@/lib/api';
import type { IBoard } from '@/data/blog';
import { toast } from 'sonner';

export default function AdminBoardsPage() {
  const [boards, setBoards] = useState<IBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState<IBoard | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    slug: '',
    name: '',
    description: '',
    icon: '',
    sort_order: 0,
  });

  const fetchBoards = useCallback(async () => {
    setLoading(true);
    try {
      const res = await boardApi.listAdmin();
      if (res.success && res.data) {
        setBoards(res.data as unknown as IBoard[]);
      }
    } catch {
      toast.error('加载板块失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  const openCreateDialog = () => {
    setEditingBoard(null);
    setFormData({ slug: '', name: '', description: '', icon: '', sort_order: 0 });
    setDialogOpen(true);
  };

  const openEditDialog = (board: IBoard) => {
    setEditingBoard(board);
    setFormData({
      slug: board.slug,
      name: board.name,
      description: board.description || '',
      icon: board.icon || '',
      sort_order: board.sort_order,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.slug || !formData.name) {
      toast.error('请填写标识和名称');
      return;
    }

    setSaving(true);
    try {
      if (editingBoard) {
        const res = await boardApi.update(editingBoard.id, formData);
        if (res.success) {
          toast.success('板块已更新');
          fetchBoards();
        } else {
          toast.error(res.message || '更新失败');
        }
      } else {
        const res = await boardApi.create(formData);
        if (res.success) {
          toast.success('板块已创建');
          fetchBoards();
        } else {
          toast.error(res.message || '创建失败');
        }
      }
      setDialogOpen(false);
    } catch {
      toast.error('操作失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const board = boards.find((b) => b.id === id);
    if (board && board.post_count > 0) {
      toast.error('该板块下还有文章，无法删除');
      return;
    }
    try {
      const res = await boardApi.delete(id);
      if (res.success) {
        toast.success('板块已删除');
        fetchBoards();
      } else {
        toast.error(res.message || '删除失败');
      }
    } catch {
      toast.error('删除失败');
    }
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
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">板块管理</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 gap-1" onClick={openCreateDialog}>
              <Plus className="h-4 w-4" />
              新建板块
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingBoard ? '编辑板块' : '新建板块'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">标识 (slug)</Label>
                  <Input
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="如：tech"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">图标 (emoji)</Label>
                  <Input
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    placeholder="如：💻"
                    className="h-9 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">板块名称</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="如：技术交流"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">描述</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="板块描述"
                  className="min-h-[80px] text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">排序</Label>
                <Input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) =>
                    setFormData({ ...formData, sort_order: parseInt(e.target.value, 10) || 0 })
                  }
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                保存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">板块</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">标识</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">文章数</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">排序</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">状态</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {boards.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      暂无板块
                    </td>
                  </tr>
                ) : (
                  boards.map((board) => (
                    <tr key={board.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{board.icon}</span>
                          <div>
                            <div className="font-medium">{board.name}</div>
                            <div className="text-xs text-muted-foreground">{board.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">
                        {board.slug}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">{board.post_count}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {board.sort_order}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <Badge
                          className={`text-[10px] font-normal ${
                            board.status === 'active'
                              ? 'bg-green-500/20 text-green-500'
                              : 'bg-gray-500/20 text-gray-500'
                          }`}
                        >
                          {board.status === 'active' ? '正常' : '已归档'}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditDialog(board)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDelete(board.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
