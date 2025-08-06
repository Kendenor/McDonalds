'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, onAuthStateChanged, User, fetchSignInMethodsForEmail } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

export default function DebugLoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('mcdonald@gmail.com');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authStatus, setAuthStatus] = useState('Checking...');
  const [userExists, setUserExists] = useState<string>('Not checked');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthStatus(user ? 'Authenticated' : 'Not authenticated');
    });

    return () => unsubscribe();
  }, []);

  const checkUserExists = async () => {
    try {
      const methods = await fetchSignInMethodsForEmail(auth, email);
      if (methods.length > 0) {
        setUserExists(`✅ EXISTS - Methods: ${methods.join(', ')}`);
      } else {
        setUserExists('❌ Does NOT exist');
      }
    } catch (error: any) {
      setUserExists(`❌ Error: ${error.message}`);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log('Attempting login with:', email);
      console.log('Password length:', password.length);
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('Login successful:', result.user);
      toast({
        title: "Login Successful",
        description: `Logged in as: ${result.user.email}`,
      });
    } catch (error: any) {
      console.error('Login error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      let errorMessage = "An error occurred during login. Please try again.";
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        errorMessage = "Invalid credentials. Please check your email and password.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many failed attempts. Please try again later.";
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = "This account has been disabled.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Invalid email format.";
      }
      
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: `${errorMessage} (Code: ${error.code})`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkAdminAccess = () => {
    if (!currentUser) {
      toast({
        variant: "destructive",
        title: "No User",
        description: "No user is currently logged in.",
      });
      return;
    }

    const isAdmin = currentUser.email && currentUser.email.toLowerCase() === "mcdonald@gmail.com";
    const adminUsers = JSON.parse(localStorage.getItem('globalAdminUsers') || '[]');
    
    console.log('Current user:', currentUser.email);
    console.log('Is admin check:', isAdmin);
    console.log('Admin users in localStorage:', adminUsers);
    
    toast({
      title: "Admin Check",
      description: `User: ${currentUser.email}, Is Admin: ${isAdmin}, Admin Users: ${adminUsers.length}`,
    });
  };

  const goToAdminDashboard = () => {
    router.push('/admin/dashboard');
  };

  return (
    <div className="dark flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-2xl bg-card border-none shadow-2xl shadow-primary/20">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">Admin Login Debug</CardTitle>
          <CardDescription>Debug admin login issues</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Auth Status */}
          <div className="p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Authentication Status</h3>
            <p>Status: {authStatus}</p>
            {currentUser && (
              <p>Email: {currentUser.email}</p>
            )}
          </div>

          {/* User Exists Check */}
          <div className="p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">User Exists Check</h3>
            <p>User Status: {userExists}</p>
            <Button onClick={checkUserExists} variant="outline" className="mt-2">
              Check if User Exists
            </Button>
          </div>

          {/* Login Form */}
          <form className="space-y-4" onSubmit={handleLogin}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="mcdonald@gmail.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Password length: {password.length}</p>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Test Login'}
            </Button>
          </form>

          {/* Debug Actions */}
          <div className="space-y-2">
            <Button onClick={checkAdminAccess} variant="outline" className="w-full">
              Check Admin Access
            </Button>
            <Button onClick={goToAdminDashboard} variant="outline" className="w-full">
              Try Go to Admin Dashboard
            </Button>
          </div>

          {/* Instructions */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="font-semibold mb-2">Instructions:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Click "Check if User Exists" first</li>
              <li>Enter your email and password</li>
              <li>Click "Test Login" to see detailed error</li>
              <li>Check browser console (F12) for more details</li>
              <li>Click "Check Admin Access" to see admin status</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 