
'use client'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Users, DollarSign, ArrowDownUp, Bell, ArrowUp, ArrowDown, UserPlus } from "lucide-react"
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
import { Loader } from "lucide-react"
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { DataService } from '@/lib/user-service';

interface Transaction {
    id: string;
    userEmail: string;
    type: 'Deposit' | 'Withdrawal' | 'Investment' | 'Admin_Add' | 'Admin_Deduct';
    amount: number;
    status: 'Completed' | 'Pending' | 'Failed';
    date: string;
}

interface AppUser {
    id: string;
    phone: string;
    regDate: string;
    investment: string;
    status: 'Active' | 'Suspended';
}

function StatCard({ title, value, icon, description }: { title: string, value: string, icon: React.ReactNode, description: string }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
    )
}

export default function AdminDashboardPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalDeposits: 0,
        totalWithdrawals: 0,
        pendingApprovals: 0,
    });
    const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
    const [recentUsers, setRecentUsers] = useState<AppUser[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Initialize default data if needed
                await DataService.initializeDefaultData();
                
                // Fetch real data from Firebase
                const dashboardData = await DataService.getDashboardData();
                
                setStats({
                    totalUsers: dashboardData.totalUsers,
                    totalDeposits: dashboardData.totalDeposits,
                    totalWithdrawals: dashboardData.totalWithdrawals,
                    pendingApprovals: dashboardData.pendingApprovals,
                });
                
                // Deduplicate transactions to prevent React key errors
                const uniqueTransactions = dashboardData.recentTransactions.filter((transaction, index, self) =>
                    index === self.findIndex(t => t.id === transaction.id)
                );
                setRecentTransactions(uniqueTransactions);
                setRecentUsers(dashboardData.recentUsers);

            } catch (error) {
                console.error('Error fetching data:', error);
                // Fallback to localStorage
                const allUsers = JSON.parse(localStorage.getItem('globalAppUsers') || '[]');
                const allDeposits: any[] = JSON.parse(localStorage.getItem('globalTransactions') || '[]');

            setStats({
                    totalUsers: allUsers.length,
                    totalDeposits: allDeposits.filter((d: any) => d.status === 'Completed').reduce((sum: number, d: any) => sum + parseFloat(d.amount.replace(/[^0-9.-]+/g,"")), 0),
                    totalWithdrawals: 0,
                    pendingApprovals: allDeposits.filter((d: any) => d.status === 'Pending').length,
                });
            
                setRecentTransactions(allDeposits.slice(0, 5));
                setRecentUsers(allUsers.slice(0, 5));
            }

            setIsLoading(false);
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
        )
    }

  return (
    <div className="space-y-6">
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
                title="Pending Deposits" 
                value={stats.pendingApprovals.toString()}
                description="Deposits waiting for action"
                icon={<Bell className="h-4 w-4 text-muted-foreground" />} 
            />
        </div>
       
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Recent Users</CardTitle>
                    <CardDescription>The latest users who have registered on the platform.</CardDescription>
                </CardHeader>
                <CardContent>
                   {recentUsers.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Phone Number</TableHead>
                                <TableHead className="text-right">Reg. Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {recentUsers.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell>
                                        <div className="font-medium">{user.phone}</div>
                                    </TableCell>
                                    <TableCell className="text-right">{user.regDate}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                   ) : (
                    <div className="text-center text-muted-foreground py-12">
                        <UserPlus className="mx-auto h-8 w-8 text-muted-foreground" />
                        <p className="mt-2">No users have registered yet.</p>
                    </div>
                   )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Transactions</CardTitle>
                    <CardDescription>The latest deposits on the platform.</CardDescription>
                </CardHeader>
                <CardContent>
                   {recentTransactions.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead className="text-right">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {recentTransactions.map((tx, index) => (
                                <TableRow key={`${tx.id}-${index}`}>
                                    <TableCell>
                                        <div className="font-medium">{tx.userEmail}</div>
                                        <div className="text-xs text-muted-foreground">{tx.date}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            {tx.type === "Deposit" ? <ArrowUp className="text-green-500" size={14}/> : <ArrowDown className="text-red-500" size={14}/>}
                                            {tx.type}
                                        </div>
                                    </TableCell>
                                    <TableCell>₦{tx.amount.toLocaleString()}</TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant={
                                            tx.status === "Completed" ? "default" 
                                            : tx.status === "Pending" ? "secondary" 
                                            : "destructive"
                                        }
                                        className={
                                            tx.status === "Completed" ? "bg-green-500/20 text-green-400 border-green-500/20"
                                            : tx.status === "Pending" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/20"
                                            : "bg-red-500/20 text-red-400 border-red-500/20"
                                        }
                                        >{tx.status}</Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    ) : (
                    <div className="text-center text-muted-foreground py-12">
                         <DollarSign className="mx-auto h-8 w-8 text-muted-foreground" />
                        <p className="mt-2">No transactions have been made yet.</p>
                    </div>
                    )}
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
