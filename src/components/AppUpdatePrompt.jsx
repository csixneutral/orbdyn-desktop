import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const updatesApi = typeof window !== 'undefined' ? window.orbdyn?.updates : null;

const AppUpdateContext = createContext(null);

export function AppUpdateProvider({ children }) {
  const [currentVersion, setCurrentVersion] = useState('');
  const [nextVersion, setNextVersion] = useState('');
  const [checkStatus, setCheckStatus] = useState('idle');
  const [percent, setPercent] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [updateStarted, setUpdateStarted] = useState(false);

  useEffect(() => {
    if (!updatesApi) return undefined;

    updatesApi.getVersion?.().then((version) => {
      if (version) setCurrentVersion(version);
    });

    return updatesApi.onStatus?.((payload) => {
      if (!payload?.status) return;

      switch (payload.status) {
        case 'available':
          setNextVersion(payload.version || '');
          setCheckStatus('available');
          break;
        case 'downloading':
          setCheckStatus('downloading');
          setPercent(payload.percent || 0);
          break;
        case 'downloaded':
          setNextVersion((current) => payload.version || current);
          setCheckStatus('downloaded');
          break;
        case 'error':
          setCheckStatus('error');
          setErrorMessage(payload.message || 'Could not check for updates.');
          setUpdateStarted(false);
          break;
        case 'not-available':
          setCheckStatus('not-available');
          break;
        case 'checking':
          setCheckStatus('checking');
          break;
        default:
          break;
      }
    });
  }, []);

  useEffect(() => {
    if (!updateStarted || checkStatus !== 'downloaded') return;
    updatesApi?.install?.();
  }, [updateStarted, checkStatus]);

  const runUpdate = async () => {
    if (!updatesApi) return;
    try {
      setErrorMessage('');
      if (checkStatus === 'downloaded') {
        await updatesApi.install?.();
        return;
      }
      setUpdateStarted(true);
      setCheckStatus('downloading');
      setPercent(0);
      await updatesApi.download?.();
    } catch (err) {
      setUpdateStarted(false);
      setCheckStatus('error');
      setErrorMessage(err?.message || 'Update failed.');
    }
  };

  const value = useMemo(
    () => ({
      isDesktop: Boolean(updatesApi),
      currentVersion,
      checkStatus,
      updateVersion: nextVersion,
      downloadPercent: percent,
      errorMessage,
      checkForUpdates: () => updatesApi?.check?.(),
      downloadUpdate: () => updatesApi?.download?.(),
      installUpdate: () => updatesApi?.install?.(),
      runUpdate,
    }),
    [checkStatus, currentVersion, errorMessage, nextVersion, percent]
  );

  return <AppUpdateContext.Provider value={value}>{children}</AppUpdateContext.Provider>;
}

export function useAppUpdates() {
  const context = useContext(AppUpdateContext);
  if (!context) {
    return {
      isDesktop: false,
      currentVersion: '',
      checkStatus: 'idle',
      updateVersion: '',
      downloadPercent: 0,
      errorMessage: '',
      checkForUpdates: async () => {},
      downloadUpdate: async () => {},
      installUpdate: async () => {},
      runUpdate: async () => {},
    };
  }
  return context;
}

export function AppUpdatePrompt() {
  const { isDesktop, checkStatus, updateVersion, errorMessage, runUpdate } = useAppUpdates();

  if (!isDesktop || checkStatus !== 'error') return null;

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Update failed
          </DialogTitle>
          <DialogDescription>
            Orbdyn could not install version {updateVersion || 'the latest update'}.
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-destructive">{errorMessage}</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Close
          </Button>
          <Button onClick={runUpdate}>
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
