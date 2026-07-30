import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';

export type ThemeMode = 'dark' | 'light' | 'auto';

interface ThemeContextValue {
  theme: ThemeMode;
  resolvedTheme: 'dark' | 'light'; // 实际应用的主题
  toggleTheme: () => void;
  setTheme: (t: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'theme';

function getStoredTheme(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'auto') return stored;
  return 'light';
}

function setStoredTheme(theme: ThemeMode) {
  localStorage.setItem(STORAGE_KEY, theme);
}

// 根据时间判断应该使用深色还是浅色
// 18:00 - 06:00 使用深色，06:00 - 18:00 使用浅色
function getTimeBasedTheme(): 'dark' | 'light' {
  const hour = new Date().getHours();
  return hour >= 18 || hour < 6 ? 'dark' : 'light';
}

function resolveTheme(theme: ThemeMode): 'dark' | 'light' {
  if (theme === 'auto') {
    return getTimeBasedTheme();
  }
  return theme;
}

function applyTheme(resolved: 'dark' | 'light') {
  const root = document.documentElement;
  if (resolved === 'light') {
    root.classList.add('light');
    root.style.colorScheme = 'light';
  } else {
    root.classList.remove('light');
    root.style.colorScheme = 'dark';
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => getStoredTheme());
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>(() => resolveTheme(getStoredTheme()));

  // 应用主题
  useEffect(() => {
    const resolved = resolveTheme(theme);
    setResolvedTheme(resolved);
    applyTheme(resolved);
    setStoredTheme(theme);
  }, [theme]);

  // auto 模式下每分钟检查一次时间
  useEffect(() => {
    if (theme !== 'auto') return;

    const interval = setInterval(() => {
      const resolved = resolveTheme('auto');
      setResolvedTheme(resolved);
      applyTheme(resolved);
    }, 60 * 1000); // 每分钟检查

    return () => clearInterval(interval);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      if (prev === 'dark') return 'light';
      if (prev === 'light') return 'auto';
      return 'dark';
    });
  }, []);

  const setTheme = useCallback((t: ThemeMode) => {
    setThemeState(t);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
