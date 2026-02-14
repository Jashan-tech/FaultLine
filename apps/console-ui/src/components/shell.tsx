'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Overview' },
  { href: '/services', label: 'Services' },
  { href: '/explore', label: 'Explore' },
  { href: '/alerts', label: 'Alerts' },
  { href: '/config', label: 'Config' },
  { href: '/health', label: 'Health' }
];

export function Shell({ children }: { children: React.ReactNode }): React.JSX.Element {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="w-60 border-r border-border p-4">
        <div className="mb-6">
          <h1 className="text-lg font-semibold">FaultLine Console</h1>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'block rounded-md px-3 py-2 text-sm transition-colors',
                pathname === item.href ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <p className="mt-8 text-xs text-muted-foreground">Powered by Grafana and OSS</p>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-border px-5 py-2.5">
          <Input placeholder="Search" className="max-w-xs" />
          <ThemeToggle />
        </header>
        <main className="px-5 pb-5 pt-3">{children}</main>
      </div>
    </div>
  );
}
