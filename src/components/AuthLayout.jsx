import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TypographyH3, TypographyMuted } from '@/components/ui/typography';
import { cn } from '@/lib/utils';

export function AuthLayout({
  onBack,
  title,
  description,
  icon: Icon,
  iconClassName,
  step,
  totalSteps = 1,
  children,
  footer,
}) {
  return (
    <div className="relative h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex h-full w-full max-w-lg flex-col px-4 py-4 sm:px-6">
        <header className="shrink-0 pt-1">
          {onBack ? (
            <Button variant="ghost" size="sm" className="gap-1.5 px-2" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          ) : null}
        </header>

        <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 py-2">
          {totalSteps > 1 && (
            <div className="w-full max-w-[440px] shrink-0">
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Step {step} of {totalSteps}
                </span>
                <span>{step === 1 ? 'Team info' : 'Login details'}</span>
              </div>
              <div className="flex gap-2">
                {Array.from({ length: totalSteps }, (_, index) => (
                  <div
                    key={index}
                    className={cn(
                      'h-1.5 flex-1 rounded-full transition-colors',
                      index < step ? 'bg-primary' : 'bg-muted'
                    )}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="w-full max-w-[440px] shrink-0 text-center">
            {Icon && (
              <div
                className={cn(
                  'mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground',
                  iconClassName
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
            )}
            <TypographyH3 className="scroll-m-0">{title}</TypographyH3>
            {description && (
              <TypographyMuted className="mx-auto mt-1.5 max-w-sm">{description}</TypographyMuted>
            )}
          </div>

          <div className="w-full max-w-[440px] shrink-0">{children}</div>

          {footer && <div className="w-full max-w-[440px] shrink-0 pt-1 text-center">{footer}</div>}
        </main>
      </div>
    </div>
  );
}
