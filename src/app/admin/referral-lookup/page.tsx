'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, Users, DollarSign, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ReferralService, UserService } from '@/lib/user-service';

interface ReferralData {
  referrer: any;
  referrals: any[];
  totalReferrals: number;
  totalEarnings: number;
  referralsWithDeposits: number;
  referralsWithoutDeposits: number;
}

export default function ReferralLookupPage() {
  const [referralCode, setReferralCode] = useState('');
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const searchReferral = async () => {
    if (!referralCode.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a referral code to search."
      });
      return;
    }

    setIsLoading(true);
    try {
      // Get the referrer (person who owns the code)
      const referrer = await ReferralService.getUserByReferralCode(referralCode.trim());
      
      if (!referrer) {
        toast({
          variant: "destructive",
          title: "Not Found",
          description: "No user found with this referral code."
        });
        setReferralData(null);
        return;
      }

      // Get referral details
      const referralDetails = await ReferralService.getReferralDetails(referrer.id);
      
      setReferralData({
        referrer,
        referrals: referralDetails.referrals,
        totalReferrals: referralDetails.totalReferrals,
        totalEarnings: referralDetails.totalEarnings,
        referralsWithDeposits: referralDetails.referralsWithDeposits,
        referralsWithoutDeposits: referralDetails.referralsWithoutDeposits
      });

      toast({
        title: "Success",
        description: `Found referral data for ${referrer.email}`
      });

    } catch (error) {
      console.error('Error searching referral:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to search referral. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Referral Code Lookup</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="referralCode">Referral Code</Label>
              <Input
                id="referralCode"
                placeholder="Enter referral code (e.g., 24MZE2)"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && searchReferral()}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={searchReferral} disabled={isLoading}>
                <Search className="h-4 w-4 mr-2" />
                {isLoading ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {referralData && (
        <>
          {/* Referrer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Referrer Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">User Email</Label>
                  <p className="font-medium">{referralData.referrer.email}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Phone</Label>
                  <p className="font-medium">{referralData.referrer.phone}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Registration Date</Label>
                  <p className="font-medium">{formatDate(referralData.referrer.regDate)}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Status</Label>
                  <Badge variant={referralData.referrer.status === 'Active' ? 'default' : 'destructive'}>
                    {referralData.referrer.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Referral Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Referral Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-primary/10 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{referralData.totalReferrals}</div>
                  <div className="text-sm text-muted-foreground">Total Referrals</div>
                </div>
                <div className="text-center p-4 bg-green-500/10 rounded-lg">
                  <div className="text-2xl font-bold text-green-500">₦{referralData.totalEarnings.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Total Earnings</div>
                </div>
                <div className="text-center p-4 bg-blue-500/10 rounded-lg">
                  <div className="text-2xl font-bold text-blue-500">{referralData.referralsWithDeposits}</div>
                  <div className="text-sm text-muted-foreground">With Deposits</div>
                </div>
                <div className="text-center p-4 bg-yellow-500/10 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-500">{referralData.referralsWithoutDeposits}</div>
                  <div className="text-sm text-muted-foreground">Without Deposits</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Referred Users List */}
          <Card>
            <CardHeader>
              <CardTitle>Referred Users ({referralData.referrals.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {referralData.referrals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No referrals found for this code.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {referralData.referrals.map((referral, index) => (
                    <div key={referral.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-sm font-bold text-primary">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{referral.email}</p>
                          <p className="text-sm text-muted-foreground">{referral.phone}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Registered</p>
                          <p className="font-medium">{formatDate(referral.regDate)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Status</p>
                          <Badge variant={referral.status === 'Active' ? 'default' : 'destructive'}>
                            {referral.status}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Deposit</p>
                          <Badge variant={referral.hasDeposited ? 'default' : 'secondary'}>
                            {referral.hasDeposited ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
} 