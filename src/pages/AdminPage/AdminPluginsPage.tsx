import { Package, Plus, Download, Settings, ToggleLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

const mockPlugins = [
  {
    id: 1,
    name: 'Markdown 增强',
    description: '为 Markdown 编辑器增加更多语法支持，如数学公式、流程图、图表等',
    version: '1.2.0',
    author: '官方',
    enabled: true,
  },
  {
    id: 2,
    name: 'SEO 优化',
    description: '自动生成页面元信息、sitemap、robots.txt，提升搜索引擎收录',
    version: '1.0.0',
    author: '官方',
    enabled: false,
  },
  {
    id: 3,
    name: '评论通知',
    description: '有新评论时通过邮件或 Webhook 通知作者',
    version: '0.9.0',
    author: '社区',
    enabled: false,
  },
];

export default function AdminPluginsPage() {
  const togglePlugin = (id: number) => {
    toast.success('插件状态已更新');
  };

  return (
    <div className="space-y-4 overflow-x-hidden">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">插件管理</h2>
        <Button size="sm" className="h-8 gap-1" onClick={() => toast.info('插件市场开发中')}>
          <Plus className="h-4 w-4" />
          安装插件
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {mockPlugins.map((plugin) => (
          <Card key={plugin.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{plugin.name}</CardTitle>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>v{plugin.version}</span>
                      <span>·</span>
                      <span>{plugin.author}</span>
                    </div>
                  </div>
                </div>
                <Switch
                  checked={plugin.enabled}
                  onCheckedChange={() => togglePlugin(plugin.id)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-muted-foreground">{plugin.description}</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  <Settings className="mr-1 h-3.5 w-3.5" />
                  设置
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  <Download className="mr-1 h-3.5 w-3.5" />
                  更新
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Package className="mb-2 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">支持插件扩展，开发者可以编写自定义插件</p>
          <Button variant="ghost" size="sm" className="mt-1 h-7 text-xs underline">
            查看插件开发文档
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
