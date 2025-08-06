
'use client';

import { useLayoutEffect, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { AdminNotificationService } from '@/lib/user-service';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Home, Users, Settings, LogOut, Shield, DollarSign, ArrowDownUp, Megaphone, Loader, Bell } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

function AdminLogo() {
  return (
    <div className="flex items-center gap-2 p-2">
      <Shield className="text-primary" size={24}/>
      <span className="font-semibold text-lg text-primary group-data-[collapsible=icon]:hidden">
        Admin Panel
      </span>
    </div>
  );
}

function NotificationBell() {
    const [adminNotifications, setAdminNotifications] = useState<any[]>([]);
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        // Listen to admin notifications
        const unsubscribe = AdminNotificationService.onAdminNotificationsChange((notifications) => {
            setAdminNotifications(notifications);
            const unreadCount = notifications.filter(n => !n.read).length;
            setPendingCount(unreadCount);
        });

        return () => unsubscribe();
    }, []);

    const markAsRead = async (notificationId: string) => {
        await AdminNotificationService.markAsRead(notificationId);
    };

    const deleteNotification = async (notificationId: string) => {
        await AdminNotificationService.deleteAdminNotification(notificationId);
    };

    return (
         <Popover>
            <PopoverTrigger asChild>
                 <Button variant="ghost" size="icon" className="relative">
                    <Bell />
                    {pendingCount > 0 && (
                        <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 justify-center p-0">{pendingCount}</Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 bg-card border-border">
                <div className="grid gap-4">
                    <div className="space-y-2">
                        <h4 className="font-medium leading-none">Admin Notifications</h4>
                        <p className="text-sm text-muted-foreground">
                            You have {pendingCount} unread notification{pendingCount !== 1 ? 's' : ''}.
                        </p>
                    </div>
                     <div className="grid gap-2 max-h-64 overflow-y-auto">
                        {adminNotifications.length > 0 ? adminNotifications.map(n => (
                            <div key={n.id} className={`text-sm p-2 rounded-md flex items-center justify-between ${!n.read ? 'bg-primary/10' : ''}`}>
                                <div>
                                    <p className="font-medium">{n.message}</p>
                                    <p className="text-xs text-muted-foreground">{new Date(n.date).toLocaleString()}</p>
                                </div>
                                <button
                                    className="ml-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition-colors"
                                    title="Delete notification"
                                    onClick={() => deleteNotification(n.id)}
                                >
                                    ×
                                </button>
                            </div>
                        )) : (
                            <p className="text-sm text-muted-foreground text-center py-4">No notifications yet.</p>
                        )}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
       
    );
}


export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageTitle, setPageTitle] = useState('Dashboard');

  useLayoutEffect(() => {
    // Simple admin setup - only allow mcdonald@gmail.com
    const setupSimpleAdmin = () => {
        const adminUsers = [{ id: 'super-admin-01', email: 'mcdonald@gmail.com', role: 'Super Admin' }];
            localStorage.setItem('globalAdminUsers', JSON.stringify(adminUsers));
    };
    
    setupSimpleAdmin();
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Case-insensitive check for admin email
        const isAdmin = user.email && user.email.toLowerCase() === "mcdonald@gmail.com";

        if (isAdmin) {
          setUser(user);
        } else {
          console.log('Access denied for email:', user.email);
          toast({ 
            variant: "destructive", 
            title: "Access Denied", 
            description: `Only McDonald@gmail.com can access admin panel. You are logged in as: ${user.email}` 
          });
          router.replace('/admin/login');
        }
      } else {
        router.replace('/admin/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, toast]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      router.push('/admin/login');
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Logout Failed",
        description: "An error occurred while logging out.",
      });
    }
  };

  if (loading) {
    return (
        <div className="dark bg-background text-foreground flex items-center justify-center min-h-screen">
            <Loader className="animate-spin h-10 w-10 text-primary" />
        </div>
    );
  }

  if (!user) {
      return null;
  }

  return (
    <div className="dark bg-background text-foreground">
        <SidebarProvider>
            <Sidebar>
                <SidebarHeader>
                    <AdminLogo />
                </SidebarHeader>
                <SidebarContent>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild onClick={() => setPageTitle('Dashboard')}>
                                <Link href="/admin/dashboard">
                                    <Home/>
                                    Dashboard
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild onClick={() => setPageTitle('Users')}>
                                <Link href="/admin/dashboard/users">
                                    <Users/>
                                    Users
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                         <SidebarMenuItem>
                            <SidebarMenuButton asChild onClick={() => setPageTitle('Deposits')}>
                                <Link href="/admin/dashboard/deposits">
                                    <DollarSign/>
                                    Deposits
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild onClick={() => setPageTitle('Withdrawals')}>
                                <Link href="/admin/dashboard/withdrawals">
                                    <ArrowDownUp/>
                                    Withdrawals
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild onClick={() => setPageTitle('Referrals')}>
                                <Link href="/admin/dashboard/referrals">
                                    <Users/>
                                    Referrals
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                         <SidebarMenuItem>
                            <SidebarMenuButton asChild onClick={() => setPageTitle('Announcements')}>
                                <Link href="/admin/dashboard/announcements">
                                    <Megaphone/>
                                    Announcements
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild onClick={() => setPageTitle('Settings')}>
                                <Link href="/admin/dashboard/settings">
                                    <Settings/>
                                    Settings
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarContent>
                <SidebarFooter>
                     <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton onClick={handleLogout}>
                                <LogOut />
                                Logout
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarFooter>
            </Sidebar>
            <SidebarInset>
                <header className="flex items-center justify-between p-4 border-b h-16">
                    <div className="flex items-center gap-2">
                         <SidebarTrigger/>
                         <h1 className="text-xl font-semibold capitalize">{pageTitle}</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <NotificationBell />
                        <div className="text-sm text-muted-foreground w-auto text-right">
                            {user.email}
                        </div>
                    </div>
                </header>
                <main className="p-4">
                    {children}
                </main>
            </SidebarInset>
        </SidebarProvider>
    </div>
  );
}
