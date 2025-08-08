'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ReferralService } from '@/lib/user-service';
import { AppLoader } from '@/components/ui/app-loader';

export default function FixReferralsPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleFixReferrals = async () => {
    setIsLoading(true);
    try {
      await ReferralService.ensureAllUsersHaveReferralCodes();
      toast({ 
        title: 'Success', 
        description: 'All users now have referral codes. Check console for details.' 
      });
    } catch (error) {
      console.error('Error fixing referrals:', error);
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: 'Failed to fix referral codes. Check console for details.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Fix Referral System</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            This utility will ensure all existing users have referral codes generated.
            Run this if you notice referral issues.
          </p>
          <Button 
            onClick={handleFixReferrals} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? <AppLoader size="sm" text="Fixing referrals..." /> : 'Fix Referral Codes'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
} 