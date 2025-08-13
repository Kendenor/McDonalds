
'use client';

import { useLayoutEffect, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { NotificationService, UserService } from '@/lib/user-service';
import { useToast } from '@/hooks/use-toast';
import { Home, Briefcase, Users, User as UserIcon, Loader, Bell, ArrowLeft, Trash2, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Chatbot } from '@/components/ui/chatbot';

interface Notification {
    id: string;
    message: string;
    date: string;
    read: boolean;
}

function UserNotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                // Listen to notifications using NotificationService
                const unsubNotifs = NotificationService.onUserNotificationsChange(currentUser.uid, (notifs) => {
                    setNotifications(notifs);
                });
                return () => {
                    if (unsubNotifs && typeof unsubNotifs === 'function') {
                        unsubNotifs();
                    }
                };
            }
        });
        return () => unsubscribe();
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    const markAllAsRead = async () => {
        if (!user) return;
        const unreadNotifications = notifications.filter(n => !n.read);
        const batch = unreadNotifications.map(n => NotificationService.markAsRead(n.id));
        await Promise.all(batch);
    };

    const deleteNotification = async (id: string) => {
        await NotificationService.deleteNotification(id);
    };

    return (
        <Popover onOpenChange={(open) => { if (!open) markAllAsRead() }}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell />
                    {unreadCount > 0 && (
                        <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 justify-center p-0">{unreadCount}</Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 bg-card border-border">
                <div className="grid gap-4">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                        <h4 className="font-medium leading-none">Notifications</h4>
                            {notifications.length > 0 && (
                                <button
                                    className="text-xs text-red-500 hover:text-red-700 hover:underline"
                                    onClick={() => {
                                        notifications.forEach(n => deleteNotification(n.id));
                                    }}
                                >
                                    Delete All
                                </button>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                            You have {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}.
                        </p>
                    </div>
                    <div className="grid gap-2 max-h-64 overflow-y-auto">
                        {notifications.length > 0 ? notifications.map(n => (
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
                                    <Trash2 className="h-4 w-4" />
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

function Header() {
    const pathname = usePathname();
    const router = useRouter();

    const getTitle = () => {
        if (pathname.includes('/dashboard/my-products')) return 'My Products';
        if (pathname.includes('/dashboard/share')) return 'Share';
        if (pathname.includes('/dashboard/mine')) return 'Account';
        if (pathname.includes('/dashboard/announcements')) return 'Announcements';
        if (pathname.includes('/dashboard/change-password')) return 'Change Password';
        if (pathname.includes('/dashboard/funding-records')) return 'Funding Records';
        if (pathname.includes('/dashboard/my-team')) return 'My Team';
        if (pathname.includes('/dashboard/recharge/confirm')) return 'Confirm Deposit';
        if (pathname.includes('/dashboard/recharge')) return 'Recharge';
        if (pathname.includes('/dashboard/socials')) return 'Socials';
        if (pathname.includes('/dashboard/withdraw')) return 'Withdraw';
        if (pathname.includes('/dashboard/add-account')) return 'Update Bank';
        if (pathname.includes('/dashboard/about')) return 'About Us';
        return 'Dashboard';
    };

    const title = getTitle();
    const showBackButton = pathname !== '/dashboard' && pathname !== '/dashboard/my-products' && pathname !== '/dashboard/share' && pathname !== '/dashboard/mine';

    return (
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 flex items-center justify-between border-b">
             <div className="flex items-center gap-2">
                 {showBackButton ? (
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft />
                    </Button>
                ) : (
                    <div className="w-10 h-10"></div> // Placeholder for spacing
                )}
            </div>
            <h1 className="text-xl font-bold">{title}</h1>
            <UserNotificationBell />
        </header>
    );
}

function FooterNav() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-card border-t border-border/50 p-2 md:hidden">
      <div className="flex justify-around">
        <Link href="/dashboard">
          <Button
            variant="ghost"
            className="flex flex-col h-auto p-1 text-primary"
          >
            <Home />
            <span className="text-xs">Home</span>
          </Button>
        </Link>
        <Link href="/dashboard/my-products">
            <Button variant="ghost" className="flex flex-col h-auto p-1">
                <Briefcase />
                <span className="text-xs">Products</span>
            </Button>
        </Link>

        <Link href="/dashboard/share">
             <Button variant="ghost" className="flex flex-col h-auto p-1">
                <Users />
                <span className="text-xs">Share</span>
            </Button>
        </Link>
        <Link href="/dashboard/mine">
          <Button variant="ghost" className="flex flex-col h-auto p-1">
            <UserIcon />
            <span className="text-xs">Mine</span>
          </Button>
        </Link>
      </div>
    </footer>
  );
}


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userStatus, setUserStatus] = useState<string | null>(null);

  useLayoutEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is logged in, check their status
        setUser(user);
        try {
          const userData = await UserService.getUserById(user.uid);
          if (userData) {
            setUserStatus(userData.status);
            if (userData.status === 'Suspended') {
              // Sign out suspended user and redirect
              await signOut(auth);
              router.replace('/?suspended=true');
              return;
            }
          }
        } catch (error) {
          console.error('Error checking user status:', error);
        }
      } else {
        // User is not logged in, redirect to login page
        router.replace('/');
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
        <div className="dark bg-background text-foreground flex items-center justify-center min-h-screen">
            <Loader className="animate-spin h-10 w-10 text-primary" />
        </div>
    );
  }

  if (!user || userStatus === 'Suspended') {
      return null;
  }

  return (
    <div className="dark bg-background text-foreground min-h-screen flex flex-col">
       <Header />
       <main className="flex-1 p-4 pb-24 space-y-6">
        {children}
       </main>
      <FooterNav />
      <Chatbot />
    </div>
  );
}
