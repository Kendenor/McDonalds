"use client";
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AlertTriangle, User, Lock } from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { generateEmailAddress, getAuthErrorMessage } from '@/lib/utils';

function McDonaldLogo({ className }: { className?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-2">
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <path d="M15.75 8.25L18.25 10.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5.75 13.25L8.25 15.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 8H13.5C14.8807 8 16 9.11929 16 10.5V10.5C16 11.8807 14.8807 13 13.5 13H8C6.61929 13 5.5 14.1193 5.5 15.5V15.5C5.5 16.8807 6.61929 18 8 18H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="font-semibold text-lg text-primary">MCDONALD</span>
    </div>
  );
}

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuspendedMessage, setShowSuspendedMessage] = useState(false);

  useEffect(() => {
    if (searchParams.get('suspended') === 'true') {
      setShowSuspendedMessage(true);
      toast({
        variant: "destructive",
        title: "Account Suspended",
        description: "Your account has been suspended. Please contact support.",
      });
    }
  }, [searchParams, toast]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please enter your phone number and password.",
      });
      return;
    }
    setIsLoading(true);
    try {
      const email = generateEmailAddress(phone);
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: "Login successful!" });
      router.push("/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: getAuthErrorMessage(error, 'login'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dark flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md bg-card border-none shadow-2xl shadow-primary/20">
        <CardHeader className="text-center">
          <div className="mx-auto">
            <McDonaldLogo />
          </div>
          {showSuspendedMessage && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg mb-4">
              <div className="flex items-center gap-2 text-red-500">
                <AlertTriangle size={20} />
                <span className="font-medium">Account Suspended</span>
              </div>
              <p className="text-sm text-red-400 mt-1">
                Your account has been suspended by an administrator. Please contact support for assistance.
              </p>
            </div>
          )}
          <CardTitle className="text-3xl font-bold text-primary">Welcome Back</CardTitle>
          <CardDescription>Login to your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleLogin}>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="phone"
                  type="text"
                  placeholder="Phone number"
                  className="pl-10"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Password"
                  className="pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 text-base" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <span className="text-sm text-muted-foreground">Don't have an account? </span>
            <Link href="/register" className="text-primary font-semibold hover:underline">Register</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}