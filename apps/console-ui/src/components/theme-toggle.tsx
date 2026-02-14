'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

export function ThemeToggle(): React.JSX.Element {
  const { theme, setTheme } = useTheme();
  const dark = theme === 'dark';

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      aria-label="Toggle theme"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
