export const dynamic = "force-dynamic";

'use client';
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
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

// Dynamic imports to prevent SSR issues
const createUserWithEmailAndPassword = async () => {
  if (typeof window !== 'undefined') {
    const { createUserWithEmailAndPassword: createUser } = await import('firebase/auth');
    return createUser;
  }
  return null;
};

const getFirebaseAuth = async () => {
  if (typeof window !== 'undefined') {
    const { auth } = await import('@/lib/firebase');
    return auth;
  }
  return null;
};

const getServices = async () => {
  if (typeof window !== 'undefined') {
    const { UserService, AdminNotificationService, ReferralService } = await import('@/lib/user-service');
    return { UserService, AdminNotificationService, ReferralService };
  }
  return null;
};

const getUtils = async () => {
  if (typeof window !== 'undefined') {
    const { generateEmailAddress, formatPhoneNumber, getAuthErrorMessage } = await import('@/lib/utils');
    return { generateEmailAddress, formatPhoneNumber, getAuthErrorMessage };
  }
  return null;
};

function McDonaldLogo() {
  return (
    <div className="flex items-center justify-center gap-2 mb-2">
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-primary"
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
      <span className="font-semibold text-lg text-primary">MCDONALD</span>
    </div>
  );
}

export default function RegisterPage() {
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
    // Remove all non-digit characters
    let numbers = input.replace(/\D/g, '');
    
    // Handle different phone number formats
    if (numbers.startsWith('234') && numbers.length === 13) {
        numbers = numbers.substring(3); // Remove 234 prefix
    } else if (numbers.startsWith('0') && numbers.length === 11) {
        numbers = numbers.substring(1); // Remove leading 0
    }
    
    // Limit to 10 digits
    if (numbers.length > 10) {
        numbers = numbers.substring(0, 10);
    }
    
    setPhone(numbers);
  }

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
      // Dynamically import all required services
      const [createUserFn, auth, services, utils] = await Promise.all([
        createUserWithEmailAndPassword(),
        getFirebaseAuth(),
        getServices(),
        getUtils()
      ]);

      if (!createUserFn || !auth || !services || !utils) {
        throw new Error('Failed to initialize services');
      }

      const { UserService, AdminNotificationService, ReferralService } = services;
      const { generateEmailAddress, formatPhoneNumber, getAuthErrorMessage } = utils;

      // Validate phone number format
      let formattedPhone;
      try {
        formattedPhone = formatPhoneNumber(phone);
      } catch (error: any) {
        toast({ 
          variant: "destructive", 
          title: "Invalid Phone Number", 
          description: error.message || "Please enter a valid 10-digit Nigerian phone number (e.g. 8012345678)." 
        });
        return;
      }

      const email = generateEmailAddress(formattedPhone);
      
      // Note: Firebase will handle duplicate email check automatically
      
      const userCredential = await createUserFn(auth, email, password);
      
      // Generate referral code for new user
      const newUserReferralCode = ReferralService.generateReferralCode();
      
      // Create user data for Firestore
      const newUser: any = { 
          id: userCredential.user.uid, 
          email: email,
          phone: `+234${formattedPhone}`, 
          regDate: new Date().toISOString(), 
          investment: "₦0", 
          status: 'Active' as const,
          balance: 550, // Welcome bonus
          totalDeposits: 0,
          totalWithdrawals: 0,
          referralCode: newUserReferralCode,
          referralEarnings: 0,
          totalReferrals: 0
      };

      // Save user to Firestore first
      await UserService.saveUser(newUser);

      // Handle referral logic - use the referral code from URL, not the generated one
      if (referralCode && referralCode.trim()) {
          try {
              const referrer = await ReferralService.getUserByReferralCode(referralCode.trim());
              if (referrer) {
                  // Update user with referrer info (no bonus given yet)
                  const updatedUser = { ...newUser, referredBy: referrer.id };
                  await UserService.saveUser(updatedUser);
                  
                  // Update referrer's total referrals count (but no bonus yet)
                  try {
                      const updatedReferrer = {
                          ...referrer,
                          totalReferrals: (referrer.totalReferrals || 0) + 1
                      };
                      await UserService.saveUser(updatedReferrer);
                  } catch (referralError) {
                      console.error('Failed to update referrer stats:', referralError);
                      // Don't fail the registration if this fails
                  }
              }
          } catch (referralError) {
              console.error('Referral processing failed:', referralError);
              // Don't fail the registration if referral processing fails
              // Log the error but continue with registration
          }
      }

      // Create admin notification for new user registration
      try {
          await AdminNotificationService.createAdminNotification({
              message: `New user registered: ${newUser.phone}`,
              date: new Date().toISOString(),
              read: false,
              type: 'system'
          });
      } catch (notificationError) {
          console.error('Admin notification creation failed:', notificationError);
          // Don't fail registration if admin notification fails
      }

      toast({
        title: "Registration Successful",
        description: "Your account has been created.",
      });
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Check if it's a Firebase auth error
      if (error.code) {
        const utils = await getUtils();
        if (utils) {
          const message = utils.getAuthErrorMessage(error, 'registration');
          toast({
            variant: "destructive",
            title: "Registration Failed",
            description: message,
          });
        } else {
          toast({
            variant: "destructive",
            title: "Registration Failed",
            description: "An error occurred during registration. Please try again.",
          });
        }
      } else {
        // Handle other errors (like Firestore permission errors)
        // Check if this might be a referral processing error that shouldn't fail registration
        if (error.message && (
          error.message.includes('referral') || 
          error.message.includes('permission') ||
          error.message.includes('network') ||
          error.message.includes('Missing or insufficient permissions') ||
          error.message.includes('FirebaseError') ||
          error.message.includes('permissions')
        )) {
          // This might be a referral processing error, but user was created successfully
          // Show success message but log the error
          console.error('Referral processing error after successful registration:', error);
          toast({
            title: "Registration Successful",
            description: "Your account has been created. Some referral features may be temporarily unavailable.",
          });
          router.push('/dashboard');
        } else {
          toast({
            variant: "destructive",
            title: "Registration Failed",
            description: "An error occurred during registration. Please try again.",
          });
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while not client-side
  if (!isClient) {
    return (
      <div className="dark flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md bg-card border-none shadow-2xl shadow-primary/20">
          <CardHeader className="text-center">
            <div className="mx-auto">
              <McDonaldLogo />
            </div>
            <CardTitle className="text-3xl font-bold text-primary">McDonald's</CardTitle>
            <CardDescription>Loading...</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Loader className="animate-spin h-8 w-8" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="dark flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md bg-card border-none shadow-2xl shadow-primary/20">
        <CardHeader className="text-center">
          <div className="mx-auto">
            <McDonaldLogo />
          </div>
          <CardTitle className="text-3xl font-bold text-primary">McDonald's</CardTitle>
          <CardDescription>Create your account below.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleRegister}>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground flex items-center pointer-events-none">
                  +234
                </div>
                <Input 
                  id="phone" 
                  type="tel" 
                  placeholder="8012345678" 
                  className="pl-14" 
                  value={phone}
                  onChange={handlePhoneChange}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  className="pl-10 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? <EyeOff className="h-5 w-5 text-muted-foreground" /> : <Eye className="h-5 w-5 text-muted-foreground" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm Password"
                  className="pl-10 pr-10"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                 <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5 text-muted-foreground" /> : <Eye className="h-5 w-5 text-muted-foreground" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
               <Label htmlFor="referral">Referral Code (Optional)</Label>
               <div className="relative">
                <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                  id="referral" 
                  type="text" 
                  placeholder="e.g. MP6MA5" 
                  className="pl-10" 
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                />
              </div>
            </div>
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 text-base" disabled={isLoading}>
                {isLoading ? <Loader className="animate-spin" /> : 'Register'}
              </Button>
          </form>
          <div className="mt-6 text-center text-sm">
            Already a member?{' '}
            <Link href="/" className="font-medium text-primary hover:underline">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
