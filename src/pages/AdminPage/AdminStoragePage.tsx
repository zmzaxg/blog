import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, HardDrive, Check, Database, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { storageApi } from '@/lib/api';
import { toast } from 'sonner';

interface StorageConfig {
  id: number;
  name: string;
  type: string;
  is_default: number;
  status: string;
  config: {
    url?: string;
    username?: string;
    password?: string;
    bucket?: string;
    region?: string;
  };
}

export default function AdminStoragePage() {
  const [configs, setConfigs] = useState<StorageConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<StorageConfig | null>(null);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'webdav',
    url: '',
    username: '',
    password: '',
    is_default: false,
  });

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await storageApi.listConfigs();
      if (res.success && res.data) {
        // 需要获取完整配置（含 config 字段）
        const list = res.data as unknown as StorageConfig[];
        setConfigs(list);
      }
    } catch {
      toast.error('加载存储配置失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const openCreateDialog = () => {
    setEditingConfig(null);
    setFormData({
      name: '',
      type: 'webdav',
      url: '',
      username: '',
      password: '',
      is_default: false,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (config: StorageConfig) => {
    setEditingConfig(config);
    setFormData({
      name: config.name,
      type: config.type,
      url: config.config?.url || '',
      username: config.config?.username || '',
      password: config.config?.password || '',
      is_default: config.is_default === 1,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error('请输入配置名称');
      return;
    }
    if (formData.type === 'webdav' && !formData.url) {
      toast.error('请输入 WebDAV URL');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        type: formData.type,
        config: {
          url: formData.url,
          username: formData.username,
          password: formData.password,
        },
        is_default: formData.is_default,
      };

      if (editingConfig) {
        const res = await storageApi.updateConfig(editingConfig.id, payload);
        if (res.success) {
          toast.success('配置已更新');
          fetchConfigs();
        } else {
          toast.error(res.message || '更新失败');
        }
      } else {
        const res = await storageApi.createConfig(payload);
        if (res.success) {
          toast.success('配置已创建');
          fetchConfigs();
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
    try {
      const res = await storageApi.deleteConfig(id);
      if (res.success) {
        toast.success('配置已删除');
        fetchConfigs();
      } else {
        toast.error(res.message || '删除失败');
      }
    } catch {
      toast.error('删除失败');
    }
  };

  const handleTest = async (id: number) => {
    setTestingId(id);
    try {
      const res = await storageApi.testConnection(id);
      if (res.success && (res.data as unknown as { connected: boolean })?.connected) {
        toast.success('连接成功');
      } else {
        toast.error(res.message || '连接失败');
      }
    } catch {
      toast.error('连接测试失败');
    } finally {
      setTestingId(null);
    }
  };

  const setDefault = async (id: number) => {
    try {
      const res = await storageApi.updateConfig(id, { is_default: true });
      if (res.success) {
        toast.success('已设为默认存储');
        fetchConfigs();
      } else {
        toast.error(res.message || '操作失败');
      }
    } catch {
      toast.error('操作失败');
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
    <div className="space-y-6">
      {/* 说明 */}
      <Alert className="border-info/30 bg-info/10">
        <Database className="h-4 w-4 text-info" />
        <AlertDescription className="text-xs">
          配置外部存储（如 WebDAV）可以将文章和评论内容以 Markdown 文件形式存储，节省 D1 数据库空间。
          文件命名格式：<code className="rounded bg-muted px-1">用户ID_功能名_时间戳.md</code>
          ，系统会自动管理版本并清理旧文件。
        </AlertDescription>
      </Alert>

      {/* 存储配置列表 */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">存储配置</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 gap-1" onClick={openCreateDialog}>
              <Plus className="h-4 w-4" />
              添加配置
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingConfig ? '编辑存储配置' : '添加存储配置'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs">配置名称</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="如：默认 WebDAV 存储"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">存储类型</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="webdav">WebDAV</SelectItem>
                    <SelectItem value="s3">S3 兼容存储</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.type === 'webdav' && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs">WebDAV URL</Label>
                    <Input
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      placeholder="https://dav.example.com/remote.php/dav/files/user"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">用户名</Label>
                    <Input
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="用户名"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">密码</Label>
                    <Input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="密码"
                      className="h-9 text-sm"
                    />
                  </div>
                </>
              )}
              <div className="flex items-center justify-between">
                <Label className="text-xs">设为默认存储</Label>
                <Switch
                  checked={formData.is_default}
                  onCheckedChange={(v) => setFormData({ ...formData, is_default: v })}
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

      {configs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <HardDrive className="mb-3 h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">暂无存储配置</p>
            <Button size="sm" className="mt-4" onClick={openCreateDialog}>
              添加第一个配置
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {configs.map((config) => (
            <Card key={config.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <HardDrive className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base">
                        {config.name}
                        {config.is_default === 1 && (
                          <Badge className="h-5 bg-primary/20 text-[10px] text-primary">
                            默认
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-0.5 text-xs">
                        {config.type.toUpperCase()} · {config.config?.url || '未配置'}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => handleTest(config.id)}
                      disabled={testingId === config.id}
                    >
                      {testingId === config.id ? (
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      ) : null}
                      {testingId === config.id ? '测试中...' : '测试连接'}
                    </Button>
                    {config.is_default !== 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => setDefault(config.id)}
                      >
                        <Check className="mr-1 h-3.5 w-3.5" />
                        设为默认
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(config)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(config.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* 存储策略说明 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">存储策略说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div>
            <div className="mb-1 font-medium text-foreground">文件命名规则</div>
            <p>
              <code className="rounded bg-muted px-1">用户ID_功能名称_时间戳.md</code>
              ，例如：<code className="rounded bg-muted px-1">1_post_1706400000000.md</code>
            </p>
          </div>
          <div>
            <div className="mb-1 font-medium text-foreground">版本管理</div>
            <p>每次修改内容时，系统会获取存储中最新的版本，与修改内容合并后生成新的时间戳文件上传，然后清理旧版本（保留最近 3 个版本以防误删）。</p>
          </div>
          <div>
            <div className="mb-1 font-medium text-foreground">支持的功能</div>
            <p>文章内容、评论内容、用户资料等都可以配置为外部存储，数据库中仅保留索引和元数据。</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
