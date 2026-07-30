import { Palette, Check, Sun, Moon, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTheme, type ThemeMode } from '@/lib/theme';
import { toast } from 'sonner';

const themeOptions: { id: ThemeMode; name: string; desc: string; icon: typeof Sun }[] = [
  { id: 'light', name: '浅色模式', desc: '始终使用浅色主题', icon: Sun },
  { id: 'dark', name: '深色模式', desc: '始终使用深色主题', icon: Moon },
  { id: 'auto', name: '自动切换', desc: '18:00-06:00 深色，其余浅色', icon: Clock },
];

export default function AdminThemesPage() {
  const { theme, setTheme } = useTheme();

  const handleSetTheme = (mode: ThemeMode) => {
    setTheme(mode);
    toast.success(`已切换为${themeOptions.find((t) => t.id === mode)?.name}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold">主题管理</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          选择主题模式，自动模式会根据时间在浅色和深色之间切换
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {themeOptions.map((option) => {
          const Icon = option.icon;
          const isActive = theme === option.id;

          return (
            <Card
              key={option.id}
              className={`cursor-pointer transition-all ${
                isActive ? 'border-primary ring-1 ring-primary' : 'hover:border-muted-foreground/30'
              }`}
              onClick={() => handleSetTheme(option.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-5 w-5" />
                  </div>
                  {isActive && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                      <Check className="h-3.5 w-3.5 text-primary-foreground" />
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-sm">{option.name}</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">{option.desc}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">主题预览</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3">
            <div className="h-16 flex-1 rounded-lg bg-background border p-2">
              <div className="h-2 w-12 rounded bg-foreground" />
              <div className="mt-1 h-2 w-20 rounded bg-muted-foreground" />
            </div>
            <div className="h-16 flex-1 rounded-lg bg-card border p-2">
              <div className="h-2 w-10 rounded bg-card-foreground" />
              <div className="mt-1 h-2 w-16 rounded bg-muted" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-8 flex-1 rounded bg-primary" />
            <div className="h-8 flex-1 rounded bg-secondary" />
            <div className="h-8 flex-1 rounded bg-accent" />
          </div>
          <div className="flex gap-2">
            <div className="h-6 w-16 rounded bg-destructive" />
            <div className="h-6 w-16 rounded bg-info" />
            <div className="h-6 w-16 rounded bg-success" />
            <div className="h-6 w-16 rounded bg-warning" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
