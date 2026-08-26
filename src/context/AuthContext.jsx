import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [user, setUser] = useState(null);
  const [orgName, setOrgName] = useState('Orbdyn Workspace');
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(null);
  const [connectionError, setConnectionError] = useState(false);
  const [migrationNeeded, setMigrationNeeded] = useState(false);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      refreshBootstrap();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const refreshBootstrap = async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setLoading(false);
      setConnectionError(false);
      return;
    }

    try {
      setLoading(true);
      setConnectionError(false);

      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        setConnectionError(true);
        setMigrationNeeded(false);
        setSetupNeeded(false);
        setUser(null);
        setWorkspaces([]);
        setActiveWorkspaceId(null);
        return;
      }

      const data = await api.getBootstrap();
      setSetupNeeded(data.setupNeeded);
      setOrgName(data.orgName || 'Orbdyn Workspace');
      setUser(data.me || null);
      setWorkspaces(data.workspaces || []);
      const active = (data.workspaces || []).find((ws) => ws.active);
      setActiveWorkspaceId(active?.id || null);
      setMigrationNeeded(false);
    } catch (err) {
      console.error('Failed to load bootstrap', err);
      if (err.code === 'MIGRATION_REQUIRED') {
        setMigrationNeeded(true);
        setConnectionError(false);
      } else {
        setConnectionError(true);
        setMigrationNeeded(false);
      }
      setSetupNeeded(false);
      setUser(null);
      setWorkspaces([]);
      setActiveWorkspaceId(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshBootstrap();

    const { data: subscription } = supabase.auth.onAuthStateChange(() => {
      refreshBootstrap();
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const login = async (username, password) => {
    const res = await api.login({ username, password });
    setUser(res.user);
    const boot = await api.getBootstrap();
    setOrgName(boot.orgName || 'Orbdyn Workspace');
    setWorkspaces(boot.workspaces || []);
    const active = (boot.workspaces || []).find((ws) => ws.active);
    setActiveWorkspaceId(active?.id || null);
    return res;
  };

  const setup = async (payload) => {
    const res = await api.setup(payload);
    setUser(res.user);
    if (res.orgName) setOrgName(res.orgName);
    setSetupNeeded(false);
    const boot = await api.getBootstrap();
    setWorkspaces(boot.workspaces || []);
    const active = (boot.workspaces || []).find((ws) => ws.active);
    setActiveWorkspaceId(active?.id || null);
    return res;
  };

  const switchWorkspace = async (workspaceId) => {
    const res = await api.switchWorkspace(workspaceId);
    setUser(res.user);
    setOrgName(res.orgName);
    setActiveWorkspaceId(res.workspaceId);
    setWorkspaces((prev) =>
      prev.map((ws) => ({
        ...ws,
        active: ws.id === res.workspaceId,
      }))
    );
    return res;
  };

  const createOrganization = async (payload) => {
    const res = await api.createOrganization(payload);
    setUser(res.user);
    setOrgName(res.orgName);
    setActiveWorkspaceId(res.workspaceId);
    const { workspaces: nextWorkspaces } = await api.listWorkspaces();
    setWorkspaces(nextWorkspaces || []);
    return res;
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    setWorkspaces([]);
    setActiveWorkspaceId(null);
    await refreshBootstrap();
  };

  return (
    <AuthContext.Provider
      value={{
        loading,
        setupNeeded,
        user,
        orgName,
        workspaces,
        activeWorkspaceId,
        connectionError,
        migrationNeeded,
        isOnline,
        login,
        setup,
        logout,
        switchWorkspace,
        createOrganization,
        refreshBootstrap,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
