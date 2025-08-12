
'use client'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Users, DollarSign, ArrowDownUp, Bell, ArrowUp, ArrowDown, UserPlus, RefreshCw, Package, TrendingUp } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { Loader } from "lucide-react"
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { DataService } from '@/lib/user-service';
import { ProductInventoryService } from '@/lib/product-inventory-service';
import { useToast } from '@/hooks/use-toast';

interface Transaction {
    id: string;
    userEmail: string;
    type: 'Deposit' | 'Withdrawal' | 'Investment' | 'Admin_Add' | 'Admin_Deduct' | 'Referral_Bonus';
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
    const [isRestoring, setIsRestoring] = useState(false);
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalDeposits: 0,
        totalWithdrawals: 0,
        pendingApprovals: 0,
        netProfit: 0,
    });
    const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
    const [recentUsers, setRecentUsers] = useState<AppUser[]>([]);
    const { toast } = useToast();

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Initialize default data if needed
                await DataService.initializeDefaultData();
                
                // Initialize product inventory
                await ProductInventoryService.initializeInventory();
                
                // Fetch real data from Firebase
                const dashboardData = await DataService.getDashboardData();
                
                // Calculate net profit
                const netProfit = dashboardData.totalDeposits - dashboardData.totalWithdrawals;
                
                setStats({
                    totalUsers: dashboardData.totalUsers,
                    totalDeposits: dashboardData.totalDeposits,
                    totalWithdrawals: dashboardData.totalWithdrawals,
                    pendingApprovals: dashboardData.pendingApprovals,
                    netProfit: netProfit,
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
            
                setRecentTransactions(allDeposits.slice(0, 5));
                setRecentUsers(allUsers.slice(0, 5));
            }

            setIsLoading(false);
        };

        fetchData();
        
        const interval = setInterval(fetchData, 10000); // Refresh data every 10 seconds
        return () => clearInterval(interval);
    }, []);

    const handleRestoreInventory = async (productType: 'special' | 'premium') => {
        setIsRestoring(true);
        try {
            await ProductInventoryService.restoreInventory(productType);
            toast({
                title: "Inventory Restored!",
                description: `${productType.charAt(0).toUpperCase() + productType.slice(1)} products have been restored to full availability.`,
            });
        } catch (error) {
            console.error('Error restoring inventory:', error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to restore inventory. Please try again.",
            });
        } finally {
            setIsRestoring(false);
        }
    };

    const handleForceResetInventory = async () => {
        setIsRestoring(true);
        try {
            await ProductInventoryService.forceResetInventory();
            toast({
                title: "Inventory Reset!",
                description: "Product inventory has been forcefully reset to its initial state.",
            });
        } catch (error) {
            console.error('Error force resetting inventory:', error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to force reset inventory. Please try again.",
            });
        } finally {
            setIsRestoring(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-48">
                <Loader className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

  return (
    <div className="space-y-6">
        {/* Restore Inventory Section */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-700/40">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Package className="text-blue-600" />
                    Product Inventory Management
                </CardTitle>
                <CardDescription>
                    Restore Special and Premium products to full availability
                </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-4 flex-wrap">
                <Button 
                    onClick={() => handleRestoreInventory('special')}
                    disabled={isRestoring}
                    className="bg-blue-600 hover:bg-blue-700"
                >
                    {isRestoring ? (
                        <Loader className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Restore Special Products
                </Button>
                <Button 
                    onClick={() => handleRestoreInventory('premium')}
                    disabled={isRestoring}
                    className="bg-purple-600 hover:bg-purple-700"
                >
                    {isRestoring ? (
                        <Loader className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Restore Premium Products
                </Button>
                <Button 
                    onClick={handleForceResetInventory}
                    disabled={isRestoring}
                    variant="outline"
                    className="border-orange-300 text-orange-600 hover:bg-orange-50"
                >
                    {isRestoring ? (
                        <Loader className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Force Reset Inventory (Debug)
                </Button>
            </CardContent>
        </Card>

        {/* Analytics Dashboard */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
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
