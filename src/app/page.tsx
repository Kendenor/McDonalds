
"use client";
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function LoginPage() {
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
      // Add your login logic here (e.g., Firebase auth)
      // await signInWithPhoneAndPassword(phone, password);
      toast({ title: "Login successful!" });
      router.push("/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message || "An error occurred during login.",
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
            {/* McDonaldLogo can be added here if needed */}
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
              <label htmlFor="phone">Phone</label>
              <input
                id="phone"
                type="text"
                placeholder="Phone number"
                className="pl-10"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="Password"
                className="pl-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 text-base" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
