
'use client';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { Folder, List, Landmark, KeyRound, Power, ChevronRight, Megaphone, Users, Info, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { signOut, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useEffect, useState } from 'react';
import { UserService } from '@/lib/user-service';

function McDonaldLogo({ className }: { className?: string }) {
  return (
    <div className="flex items-center justify-center gap-2">
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <path
          d="M15.75 8.25L18.25 10.75"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        ></path>
        <path
          d="M5.75 13.25L8.25 15.75"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        ></path>
        <path
          d="M8 8H13.5C14.8807 8 16 9.11929 16 10.5V10.5C16 11.8807 14.8807 13 13.5 13H8C6.61929 13 5.5 14.1193 5.5 15.5V15.5C5.5 16.8807 6.61929 18 8 18H16"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        ></path>
      </svg>
      <span className="font-semibold text-lg text-primary hidden">
        MCDONALD
      </span>
    </div>
  );
}

function AccountMenuItem({ icon, label, href, isLogout, onClick }: { icon: React.ReactNode, label: string, href?: string, isLogout?: boolean, onClick?: () => void }) {
  const content = (
      <Card className="bg-card/50 hover:bg-card/90 transition-colors">
        <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${isLogout ? 'bg-red-500/20 text-red-400' : 'bg-primary/20 text-primary'}`}>
                    {icon}
                </div>
                <span className={`font-medium ${isLogout ? 'text-red-400' : ''}`}>{label}</span>
            </div>
            <ChevronRight className="text-muted-foreground" />
        </div>
      </Card>
  );

  if (href) {
    return <Link href={href} className="w-full">{content}</Link>
  }

  return <button onClick={onClick} className="w-full text-left">{content}</button>;
}

export default function MinePage() {
  const { toast } = useToast();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState(0);

  const fetchBalance = async (currentUser: User | null) => {
    if (currentUser) {
      const userData = await UserService.getUserById(currentUser.uid);
      if (userData && typeof userData.balance === 'number') {
        setBalance(userData.balance);
      } else {
        setBalance(0);
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      fetchBalance(currentUser);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      router.push('/');
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Logout Failed",
        description: "An error occurred while logging out.",
      });
    }
  };

  const getPhoneNumberFromEmail = (email: string | null | undefined) => {
    if (!email) return 'User';
    return email.split('@')[0];
  }

  return (
    <div className="space-y-6">
       <header className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-card/50 rounded-full flex items-center justify-center border-2 border-primary">
            <McDonaldLogo className="text-primary w-8 h-8" />
            </div>
            <div>
            <p className="text-muted-foreground">Welcome back,</p>
            <p className="text-xl font-bold">{getPhoneNumberFromEmail(user?.email)}</p>
            </div>
        </div>
      </header>

      <Card className="bg-primary text-primary-foreground p-6 rounded-2xl shadow-lg shadow-primary/20">
        <CardContent className="p-0">
          <p className="text-sm opacity-80">Your Balance</p>
          <p className="text-4xl font-bold">₦{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-4">Account Management</h2>
        <div className="space-y-3">
            <AccountMenuItem icon={<Folder size={24}/>} label="My Products" href="/dashboard/my-products" />
            <AccountMenuItem icon={<List size={24}/>} label="Funding Records" href="/dashboard/funding-records" />
            <AccountMenuItem icon={<Users size={24}/>} label="My Referrals" href="/dashboard/my-referrals" />
            <AccountMenuItem icon={<Landmark size={24}/>} label="Bank" href="/dashboard/add-account" />
            <AccountMenuItem icon={<KeyRound size={24}/>} label="Change Password" href="/dashboard/change-password" />
            <AccountMenuItem icon={<Users size={24}/>} label="Socials" href="/dashboard/socials" />
            <AccountMenuItem icon={<Download size={24}/>} label="Download App" href="/downloads" />
            <AccountMenuItem icon={<Info size={24}/>} label="About Us" href="/dashboard/about" />
            <AccountMenuItem icon={<Power size={24}/>} label="Logout" onClick={handleLogout} isLogout/>
        </div>
      </div>
    </div>
  );
}
