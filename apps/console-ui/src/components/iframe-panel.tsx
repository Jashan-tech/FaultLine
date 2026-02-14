'use client';

import { ExternalLink } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type IframePanelProps = {
  title: string;
  src: string;
  className?: string;
  iframeClassName?: string;
  description?: string;
};

export function IframePanel({
  title,
  src,
  className,
  iframeClassName,
  description
}: IframePanelProps): React.JSX.Element {
  const { resolvedTheme } = useTheme();

  return (
    <div className={cn('flex h-full flex-col gap-2', className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <h3 className="text-base font-semibold">{title}</h3>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            window.open(src, '_blank', 'noopener,noreferrer');
          }}
        >
          Open full screen
          <ExternalLink className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <div
        className={cn(
          'overflow-hidden rounded-lg border border-border',
          resolvedTheme === 'dark' ? 'bg-muted/20' : 'bg-card'
        )}
      >
        <iframe
          src={src}
          title={title}
          className={cn('block h-[64vh] w-full border-0', iframeClassName)}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
}
