
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
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Search, CheckCircle, XCircle, Loader } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from '@/hooks/use-toast'
import { TransactionService, NotificationService, AdminNotificationService } from '@/lib/user-service';

type TransactionStatus = "Completed" | "Pending" | "Failed";

interface Transaction {
    id: string;
    userId: string;
    userEmail: string;
    amount: number;
    status: TransactionStatus;
    type: 'Deposit' | 'Withdrawal' | 'Investment' | 'Admin_Add' | 'Admin_Deduct';
    date: string;
    bankAccount?: string;
}

const WITHDRAWAL_CHARGE_PERCENT = 0.15; // 15%

const createNotification = (userId: string, message: string) => {
    const notifications = JSON.parse(localStorage.getItem(`notifications_${userId}`) || '[]');
    const newNotification = {
        id: `N${Date.now()}`,
        message,
        date: new Date().toISOString(),
        read: false,
    };
    notifications.unshift(newNotification);
    localStorage.setItem(`notifications_${userId}`, JSON.stringify(notifications));
    window.dispatchEvent(new Event('storage'));
};

export default function WithdrawalsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { toast } = useToast();

  const fetchTransactions = async () => {
      setIsLoading(true);
      const allTransactions = await TransactionService.getAllTransactions();
      const withdrawalTransactions = allTransactions.filter((t: any) => t.type === 'Withdrawal');
      
      // Remove duplicates based on ID
      const uniqueWithdrawals = withdrawalTransactions.filter((transaction, index, self) => 
        index === self.findIndex(t => t.id === transaction.id)
      );
      
      const sortedWithdrawals = uniqueWithdrawals.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(sortedWithdrawals);
      setIsLoading(false);
  }

  useEffect(() => {
    fetchTransactions();
    const handleStorageChange = () => fetchTransactions();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    let result = transactions;
    if (statusFilter !== 'all') {
      result = result.filter(d => d.status.toLowerCase() === statusFilter);
    }
    if (searchTerm) {
      result = result.filter(d => d.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) || d.id.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    setFilteredTransactions(result);
  }, [searchTerm, statusFilter, transactions]);

  const updateWithdrawalStatus = async (id: string, newStatus: TransactionStatus) => {
    try {
      await TransactionService.updateTransactionStatus(id, newStatus);
      
      // Send notification to user about withdrawal status
      const transaction = transactions.find(t => t.id === id);
      if (transaction && newStatus === 'Completed') {
        await NotificationService.createNotification({
          userId: transaction.userId,
          message: `Your withdrawal of ₦${transaction.amount.toLocaleString()} has been approved.`,
          date: new Date().toISOString(),
          read: false
        });
        
        // Create admin notification
        await AdminNotificationService.createAdminNotification({
          message: `Withdrawal approved: ₦${transaction.amount.toLocaleString()} for ${transaction.userEmail}`,
          date: new Date().toISOString(),
          read: false,
          type: 'withdrawal'
        });
      } else if (transaction && newStatus === 'Failed') {
        await NotificationService.createNotification({
          userId: transaction.userId,
          message: `Your withdrawal of ₦${transaction.amount.toLocaleString()} was rejected and the funds returned to your balance.`,
          date: new Date().toISOString(),
          read: false
        });
        
        // Create admin notification
        await AdminNotificationService.createAdminNotification({
          message: `Withdrawal rejected: ₦${transaction.amount.toLocaleString()} for ${transaction.userEmail}`,
          date: new Date().toISOString(),
          read: false,
          type: 'withdrawal'
        });
      }
      
      toast({ title: 'Success', description: `Withdrawal status updated to ${newStatus}.` });
      fetchTransactions();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update withdrawal status.' });
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
        <Card>
            <CardHeader>
                <CardTitle>Manage Withdrawals</CardTitle>
                <CardDescription>View, search, and manage all withdrawal requests.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex justify-between items-center mb-4 gap-4">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input 
                            placeholder="Search by user or transaction ID..." 
                            className="pl-10" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                     <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                 {filteredTransactions.length === 0 ? (
                    <div className="text-center text-muted-foreground py-12">
                        <p>No withdrawal transactions found.</p>
                    </div>
                 ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Bank Details</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredTransactions.map((tx, index) => (
                            <TableRow key={`${tx.id}-${index}`}>
                                <TableCell>
                                  <div className="font-medium">{tx.userEmail}</div>
                                  <div className="font-mono text-xs text-muted-foreground">{tx.id}</div>
                                </TableCell>
                                <TableCell>
                                    <div>{`₦${tx.amount.toLocaleString()}`}</div>
                                    <div className="text-xs text-red-400">
                                        (Fee: ₦{(tx.amount * 0.15).toLocaleString()})
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="font-semibold">{tx.bankAccount || 'N/A'}</div>
                                </TableCell>
                                <TableCell>{new Date(tx.date).toLocaleString()}</TableCell>
                                <TableCell>
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
                                <TableCell className="text-right">
                                     <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" disabled={tx.status !== 'Pending'}>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                            <DropdownMenuItem onClick={() => updateWithdrawalStatus(tx.id, 'Completed')}>
                                                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                                Approve
                                            </DropdownMenuItem>
                                             <DropdownMenuItem onClick={() => updateWithdrawalStatus(tx.id, 'Failed')}>
                                                <XCircle className="mr-2 h-4 w-4 text-red-500" />
                                                Reject
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
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
