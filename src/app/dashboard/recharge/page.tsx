
'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Banknote, AlertCircle, ArrowRight, Loader } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { SettingsService } from '@/lib/firebase-service';

export default function RechargePage() {
    const { toast } = useToast();
    const router = useRouter();
    const [amount, setAmount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [minDeposit, setMinDeposit] = useState(3000);
    const [maxDeposit, setMaxDeposit] = useState(500000);
    const quickAmounts = [3000, 5000, 10000, 30000, 80000, 150000, 400000, 650000];

    useEffect(() => {
        const loadDepositLimits = async () => {
            try {
                const settings = await SettingsService.getSettings();
                setMinDeposit(settings.minDeposit || 3000);
                setMaxDeposit(settings.maxDeposit || 500000);
            } catch (error) {
                console.error('Error loading deposit limits:', error);
            }
        };
        loadDepositLimits();
    }, []);

    const handleQuickAmountClick = (quickAmount: number) => {
        setAmount(quickAmount.toString());
    };

    const handleProceed = () => {
        const depositAmount = parseFloat(amount);
        if (isNaN(depositAmount)) {
            toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Please enter a valid amount.' });
            return;
        }
        
        if (depositAmount < minDeposit) {
            toast({ variant: 'destructive', title: 'Amount Too Low', description: `Minimum recharge amount is ₦${minDeposit.toLocaleString()}.` });
            return;
        }
        
        if (depositAmount > maxDeposit) {
            toast({ variant: 'destructive', title: 'Amount Too High', description: `Maximum recharge amount is ₦${maxDeposit.toLocaleString()}.` });
            return;
        }

        setIsSubmitting(true);
        router.push(`/dashboard/recharge/confirm?amount=${depositAmount}`);
    };

  return (
    <div className="space-y-6">
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <Banknote className="text-primary" size={28}/>
                <h2 className="text-lg font-semibold">Deposit Funds</h2>
            </div>

            <div className="bg-gradient-to-r from-primary/80 to-primary/60 text-primary-foreground p-4 rounded-lg flex items-center gap-3">
                <AlertCircle />
                <div>
                    <p className="text-sm">Deposit Limits:</p>
                    <p className="font-bold text-lg">₦{minDeposit.toLocaleString()} - ₦{maxDeposit.toLocaleString()}</p>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="deposit-amount" className="font-semibold">Deposit Amount</Label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₦</span>
                    <Input 
                        id="deposit-amount" 
                        type="number" 
                        placeholder="Enter Deposit Amount" 
                        className="pl-8 text-base h-12"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        disabled={isSubmitting}
                    />
                </div>
            </div>
            
            <div className="space-y-3">
                <h3 className="font-semibold">Quick Amounts</h3>
                <div className="grid grid-cols-3 gap-3">
                    {quickAmounts.map(quickAmount => (
                         <Button 
                            key={quickAmount} 
                            variant="outline" 
                            className="bg-card/50 h-auto py-3 flex-col gap-1 text-sm bg-gradient-to-br from-primary/30 to-card/50 border-primary/20"
                            onClick={() => handleQuickAmountClick(quickAmount)}
                            disabled={isSubmitting}
                        >
                            <Banknote size={16}/>
                           ₦{quickAmount.toLocaleString()}
                        </Button>
                    ))}
                </div>
            </div>

            <Button className="w-full text-lg py-6 bg-gradient-to-r from-primary to-primary/70" onClick={handleProceed} disabled={isSubmitting}>
                {isSubmitting ? <Loader className="animate-spin" /> : 'Proceed'}
                <ArrowRight className="ml-2"/>
            </Button>
        </div>
    </div>
  );
}
