
'use client'
import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Banknote, Copy, Loader, CheckCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { SettingsService } from '@/lib/firebase-service';
import { TransactionService, AdminNotificationService, ReferralService, UserService } from '@/lib/user-service';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface BankAccount {
    id?: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
}

function ConfirmDepositContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    
    const [amount, setAmount] = useState<number | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [paymentProof, setPaymentProof] = useState<string | null>(null);
    const [transactionRef, setTransactionRef] = useState('');
    const [proofError, setProofError] = useState('');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            } else {
                router.replace('/');
            }
        });

        const amountParam = searchParams.get('amount');
        if (amountParam && !isNaN(parseFloat(amountParam))) {
            setAmount(parseFloat(amountParam));
        } else {
            toast({ variant: 'destructive', title: "Invalid Amount", description: "The deposit amount is missing or invalid." });
            router.push('/dashboard/recharge');
        }

        // Fetch bank accounts from settings
        const loadBankAccounts = async () => {
            try {
                const settings = await SettingsService.getSettings();
                console.log('[DEPOSIT] Loading bank accounts from settings:', settings);
                console.log('[DEPOSIT] Bank accounts found:', settings.bankAccounts);
                setBankAccounts(settings.bankAccounts || []);
            } catch (error) {
                console.error('Error loading bank accounts:', error);
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to load bank accounts. Please try again.' });
            }
            setIsLoading(false);
        };
        
        // Load bank accounts
        loadBankAccounts();
        
        // Set up real-time listener for bank account changes
        const settingsUnsubscribe = SettingsService.onSettingsChange((updatedSettings) => {
            console.log('[DEPOSIT] Settings updated, new bank accounts:', updatedSettings.bankAccounts);
            setBankAccounts(updatedSettings.bankAccounts || []);
        });
        
        return () => settingsUnsubscribe();
    }, [router, searchParams, toast]);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            toast({ title: 'Copied!', description: `Copied to clipboard.` });
        });
    };
    
    const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                // Calculate new dimensions (max 800px width/height)
                const maxSize = 800;
                let { width, height } = img;
                
                if (width > height) {
                    if (width > maxSize) {
                        height = (height * maxSize) / width;
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width = (width * maxSize) / height;
                        height = maxSize;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // Draw and compress
                ctx?.drawImage(img, 0, 0, width, height);
                const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7); // 70% quality
                resolve(compressedDataUrl);
            };
            
            img.src = URL.createObjectURL(file);
        });
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                // Compress image before setting
                const compressedImage = await compressImage(file);
                setPaymentProof(compressedImage);
            } catch (error) {
                console.error('Error compressing image:', error);
                // Fallback to original method
                const reader = new FileReader();
                reader.onloadend = () => {
                    setPaymentProof(reader.result as string);
                };
                reader.readAsDataURL(file);
            }
        }
    };

    const handlePaymentConfirmed = async () => {
        setProofError('');
        if (!user || !amount || !user.email) {
            toast({ variant: 'destructive', title: "Error", description: "Your session has expired. Please log in again." });
            return;
        }
        if (!paymentProof) {
            setProofError('Please upload a payment screenshot.');
            return;
        }
        if (!transactionRef.trim()) {
            setProofError('Please enter a transaction reference.');
            return;
        }
        setIsSubmitting(true);
        try {
            // Check if this is user's first deposit
            const userData = await UserService.getUserById(user.uid);
            const isFirstDeposit = userData && !userData.hasDeposited;

            console.log('Creating deposit transaction...');
            await TransactionService.createTransaction({
                userId: user.uid,
                userEmail: user.email,
                type: 'Deposit',
                amount: amount,
                status: 'Pending',
                date: new Date().toISOString(),
                description: 'User deposit',
                proofImage: paymentProof,
                bankAccount: bankAccounts[0]?.id || '',
                transactionRef,
            });
            
            console.log('Deposit transaction created successfully');
            // Note: hasDeposited will be set to true when admin approves the deposit
            // This ensures referral bonuses are only paid for approved deposits
            
            console.log('Creating admin notification...');
            // Create admin notification for new deposit request
            await AdminNotificationService.createAdminNotification({
                message: `New deposit request: ₦${amount.toLocaleString()} from ${user.email}`,
                date: new Date().toISOString(),
                read: false,
                type: 'deposit'
            });
            
            toast({ title: 'Deposit Submitted', description: 'Your deposit is pending approval. This may take some time.' });
            router.push('/dashboard/funding-records');
        } catch (error) {
            console.error('Deposit submission error:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to submit deposit request. Please try again.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading || !amount) {
        return <div className="flex justify-center items-center h-64"><Loader className="animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            <Card className="bg-primary/10 border-primary/20 text-center">
                <CardHeader>
                    <CardTitle className="text-primary">Amount to Pay</CardTitle>
                    <CardDescription>Please transfer the exact amount shown below.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-4xl font-bold text-foreground">₦{amount.toLocaleString()}</p>
                </CardContent>
            </Card>

            {bankAccounts.length > 0 ? (
                <div className="space-y-4">
                    <h3 className="font-semibold text-center text-muted-foreground">Transfer to any of the accounts below</h3>
                    {bankAccounts.map(account => (
                        <Card key={account.id} className="bg-card/50">
                            <CardContent className="p-4 space-y-3">
                                <div className="flex justify-between items-center">
                                    <p className="font-semibold text-lg">{account.bankName}</p>
                                    <Banknote className="text-primary"/>
                                </div>
                                
                                <div className="space-y-2">
                                <div className="flex justify-between items-center bg-background p-3 rounded-lg">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Account Number</p>
                                            <p className="font-mono text-lg font-semibold">{account.accountNumber}</p>
                                        </div>
                                    <Button size="sm" variant="ghost" onClick={() => handleCopy(account.accountNumber)}>
                                        <Copy size={16} className="mr-2"/> Copy
                                    </Button>
                                </div>
                                    
                                <div className="flex justify-between items-center bg-background p-3 rounded-lg">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Account Name</p>
                                            <p className="font-semibold text-lg">{account.accountName}</p>
                                        </div>
                                    <Button size="sm" variant="ghost" onClick={() => handleCopy(account.accountName)}>
                                         <Copy size={16} className="mr-2"/> Copy
                                    </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="bg-card/50 text-center">
                    <CardContent className="p-8">
                        <p className="text-muted-foreground">No bank accounts are available for deposit at this moment. Please contact support.</p>
                    </CardContent>
                </Card>
            )}

            <div className="space-y-4">
                <Label htmlFor="transaction-ref">Transaction Reference</Label>
                <Input
                    id="transaction-ref"
                    type="text"
                    placeholder="Enter transaction reference"
                    value={transactionRef}
                    onChange={e => setTransactionRef(e.target.value)}
                    disabled={isSubmitting}
                />
                <Label htmlFor="payment-proof">Payment Screenshot</Label>
                <Input
                    id="payment-proof"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={isSubmitting}
                />
                {paymentProof && (
                    <img src={paymentProof} alt="Payment Proof" className="max-h-40 mt-2 rounded border" />
                )}
                {proofError && <p className="text-red-500 text-sm mt-2">{proofError}</p>}
            </div>

            <Button 
                className="w-full text-lg py-6 bg-green-600 hover:bg-green-700" 
                onClick={handlePaymentConfirmed}
                disabled={isSubmitting || bankAccounts.length === 0}
            >
                {isSubmitting ? <Loader className="animate-spin" /> : <><CheckCircle className="mr-2"/> I Have Paid, Confirm Now</>}
            </Button>
        </div>
    );
}


export default function ConfirmDepositPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader className="animate-spin" /></div>}>
            <ConfirmDepositContent />
        </Suspense>
    );
}
