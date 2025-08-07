"use client";
export const dynamic = "force-dynamic";
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
      // Add your registration logic here (e.g., Firebase auth)
      // await registerWithPhoneAndPassword(phone, password, referralCode);
      toast({ title: "Registration successful!" });
      router.push("/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: error.message || "An error occurred during registration.",
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
              <Input
                id="phone"
                type="text"
                placeholder="Phone number"
                className="pl-10"
                value={phone}
                onChange={handlePhoneChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                className="pl-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button type="button" onClick={() => setShowPassword((v) => !v)}>
                {showPassword ? <EyeOff /> : <Eye />} Show/Hide
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm Password"
                className="pl-10"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <Button type="button" onClick={() => setShowConfirmPassword((v) => !v)}>
                {showConfirmPassword ? <EyeOff /> : <Eye />} Show/Hide
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="referralCode">Referral Code (optional)</Label>
              <Input
                id="referralCode"
                type="text"
                placeholder="Referral code"
                className="pl-10"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 text-base" disabled={isLoading}>
              {isLoading ? 'Registering...' : 'Register'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
