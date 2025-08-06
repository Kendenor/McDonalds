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
import { Shield, CheckCircle, AlertCircle, Users, Key, Database } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

export default function AdminDebugPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [firebaseConfig, setFirebaseConfig] = useState<any>(null);
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    // Listen to auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });

    // Load admin users from localStorage
    const loadAdminUsers = () => {
      const adminUsersRaw = localStorage.getItem('globalAdminUsers');
      const users = adminUsersRaw ? JSON.parse(adminUsersRaw) : [];
      setAdminUsers(users);
    };

    // Get Firebase config
    const getFirebaseConfig = () => {
      try {
        const config = {
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
          appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
        };
        setFirebaseConfig(config);
      } catch (error) {
        console.error('Error getting Firebase config:', error);
      }
    };

    loadAdminUsers();
    getFirebaseConfig();

    return () => unsubscribe();
  }, []);

  const setupAdminManually = () => {
    const adminUsers = [
      { id: 'super-admin-01', email: 'McDonald@gmail.com', role: 'Super Admin' }
    ];
    localStorage.setItem('globalAdminUsers', JSON.stringify(adminUsers));
    setAdminUsers(adminUsers);
    toast({
      title: "Admin Setup Complete",
      description: "Super admin user has been created in localStorage.",
    });
  };

  const clearLocalStorage = () => {
    localStorage.removeItem('globalAdminUsers');
    setAdminUsers([]);
    toast({
      title: "LocalStorage Cleared",
      description: "All admin users have been removed from localStorage.",
    });
  };

  const checkAdminAccess = () => {
    if (!currentUser) {
      setDebugInfo({ error: "No user is currently logged in" });
      return;
    }

    const isInAdminList = adminUsers.some((admin: any) => admin.email === currentUser.email);
    const isSuperAdmin = currentUser.email === 'McDonald@gmail.com';

    setDebugInfo({
      userEmail: currentUser.email,
      isInAdminList,
      isSuperAdmin,
      adminUsersCount: adminUsers.length,
      canAccess: isInAdminList || isSuperAdmin
    });
  };

  const createTestUser = async () => {
    try {
      // This would normally create a user in Firebase, but for demo purposes
      // we'll just show how to do it
      toast({
        title: "Test User Creation",
        description: "To create a test user, you need to use Firebase Console or Firebase Admin SDK.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create test user.",
      });
    }
  };

  return (
    <div className="dark flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-4xl bg-card border-none shadow-2xl shadow-primary/20">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Shield size={48} className="text-primary mx-auto" />
          </div>
          <CardTitle className="text-3xl font-bold text-primary">Admin Debug Panel</CardTitle>
          <CardDescription>Debug and troubleshoot admin access issues.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Firebase Authentication Status */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Key className="h-5 w-5" />
              Firebase Authentication Status
            </h3>
            <div className="p-4 bg-muted/50 rounded-lg">
              {currentUser ? (
                <div className="space-y-2">
                  <p><strong>Status:</strong> <span className="text-green-500">Logged In</span></p>
                  <p><strong>Email:</strong> {currentUser.email}</p>
                  <p><strong>UID:</strong> {currentUser.uid}</p>
                  <p><strong>Email Verified:</strong> {currentUser.emailVerified ? 'Yes' : 'No'}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p><strong>Status:</strong> <span className="text-red-500">Not Logged In</span></p>
                  <p className="text-muted-foreground">You need to log in first to access admin features.</p>
                </div>
              )}
            </div>
          </div>

          {/* Admin Users in localStorage */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Database className="h-5 w-5" />
              Admin Users in localStorage
            </h3>
            <div className="p-4 bg-muted/50 rounded-lg">
              {adminUsers.length === 0 ? (
                <p className="text-muted-foreground">No admin users found in localStorage.</p>
              ) : (
                <div className="space-y-2">
                  {adminUsers.map((admin) => (
                    <div key={admin.id} className="flex items-center justify-between p-2 bg-background rounded">
                      <div>
                        <p className="font-medium">{admin.email}</p>
                        <p className="text-sm text-muted-foreground">{admin.role}</p>
                      </div>
                      {currentUser?.email === admin.email && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Debug Actions */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Debug Actions
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Button onClick={setupAdminManually} className="flex-1">
                <Shield className="mr-2 h-4 w-4" />
                Setup Admin Users
              </Button>
              <Button onClick={clearLocalStorage} variant="outline" className="flex-1">
                <AlertCircle className="mr-2 h-4 w-4" />
                Clear localStorage
              </Button>
              <Button onClick={checkAdminAccess} className="flex-1">
                <CheckCircle className="mr-2 h-4 w-4" />
                Check Access
              </Button>
              <Button onClick={createTestUser} variant="outline" className="flex-1">
                <Users className="mr-2 h-4 w-4" />
                Create Test User
              </Button>
            </div>
          </div>

          {/* Debug Results */}
          {Object.keys(debugInfo).length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Debug Results</h3>
              <div className="p-4 bg-muted/50 rounded-lg">
                <pre className="text-sm overflow-auto">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">How to Fix Admin Access</h3>
            <div className="space-y-2 text-sm">
              <p><strong>Step 1:</strong> Make sure you have a Firebase user account with email "McDonald@gmail.com"</p>
              <p><strong>Step 2:</strong> Click "Setup Admin Users" to create admin list in localStorage</p>
              <p><strong>Step 3:</strong> Go to <code>/admin/login</code> and log in with your credentials</p>
              <p><strong>Step 4:</strong> If still having issues, check the debug results above</p>
            </div>
          </div>

          {/* Navigation */}
          <div className="pt-4 border-t space-y-2">
            <Button onClick={() => router.push('/admin/login')} className="w-full">
              Go to Admin Login
            </Button>
            <Button onClick={() => router.push('/admin/setup')} variant="outline" className="w-full">
              Go to Admin Setup
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 