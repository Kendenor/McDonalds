'use client'
import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Users, TrendingUp, Wallet, Calendar, Loader } from "lucide-react"
import { useToast } from '@/hooks/use-toast'
import { onAuthStateChanged, User } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { ReferralService } from '@/lib/user-service'

interface ReferralDetails {
  referrals: any[];
  totalReferrals: number;
  totalEarnings: number;
  referralsWithDeposits: number;
  referralsWithoutDeposits: number;
}

export default function MyReferralsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [referralDetails, setReferralDetails] = useState<ReferralDetails>({
    referrals: [],
    totalReferrals: 0,
    totalEarnings: 0,
    referralsWithDeposits: 0,
    referralsWithoutDeposits: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const details = await ReferralService.getReferralDetails(currentUser.uid);
          setReferralDetails(details);
        } catch (error) {
          console.error('Error loading referral details:', error);
          toast({ variant: 'destructive', title: 'Error', description: 'Failed to load referral details.' });
        } finally {
          setIsLoading(false);
        }
      }
    });
    return () => unsubscribe();
  }, [toast]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please log in to view your referrals.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            My Referrals
          </CardTitle>
          <CardDescription>
            Track your referral earnings and team members.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Referrals</p>
                <p className="text-2xl font-bold">{referralDetails.totalReferrals}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Earnings</p>
                <p className="text-2xl font-bold">₦{referralDetails.totalEarnings.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <Wallet className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">With Deposits</p>
                <p className="text-2xl font-bold">{referralDetails.referralsWithDeposits}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <Users className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Without Deposits</p>
                <p className="text-2xl font-bold">{referralDetails.referralsWithoutDeposits}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My Referred Users</CardTitle>
          <CardDescription>
            People who registered using your referral code.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {referralDetails.referrals.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium">No referrals yet</p>
              <p className="text-sm">Share your referral code to start earning bonuses!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phone</TableHead>
                  <TableHead>Registration Date</TableHead>
                  <TableHead>Deposit Status</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>First Deposit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referralDetails.referrals.map((referral) => (
                  <TableRow key={referral.id}>
                    <TableCell className="font-medium">{referral.phone}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {new Date(referral.regDate).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={referral.hasDeposited ? "default" : "secondary"}>
                        {referral.hasDeposited ? "Deposited" : "No Deposit"}
                      </Badge>
                    </TableCell>
                    <TableCell>₦{(referral.balance || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      {referral.hasDeposited && referral.firstDepositDate ? (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {new Date(referral.firstDepositDate).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Not yet</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 