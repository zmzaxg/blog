import { useState } from 'react';
import { Palette, Check, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const mockThemes = [
  {
    id: 'default',
    name: '默认主题',
    description: '简洁现代的默认主题，支持深色模式',
    version: '1.0.0',
    author: '官方',
    active: true,
    colors: ['#1a1a1a', '#262626', '#ffffff', '#3b82f6'],
  },
  {
    id: 'classic',
    name: '经典博客',
    description: '传统博客风格，阅读体验佳',
    version: '1.0.0',
    author: '官方',
    active: false,
    colors: ['#ffffff', '#f5f5f5', '#1a1a1a', '#2563eb'],
  },
  {
    id: 'minimal',
    name: '极简白',
    description: '极简主义风格，内容至上',
    version: '0.9.0',
    author: '社区',
    active: false,
    colors: ['#ffffff', '#ffffff', '#000000', '#000000'],
  },
];

export default function AdminThemesPage() {
  const [themes, setThemes] = useState(mockThemes);

  const activateTheme = (id: string) => {
    setThemes(themes.map((t) => ({ ...t, active: t.id === id })));
    toast.success('主题已切换');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">主题管理</h2>
        <Button size="sm" className="h-8 gap-1" onClick={() => toast.info('主题市场开发中')}>
          <Upload className="h-4 w-4" />
          上传主题
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {themes.map((theme) => (
          <Card key={theme.id} className={theme.active ? 'border-primary ring-1 ring-primary' : ''}>
            {/* 预览区 */}
            <div
              className="relative h-32 border-b border-border"
              style={{ backgroundColor: theme.colors[0] }}
            >
              {/* 模拟预览条 */}
              <div className="absolute inset-x-3 top-3 flex gap-1.5">
                <div
                  className="h-6 w-16 rounded"
                  style={{ backgroundColor: theme.colors[2], opacity: 0.8 }}
                />
                <div
                  className="h-6 w-10 rounded"
                  style={{ backgroundColor: theme.colors[2], opacity: 0.4 }}
                />
                <div
                  className="h-6 w-10 rounded"
                  style={{ backgroundColor: theme.colors[2], opacity: 0.4 }}
                />
              </div>
              {/* 模拟内容块 */}
              <div
                className="absolute inset-x-3 bottom-3 h-16 rounded"
                style={{ backgroundColor: theme.colors[1] }}
              />
              {/* 主色点 */}
              <div
                className="absolute right-3 top-3 h-3 w-3 rounded-full"
                style={{ backgroundColor: theme.colors[3] }}
              />
              {theme.active && (
                <div className="absolute right-2 bottom-2 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">
                  <Check className="h-3 w-3" />
                  当前使用
                </div>
              )}
            </div>

            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-sm">{theme.name}</CardTitle>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>v{theme.version}</span>
                    <span>·</span>
                    <span>{theme.author}</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">
                {theme.description}
              </p>
              {theme.active ? (
                <Button variant="outline" size="sm" className="w-full h-7 text-xs" disabled>
                  <Palette className="mr-1 h-3.5 w-3.5" />
                  自定义
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-7 text-xs"
                  onClick={() => activateTheme(theme.id)}
                >
                  启用主题
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Palette className="mb-2 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">支持自定义主题，开发者可以编写主题包</p>
          <Button variant="ghost" size="sm" className="mt-1 h-7 text-xs underline">
            查看主题开发文档
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
