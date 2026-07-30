import { Sun, Moon, Clock } from 'lucide-react';
import { useTheme } from '@/lib/theme';

export default function ThemeSwitcher() {
  const { theme, toggleTheme } = useTheme();

  const icons = {
    light: Sun,
    dark: Moon,
    auto: Clock,
  };

  const labels = {
    light: '浅色',
    dark: '深色',
    auto: '自动',
  };

  const Icon = icons[theme];

  return (
    <button
      onClick={toggleTheme}
      className="fixed right-3 z-50 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/95 shadow-md backdrop-blur-md transition-colors hover:bg-muted"
      style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))' }}
      title={`当前: ${labels[theme]}，点击切换`}
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}
