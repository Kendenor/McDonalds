
'use client'

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Copy, Link as LinkIcon, Star, Users, Award, Percent, Share2, Wallet } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useMemo, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { UserService, ReferralService } from "@/lib/user-service";
import { generateReferralLink } from "@/lib/utils";

function WhatsAppIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
        </svg>
    )
}

function TelegramIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
    )
}

export default function SharePage() {
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<any>(null);
    const [teamData, setTeamData] = useState<{ level1: any[]; level2: any[]; level3: any[] }>({ level1: [], level2: [], level3: [] });
    const [isLoading, setIsLoading] = useState(true);
    
    const refreshUserData = async () => {
        if (!user) return;
        try {
            const loadedUser = await UserService.getUserById(user.uid);
            if (loadedUser) {
                setUserData(loadedUser);
            }
        } catch (error) {
            console.error('Error refreshing user data:', error);
        }
    };
    
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                try {
                    const loadedUser = await UserService.getUserById(currentUser.uid);
                    // Ensure the user has a referral code; if missing, generate and save one immediately
                    if (loadedUser && !loadedUser.referralCode) {
                        const code = ReferralService.generateReferralCode();
                        await UserService.saveUser({ ...loadedUser, referralCode: code });
                        setUserData({ ...loadedUser, referralCode: code });
                    } else {
                        setUserData(loadedUser);
                    }

                    if (loadedUser) {
                        const referralTree = await ReferralService.getReferralTree(currentUser.uid);
                        setTeamData(referralTree);
                    }
                } catch (error) {
                    console.error('Error loading user data:', error);
                } finally {
                    setIsLoading(false);
                }
            }
        });
        return () => unsubscribe();
    }, []);

    // Add real-time listener for user data changes
    useEffect(() => {
        if (!user) return;
        
        const unsubscribe = UserService.onUsersChange((users) => {
            const currentUser = users.find(u => u.id === user.uid);
            if (currentUser) {
                setUserData(currentUser);
            }
        });
        
        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [user]);

    // Auto-refresh user data every 30 seconds to catch any updates
    useEffect(() => {
        if (!user) return;
        
        const interval = setInterval(() => {
            refreshUserData();
        }, 30000);
        
        return () => clearInterval(interval);
    }, [user]);

    const inviteCode = useMemo(() => {
        if (!userData) return 'ABCDEF';
        return userData.referralCode || 'ABCDEF';
    }, [userData]);

    const inviteLink = useMemo(() => {
        return generateReferralLink(inviteCode);
    }, [inviteCode]);

    const totalEarnings = useMemo(() => {
        if (!userData) return 0;
        return userData.referralEarnings || 0;
    }, [userData]);

    const handleCopy = (text: string, type: string) => {
        navigator.clipboard.writeText(text).then(() => {
            toast({ title: "Copied!", description: `${type} copied to clipboard.` });
        }).catch(() => {
            toast({ variant: "destructive", title: "Failed", description: `Could not copy ${type}.` });
        });
    };

    const shareOnWhatsApp = () => {
        const message = `Join me on McDonald's and earn! Use my invite code: ${inviteCode}. Register here: ${inviteLink}`;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
    };

    const shareOnTelegram = () => {
        const message = `Join me on McDonald's and earn! Use my invite code: ${inviteCode}. Register here: ${inviteLink}`;
        window.open(`https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(message)}`, '_blank');
    };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative h-48 w-full rounded-2xl overflow-hidden flex flex-col justify-center items-center text-white p-4 text-center shadow-lg">
        <Image
          src="/images/team-banner.png"
          alt="My Team"
          fill={true}
          className="object-cover brightness-50"
          data-ai-hint="team business"
        />
        <div className="relative z-10">
          <div className="flex justify-center items-center gap-2">
            <Users size={40} />
            <h1 className="text-4xl font-bold">My Team</h1>
          </div>
          <p className="text-lg mt-2">Invite Friends to Earn Money</p>
          <Link href="/dashboard/my-team">
            <Button variant="outline" className="mt-4 bg-transparent border-white text-white hover:bg-white/10">
              Team Details
            </Button>
          </Link>
        </div>
      </div>
      
       <Card className="bg-card/50">
             <CardContent className="p-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <Wallet size={28} className="text-primary"/>
                    <div>
                        <p className="text-muted-foreground text-sm">Referral Earnings</p>
                        <p className="font-bold text-2xl">₦ {totalEarnings.toLocaleString()}</p>
                    </div>
                </div>
                <Button>Claim</Button>
             </CardContent>
        </Card>

      <Card className="bg-card/50">
        <CardContent className="p-4 space-y-4">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Percent size={20}/>
                <h3 className="font-semibold text-lg text-foreground">Invite Code</h3>
            </div>
            <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                <p className="text-xl font-mono text-primary">{inviteCode}</p>
                <Button variant="ghost" size="icon" onClick={() => handleCopy(inviteCode, 'Invite Code')}>
                    <Copy />
                </Button>
            </div>
          </div>
           <div>
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <LinkIcon size={20}/>
                <h3 className="font-semibold text-lg text-foreground">Invite Link</h3>
            </div>
            <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                <p className="text-sm font-mono text-primary truncate">{inviteLink}</p>
                <Button variant="ghost" size="icon" onClick={() => handleCopy(inviteLink, 'Invite Link')}>
                    <Copy />
                </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="bg-card/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 bg-yellow-400/20 rounded-lg">
                <Award size={28} className="text-yellow-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-yellow-400 flex items-center gap-1"><Star size={16} fill="currentColor"/> 19% Commission</p>
              <p className="text-sm text-muted-foreground">Level 1 Referrals (First Deposit Only)</p>
            </div>
          </CardContent>
        </Card>
         <Card className="bg-card/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 bg-slate-400/20 rounded-lg">
                <Award size={28} className="text-slate-400" />
            </div>
            <div>
               <p className="text-lg font-bold text-slate-400 flex items-center gap-1"><Star size={16} fill="currentColor"/> 2% Commission</p>
               <p className="text-sm text-muted-foreground">Level 2 Referrals (First Deposit Only)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 bg-amber-600/20 rounded-lg">
                <Award size={28} className="text-amber-600" />
            </div>
            <div>
               <p className="text-lg font-bold text-amber-600 flex items-center gap-1"><Star size={16} fill="currentColor"/> 1% Commission</p>
               <p className="text-sm text-muted-foreground">Level 3 Referrals (First Deposit Only)</p>
            </div>
          </CardContent>
        </Card>
      </div>

       <Card className="bg-card/50">
        <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground">
                <Share2 size={20}/>
                <h3 className="font-semibold text-lg text-foreground">Share Your Invite Link</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Button className="bg-[#25D366] hover:bg-[#20ba5a] text-white" onClick={shareOnWhatsApp}>
                    <WhatsAppIcon className="mr-2"/>
                    WhatsApp
                </Button>
                <Button className="bg-[#0088cc] hover:bg-[#0077b3] text-white" onClick={shareOnTelegram}>
                    <TelegramIcon className="mr-2"/>
                    Telegram
                </Button>
            </div>
             <Button variant="outline" className="w-full" onClick={() => handleCopy(inviteLink, 'Invite Link')}>
                <Copy className="mr-2"/>
                Copy Link
            </Button>
        </CardContent>
      </Card>

    </div>
  );
}
