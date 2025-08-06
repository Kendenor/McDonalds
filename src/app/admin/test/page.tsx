'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Shield, User, Key, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

export default function AdminTestPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [testResults, setTestResults] = useState<any>({});

  useEffect(() => {
    // Listen to auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      runTests(user);
    });

    // Load admin users from localStorage
    const loadAdminUsers = () => {
      const adminUsersRaw = localStorage.getItem('globalAdminUsers');
      const users = adminUsersRaw ? JSON.parse(adminUsersRaw) : [];
      setAdminUsers(users);
    };

    loadAdminUsers();

    return () => unsubscribe();
  }, []);

  const runTests = (user: FirebaseUser | null) => {
    const results: any = {};

    // Test 1: Check if user is logged in
    results.isLoggedIn = !!user;
    results.userEmail = user?.email || 'No user logged in';

    // Test 2: Check if email matches admin requirement
    if (user?.email) {
      results.emailMatches = user.email.toLowerCase() === 'mcdonald@gmail.com';
      results.emailLowercase = user.email.toLowerCase();
      results.expectedEmail = 'mcdonald@gmail.com';
    }

    // Test 3: Check localStorage admin users
    const adminUsersRaw = localStorage.getItem('globalAdminUsers');
    const users = adminUsersRaw ? JSON.parse(adminUsersRaw) : [];
    results.adminUsersInStorage = users;
    results.adminUsersCount = users.length;

    // Test 4: Check if user is in admin list
    if (user?.email) {
      results.isInAdminList = users.some((admin: any) => 
        admin.email.toLowerCase() === user.email?.toLowerCase()
      );
    }

    // Test 5: Overall access check
    results.canAccess = results.isLoggedIn && results.emailMatches;

    setTestResults(results);
  };

  const fixAdminSetup = () => {
    const adminUsers = [{ id: 'super-admin-01', email: 'mcdonald@gmail.com', role: 'Super Admin' }];
    localStorage.setItem('globalAdminUsers', JSON.stringify(adminUsers));
    setAdminUsers(adminUsers);
    runTests(currentUser);
    toast({
      title: "Admin Setup Fixed",
      description: "Admin users have been reset to default configuration.",
    });
  };

  const clearAllData = () => {
    localStorage.removeItem('globalAdminUsers');
    setAdminUsers([]);
    runTests(currentUser);
    toast({
      title: "Data Cleared",
      description: "All admin data has been cleared.",
    });
  };

  return (
    <div className="dark flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-4xl bg-card border-none shadow-2xl shadow-primary/20">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Shield size={48} className="text-primary mx-auto" />
          </div>
          <CardTitle className="text-3xl font-bold text-primary">Admin Access Test</CardTitle>
          <CardDescription>Debug your admin access issues step by step.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Current User Status */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <User className="h-5 w-5" />
              Current User Status
            </h3>
            <div className="p-4 bg-muted/50 rounded-lg">
              {currentUser ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="font-medium">Logged In</span>
                  </div>
                  <p><strong>Email:</strong> {currentUser.email}</p>
                  <p><strong>UID:</strong> {currentUser.uid}</p>
                  <p><strong>Email Verified:</strong> {currentUser.emailVerified ? 'Yes' : 'No'}</p>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="font-medium">Not Logged In</span>
                </div>
              )}
            </div>
          </div>

          {/* Test Results */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Key className="h-5 w-5" />
              Test Results
            </h3>
            <div className="space-y-2">
              {Object.entries(testResults).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="font-medium">{key}:</span>
                  <span className={`font-mono text-sm ${
                    typeof value === 'boolean' 
                      ? (value ? 'text-green-500' : 'text-red-500')
                      : 'text-foreground'
                  }`}>
                    {typeof value === 'boolean' ? (value ? '✅ True' : '❌ False') : JSON.stringify(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Admin Users in localStorage */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Admin Users in localStorage</h3>
            <div className="p-4 bg-muted/50 rounded-lg">
              {adminUsers.length === 0 ? (
                <p className="text-muted-foreground">No admin users found.</p>
              ) : (
                <div className="space-y-2">
                  {adminUsers.map((admin) => (
                    <div key={admin.id} className="flex items-center justify-between p-2 bg-background rounded">
                      <div>
                        <p className="font-medium">{admin.email}</p>
                        <p className="text-sm text-muted-foreground">{admin.role}</p>
                      </div>
                      {currentUser?.email?.toLowerCase() === admin.email.toLowerCase() && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Quick Fixes</h3>
            <div className="grid grid-cols-2 gap-4">
              <Button onClick={fixAdminSetup} className="flex-1">
                <Shield className="mr-2 h-4 w-4" />
                Fix Admin Setup
              </Button>
              <Button onClick={clearAllData} variant="outline" className="flex-1">
                <XCircle className="mr-2 h-4 w-4" />
                Clear All Data
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">What to do next:</h3>
            <div className="space-y-2 text-sm">
              {!testResults.isLoggedIn && (
                <p className="text-red-500">❌ <strong>Step 1:</strong> You need to log in first. Go to /admin/login</p>
              )}
              {testResults.isLoggedIn && !testResults.emailMatches && (
                <p className="text-red-500">❌ <strong>Step 2:</strong> Your email doesn't match. You need to use exactly: mcdonald@gmail.com</p>
              )}
              {testResults.isLoggedIn && testResults.emailMatches && !testResults.canAccess && (
                <p className="text-red-500">❌ <strong>Step 3:</strong> Click "Fix Admin Setup" to configure admin access</p>
              )}
              {testResults.canAccess && (
                <p className="text-green-500">✅ <strong>Success!</strong> You should be able to access the admin panel</p>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="pt-4 border-t space-y-2">
            <Button onClick={() => router.push('/admin/login')} className="w-full">
              Go to Admin Login
            </Button>
            <Button onClick={() => router.push('/admin/dashboard')} variant="outline" className="w-full">
              Try Admin Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 