
'use client';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader, User as UserIcon, Shield, CreditCard, Bell, Key } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { UserService } from '@/lib/user-service';

export default function AccountSettingsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // Bank account settings
    const [bankName, setBankName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [accountName, setAccountName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Profile settings
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    
    // Notification settings
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [pushNotifications, setPushNotifications] = useState(true);

     useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                try {
                    const userData = await UserService.getUserById(currentUser.uid);
                    setUserData(userData);
                    
                    if (userData) {
                        setPhone(userData.phone || '');
                        setEmail(userData.email || '');
                    }
                    
                    // Load saved bank account
                    const savedAccount = localStorage.getItem(`bankAccount_${currentUser.uid}`);
                    if (savedAccount) {
                        const { bankName, accountNumber, accountName } = JSON.parse(savedAccount);
                        setBankName(bankName);
                        setAccountNumber(accountNumber);
                        setAccountName(accountName);
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

    const banks = [
        "Access Bank", "Citi Bank", "EcoBank PLC", "First Bank PLC",
        "First City Monument Bank", "Fidelity Bank", "Guaranty Trust Bank",
        "Polaris Bank", "Stanbic IBTC Bank", "Standard Chartered Bank PLC",
        "Zenith Bank PLC", "Unity Bank PLC", "Providus Bank PLC", "Keystone Bank",
        "Jaiz Bank", "Heritage Bank", "Kuda", "VFD Micro Finance Bank", "Opay",
        "Paga", "GoMoney",
    ];

    const handleBankSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            toast({ variant: 'destructive', title: "Not logged in", description: "You must be logged in to add a bank account." });
            return;
        }
        if (!bankName || !accountNumber || !accountName) {
            toast({ variant: 'destructive', title: "Missing Information", description: "Please fill all fields." });
            return;
        }
        setIsSubmitting(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));

            const accountDetails = { bankName, accountNumber, accountName };
            localStorage.setItem(`bankAccount_${user.uid}`, JSON.stringify(accountDetails));

            toast({ title: "Success", description: "Bank account added successfully." });
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Failed to add bank account." });
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleProfileUpdate = async () => {
        if (!user || !userData) return;
        
        try {
            const updatedUser = { ...userData, phone, email };
            await UserService.saveUser(updatedUser);
            setUserData(updatedUser);
            toast({ title: "Success", description: "Profile updated successfully." });
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Failed to update profile." });
        }
    }

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader className="animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <UserIcon className="text-primary" />
                <h1 className="text-2xl font-bold">Account Settings</h1>
            </div>

            <Tabs defaultValue="profile" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                    <TabsTrigger value="bank">Bank Account</TabsTrigger>
                    <TabsTrigger value="notifications">Notifications</TabsTrigger>
                    <TabsTrigger value="security">Security</TabsTrigger>
                </TabsList>

                <TabsContent value="profile">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <UserIcon className="h-5 w-5" />
                                Profile Information
                            </CardTitle>
                            <CardDescription>
                                Update your personal information and contact details.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input 
                                    id="email" 
                                    type="email" 
                                    value={email} 
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="your@email.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number</Label>
                                <Input 
                                    id="phone" 
                                    type="tel" 
                                    value={phone} 
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="+2348012345678"
                                />
                            </div>
                            <Button onClick={handleProfileUpdate} className="w-full">
                                Update Profile
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="bank">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CreditCard className="h-5 w-5" />
                                Bank Account
                            </CardTitle>
                            <CardDescription>
                                Add or update your bank account details for withdrawals.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form className="space-y-4" onSubmit={handleBankSubmit}>
                                <div className="space-y-2">
                                    <Label htmlFor="bank">Select Bank</Label>
                                    <Select onValueChange={setBankName} value={bankName}>
                                        <SelectTrigger id="bank">
                                            <SelectValue placeholder="Select a bank" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {banks.map(bank => (
                                                <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="account-number">Account Number</Label>
                                    <Input 
                                        id="account-number" 
                                        type="text" 
                                        placeholder="Please enter your account number" 
                                        value={accountNumber} 
                                        onChange={(e) => setAccountNumber(e.target.value)} 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="account-name">Account Name</Label>
                                    <Input 
                                        id="account-name" 
                                        type="text" 
                                        placeholder="Account Name" 
                                        value={accountName} 
                                        onChange={(e) => setAccountName(e.target.value)} 
                                    />
                                </div>
                                <Button type="submit" className="w-full" disabled={isSubmitting}>
                                    {isSubmitting ? <Loader className="animate-spin" /> : 'Save Bank Account'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="notifications">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Bell className="h-5 w-5" />
                                Notification Settings
                            </CardTitle>
                            <CardDescription>
                                Manage your notification preferences.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label htmlFor="email-notifications">Email Notifications</Label>
                                    <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                                </div>
                                <input
                                    type="checkbox"
                                    id="email-notifications"
                                    checked={emailNotifications}
                                    onChange={(e) => setEmailNotifications(e.target.checked)}
                                    className="h-4 w-4"
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label htmlFor="push-notifications">Push Notifications</Label>
                                    <p className="text-sm text-muted-foreground">Receive push notifications</p>
                                </div>
                                <input
                                    type="checkbox"
                                    id="push-notifications"
                                    checked={pushNotifications}
                                    onChange={(e) => setPushNotifications(e.target.checked)}
                                    className="h-4 w-4"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="security">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5" />
                                Security Settings
                            </CardTitle>
                            <CardDescription>
                                Manage your account security settings.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Account Status</Label>
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${userData?.status === 'Active' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                    <span className="text-sm">{userData?.status || 'Unknown'}</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Registration Date</Label>
                                <p className="text-sm text-muted-foreground">
                                    {userData?.regDate ? new Date(userData.regDate).toLocaleDateString() : 'Unknown'}
                                </p>
                            </div>
                            <Button 
                                variant="outline" 
                                className="w-full"
                                onClick={() => router.push('/dashboard/change-password')}
                            >
                                <Key className="mr-2 h-4 w-4" />
                                Change Password
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
