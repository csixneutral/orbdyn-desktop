import React from 'react';
import { Spinner } from '@/components/ui/spinner';
import { TypographyMuted } from '@/components/ui/typography';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';
import { cn } from '@/lib/utils';

export function LoadingScreen({ label = 'Loading...', className }) {
  return (
    <div className={cn('flex min-h-screen flex-col items-center justify-center bg-background', className)}>
      <Spinner className="size-8 text-primary" />
      <TypographyMuted className="mt-3">{label}</TypographyMuted>
    </div>
  );
}

export function ApiLoadingOverlay({ loading, label = 'Loading...', className }) {
  const show = useDelayedLoading(loading);

  if (!show) return null;

  return (
    <div
      className={cn(
        'absolute inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-[1px]',
        className
      )}
    >
      <div className="flex flex-col items-center gap-3 rounded-lg border bg-card/90 px-6 py-5 shadow-lg">
        <Spinner className="size-8 text-primary" />
        <TypographyMuted className="text-sm">{label}</TypographyMuted>
      </div>
    </div>
  );
}
