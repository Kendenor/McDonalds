'use client'
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
import { useEffect, useState } from "react"
import { Loader, Users, UserCheck, UserX, TrendingUp } from "lucide-react"
import { UserService, ReferralService, AppUser } from '@/lib/user-service'

interface ReferralStats {
  totalReferrers: number;
  totalReferrals: number;
  referralsWithDeposits: number;
  referralsWithoutDeposits: number;
  totalReferralEarnings: number;
}

interface ReferrerData {
  referrer: AppUser;
  referrals: AppUser[];
  totalReferrals: number;
  referralsWithDeposits: number;
  referralsWithoutDeposits: number;
  totalEarnings: number;
}

export default function AdminReferralsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [referralStats, setReferralStats] = useState<ReferralStats>({
    totalReferrers: 0,
    totalReferrals: 0,
    referralsWithDeposits: 0,
    referralsWithoutDeposits: 0,
    totalReferralEarnings: 0,
  });
  const [referrerData, setReferrerData] = useState<ReferrerData[]>([]);

  useEffect(() => {
  const fetchReferralData = async () => {
    setIsLoading(true);
    try {
        // Get all users
        const allUsers = await UserService.getAllUsers();
        
        // Filter users who have referrals (referrers)
        const referrers = allUsers.filter(user => user.totalReferrals && user.totalReferrals > 0);
        
        // Get detailed referral data for each referrer
        const referrerDetails: ReferrerData[] = [];
        let totalReferrals = 0;
        let totalWithDeposits = 0;
        let totalWithoutDeposits = 0;
        let totalEarnings = 0;

        for (const referrer of referrers) {
          const referrals = allUsers.filter(user => user.referredBy === referrer.id);
          const withDeposits = referrals.filter(user => user.hasDeposited).length;
          const withoutDeposits = referrals.filter(user => !user.hasDeposits).length;
          const earnings = referrer.referralEarnings || 0;

          referrerDetails.push({
            referrer,
            referrals,
            totalReferrals: referrals.length,
            referralsWithDeposits: withDeposits,
            referralsWithoutDeposits: withoutDeposits,
            totalEarnings: earnings,
          });

          totalReferrals += referrals.length;
          totalWithDeposits += withDeposits;
          totalWithoutDeposits += withoutDeposits;
          totalEarnings += earnings;
        }

        // Sort by total referrals (descending)
        referrerDetails.sort((a, b) => b.totalReferrals - a.totalReferrals);

      setReferralStats({
          totalReferrers: referrers.length,
        totalReferrals,
          referralsWithDeposits: totalWithDeposits,
          referralsWithoutDeposits: totalWithoutDeposits,
          totalReferralEarnings: totalEarnings,
        });

        setReferrerData(referrerDetails);
    } catch (error) {
      console.error('Error fetching referral data:', error);
    } finally {
      setIsLoading(false);
    }
    };

    fetchReferralData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{referralStats.totalReferrers}</div>
            <p className="text-xs text-muted-foreground">Users with referrals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{referralStats.totalReferrals}</div>
            <p className="text-xs text-muted-foreground">Total referred users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Deposits</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{referralStats.referralsWithDeposits}</div>
            <p className="text-xs text-muted-foreground">Deposited users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Without Deposits</CardTitle>
            <UserX className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{referralStats.referralsWithoutDeposits}</div>
            <p className="text-xs text-muted-foreground">Non-deposited users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">₦{referralStats.totalReferralEarnings.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Referral bonuses paid</p>
          </CardContent>
        </Card>
      </div>

      {/* Referrers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Referral Management</CardTitle>
          <CardDescription>
            View all users who have referred others and their referral performance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {referrerData.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                  <TableHead>Referrer</TableHead>
                      <TableHead>Phone</TableHead>
                  <TableHead>Total Referrals</TableHead>
                  <TableHead>With Deposits</TableHead>
                  <TableHead>Without Deposits</TableHead>
                  <TableHead>Total Earnings</TableHead>
                  <TableHead>Referral Code</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                {referrerData.map((data) => (
                  <TableRow key={data.referrer.id}>
                    <TableCell>
                      <div className="font-medium">{data.referrer.email}</div>
                      <div className="text-xs text-muted-foreground">
                        Joined: {new Date(data.referrer.regDate).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>{data.referrer.phone}</TableCell>
                    <TableCell>
                      <Badge variant="default" className="bg-blue-500/20 text-blue-400 border-blue-500/20">
                        {data.totalReferrals}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/20">
                        {data.referralsWithDeposits}
                      </Badge>
                    </TableCell>
                          <TableCell>
                      <Badge variant="default" className="bg-red-500/20 text-red-400 border-red-500/20">
                        {data.referralsWithoutDeposits}
                            </Badge>
                          </TableCell>
                          <TableCell>
                      <div className="font-medium text-green-600">
                        ₦{data.totalEarnings.toLocaleString()}
                              </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                        {data.referrer.referralCode}
                      </code>
                          </TableCell>
                        </TableRow>
                ))}
                  </TableBody>
                </Table>
          ) : (
            <div className="text-center text-muted-foreground py-12">
              <Users className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2">No referral data available yet.</p>
            </div>
              )}
            </CardContent>
          </Card>

      {/* Detailed Referral Breakdown */}
      {referrerData.length > 0 && (
          <Card>
            <CardHeader>
            <CardTitle>Detailed Referral Breakdown</CardTitle>
              <CardDescription>
              See exactly who each referrer has brought to the platform.
              </CardDescription>
            </CardHeader>
            <CardContent>
            <div className="space-y-6">
              {referrerData.map((data) => (
                <div key={data.referrer.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold">{data.referrer.email}</h3>
                      <p className="text-sm text-muted-foreground">
                        Referral Code: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">{data.referrer.referralCode}</code>
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{data.totalReferrals} referrals</div>
                      <div className="text-sm text-muted-foreground">
                        ₦{data.totalEarnings.toLocaleString()} earned
                      </div>
                </div>
              </div>

                  {data.referrals.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                          <TableHead>Referred User</TableHead>
                      <TableHead>Phone</TableHead>
                          <TableHead>Join Date</TableHead>
                      <TableHead>Deposit Status</TableHead>
                          <TableHead>First Deposit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                        {data.referrals.map((referral) => (
                          <TableRow key={referral.id}>
                            <TableCell>
                              <div className="font-medium">{referral.email}</div>
                            </TableCell>
                            <TableCell>{referral.phone}</TableCell>
                            <TableCell>
                              {new Date(referral.regDate).toLocaleDateString()}
                            </TableCell>
                        <TableCell>
                              <Badge 
                                variant={referral.hasDeposited ? "default" : "secondary"}
                                className={
                                  referral.hasDeposited 
                                    ? "bg-green-500/20 text-green-400 border-green-500/20"
                                    : "bg-gray-500/20 text-gray-400 border-gray-500/20"
                                }
                              >
                                {referral.hasDeposited ? "Deposited" : "No Deposit"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                              {referral.firstDepositDate 
                                ? new Date(referral.firstDepositDate).toLocaleDateString()
                                : "N/A"
                              }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                  ) : (
                    <div className="text-center text-muted-foreground py-4">
                      No referrals found for this user.
                    </div>
              )}
                </div>
              ))}
            </div>
            </CardContent>
          </Card>
      )}
    </div>
  );
} 