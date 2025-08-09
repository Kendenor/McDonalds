"use client";
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AlertTriangle, User, Lock, Download } from 'lucide-react';
import { AppLoader } from '@/components/ui/app-loader';
import Link from 'next/link';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { generateEmailAddress, getAuthErrorMessage } from '@/lib/utils';
import { UserService } from '@/lib/user-service';

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
      
      // First, try to get user data to check for admin-changed password
      try {
        const userData = await UserService.getUserById(email);
        if (userData && userData.adminChangedPassword && userData.passwordChangedByAdmin) {
          // Check if the password matches the admin-changed password
          if (password === userData.adminChangedPassword) {
            // Password matches admin-changed password, try to authenticate with Firebase
            try {
              // Try to sign in with the admin password
              await signInWithEmailAndPassword(auth, email, password);
              toast({ title: "Login successful!" });
              router.push("/dashboard");
              return;
            } catch (firebaseError: any) {
              // If Firebase auth fails, the admin password might not be synced with Firebase
              // In this case, we'll show a specific message
              console.log('Firebase auth failed with admin password:', firebaseError);
              toast({
                variant: "destructive",
                title: "Login Failed",
                description: "Your password was changed by an administrator. Please try using the new password provided by the admin. If you continue to have issues, please contact support.",
              });
              return;
            }
          } else {
            // Admin password doesn't match, try normal login
            console.log('Admin password provided but doesn\'t match stored admin password');
          }
        }
      } catch (error) {
        // If user data fetch fails, continue with normal login
        console.log('Could not fetch user data, proceeding with normal login');
      }
      
      // Normal Firebase authentication
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: "Login successful!" });
      router.push("/dashboard");
    } catch (error: any) {
      // Check if this might be an admin-changed password issue
      if (error.code === 'auth/wrong-password') {
        try {
          const email = generateEmailAddress(phone);
          const userData = await UserService.getUserById(email);
          if (userData && userData.adminChangedPassword && userData.passwordChangedByAdmin) {
            toast({
              variant: "destructive",
              title: "Login Failed",
              description: "Your password was changed by an administrator. Please use the new password provided by the admin.",
            });
            return;
          }
        } catch (userDataError) {
          // Continue with normal error handling
        }
      }
      
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
              {isLoading ? <AppLoader size="sm" text="Logging in..." /> : 'Login'}
            </Button>
          </form>
          <div className="mt-6 space-y-4">
            <div className="text-center">
              <span className="text-sm text-muted-foreground">Don't have an account? </span>
              <Link href="/register" className="text-primary font-semibold hover:underline">Register</Link>
            </div>
            <div className="text-center border-t pt-4">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = '/downloads/android/McDonald-App.apk';
                  link.download = 'McDonald-App.apk';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Mobile App
              </Button>
              <div className="mt-2">
                <Link href="/downloads" className="text-xs text-muted-foreground hover:underline">
                  View all download options
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}