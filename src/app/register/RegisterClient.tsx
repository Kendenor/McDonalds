"use client";
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { User, Lock, Eye, EyeOff, Ticket, Loader } from 'lucide-react';
import { AppLoader } from '@/components/ui/app-loader';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { generateEmailAddress, getAuthErrorMessage } from '@/lib/utils';
import { UserService, ReferralService } from '@/lib/user-service';

export default function RegisterClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && searchParams) {
      const refCode = searchParams.get('ref');
      if (refCode) {
        setReferralCode(refCode);
      }
    }
  }, [searchParams, isClient]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    let numbers = input.replace(/\D/g, '');
    if (numbers.startsWith('234') && numbers.length === 13) {
      numbers = numbers.substring(3);
    } else if (numbers.startsWith('0') && numbers.length === 11) {
      numbers = numbers.substring(1);
    }
    if (numbers.length > 10) {
      numbers = numbers.substring(0, 10);
    }
    setPhone(numbers);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isClient) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please wait for the page to load completely."
      });
      return;
    }
    if (!phone || phone.length !== 10) {
      toast({
        variant: "destructive",
        title: "Wrong Phone Number",
        description: "Enter a valid 10-digit Nigerian phone number (e.g. 8012345678). Only phone numbers are allowed."
      });
      return;
    }
    if (password !== confirmPassword) {
      toast({ variant: "destructive", title: "Passwords do not match", description: "Please check your passwords and try again." });
      return;
    }
    setIsLoading(true);
    try {
      const email = generateEmailAddress(phone);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Process referral if provided
      let referrerId: string | undefined;
      if (referralCode) {
        const normalizedCode = referralCode.trim().toUpperCase();
        console.log('Processing referral code:', normalizedCode);
        const referrer = await ReferralService.getUserByReferralCode(normalizedCode);
        if (referrer) {
          referrerId = referrer.id;
          console.log('Found referrer:', referrer.email, 'ID:', referrerId);
        } else {
          console.log('No referrer found for code:', referralCode);
        }
      }

      // Generate referral code for new user
      const newUserReferralCode = ReferralService.generateReferralCode();
      
      // Create user profile with welcome bonus
      const newUser: any = {
        id: userCredential.user.uid,
        email: email,
        phone: phone,
        regDate: new Date().toISOString(),
        investment: '₦0',
        status: 'Active' as const,
        balance: 300, // Welcome bonus
        totalDeposits: 0,
        totalWithdrawals: 0,
        referralCode: newUserReferralCode, // Generate new referral code for user
        hasDeposited: false, // Important: Set to false for new users
        referralEarnings: 0, // Initialize referral earnings
        totalReferrals: 0, // Initialize total referrals
      };
      // Only include referredBy if we have a valid referrer (Firestore disallows undefined values)
      if (referrerId) {
        newUser.referredBy = referrerId;
      }

      await UserService.saveUser(newUser);
      
      // Note: Referral bonuses are now processed when the user makes their first deposit
      // This ensures referrers only get bonuses when their referrals actually deposit
      
      toast({ 
        title: "Registration successful!", 
        description: referrerId
          ? "Your referral was applied! Your ₦300 welcome bonus has been added. Referral bonuses will be paid when you make your first deposit."
          : "Welcome bonus of ₦300 has been added to your account!"
      });
      router.push("/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: getAuthErrorMessage(error, 'registration'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dark flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md bg-card border-none shadow-2xl shadow-primary/20">
        <CardHeader className="text-center">
          <div className="mx-auto">
            {/* McDonaldLogo can be added here if needed */}
          </div>
          <CardTitle className="text-3xl font-bold text-primary">Register</CardTitle>
          <CardDescription>Create your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleRegister}>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="phone"
                  type="text"
                  placeholder="Phone number"
                  className="pl-10"
                  value={phone}
                  onChange={handlePhoneChange}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  className="pl-10 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm Password"
                  className="pl-10 pr-10"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="referralCode">Referral Code (optional)</Label>
              <div className="relative">
                <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="referralCode"
                  type="text"
                  placeholder="Referral code"
                  className="pl-10"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                />
              </div>
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 text-base" disabled={isLoading}>
              {isLoading ? <AppLoader size="sm" text="Registering..." /> : 'Register'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}