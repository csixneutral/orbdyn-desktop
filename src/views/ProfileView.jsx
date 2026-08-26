import React, { useEffect, useRef, useState } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { Camera, Shield, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PasswordInput } from '@/components/ui/password-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { PageHeader, TypographyH4, TypographyMuted, TypographySmall } from '@/components/ui/typography';
import { cn } from '@/lib/utils';
import { showNotification } from '@/lib/notify.js';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
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
  const { user, orgName, setUser } = useAuth();
  const { refresh } = useData();
  const avatarColorClass = AVATAR_COLORS[user?.color] || AVATAR_COLORS.blue;
  const fileInputRef = useRef(null);

  const [name, setName] = useState(user?.name || '');
  const [avatarImageUrl, setAvatarImageUrl] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    setName(user?.name || '');
  }, [user?.name]);

  useEffect(() => {
    let cancelled = false;

    async function loadAvatar() {
      if (!user?.avatarUrl) {
        setAvatarImageUrl(null);
        return;
      }
      const url = await api.getAvatarUrl(user.avatarUrl);
      if (!cancelled) setAvatarImageUrl(url);
    }

    loadAvatar();
    return () => {
      cancelled = true;
    };
  }, [user?.avatarUrl]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showNotification({ title: 'Error', message: 'Name is required', color: 'red' });
      return;
    }
    try {
      setProfileLoading(true);
      const { user: updatedUser } = await api.updateProfile({ name });
      setUser(updatedUser);
      refresh();
      showNotification({ title: 'Success', message: 'Profile updated', color: 'green' });
    } catch (err) {
      showNotification({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePhotoSelect = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      setPhotoLoading(true);
      const { user: updatedUser } = await api.updateProfile({ avatarFile: file });
      setUser(updatedUser);
      refresh();
      showNotification({ title: 'Success', message: 'Profile photo updated', color: 'green' });
    } catch (err) {
      showNotification({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleRemovePhoto = async () => {
    try {
      setPhotoLoading(true);
      const { user: updatedUser } = await api.updateProfile({ removeAvatar: true });
      setUser(updatedUser);
      setAvatarImageUrl(null);
      refresh();
      showNotification({ title: 'Removed', message: 'Profile photo removed', color: 'blue' });
    } catch (err) {
      showNotification({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setPhotoLoading(false);
    }
  };

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
        <CardContent className="space-y-6 p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <div className="relative shrink-0">
              <Avatar className="h-24 w-24 rounded-xl">
                {avatarImageUrl ? <AvatarImage src={avatarImageUrl} alt={user?.name || 'Profile'} className="rounded-xl object-cover" /> : null}
                <AvatarFallback className={cn('rounded-xl text-2xl font-semibold', avatarColorClass)}>
                  {user?.name ? user.name[0].toUpperCase() : '?'}
                </AvatarFallback>
              </Avatar>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full shadow"
                disabled={photoLoading}
                onClick={() => fileInputRef.current?.click()}
              >
                {photoLoading ? <Spinner className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={handlePhotoSelect}
              />
            </div>

            <div className="flex-1 space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="capitalize">
                  {getRoleShortLabel(user?.role || 'manager')}
                </Badge>
                {orgName ? <Badge variant="outline">{orgName}</Badge> : null}
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="profile-name">Display name</Label>
                  <Input
                    id="profile-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    required
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={profileLoading || name.trim() === (user?.name || '')}>
                    {profileLoading && <Spinner />}
                    Save profile
                  </Button>
                  {user?.avatarUrl ? (
                    <Button type="button" variant="outline" disabled={photoLoading} onClick={handleRemovePhoto}>
                      Remove photo
                    </Button>
                  ) : null}
                </div>
              </form>
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
              <TypographyMuted className="text-xs">Username</TypographyMuted>
              <TypographySmall className="mt-1 block">@{user?.username || '-'}</TypographySmall>
            </div>
            <div>
              <TypographyMuted className="text-xs">Email</TypographyMuted>
              <TypographySmall className="mt-1 block">{user?.email || 'Not set'}</TypographySmall>
            </div>
            <div>
              <TypographyMuted className="text-xs">Username cannot be changed</TypographyMuted>
              <TypographyMuted className="mt-1 block text-xs">Contact an admin if you need account changes.</TypographyMuted>
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
