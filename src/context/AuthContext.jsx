import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [user, setUser] = useState(null);
  const [orgName, setOrgName] = useState('Orbdyn Workspace');
  const [dataFolder, setDataFolder] = useState('');
  const [connectionError, setConnectionError] = useState(false);

  const refreshBootstrap = async () => {
    try {
      setLoading(true);
      setConnectionError(false);
      const data = await api.getBootstrap();
      setSetupNeeded(data.setupNeeded);
      setOrgName(data.orgName || 'Orbdyn Workspace');
      setDataFolder(data.dataFolder || '');
      setUser(data.me || null);
    } catch (err) {
      console.error('Failed to load bootstrap', err);
      setConnectionError(true);
      setSetupNeeded(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshBootstrap();
  }, []);

  const login = async (username, password) => {
    const res = await api.login({ username, password });
    setUser(res.user);
    setSetupNeeded(false);
    return res;
  };

  const setup = async (payload) => {
    const res = await api.setup(payload);
    setUser(res.user);
    if (res.orgName) setOrgName(res.orgName);
    setSetupNeeded(false);
    return res;
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        loading,
        setupNeeded,
        user,
        orgName,
        dataFolder,
        connectionError,
        login,
        setup,
        logout,
        refreshBootstrap,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
