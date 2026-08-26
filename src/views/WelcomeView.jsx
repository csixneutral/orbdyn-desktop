import React from 'react';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  FileText,
  FolderKanban,
  Sparkles,
  Users,
} from 'lucide-react';
import { MarketingHeader } from '@/components/MarketingHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TypographyH1, TypographyLead, TypographyMuted, TypographySmall } from '@/components/ui/typography';

const features = [
  {
    icon: FolderKanban,
    title: 'Projects first',
    description: 'Create a project, then manage tasks, docs, and your team inside it.',
  },
  {
    icon: CheckCircle2,
    title: 'Tasks & kanban',
    description: 'Track work with boards, assignees, priorities, and due dates.',
  },
  {
    icon: FileText,
    title: 'Shared documents',
    description: 'Upload files per project and preview them with your team.',
  },
  {
    icon: Calendar,
    title: 'Calendar',
    description: 'Plan milestones, meetings, and deadlines in one place.',
  },
  {
    icon: Users,
    title: 'Team collaboration',
    description: 'Invite people, assign roles, and stay aligned on every project.',
  },
];

export function WelcomeView({ onGetStarted, onSignIn }) {
  return (
    <div className="relative min-h-screen bg-background">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-10">
        <MarketingHeader onSignIn={onSignIn} />

        <main className="my-12 flex flex-1 flex-col items-center justify-center gap-12 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl space-y-6 text-center lg:text-left">
            <Badge variant="secondary" className="gap-1 px-3 py-1">
              <Sparkles className="h-3.5 w-3.5" />
              Team workspace
            </Badge>
            <TypographyH1>Plan projects. Ship work. Stay in sync.</TypographyH1>
            <TypographyLead>
              Orbdyn helps your team organize projects with tasks, documents, calendar events, and people —
              all in one place.
            </TypographyLead>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Button size="lg" className="gap-2" onClick={onGetStarted}>
                Get started
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={onSignIn}>
                Sign in
              </Button>
            </div>
            <TypographyMuted className="text-sm">
              Get started to create a new organization and account. Sign in if you already have one — you can
              switch between organizations after you log in.
            </TypographyMuted>
          </div>

          <Card className="w-full max-w-md border-primary/10 bg-card/80 shadow-xl backdrop-blur">
            <CardContent className="space-y-4 p-6">
              <TypographySmall className="uppercase tracking-wide text-muted-foreground">
                Inside every project
              </TypographySmall>
              <div className="grid gap-3">
                {features.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <div key={feature.title} className="flex gap-3 rounded-lg border bg-background/60 p-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <TypographySmall>{feature.title}</TypographySmall>
                        <TypographyMuted className="text-xs">{feature.description}</TypographyMuted>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </main>

        <footer className="text-center">
          <TypographyMuted className="text-xs">
            One account can belong to multiple organizations. Use the workspace menu to switch after sign-in.
          </TypographyMuted>
        </footer>
      </div>
    </div>
  );
}

