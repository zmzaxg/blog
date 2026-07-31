import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Edit, Trash2, HardDrive, Check, Database, Loader2, Folder, File,
  ChevronRight, ChevronLeft, Home, RefreshCw, Download, Upload, BarChart3,
  ArrowUpDown, Settings, TestTube, Eye, MoreHorizontal, FolderPlus, Trash, Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { storageApi } from '@/lib/api';
import { toast } from 'sonner';

interface StorageConfig {
  id: number;
  name: string;
  type: string;
  is_default: number;
  status: string;
  config: {
    url: string;
    username: string;
    path?: string;
    stores?: string[];
  };
  created_at: string;
  updated_at: string;
}

interface FileItem {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  lastModified: string;
}

const STORE_TYPES = [
  { value: 'posts', label: '文章内容', desc: '将文章 Markdown 内容存储到 WebDAV' },
  { value: 'comments', label: '评论内容', desc: '将评论内容存储到 WebDAV' },
  { value: 'users', label: '用户资料', desc: '将用户简介等资料存储到 WebDAV' },
  { value: 'images', label: '图片文件', desc: '将上传的图片存储到 WebDAV' },
];

export default function AdminStoragePage() {
  const [configs, setConfigs] = useState<StorageConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<StorageConfig | null>(null);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<Record<number, { success: boolean; message: string }>>({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('configs');

  // 表单数据
  const [formData, setFormData] = useState({
    name: '',
    type: 'webdav',
    url: '',
    username: '',
    password: '',
    path: '',
    stores: [] as string[],
    is_default: false,
  });

  // 文件浏览器状态
  const [browsingConfigId, setBrowsingConfigId] = useState<number | null>(null);
  const [browsingPath, setBrowsingPath] = useState('');
  const [browseItems, setBrowseItems] = useState<FileItem[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [newDirName, setNewDirName] = useState('');
  const [showMkdirDialog, setShowMkdirDialog] = useState(false);

  // 重命名状态
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  // 文件预览状态
  const [previewContent, setPreviewContent] = useState<{ path: string; content: string; content_type: string; size: number } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // 统计数据
  const [stats, setStats] = useState<Record<string, { count: number; size: number }>>({});
  const [statsLoading, setStatsLoading] = useState(false);

  // 迁移状态
  const [migrating, setMigrating] = useState(false);
  const [reverseMigrating, setReverseMigrating] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  // D1 数据浏览
  const [d1BrowseType, setD1BrowseType] = useState('posts');
  const [d1BrowseData, setD1BrowseData] = useState<Array<Record<string, unknown>>>([]);
  const [d1BrowseTotal, setD1BrowseTotal] = useState(0);
  const [d1BrowsePage, setD1BrowsePage] = useState(1);
  const [d1BrowseTotalPages, setD1BrowseTotalPages] = useState(1);
  const [d1BrowseLoading, setD1BrowseLoading] = useState(false);
  const [d1BrowseKeyword, setD1BrowseKeyword] = useState('');
  const [d1Cleaning, setD1Cleaning] = useState(false);

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await storageApi.listConfigs();
      if (res.success && res.data) {
        setConfigs(res.data as unknown as StorageConfig[]);
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
      path: '',
      stores: [],
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
      password: '', // 不回显密码
      path: config.config?.path || '',
      stores: config.config?.stores || [],
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
          path: formData.path,
          stores: formData.stores,
        },
        is_default: formData.is_default,
      };

      let res;
      if (editingConfig) {
        // 如果密码为空，不更新密码
        if (!formData.password) {
          delete (payload.config as Record<string, unknown>).password;
        }
        res = await storageApi.updateConfig(editingConfig.id, payload);
      } else {
        res = await storageApi.createConfig(payload);
      }

      if (res.success) {
        toast.success(editingConfig ? '配置已更新' : '配置已创建');
        fetchConfigs();
        setDialogOpen(false);
      } else {
        toast.error(res.message || '操作失败');
      }
    } catch {
      toast.error('操作失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此配置？')) return;
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
    setTestResult((prev) => ({ ...prev, [id]: { success: false, message: '测试中...' } }));
    try {
      const res = await storageApi.testConnection(id);
      if (res.success) {
        const data = res.data as unknown as { connected: boolean; message: string };
        setTestResult((prev) => ({
          ...prev,
          [id]: { success: data.connected, message: data.message || '连接成功' },
        }));
        toast.success('连接测试成功');
      } else {
        setTestResult((prev) => ({
          ...prev,
          [id]: { success: false, message: res.message || '连接失败' },
        }));
        toast.error(res.message || '连接失败');
      }
    } catch {
      setTestResult((prev) => ({
        ...prev,
        [id]: { success: false, message: '测试请求失败' },
      }));
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

  // 浏览文件
  const handleBrowse = async (configId: number, path?: string) => {
    setBrowsingConfigId(configId);
    setBrowseLoading(true);
    setPreviewContent(null);
    try {
      const res = await storageApi.browse(configId, path || '');
      if (res.success && res.data) {
        const data = res.data as unknown as { items: FileItem[]; path: string };
        // 排序：目录在前，文件在后
        const items = (data.items || []).sort((a, b) => {
          if (a.isDir && !b.isDir) return -1;
          if (!a.isDir && b.isDir) return 1;
          return a.name.localeCompare(b.name);
        });
        setBrowseItems(items);
        setBrowsingPath(data.path || '');
      } else {
        toast.error(res.message || '读取目录失败');
        setBrowseItems([]);
      }
    } catch {
      toast.error('读取目录失败');
      setBrowseItems([]);
    } finally {
      setBrowseLoading(false);
    }
  };

  // 预览文件
  const handlePreview = async (configId: number, filePath: string) => {
    setPreviewContent({ path: filePath, content: '', content_type: 'text/plain', size: 0 });
    setPreviewLoading(true);
    try {
      const res = await storageApi.readFile(configId, filePath);
      if (res.success && res.data) {
        setPreviewContent(res.data as unknown as { path: string; content: string; content_type: string; size: number });
      } else {
        toast.error(res.message || '读取文件失败');
        setPreviewContent(null);
      }
    } catch {
      toast.error('读取文件失败');
      setPreviewContent(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  // 创建目录
  const handleMkdir = async () => {
    if (!browsingConfigId || !newDirName) return;
    try {
      const fullPath = browsingPath ? `${browsingPath}/${newDirName}` : newDirName;
      const res = await storageApi.mkdir(browsingConfigId, fullPath);
      if (res.success) {
        toast.success('目录创建成功');
        setShowMkdirDialog(false);
        setNewDirName('');
        handleBrowse(browsingConfigId, browsingPath);
      } else {
        toast.error(res.message || '创建失败');
      }
    } catch {
      toast.error('创建目录失败');
    }
  };

  // 删除文件/目录
  const handleDeleteItem = async (path: string) => {
    if (!browsingConfigId) return;
    if (!confirm(`确定删除 ${path}？`)) return;
    try {
      const res = await storageApi.deleteItem(browsingConfigId, path);
      if (res.success) {
        toast.success('删除成功');
        handleBrowse(browsingConfigId, browsingPath);
      } else {
        toast.error(res.message || '删除失败');
      }
    } catch {
      toast.error('删除失败');
    }
  };

  // 重命名
  const handleRename = async () => {
    if (!browsingConfigId || !renamingPath || !newName) return;
    try {
      const res = await storageApi.renameItem(browsingConfigId, renamingPath, newName);
      if (res.success) {
        toast.success('重命名成功');
        setRenamingPath(null);
        setNewName('');
        handleBrowse(browsingConfigId, browsingPath);
      } else {
        toast.error(res.message || '重命名失败');
      }
    } catch {
      toast.error('重命名失败');
    }
  };

  // 获取统计
  const handleGetStats = async (configId: number) => {
    setStatsLoading(true);
    try {
      const res = await storageApi.getStats(configId);
      if (res.success && res.data) {
        setStats((res.data as unknown as { stats: Record<string, { count: number; size: number }> }).stats || {});
      }
    } catch {
      toast.error('获取统计失败');
    } finally {
      setStatsLoading(false);
    }
  };

  // 数据迁移
  const handleMigrate = async (configId: number, type: string) => {
    setMigrating(true);
    try {
      const res = await storageApi.migrate({ config_id: configId, type, limit: 100 });
      if (res.success && res.data) {
        const data = res.data as unknown as { migrated: number; errors: number };
        toast.success(`迁移完成: 成功 ${data.migrated} 条，失败 ${data.errors} 条`);
      } else {
        toast.error(res.message || '迁移失败');
      }
    } catch {
      toast.error('迁移失败');
    } finally {
      setMigrating(false);
    }
  };

  // 数据清理
  const handleCleanup = async (configId: number, type: string) => {
    if (!confirm(`确定清理 ${type} 目录中的旧数据？`)) return;
    setCleaning(true);
    try {
      const res = await storageApi.cleanup({ config_id: configId, type, keep_latest: 3 });
      if (res.success && res.data) {
        const data = res.data as unknown as { deleted: number; kept: number };
        toast.success(`清理完成: 删除 ${data.deleted} 个，保留 ${data.kept} 个`);
      } else {
        toast.error(res.message || '清理失败');
      }
    } catch {
      toast.error('清理失败');
    } finally {
      setCleaning(false);
    }
  };

  // 反向迁移 WebDAV → D1
  const handleReverseMigrate = async (configId: number, type: string) => {
    if (!confirm(`确定将 WebDAV 中的 ${type} 数据反向迁移到 D1？这会将文件内容写回数据库。`)) return;
    setReverseMigrating(true);
    try {
      const res = await storageApi.migrateReverse({ config_id: configId, type, limit: 100 });
      if (res.success && res.data) {
        const data = res.data as unknown as { migrated: number; errors: number; skipped: number };
        toast.success(`反向迁移完成: 成功 ${data.migrated} 条，跳过 ${data.skipped} 条，失败 ${data.errors} 条`);
      } else {
        toast.error(res.message || '反向迁移失败');
      }
    } catch {
      toast.error('反向迁移失败');
    } finally {
      setReverseMigrating(false);
    }
  };

  // 浏览 D1 数据
  const handleBrowseD1 = async (type: string, page = 1, keyword = '') => {
    setD1BrowseLoading(true);
    setD1BrowseType(type);
    try {
      const res = await storageApi.browseD1({ type, page, page_size: 20, keyword });
      if (res.success && res.data) {
        const data = res.data as unknown as { data: Array<Record<string, unknown>>; total: number; page: number; total_pages: number };
        setD1BrowseData(data.data || []);
        setD1BrowseTotal(data.total || 0);
        setD1BrowsePage(data.page || 1);
        setD1BrowseTotalPages(data.total_pages || 1);
      } else {
        toast.error(res.message || '查询失败');
      }
    } catch {
      toast.error('查询失败');
    } finally {
      setD1BrowseLoading(false);
    }
  };

  // 清理 D1 数据
  const handleCleanupD1 = async (type: string, onlyMigrated = true) => {
    const msg = onlyMigrated
      ? `确定清理 D1 中已迁移到 WebDAV 的 ${type} 数据？`
      : `确定清理选中的 ${type} 数据？`;
    if (!confirm(msg)) return;
    setD1Cleaning(true);
    try {
      const res = await storageApi.cleanupD1({ type, only_migrated: onlyMigrated });
      if (res.success && res.data) {
        const data = res.data as unknown as { deleted: number };
        toast.success(`清理完成: ${data.deleted} 条数据已标记删除`);
        handleBrowseD1(type, d1BrowsePage, d1BrowseKeyword);
      } else {
        toast.error(res.message || '清理失败');
      }
    } catch {
      toast.error('清理失败');
    } finally {
      setD1Cleaning(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const toggleStore = (store: string) => {
    setFormData((prev) => ({
      ...prev,
      stores: prev.stores.includes(store)
        ? prev.stores.filter((s) => s !== store)
        : [...prev.stores, store],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="configs" className="text-xs">
            <Settings className="mr-1.5 h-3.5 w-3.5" />
            存储配置
          </TabsTrigger>
          <TabsTrigger value="migrate" className="text-xs">
            <ArrowUpDown className="mr-1.5 h-3.5 w-3.5" />
            数据迁移
          </TabsTrigger>
        </TabsList>

        {/* ========== 存储配置 Tab ========== */}
        <TabsContent value="configs" className="space-y-4">
          {/* 说明 */}
          <Alert className="border-info/30 bg-info/10">
            <Database className="h-4 w-4 text-info" />
            <AlertDescription className="text-xs">
              配置 WebDAV 存储后，可将文章、评论、用户数据等存储到外部 WebDAV 服务，节省 D1 数据库空间。
              支持配置多个 WebDAV，分别存储不同类型的数据。
            </AlertDescription>
          </Alert>

          {/* 添加配置按钮 */}
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">存储配置</h2>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 gap-1" onClick={openCreateDialog}>
                  <Plus className="h-4 w-4" />
                  添加配置
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingConfig ? '编辑存储配置' : '添加存储配置'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                  <div className="space-y-2">
                    <Label className="text-xs">配置名称 *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="如：文章存储、图片存储"
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
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">WebDAV URL *</Label>
                    <Input
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      placeholder="https://dav.example.com/remote.php/dav/files/user"
                      className="h-9 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">用户名</Label>
                      <Input
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        placeholder="WebDAV 用户名"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">密码</Label>
                      <Input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder={editingConfig ? '留空不修改' : 'WebDAV 密码'}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">存储目录（子目录路径）</Label>
                    <Input
                      value={formData.path}
                      onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                      placeholder="如：blog-data（留空使用根目录）"
                      className="h-9 text-sm"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      在 WebDAV 根目录下的子目录，不存在会自动创建
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">存储内容类型（可多选）</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {STORE_TYPES.map((store) => (
                        <div
                          key={store.value}
                          className={`flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer transition-colors ${
                            formData.stores.includes(store.value)
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:bg-muted/50'
                          }`}
                          onClick={() => toggleStore(store.value)}
                        >
                          <Switch
                            checked={formData.stores.includes(store.value)}
                            onCheckedChange={() => toggleStore(store.value)}
                          />
                          <div>
                            <div className="text-xs font-medium">{store.label}</div>
                            <div className="text-[10px] text-muted-foreground">{store.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <div className="text-sm font-medium">设为默认存储</div>
                      <div className="text-[10px] text-muted-foreground">新数据将存储到此配置</div>
                    </div>
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
                    {editingConfig ? '更新' : '创建'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* 配置列表 */}
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
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <HardDrive className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="flex items-center gap-2 text-base">
                            {config.name}
                            {config.is_default === 1 && (
                              <Badge className="h-5 bg-primary/20 text-[10px] text-primary">默认</Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="mt-0.5 text-xs truncate max-w-[280px] sm:max-w-none">
                            {config.type.toUpperCase()} · {config.config?.url || '未配置'}
                            {config.config?.path && ` / ${config.config.path}`}
                          </CardDescription>
                          {config.config?.stores && config.config.stores.length > 0 && (
                            <div className="mt-1 flex gap-1">
                              {config.config.stores.map((s) => (
                                <Badge key={s} variant="outline" className="h-4 px-1 text-[10px]">
                                  {STORE_TYPES.find((t) => t.value === s)?.label || s}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => handleTest(config.id)}
                          disabled={testingId === config.id}
                        >
                          {testingId === config.id ? (
                            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <TestTube className="mr-1 h-3.5 w-3.5" />
                          )}
                          测试
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => {
                            setActiveTab('configs');
                            handleBrowse(config.id);
                          }}
                        >
                          <Folder className="mr-1 h-3.5 w-3.5" />
                          浏览
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => handleGetStats(config.id)}
                        >
                          <BarChart3 className="mr-1 h-3.5 w-3.5" />
                          统计
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

                    {/* 测试结果 */}
                    {testResult[config.id] && (
                      <Alert className={`mt-2 ${testResult[config.id].success ? 'border-green-500/30 bg-green-500/5' : 'border-destructive/30 bg-destructive/5'}`}>
                        <AlertDescription className="text-xs">
                          {testResult[config.id].message}
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* 统计结果 */}
                    {stats && Object.keys(stats).length > 0 && (
                      <div className="mt-3 grid grid-cols-4 gap-2">
                        {Object.entries(stats).map(([key, val]) => (
                          <div key={key} className="rounded-lg border p-2 text-center">
                            <div className="text-[10px] text-muted-foreground">
                              {STORE_TYPES.find((t) => t.value === key)?.label || key}
                            </div>
                            <div className="text-sm font-medium">{val.count} 个</div>
                            <div className="text-[10px] text-muted-foreground">{formatSize(val.size)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}

          {/* 文件浏览器 */}
          {browsingConfigId && (
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Folder className="h-4 w-4" />
                    文件浏览器
                  </CardTitle>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setShowMkdirDialog(true)}
                    >
                      <FolderPlus className="mr-1 h-3 w-3" />
                      新建目录
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleBrowse(browsingConfigId, browsingPath)}
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setBrowsingConfigId(null);
                        setBrowseItems([]);
                        setBrowsingPath('');
                        setPreviewContent(null);
                      }}
                    >
                      关闭
                    </Button>
                  </div>
                </div>

                {/* 面包屑导航 */}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <button
                    className="hover:text-foreground"
                    onClick={() => handleBrowse(browsingConfigId, '')}
                  >
                    <Home className="h-3 w-3" />
                  </button>
                  {browsingPath.split('/').filter(Boolean).map((part, i, arr) => (
                    <span key={i} className="flex items-center gap-1">
                      <ChevronRight className="h-3 w-3" />
                      <button
                        className="hover:text-foreground"
                        onClick={() => handleBrowse(browsingConfigId, arr.slice(0, i + 1).join('/'))}
                      >
                        {part}
                      </button>
                    </span>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {browseLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : browseItems.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    空目录
                  </div>
                ) : (
                  <div className="max-h-[500px] overflow-y-auto">
                    {/* 返回上一级 */}
                    {browsingPath && (
                      <div
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 cursor-pointer border-b"
                        onClick={() => {
                          const parent = browsingPath.split('/').slice(0, -1).join('/');
                          handleBrowse(browsingConfigId, parent);
                        }}
                      >
                        <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">..</span>
                      </div>
                    )}
                    {browseItems.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/50 border-b last:border-0 group"
                      >
                        <div
                          className="flex items-center gap-3 flex-1 cursor-pointer min-w-0"
                          onClick={() => {
                            if (item.isDir) {
                              handleBrowse(browsingConfigId, item.path);
                            } else {
                              handlePreview(browsingConfigId, item.path);
                            }
                          }}
                        >
                          {item.isDir ? (
                            <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-500/10">
                              <Folder className="h-4 w-4 text-blue-500" />
                            </div>
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                              <File className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{item.name}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {item.isDir ? '文件夹' : formatSize(item.size)}
                              {!item.isDir && item.lastModified && ` · ${new Date(item.lastModified).toLocaleDateString('zh-CN')}`}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {!item.isDir && (
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handlePreview(browsingConfigId, item.path)}
                              title="预览"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              setRenamingPath(item.path);
                              setNewName(item.name);
                            }}
                            title="重命名"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 text-destructive border-destructive/30"
                            onClick={() => handleDeleteItem(item.path)}
                            title="删除"
                          >
                            <Trash className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 文件预览 */}
          {previewContent && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    文件预览: {previewContent.path.split('/').pop()}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">
                      {formatSize(previewContent.size)} · {previewContent.content_type}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setPreviewContent(null)}
                    >
                      关闭
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {previewLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : previewContent.content_type.startsWith('image/') ? (
                  <div className="flex justify-center">
                    <img
                      src={`data:${previewContent.content_type};base64,${(() => { try { return btoa(previewContent.content); } catch { return btoa(unescape(encodeURIComponent(previewContent.content))); } })()}`}
                      alt=""
                      className="max-w-full max-h-[400px] rounded border"
                    />
                  </div>
                ) : (
                  <pre className="max-h-[400px] overflow-auto rounded bg-muted p-4 text-xs font-mono whitespace-pre-wrap">
                    {previewContent.content}
                  </pre>
                )}
              </CardContent>
            </Card>
          )}

          {/* 新建目录对话框 */}
          <Dialog open={showMkdirDialog} onOpenChange={setShowMkdirDialog}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>新建目录</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <Label className="text-xs">目录名称</Label>
                <Input
                  value={newDirName}
                  onChange={(e) => setNewDirName(e.target.value)}
                  placeholder="新目录名称"
                  className="h-9 text-sm mt-2"
                  onKeyDown={(e) => e.key === 'Enter' && handleMkdir()}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setShowMkdirDialog(false)}>
                  取消
                </Button>
                <Button size="sm" onClick={handleMkdir}>
                  创建
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* 重命名对话框 */}
          <Dialog open={!!renamingPath} onOpenChange={(open) => { if (!open) { setRenamingPath(null); setNewName(''); } }}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>重命名</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <Label className="text-xs">新名称</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="新名称"
                  className="h-9 text-sm mt-2"
                  onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => { setRenamingPath(null); setNewName(''); }}>
                  取消
                </Button>
                <Button size="sm" onClick={handleRename}>
                  重命名
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ========== 数据迁移 Tab ========== */}
        <TabsContent value="migrate" className="space-y-4">
          <Alert className="border-warning/30 bg-warning/10">
            <ArrowUpDown className="h-4 w-4 text-warning" />
            <AlertDescription className="text-xs">
              数据迁移功能可以将 D1 数据库中的内容迁移到 WebDAV 存储，或反向迁移。
              同时支持清理 D1 和 WebDAV 中的数据。
            </AlertDescription>
          </Alert>

          {configs.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                请先添加存储配置
              </CardContent>
            </Card>
          ) : (
            configs.map((config) => (
              <Card key={config.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    {config.name}
                    {config.is_default === 1 && (
                      <Badge className="h-5 bg-primary/20 text-[10px] text-primary">默认</Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {config.config?.url}
                    {config.config?.path && ` / ${config.config.path}`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* D1 → WebDAV 迁移 */}
                  <div>
                    <h4 className="text-sm font-medium mb-1">D1 → WebDAV 迁移</h4>
                    <p className="text-[10px] text-muted-foreground mb-2">
                      将数据库中的内容上传到 WebDAV，数据库仅保留索引
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {['posts', 'comments', 'users'].map((type) => (
                        <Button
                          key={type}
                          variant="outline"
                          size="sm"
                          className="h-9 text-xs gap-1"
                          onClick={() => handleMigrate(config.id, type)}
                          disabled={migrating}
                        >
                          {migrating ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Upload className="h-3 w-3" />
                          )}
                          迁移{STORE_TYPES.find((t) => t.value === type)?.label || type}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* WebDAV → D1 反向迁移 */}
                  <div>
                    <h4 className="text-sm font-medium mb-1">WebDAV → D1 反向迁移</h4>
                    <p className="text-[10px] text-muted-foreground mb-2">
                      将 WebDAV 中的文件内容写回 D1 数据库（已存在数据会跳过）
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {['posts', 'comments', 'users'].map((type) => (
                        <Button
                          key={type}
                          variant="outline"
                          size="sm"
                          className="h-9 text-xs gap-1"
                          onClick={() => handleReverseMigrate(config.id, type)}
                          disabled={reverseMigrating}
                        >
                          {reverseMigrating ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Download className="h-3 w-3" />
                          )}
                          反向迁移{STORE_TYPES.find((t) => t.value === type)?.label || type}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* WebDAV 数据清理 */}
                  <div>
                    <h4 className="text-sm font-medium mb-1">WebDAV 数据清理</h4>
                    <p className="text-[10px] text-muted-foreground mb-2">
                      清理 WebDAV 中的旧版本文件，每个用户保留最新 3 个版本
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {['posts', 'comments', 'users', 'images'].map((type) => (
                        <Button
                          key={type}
                          variant="outline"
                          size="sm"
                          className="h-9 text-xs gap-1"
                          onClick={() => handleCleanup(config.id, type)}
                          disabled={cleaning}
                        >
                          {cleaning ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash className="h-3 w-3" />
                          )}
                          清理{STORE_TYPES.find((t) => t.value === type)?.label || type}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* 浏览 WebDAV 数据 */}
                  <div>
                    <h4 className="text-sm font-medium mb-1">浏览 WebDAV 数据</h4>
                    <p className="text-[10px] text-muted-foreground mb-2">
                      查看 WebDAV 中存储的文件，支持预览
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 text-xs gap-1"
                      onClick={() => {
                        setActiveTab('configs');
                        handleBrowse(config.id);
                      }}
                    >
                      <Folder className="h-3 w-3" />
                      浏览文件
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}

          {/* D1 数据库管理 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-4 w-4" />
                D1 数据库管理
              </CardTitle>
              <CardDescription className="text-xs">
                浏览和清理 D1 数据库中的数据
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* D1 数据浏览 */}
              <div>
                <h4 className="text-sm font-medium mb-2">D1 数据浏览</h4>
                <div className="flex gap-2 mb-3">
                  {['posts', 'comments', 'users'].map((type) => (
                    <Button
                      key={type}
                      variant={d1BrowseType === type ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => {
                        setD1BrowsePage(1);
                        setD1BrowseKeyword('');
                        handleBrowseD1(type, 1, '');
                      }}
                    >
                      {STORE_TYPES.find((t) => t.value === type)?.label || type}
                    </Button>
                  ))}
                </div>

                <div className="flex gap-2 mb-3">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="搜索..."
                      value={d1BrowseKeyword}
                      onChange={(e) => setD1BrowseKeyword(e.target.value)}
                      className="h-8 pl-9 text-xs"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setD1BrowsePage(1);
                          handleBrowseD1(d1BrowseType, 1, d1BrowseKeyword);
                        }
                      }}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => {
                      setD1BrowsePage(1);
                      handleBrowseD1(d1BrowseType, 1, d1BrowseKeyword);
                    }}
                  >
                    搜索
                  </Button>
                  {d1BrowseTotal > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1 text-destructive border-destructive/30"
                      onClick={() => handleCleanupD1(d1BrowseType, true)}
                      disabled={d1Cleaning}
                    >
                      {d1Cleaning ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash className="h-3 w-3" />
                      )}
                      清理已迁移数据
                    </Button>
                  )}
                </div>

                {d1BrowseLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : d1BrowseData.length > 0 ? (
                  <>
                    <div className="text-xs text-muted-foreground mb-2">
                      共 {d1BrowseTotal} 条记录
                    </div>
                    <div className="max-h-[400px] overflow-y-auto rounded border">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b bg-muted/30 text-left text-muted-foreground">
                            <th className="px-3 py-2 font-medium">ID</th>
                            {d1BrowseType === 'posts' && <th className="px-3 py-2 font-medium">标题</th>}
                            {d1BrowseType === 'comments' && <th className="px-3 py-2 font-medium">帖子ID</th>}
                            {d1BrowseType === 'users' && <th className="px-3 py-2 font-medium">用户名</th>}
                            <th className="px-3 py-2 font-medium">存储Key</th>
                            <th className="px-3 py-2 font-medium">创建时间</th>
                          </tr>
                        </thead>
                        <tbody>
                          {d1BrowseData.map((row, i) => (
                            <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                              <td className="px-3 py-2 font-mono">{String(row.id)}</td>
                              {d1BrowseType === 'posts' && (
                                <td className="max-w-[200px] truncate px-3 py-2">{String(row.title || '-')}</td>
                              )}
                              {d1BrowseType === 'comments' && (
                                <td className="px-3 py-2">{String(row.post_id || '-')}</td>
                              )}
                              {d1BrowseType === 'users' && (
                                <td className="px-3 py-2">{String(row.username || '-')}</td>
                              )}
                              <td className="max-w-[150px] truncate px-3 py-2 font-mono text-muted-foreground">
                                {row.storage_key ? String(row.storage_key) : (
                                  <span className="text-yellow-500">未迁移</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">
                                {row.created_at ? new Date(String(row.created_at)).toLocaleDateString('zh-CN') : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* 分页 */}
                    {d1BrowseTotalPages > 1 && (
                      <div className="flex items-center justify-center gap-2 pt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={d1BrowsePage <= 1}
                          onClick={() => {
                            const newPage = d1BrowsePage - 1;
                            setD1BrowsePage(newPage);
                            handleBrowseD1(d1BrowseType, newPage, d1BrowseKeyword);
                          }}
                        >
                          上一页
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          {d1BrowsePage} / {d1BrowseTotalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={d1BrowsePage >= d1BrowseTotalPages}
                          onClick={() => {
                            const newPage = d1BrowsePage + 1;
                            setD1BrowsePage(newPage);
                            handleBrowseD1(d1BrowseType, newPage, d1BrowseKeyword);
                          }}
                        >
                          下一页
                        </Button>
                      </div>
                    )}
                  </>
                ) : d1BrowseTotal === 0 && d1BrowseData.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    点击上方按钮查看数据
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
