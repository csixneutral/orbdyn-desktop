import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { showNotification } from '@/lib/notify';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { user, activeWorkspaceId } = useAuth();

  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [files, setFiles] = useState([]);
  const [events, setEvents] = useState([]);
  const [activity, setActivity] = useState([]);
  const [trash, setTrash] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notificationList, setNotificationList] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [shareStatus, setShareStatus] = useState({ online: true, url: null, lan: [], port: null, cloud: true });
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async (options = {}) => {
    const { silent = false } = options;
    if (!user) return;
    try {
      if (!silent) setLoading(true);
      const [pRes, tRes, uRes, fRes, eRes, aRes, nRes, dRes, sRes, trRes] = await Promise.allSettled([
        api.getProjects(),
        api.getTasks(),
        api.getUsers(),
        api.getFiles(),
        api.getEvents(),
        api.getActivity(),
        api.getNotifications(),
        api.getDashboard(),
        api.getShareStatus(),
        api.getTrash(),
      ]);

      if (pRes.status === 'fulfilled') setProjects(pRes.value.projects || []);
      if (tRes.status === 'fulfilled') setTasks(tRes.value.tasks || []);
      if (uRes.status === 'fulfilled') setUsers(uRes.value.users || []);
      if (fRes.status === 'fulfilled') setFiles(fRes.value.files || []);
      if (eRes.status === 'fulfilled') setEvents(eRes.value.events || []);
      if (aRes.status === 'fulfilled') setActivity(aRes.value.activity || []);
      if (trRes.status === 'fulfilled') setTrash(trRes.value.trash || []);
      if (nRes.status === 'fulfilled') {
        setNotificationList(nRes.value.notifications || []);
        setUnreadNotifications(nRes.value.unread || 0);
      }
      if (dRes.status === 'fulfilled') setDashboardData(dRes.value);
      if (sRes.status === 'fulfilled') setShareStatus(sRes.value);
    } catch (err) {
      console.error('Error fetching workspace data', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchAll();
    else {
      setProjects([]);
      setTasks([]);
      setUsers([]);
      setFiles([]);
      setEvents([]);
      setActivity([]);
      setTrash([]);
      setUnreadNotifications(0);
      setNotificationList([]);
      setDashboardData(null);
    }
  }, [user, activeWorkspaceId, fetchAll]);

  useEffect(() => {
    if (!user?.id) return;

    const tables = [
      'profiles',
      'projects',
      'tasks',
      'comments',
      'files',
      'events',
      'activity_log',
      'trash_items',
    ];

    const channel = supabase.channel(`orbdyn-${user.id}`);

    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
      (payload) => {
        const row = payload.new;
        showNotification({
          title: row.title || 'Orbdyn',
          message: row.body || '',
          color: 'blue',
        });
        if (window.orbdyn?.notify) {
          window.orbdyn.notify(row.title, row.body);
        }
        fetchAll({ silent: true });
      }
    );

    tables.forEach((table) => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        fetchAll({ silent: true });
      });
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchAll]);

  return (
    <DataContext.Provider
      value={{
        projects,
        tasks,
        users,
        files,
        events,
        activity,
        trash,
        notificationList,
        unreadNotifications,
        dashboardData,
        shareStatus,
        loading,
        refresh: fetchAll,
        setShareStatus,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}
