import * as React from 'react';
import { cn } from '@/lib/utils';

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>): React.JSX.Element {
  return (
    <span
      className={cn('inline-flex rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs text-muted-foreground', className)}
      {...props}
    />
  );
}
