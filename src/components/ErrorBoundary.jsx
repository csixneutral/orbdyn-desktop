import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TypographyH3, TypographyMuted } from '@/components/ui/typography';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[orbdyn] UI crashed:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    const message = this.state.error?.message || 'Something went wrong while loading Orbdyn.';

    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="flex flex-col gap-4 p-8">
            <TypographyH3 className="scroll-m-0">Orbdyn failed to load</TypographyH3>
            <TypographyMuted>{message}</TypographyMuted>
            <Button onClick={() => window.location.reload()}>Reload</Button>
          </CardContent>
        </Card>
      </div>
    );
  }
}
