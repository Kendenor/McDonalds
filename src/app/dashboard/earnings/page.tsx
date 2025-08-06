'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Clock, 
  BarChart3, 
  ArrowUpRight,
  ArrowDownRight,
  Loader
} from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { UserService, TransactionService, ProductService } from '@/lib/user-service';
import { useToast } from '@/hooks/use-toast';

interface EarningStats {
  totalEarnings: number;
  todayEarnings: number;
  thisWeekEarnings: number;
  thisMonthEarnings: number;
  totalInvested: number;
  activeInvestments: number;
}

interface EarningRecord {
  id: string;
  date: string;
  amount: number;
  type: string;
  description: string;
  source: string;
}

export default function EarningsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [stats, setStats] = useState<EarningStats>({
    totalEarnings: 0,
    todayEarnings: 0,
    thisWeekEarnings: 0,
    thisMonthEarnings: 0,
    totalInvested: 0,
    activeInvestments: 0
  });
  const [earningsHistory, setEarningsHistory] = useState<EarningRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        try {
          const userData = await UserService.getUserById(user.uid);
          setUserData(userData);
          
          if (userData) {
            await loadEarningsData(user.uid, userData);
          }
        } catch (error) {
          console.error('Error loading user data:', error);
          toast({ variant: 'destructive', title: 'Error', description: 'Failed to load earnings data.' });
        } finally {
          setIsLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const loadEarningsData = async (userId: string, userData: any) => {
    try {
      // Get all transactions
      const transactions = await TransactionService.getTransactionsByUser(userId);
      
      // Get user's active products
      const userProducts = await ProductService.getUserProducts(userId);
      const activeProducts = userProducts.filter(p => p.status === 'Active');
      
      // Calculate today's date
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
      
      // Calculate this week's date range
      const weekStart = new Date(today.getTime() - today.getDay() * 24 * 60 * 60 * 1000);
      weekStart.setHours(0, 0, 0, 0);
      
      // Calculate this month's date range
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      
      // Filter transactions by type and date
      const earningTransactions = transactions.filter(t => 
        t.type === 'Investment' || t.type === 'Referral_Bonus' || t.type === 'Admin_Add'
      );
      
      const todayEarnings = earningTransactions.filter(t => {
        const txDate = new Date(t.date);
        return txDate >= todayStart && txDate < todayEnd;
      }).reduce((sum, t) => sum + t.amount, 0);
      
      const thisWeekEarnings = earningTransactions.filter(t => {
        const txDate = new Date(t.date);
        return txDate >= weekStart;
      }).reduce((sum, t) => sum + t.amount, 0);
      
      const thisMonthEarnings = earningTransactions.filter(t => {
        const txDate = new Date(t.date);
        return txDate >= monthStart;
      }).reduce((sum, t) => sum + t.amount, 0);
      
      const totalEarnings = earningTransactions.reduce((sum, t) => sum + t.amount, 0);
      
      // Calculate total invested
      const investmentTransactions = transactions.filter(t => t.type === 'Investment' && t.description?.includes('Investment in'));
      const totalInvested = investmentTransactions.reduce((sum, t) => sum + t.amount, 0);
      
      // Create earnings history
      const history = earningTransactions
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 50) // Show last 50 earnings
        .map(t => ({
          id: t.id,
          date: t.date,
          amount: t.amount,
          type: t.type,
          description: t.description || 'Earning',
          source: getEarningSource(t.type, t.description)
        }));
      
      setStats({
        totalEarnings,
        todayEarnings,
        thisWeekEarnings,
        thisMonthEarnings,
        totalInvested,
        activeInvestments: activeProducts.length
      });
      
      setEarningsHistory(history);
    } catch (error) {
      console.error('Error loading earnings data:', error);
    }
  };

  const getEarningSource = (type: string, description?: string): string => {
    switch (type) {
      case 'Investment':
        if (description?.includes('Daily payout')) return 'Daily Payout';
        if (description?.includes('Plan completion')) return 'Plan Completion';
        if (description?.includes('Daily check-in')) return 'Check-in Bonus';
        return 'Investment';
      case 'Referral_Bonus':
        return 'Referral Bonus';
      case 'Admin_Add':
        return 'Admin Credit';
      default:
        return 'Other';
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <TrendingUp className="text-primary" />
        <h1 className="text-2xl font-bold">My Earnings</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Total Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">₦{stats.totalEarnings.toLocaleString()}</div>
            <p className="text-xs text-green-600 mt-1">All time earnings</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">Today's Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">₦{stats.todayEarnings.toLocaleString()}</div>
            <p className="text-xs text-blue-600 mt-1">Earnings today</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-600">This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">₦{stats.thisWeekEarnings.toLocaleString()}</div>
            <p className="text-xs text-purple-600 mt-1">Weekly earnings</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-600">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">₦{stats.thisMonthEarnings.toLocaleString()}</div>
            <p className="text-xs text-orange-600 mt-1">Monthly earnings</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-red-50 to-pink-50 border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Total Invested</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">₦{stats.totalInvested.toLocaleString()}</div>
            <p className="text-xs text-red-600 mt-1">Total investments</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-indigo-600">Active Investments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-700">{stats.activeInvestments}</div>
            <p className="text-xs text-indigo-600 mt-1">Running plans</p>
          </CardContent>
        </Card>
      </div>

      {/* Earnings History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="text-primary" />
            Earnings History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {earningsHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No earnings recorded yet.</p>
              <p className="text-sm">Start investing to see your earnings here!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {earningsHistory.map((earning) => (
                    <TableRow key={earning.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDate(earning.date)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {earning.source}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {earning.description}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 text-green-600 font-semibold">
                          <ArrowUpRight className="h-4 w-4" />
                          ₦{earning.amount.toLocaleString()}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}