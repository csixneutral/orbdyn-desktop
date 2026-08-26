import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { App } from './App';
import { AppUpdateProvider, AppUpdatePrompt } from './components/AppUpdatePrompt';
import { ErrorBoundary } from './components/ErrorBoundary';

import '@fontsource-variable/inter';

import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <Toaster position="bottom-right" richColors closeButton />
        <AuthProvider>
          <AppUpdateProvider>
            <DataProvider>
              <App />
              <AppUpdatePrompt />
            </DataProvider>
          </AppUpdateProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
