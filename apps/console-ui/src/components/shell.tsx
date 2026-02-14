'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { ServiceSelector } from '@/components/service-selector';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Overview' },
  { href: '/getting-started', label: 'Getting Started' },
  { href: '/services', label: 'Services' },
  { href: '/explore', label: 'Explore' },
  { href: '/alerts', label: 'Alerts' },
  { href: '/config', label: 'Config' },
  { href: '/health', label: 'Health' }
];

export function Shell({ children }: { children: React.ReactNode }): React.JSX.Element {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-muted/35 text-foreground">
      <aside className="w-60 border-r border-border bg-card/85 p-3.5">
        <div className="mb-4 border-b border-border pb-3">
          <h1 className="text-base font-semibold tracking-tight">FaultLine Console</h1>
        </div>
        <nav className="space-y-0.5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'block rounded-sm border-l-2 border-transparent px-2.5 py-1.5 text-sm transition-colors',
                pathname === item.href
                  ? 'border-primary/70 bg-accent/60 text-foreground'
                  : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <p className="mt-6 border-t border-border pt-3 text-xs text-muted-foreground">Powered by Grafana and OSS</p>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-border bg-card/70 px-4 py-2">
          <Input placeholder="Search" className="h-8 max-w-xs bg-background" />
          <div className="flex items-center gap-3">
            <ServiceSelector />
            <ThemeToggle />
          </div>
        </header>
        <main className="px-4 pb-4 pt-3">{children}</main>
      </div>
    </div>
  );
}
