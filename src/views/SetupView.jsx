import React, { useState } from 'react';
import { Building2, KeyRound, ShieldCheck, Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { showNotification } from '@/lib/notify';
import { AuthLayout } from '../components/AuthLayout';
import { useAuth } from '../context/AuthContext';

const TOTAL_STEPS = 2;

export function SetupView({ onBack, onSignIn }) {
  const { setup } = useAuth();

  const [step, setStep] = useState(1);
  const [orgName, setOrgName] = useState('My Team');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      return;
    }
    onBack?.();
  };

  const handleContinue = (e) => {
    e.preventDefault();
    if (!orgName.trim() || !name.trim()) {
      showNotification({ title: 'Error', message: 'Please fill in all fields', color: 'red' });
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password || !email.trim()) {
      showNotification({ title: 'Error', message: 'Please fill in all fields', color: 'red' });
      return;
    }
    if (password.length < 6) {
      showNotification({ title: 'Error', message: 'Password must be at least 6 characters', color: 'red' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      showNotification({ title: 'Error', message: 'Enter a valid email address', color: 'red' });
      return;
    }
    try {
      setLoading(true);
      await setup({ orgName, name, username, password, email: email.trim() });
      showNotification({
        title: 'Welcome to Orbdyn!',
        message: 'Your account is ready. Create your first project.',
        color: 'green',
      });
    } catch (err) {
      showNotification({ title: 'Setup Failed', message: err.message, color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      onBack={handleBack}
      step={step}
      totalSteps={TOTAL_STEPS}
      title={step === 1 ? 'About your team' : 'Create your login'}
      description={
        step === 1
          ? 'Start with your team name and your full name.'
          : 'Choose a username, password, and your sign-in email.'
      }
      icon={step === 1 ? Building2 : KeyRound}
      footer={
        onSignIn ? (
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <button type="button" className="font-medium text-primary hover:underline" onClick={onSignIn}>
              Sign in
            </button>
          </p>
        ) : null
      }
    >
      <Card className="border-primary/10 bg-card/95 shadow-xl backdrop-blur">
        {step === 1 ? (
          <>
            <CardHeader className="space-y-1 pb-3 pt-5">
              <CardTitle className="text-base">Step 1 — Team info</CardTitle>
              <CardDescription>This name appears across your Orbdyn workspace.</CardDescription>
            </CardHeader>
            <CardContent className="pb-6">
              <form onSubmit={handleContinue}>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="orgName">Team / company name</Label>
                    <Input
                      id="orgName"
                      placeholder="e.g. Acme Studio"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="name">Your full name</Label>
                    <Input
                      id="name"
                      placeholder="e.g. Alex Morgan"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  <Button type="submit" className="mt-1 w-full" size="lg">
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader className="space-y-1 pb-3 pt-5">
              <CardTitle className="text-base">Step 2 — Login details</CardTitle>
              <CardDescription>Sign-in credentials and your contact email.</CardDescription>
            </CardHeader>
            <CardContent className="pb-6">
              <form onSubmit={handleSubmit}>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      placeholder="e.g. alex"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      autoComplete="username"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="e.g. alex@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Used to sign in to Orbdyn (your username is for display inside the app).
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="password">Password</Label>
                    <PasswordInput
                      id="password"
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                    />
                  </div>

                  <div className="flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Secured with Supabase Auth. Use a strong password you will remember.
                    </p>
                  </div>

                  <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      className="w-full sm:flex-1"
                      onClick={() => setStep(1)}
                      disabled={loading}
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button type="submit" className="w-full sm:flex-1" size="lg" disabled={loading}>
                      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                      Create account
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </>
        )}
      </Card>
    </AuthLayout>
  );
}
