'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Shield, CheckCircle, AlertCircle, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AdminSetupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    loadAdminUsers();
  }, []);

  const loadAdminUsers = () => {
    const adminUsersRaw = localStorage.getItem('globalAdminUsers');
    const users = adminUsersRaw ? JSON.parse(adminUsersRaw) : [];
    setAdminUsers(users);
  };

  const setupDefaultAdmin = () => {
    const adminUsers = [
      { id: 'super-admin-01', email: 'McDonald@gmail.com', role: 'Super Admin' }
    ];
    localStorage.setItem('globalAdminUsers', JSON.stringify(adminUsers));
    loadAdminUsers();
    setStatus('Super admin user created successfully!');
    toast({
      title: "Setup Complete",
      description: "Super admin user has been created.",
    });
  };

  const addAdmin = () => {
    if (!newAdminEmail) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter an email address.",
      });
      return;
    }

    const newAdmin = {
      id: `admin-${Date.now()}`,
      email: newAdminEmail,
      role: 'Admin'
    };

    const updatedUsers = [...adminUsers, newAdmin];
    localStorage.setItem('globalAdminUsers', JSON.stringify(updatedUsers));
    loadAdminUsers();
    setNewAdminEmail('');
    setStatus(`Admin ${newAdminEmail} added successfully!`);
    toast({
      title: "Admin Added",
      description: `${newAdminEmail} has been added as an admin.`,
    });
  };

  const removeAdmin = (adminId: string) => {
    const updatedUsers = adminUsers.filter(user => user.id !== adminId);
    localStorage.setItem('globalAdminUsers', JSON.stringify(updatedUsers));
    loadAdminUsers();
    setStatus('Admin removed successfully!');
    toast({
      title: "Admin Removed",
      description: "Admin user has been removed.",
    });
  };

  const clearAllAdmins = () => {
    localStorage.removeItem('globalAdminUsers');
    loadAdminUsers();
    setStatus('All admin users cleared!');
    toast({
      title: "Cleared",
      description: "All admin users have been removed.",
    });
  };

  return (
    <div className="dark flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-2xl bg-card border-none shadow-2xl shadow-primary/20">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Shield size={48} className="text-primary mx-auto" />
          </div>
          <CardTitle className="text-3xl font-bold text-primary">Admin Setup</CardTitle>
          <CardDescription>Configure admin access for your application.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {status && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle size={20} />
                <span>{status}</span>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={setupDefaultAdmin} className="flex-1">
                <Shield className="mr-2 h-4 w-4" />
                Setup Default Admin
              </Button>
              <Button onClick={clearAllAdmins} variant="outline" className="flex-1">
                <AlertCircle className="mr-2 h-4 w-4" />
                Clear All Admins
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newAdmin">Add New Admin</Label>
              <div className="flex gap-2">
                <Input
                  id="newAdmin"
                  type="email"
                  placeholder="admin@example.com"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                />
                <Button onClick={addAdmin}>Add</Button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" />
              Current Admin Users
            </h3>
            {adminUsers.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No admin users found. Click "Setup Default Admin" to create default users.
              </div>
            ) : (
              <div className="space-y-2">
                {adminUsers.map((admin) => (
                  <div key={admin.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">{admin.email}</p>
                      <p className="text-sm text-muted-foreground">{admin.role}</p>
                    </div>
                    {admin.role !== 'Super Admin' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeAdmin(admin.id)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t">
            <Button onClick={() => router.push('/admin/login')} className="w-full">
              Go to Admin Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 