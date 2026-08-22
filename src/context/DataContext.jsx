import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { useAuth } from './AuthContext';
import { notifications } from '@mantine/notifications';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { user } = useAuth();

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
  const [shareStatus, setShareStatus] = useState({ online: false, url: null, lan: [], port: 4380 });
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
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
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchAll();
    }
  }, [user, fetchAll]);

  // Subscribe to Server-Sent Events for real-time live updates
  useEffect(() => {
    if (!user) return;
    let es;
    try {
      es = new EventSource('/api/stream');
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'notification') {
            notifications.show({
              title: data.title || 'Orbdyn',
              message: data.body || '',
              color: 'blue',
            });
            // Electron native OS notification trigger
            if (window.orbdyn?.notify) {
              window.orbdyn.notify(data.title, data.body);
            }
            fetchAll();
          } else {
            fetchAll();
          }
        } catch (_) {}
      };
      es.onerror = () => {
        es && es.close();
      };
    } catch (e) {
      console.error('SSE Error', e);
    }

    return () => {
      if (es) es.close();
    };
  }, [user, fetchAll]);

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
