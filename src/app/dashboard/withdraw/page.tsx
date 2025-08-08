
'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Wallet, Landmark, PlusCircle, Loader } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { UserService, TransactionService, AdminNotificationService } from '@/lib/user-service';
import { SettingsService } from '@/lib/firebase-service';

interface BankAccount {
    bankName: string;
    accountNumber: string;
    accountName: string;
}

const WITHDRAWAL_CHARGE_PERCENT = 0.15; // 15%
const WITHDRAWAL_START_HOUR = 10; // 10 AM
const WITHDRAWAL_END_HOUR = 18; // 6 PM

export default function WithdrawPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [balance, setBalance] = useState(0);
    const [amount, setAmount] = useState('');
    const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [minWithdrawal, setMinWithdrawal] = useState(1000);
    
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                await fetchData(currentUser);
            }
        });
        
        const fetchData = async (currentUser: User) => {
            try {
                // Load user data from Firestore
                const userData = await UserService.getUserById(currentUser.uid);
                if (userData && typeof userData.balance === 'number') {
                    setBalance(userData.balance);
                } else {
                    setBalance(0);
                }

                // Load settings for minimum withdrawal
                const settings = await SettingsService.getSettings();
                setMinWithdrawal(settings.minWithdrawal || 1000);

                // Load bank account from Firestore (assuming it's stored in user data)
                // For now, we'll use a placeholder - you may need to create a separate bank account service
                const savedAccount = localStorage.getItem(`bankAccount_${currentUser.uid}`);
                if (savedAccount) {
                    setBankAccount(JSON.parse(savedAccount));
                }
            } catch (error) {
                console.error('Error loading user data:', error);
                setBalance(0);
            }
        };

        return () => unsubscribe();
    }, []);

    const rules = [
        `Min withdrawal: ₦${minWithdrawal.toLocaleString()}`,
        `Charges: ${WITHDRAWAL_CHARGE_PERCENT * 100}%`,
        `Time: ${WITHDRAWAL_START_HOUR}:00 - ${WITHDRAWAL_END_HOUR}:00 daily`,
        "Ensure correct account details",
        "Funds arrive within 24 hours of approval",
        "Withdraw only to your added account"
    ];

    const handleWithdraw = async () => {
        if (!user || !user.email) {
            toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
            return;
        };

        const now = new Date();
        const currentHour = now.getHours();
        if (currentHour < WITHDRAWAL_START_HOUR || currentHour >= WITHDRAWAL_END_HOUR) {
            toast({ variant: 'destructive', title: 'Withdrawal Closed', description: `Withdrawals are only open between ${WITHDRAWAL_START_HOUR}:00 and ${WITHDRAWAL_END_HOUR}:00.` });
            return;
        }

        const withdrawAmount = parseFloat(amount);
        if (!bankAccount) {
            toast({ variant: 'destructive', title: 'No Bank Account', description: 'Please add a bank account first.' });
            return;
        }
        if (isNaN(withdrawAmount) || withdrawAmount < minWithdrawal) {
            toast({ variant: 'destructive', title: 'Invalid Amount', description: `Minimum withdrawal is ₦${minWithdrawal.toLocaleString()}.` });
            return;
        }
        
        if (withdrawAmount > balance) {
            toast({ variant: 'destructive', title: 'Insufficient Funds', description: `You do not have enough balance to withdraw that amount.` });
            return;
        }

        setIsSubmitting(true);
        try {
            // Create withdrawal transaction in Firestore
            await TransactionService.createTransaction({
                userId: user.uid,
                userEmail: user.email || '',
                type: 'Withdrawal',
                amount: withdrawAmount,
                status: 'Pending',
                date: new Date().toISOString(),
                description: `Withdrawal request`,
                bankAccount: bankAccount ? `${bankAccount.bankName} - ${bankAccount.accountNumber}` : ''
            });

            // Update user balance in Firestore
            const userData = await UserService.getUserById(user.uid);
            if (userData) {
                const newBalance = (userData.balance || 0) - withdrawAmount;
                await UserService.saveUser({ ...userData, balance: newBalance });
                setBalance(newBalance);
            }

            // Create admin notification for new withdrawal request
            await AdminNotificationService.createAdminNotification({
                message: `New withdrawal request: ₦${withdrawAmount.toLocaleString()} from ${user.email}`,
                date: new Date().toISOString(),
                read: false,
                type: 'withdrawal'
            });

            setAmount('');
            toast({ title: 'Withdrawal Request Submitted', description: `Your request of ₦${withdrawAmount.toLocaleString()} is pending approval.` });
            router.push('/dashboard/funding-records');
        } catch (error) {
            console.error('Error processing withdrawal:', error);
            toast({ variant: 'destructive', title: 'Withdrawal Failed', description: 'An error occurred. Please try again.' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const amountToReceive = () => {
        const withdrawAmount = parseFloat(amount);
        if (isNaN(withdrawAmount) || withdrawAmount <= 0) return '0.00';
        const fee = withdrawAmount * WITHDRAWAL_CHARGE_PERCENT;
        return (withdrawAmount - fee).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

  return (
    <div className="space-y-6">
        <Card className="bg-card/50">
            <CardContent className="p-4">
                <div className="flex items-center gap-3 text-primary mb-3">
                    <AlertCircle size={24} />
                    <h2 className="text-lg font-semibold">Withdrawal Rules</h2>
                </div>
                <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
                   {rules.map((rule, index) => <li key={index}>{rule}</li>)}
                </ul>
            </CardContent>
        </Card>
        
        <Card className="bg-card/50">
             <CardContent className="p-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <Wallet size={28} className="text-primary"/>
                    <div>
                        <p className="text-muted-foreground text-sm">Available Balance</p>
                        <p className="font-bold text-2xl">₦ {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                </div>
             </CardContent>
        </Card>

        <div className="space-y-4">
            <Card className="bg-card/50">
                <CardContent className="p-4 space-y-3">
                    <Label htmlFor="amount" className="font-semibold text-base">Amount</Label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₦</span>
                        <Input id="amount" type="number" placeholder="Enter amount" className="pl-8 text-lg h-12" value={amount} onChange={e => setAmount(e.target.value)} disabled={isSubmitting}/>
                    </div>
                     <div className="text-sm text-muted-foreground">
                        <p>Fee (15%): ₦{((parseFloat(amount) || 0) * WITHDRAWAL_CHARGE_PERCENT).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        <p className="font-bold">You will receive: ₦{amountToReceive()}</p>
                    </div>
                    <Button className="w-full text-lg py-6" onClick={handleWithdraw} disabled={isSubmitting || !bankAccount}>
                        {isSubmitting ? <Loader className="animate-spin" /> : 'Withdraw'}
                    </Button>
                </CardContent>
            </Card>

            <Card className="bg-card/50">
                <CardContent className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Landmark className="text-primary" />
                            <h3 className="font-semibold text-lg">Bank Account</h3>
                        </div>
                        {bankAccount && (
                             <Link href="/dashboard/add-account">
                                <Button variant="link" className="text-primary">Change</Button>
                            </Link>
                        )}
                    </div>
                    {bankAccount ? (
                        <div className='p-4 bg-background rounded-lg'>
                            <p className="font-bold">{bankAccount.accountName}</p>
                            <p className="text-muted-foreground">{bankAccount.bankName}</p>
                            <p className="text-muted-foreground font-mono">{bankAccount.accountNumber}</p>
                        </div>
                    ) : (
                        <Link href="/dashboard/add-account" className="w-full">
                            <Button variant="outline" className="w-full border-dashed border-primary/50 text-primary hover:bg-primary/10 hover:text-primary">
                                <PlusCircle size={20} className="mr-2"/>
                                Add Account
                            </Button>
                        </Link>
                    )}
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
