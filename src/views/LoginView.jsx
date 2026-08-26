import React, { useState } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { showNotification } from '@/lib/notify';
import { AuthLayout } from '../components/AuthLayout';
import { useAuth } from '../context/AuthContext';

export function LoginView({ onGetStarted, onSignIn, onHome }) {
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      showNotification({ title: 'Error', message: 'Enter username and password', color: 'red' });
      return;
    }
    try {
      setLoading(true);
      await login(username, password);
      showNotification({ title: 'Welcome back!', message: 'Signed in successfully.', color: 'green' });
    } catch (err) {
      showNotification({ title: 'Sign In Failed', message: err.message, color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      onSignIn={onSignIn}
      onHome={onHome}
      title="Sign in"
      description="Use your username or email and password."
      icon={LogIn}
      footer={
        <p className="text-sm text-muted-foreground">
          New to Orbdyn?{' '}
          <button type="button" className="font-medium text-primary hover:underline" onClick={onGetStarted}>
            Get started
          </button>
        </p>
      }
    >
      <Card className="border-primary/10 bg-card/95 shadow-xl backdrop-blur">
        <CardHeader className="space-y-2 pb-3 pt-5">
          <CardTitle className="text-base">Your credentials</CardTitle>
          <CardDescription>Sign in to open your projects and switch organizations from the sidebar.</CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="username">Username or email</Label>
                <Input
                  id="username"
                  placeholder="Username or email address"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Password</Label>
                <PasswordInput
                  id="password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>

              <Button type="submit" className="mt-1 w-full" size="lg" disabled={loading}>
                {loading && <Spinner />}
                Sign in
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
