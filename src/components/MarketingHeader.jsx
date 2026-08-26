import React from 'react';
import { AppLogo } from '@/components/AppLogo';
import { Button } from '@/components/ui/button';
import { TypographyLarge, TypographyMuted } from '@/components/ui/typography';

export function MarketingHeader({ onSignIn, onHome }) {
  const brand = (
    <>
      <AppLogo size="md" />
      <div>
        <TypographyLarge>Orbdyn</TypographyLarge>
        <TypographyMuted className="text-xs">Team workspace</TypographyMuted>
      </div>
    </>
  );

  return (
    <header className="flex items-center justify-between">
      {onHome ? (
        <button
          type="button"
          onClick={onHome}
          className="flex items-center gap-3 rounded-lg text-left transition-opacity hover:opacity-90"
        >
          {brand}
        </button>
      ) : (
        <div className="flex items-center gap-3">{brand}</div>
      )}
      {onSignIn ? (
        <Button variant="outline" onClick={onSignIn}>
          Sign in
        </Button>
      ) : null}
    </header>
  );
}
