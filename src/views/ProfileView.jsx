import React, { useState } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { Shield, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { PageHeader, TypographyH4, TypographyMuted, TypographySmall } from '@/components/ui/typography';
import { cn } from '@/lib/utils';
import { showNotification } from '@/lib/notify.js';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { getRoleShortLabel } from '@/lib/roles';

const AVATAR_COLORS = {
  blue: 'bg-blue-600 text-white',
  green: 'bg-green-600 text-white',
  red: 'bg-red-600 text-white',
  yellow: 'bg-yellow-600 text-white',
  violet: 'bg-violet-600 text-white',
  cyan: 'bg-cyan-600 text-white',
  gray: 'bg-muted text-foreground',
};

export function ProfileView() {
  const { user, orgName } = useAuth();
  const avatarColorClass = AVATAR_COLORS[user?.color] || AVATAR_COLORS.blue;

  const [currentPassword, setCurrentPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!currentPassword || !nextPassword) return;
    try {
      setPasswordLoading(true);
      await api.updatePassword({ current: currentPassword, next: nextPassword });
      showNotification({ title: 'Success', message: 'Your password has been changed', color: 'green' });
      setCurrentPassword('');
      setNextPassword('');
    } catch (err) {
      showNotification({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Profile" description="Your account details and security settings" />

      <Card>
        <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
          <Avatar className="h-20 w-20 rounded-xl">
            <AvatarFallback className={cn('rounded-xl text-2xl font-semibold', avatarColorClass)}>
              {user?.name ? user.name[0].toUpperCase() : '?'}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-3">
            <div>
              <TypographyH4 className="scroll-m-0 border-0 pb-0">{user?.name || 'User'}</TypographyH4>
              <TypographyMuted>@{user?.username}</TypographyMuted>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="capitalize">
                {getRoleShortLabel(user?.role || 'manager')}
              </Badge>
              {orgName ? <Badge variant="outline">{orgName}</Badge> : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center gap-2">
            <UserRound className="h-4 w-4 text-primary" />
            <TypographyH4 className="scroll-m-0 border-0 pb-0 text-base">Account details</TypographyH4>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <TypographyMuted className="text-xs">Display name</TypographyMuted>
              <TypographySmall className="mt-1 block">{user?.name || '-'}</TypographySmall>
            </div>
            <div>
              <TypographyMuted className="text-xs">Username</TypographyMuted>
              <TypographySmall className="mt-1 block">@{user?.username || '-'}</TypographySmall>
            </div>
            <div>
              <TypographyMuted className="text-xs">Email</TypographyMuted>
              <TypographySmall className="mt-1 block">{user?.email || 'Not set'}</TypographySmall>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <TypographyH4 className="scroll-m-0 border-0 pb-0 text-base">Change Password</TypographyH4>
          </div>
          <form onSubmit={handlePasswordChange}>
            <div className="flex max-w-[400px] flex-col gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="current-password">Current password</Label>
                <PasswordInput
                  id="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-password">New password</Label>
                <PasswordInput
                  id="new-password"
                  value={nextPassword}
                  onChange={(e) => setNextPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={passwordLoading} className="w-fit">
                {passwordLoading && <Spinner />}
                Update password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
