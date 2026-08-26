import React, { useState } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { Cloud, Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PageHeader, TypographyH4, TypographyMuted, TypographySmall } from '@/components/ui/typography';
import { showNotification } from '@/lib/notify.js';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { useAppUpdates } from '../components/AppUpdatePrompt';

export function SettingsView() {
  const { user } = useAuth();
  const {
    isDesktop,
    currentVersion,
    checkStatus,
    updateVersion,
    downloadPercent,
    errorMessage,
    checkForUpdates,
    runUpdate,
  } = useAppUpdates();

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
      <PageHeader
        title="Settings"
        description="Manage your account and workspace preferences"
      />

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-start gap-3">
            <Cloud className="mt-0.5 h-6 w-6 text-primary" />
            <div>
              <TypographyH4 className="scroll-m-0 border-0 pb-0">Supabase Cloud Backend</TypographyH4>
              <TypographyMuted className="text-xs">
                Your workspace data, files, and notifications are stored in Supabase and sync in real time across devices.
              </TypographyMuted>
            </div>
          </div>
          <Alert>
            <AlertTitle>Internet required</AlertTitle>
            <AlertDescription>
              Orbdyn runs online. Sign in from the desktop app or web with your team credentials — an active internet connection is required.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {isDesktop && (
        <Card>
          <CardContent className="space-y-4 p-4">
            <TypographyH4 className="scroll-m-0 border-0 pb-0">Desktop App Updates</TypographyH4>
            <TypographyMuted className="text-xs">
              Installed version: {currentVersion || 'Unknown'}
            </TypographyMuted>

            {checkStatus === 'available' && (
              <Alert>
                <AlertTitle>Update available</AlertTitle>
                <AlertDescription>
                  Orbdyn {updateVersion} is ready to download.
                </AlertDescription>
              </Alert>
            )}

            {checkStatus === 'not-available' && (
              <TypographyMuted className="text-sm">You are on the latest version.</TypographyMuted>
            )}

            {checkStatus === 'downloading' && (
              <TypographyMuted className="text-sm">
                Downloading update… {downloadPercent}%
              </TypographyMuted>
            )}

            {checkStatus === 'downloaded' && (
              <Alert>
                <AlertTitle>Update downloaded</AlertTitle>
                <AlertDescription>
                  Orbdyn {updateVersion} is ready. Restart to install.
                </AlertDescription>
              </Alert>
            )}

            {checkStatus === 'error' && (
              <TypographyMuted className="text-sm text-destructive">{errorMessage}</TypographyMuted>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={checkStatus === 'checking' || checkStatus === 'downloading'}
                onClick={async () => {
                  try {
                    await checkForUpdates();
                  } catch (err) {
                    showNotification({ title: 'Update check failed', message: err.message, color: 'red' });
                  }
                }}
              >
                {checkStatus === 'checking' ? <Spinner /> : <RefreshCw className="h-4 w-4" />}
                Check for updates
              </Button>

              {checkStatus === 'downloaded' && (
                <Button onClick={runUpdate}>
                  <RefreshCw className="h-4 w-4" />
                  Restart & install
                </Button>
              )}

              {checkStatus === 'available' && (
                <Button onClick={runUpdate}>
                  <Download className="h-4 w-4" />
                  Download & install
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <TypographyH4 className="mb-4 scroll-m-0 border-0 pb-0">Change Password</TypographyH4>
          <form onSubmit={handlePasswordChange}>
            <div className="flex max-w-[400px] flex-col gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="current-password">Current Password</Label>
                <PasswordInput
                  id="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-password">New Password</Label>
                <PasswordInput
                  id="new-password"
                  value={nextPassword}
                  onChange={(e) => setNextPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={passwordLoading} className="w-fit">
                {passwordLoading && <Spinner />}
                Update Password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <TypographyMuted className="text-xs">Signed in as</TypographyMuted>
          <TypographySmall className="mt-1 block">{user?.name} ({user?.username})</TypographySmall>
          <TypographyMuted className="capitalize">{user?.role}</TypographyMuted>
        </CardContent>
      </Card>
    </div>
  );
}
