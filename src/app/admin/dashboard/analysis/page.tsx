'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, DollarSign, ArrowDownUp, TrendingUp, Bell, BarChart3, Activity, Target } from 'lucide-react';
import { UserService } from '@/lib/user-service';
import { Loader } from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  totalDeposits: number;
  totalWithdrawals: number;
  pendingApprovals: number;
  netProfit: number;
}

function StatCard({ title, value, icon, description }: { title: string, value: string, icon: React.ReactNode, description: string }) {
  return (
    <Card className="bg-card/50 hover:bg-card/90 transition-colors">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function AnalysisPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    pendingApprovals: 0,
    netProfit: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Initialize default data
        await UserService.initializeDefaultData();
        
        // Fetch real data from Firebase
        const dashboardData = await UserService.getDashboardData();
        
        // Calculate net profit
        const netProfit = dashboardData.totalDeposits - dashboardData.totalWithdrawals;
        
        setStats({
          totalUsers: dashboardData.totalUsers,
          totalDeposits: dashboardData.totalDeposits,
          totalWithdrawals: dashboardData.totalWithdrawals,
          pendingApprovals: dashboardData.pendingApprovals,
          netProfit: netProfit,
        });

      } catch (error) {
        console.error('Error fetching data:', error);
        // Fallback to localStorage
        const allUsers = JSON.parse(localStorage.getItem('globalAppUsers') || '[]');
        const allDeposits: any[] = JSON.parse(localStorage.getItem('globalTransactions') || '[]');

        const totalDeposits = allDeposits.filter((d: any) => d.status === 'Completed').reduce((sum: number, d: any) => sum + parseFloat(d.amount.replace(/[^0-9.-]+/g,"")), 0);
        const totalWithdrawals = 0;
        const netProfit = totalDeposits - totalWithdrawals;

        setStats({
          totalUsers: allUsers.length,
          totalDeposits: totalDeposits,
          totalWithdrawals: totalWithdrawals,
          pendingApprovals: allDeposits.filter((d: any) => d.status === 'Pending').length,
          netProfit: netProfit,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    
    const interval = setInterval(fetchData, 10000); // Refresh data every 10 seconds
    return () => clearInterval(interval);
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
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Real-time platform statistics and insights</p>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <span className="text-sm text-muted-foreground">Live Data</span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Users" 
          value={stats.totalUsers.toLocaleString()}
          description="Total registered users"
          icon={<Users className="h-4 w-4 text-muted-foreground" />} 
        />
        <StatCard 
          title="Total Deposits" 
          value={`₦${stats.totalDeposits.toLocaleString()}`}
          description="Sum of all completed deposits"
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} 
        />
        <StatCard 
          title="Total Withdrawals" 
          value={`₦${stats.totalWithdrawals.toLocaleString()}`}
          description="Sum of all completed withdrawals"
          icon={<ArrowDownUp className="h-4 w-4 text-muted-foreground" />} 
        />
        <StatCard 
          title="Net Profit" 
          value={`₦${stats.netProfit.toLocaleString()}`}
          description="Total deposits minus withdrawals"
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />} 
        />
      </div>

      {/* Additional Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard 
          title="Pending Deposits" 
          value={stats.pendingApprovals.toString()}
          description="Deposits waiting for action"
          icon={<Bell className="h-4 w-4 text-muted-foreground" />} 
        />
        <StatCard 
          title="Success Rate" 
          value={`${stats.totalUsers > 0 ? Math.round((stats.totalUsers / (stats.totalUsers + stats.pendingApprovals)) * 100) : 0}%`}
          description="User engagement rate"
          icon={<Target className="h-4 w-4 text-muted-foreground" />} 
        />
        <StatCard 
          title="Average Deposit" 
          value={`₦${stats.totalUsers > 0 ? Math.round(stats.totalDeposits / stats.totalUsers).toLocaleString() : 0}`}
          description="Average deposit per user"
          icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />} 
        />
      </div>

      {/* Detailed Analysis Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Profit Analysis
            </CardTitle>
            <CardDescription>Detailed breakdown of platform profitability</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Revenue</span>
              <span className="font-semibold text-green-600">₦{stats.totalDeposits.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Payouts</span>
              <span className="font-semibold text-red-600">₦{stats.totalWithdrawals.toLocaleString()}</span>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Net Profit</span>
                <span className={`font-bold text-lg ${stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₦{stats.netProfit.toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Statistics
            </CardTitle>
            <CardDescription>Platform user metrics and growth</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Users</span>
              <span className="font-semibold">{stats.totalUsers.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Pending Approvals</span>
              <span className="font-semibold text-orange-600">{stats.pendingApprovals}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Active Users</span>
              <span className="font-semibold text-blue-600">{stats.totalUsers - stats.pendingApprovals}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Platform Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The platform currently has <strong>{stats.totalUsers}</strong> registered users with a total revenue of <strong>₦{stats.totalDeposits.toLocaleString()}</strong>. 
            The net profit stands at <strong className={stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}>₦{stats.netProfit.toLocaleString()}</strong>.
            {stats.pendingApprovals > 0 && ` There are ${stats.pendingApprovals} pending deposits awaiting approval.`}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
