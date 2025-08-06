
'use client'
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { TransactionService } from '@/lib/user-service';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type TransactionStatus = "Completed" | "Pending" | "Failed";
type TransactionType = 'Deposit' | 'Withdrawal' | 'Investment' | 'Admin_Add' | 'Admin_Deduct' | 'Referral_Bonus';

interface Transaction {
    id: string;
    userId: string;
    amount: number;
    status: TransactionStatus;
    type: TransactionType;
    date: string;
    description?: string;
}

function TransactionRow({ transaction }: { transaction: Transaction }) {
    const isPositive = transaction.type === 'Deposit' || transaction.type === 'Admin_Add' || transaction.type === 'Referral_Bonus';

    const statusBadge = (status: TransactionStatus) => {
        switch(status) {
            case 'Completed': return <Badge className="bg-green-500/20 text-green-400 border-green-500/20">Completed</Badge>;
            case 'Pending': return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/20">Pending</Badge>;
            case 'Failed': return <Badge className="bg-red-500/20 text-red-400 border-red-500/20">Failed</Badge>;
            default: return <Badge>{status}</Badge>;
        }
    };

    const getTransactionIcon = () => {
        switch(transaction.type) {
            case 'Deposit':
            case 'Admin_Add':
                return <ArrowUpCircle className="text-green-400" size={32} />;
            case 'Withdrawal':
            case 'Admin_Deduct':
                return <ArrowDownCircle className="text-red-400" size={32} />;
            case 'Investment':
                return <ArrowUpCircle className="text-blue-400" size={32} />;
            case 'Referral_Bonus':
                return <ArrowUpCircle className="text-purple-400" size={32} />;
            default:
                return <ArrowUpCircle className="text-gray-400" size={32} />;
        }
    };

    const getTransactionLabel = () => {
        switch(transaction.type) {
            case 'Deposit': return 'Deposit';
            case 'Withdrawal': return 'Withdrawal';
            case 'Investment': return 'Investment';
            case 'Admin_Add': return 'Admin Credit';
            case 'Admin_Deduct': return 'Admin Debit';
            case 'Referral_Bonus': return 'Referral Bonus';
            default: return transaction.type;
        }
    };
    
    return (
        <Card className="bg-card/50">
            <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {getTransactionIcon()}
                    <div>
                        <p className="font-bold">{getTransactionLabel()}</p>
                        <p className="text-xs text-muted-foreground">{new Date(transaction.date).toLocaleString()}</p>
                        {transaction.description && (
                            <p className="text-xs text-muted-foreground">{transaction.description}</p>
                        )}
                    </div>
                </div>
                <div className="text-right">
                    <p className={`font-bold text-lg ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                        {isPositive ? '+' : '-'}₦{transaction.amount.toLocaleString()}
                    </p>
                    {statusBadge(transaction.status)}
                </div>
            </CardContent>
        </Card>
    )
}

export default function FundingRecordsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                await fetchTransactions(currentUser.uid);
            } else {
                setIsLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const fetchTransactions = async (uid: string) => {
        setIsLoading(true);
        try {
            const userTransactions = await TransactionService.getTransactionsByUser(uid);
            setTransactions(userTransactions);
        } catch (error) {
            console.error('Error fetching transactions:', error);
            setTransactions([]);
        } finally {
            setIsLoading(false);
        }
    };

    const deposits = transactions.filter(tx => tx.type === 'Deposit' || tx.type === 'Admin_Add');
    const withdrawals = transactions.filter(tx => tx.type === 'Withdrawal' || tx.type === 'Admin_Deduct');

    return (
        <div className="space-y-4">
            {isLoading ? (
                <div className="flex justify-center items-center h-48">
                    <Loader className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <Tabs defaultValue="all" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="all">All ({transactions.length})</TabsTrigger>
                        <TabsTrigger value="deposits">Credits ({deposits.length})</TabsTrigger>
                        <TabsTrigger value="withdrawals">Debits ({withdrawals.length})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="all">
                        {transactions.length > 0 ? (
                            <div className="space-y-3 mt-4">
                                {transactions.map(tx => <TransactionRow key={tx.id} transaction={tx} />)}
                            </div>
                        ) : (
                            <Card className="bg-card/50 mt-4"><CardContent className="p-10 text-center text-muted-foreground">No transactions found.</CardContent></Card>
                        )}
                    </TabsContent>
                    <TabsContent value="deposits">
                        {deposits.length > 0 ? (
                            <div className="space-y-3 mt-4">
                                {deposits.map(tx => <TransactionRow key={tx.id} transaction={tx} />)}
                            </div>
                        ) : (
                           <Card className="bg-card/50 mt-4"><CardContent className="p-10 text-center text-muted-foreground">No credits found.</CardContent></Card>
                        )}
                    </TabsContent>
                    <TabsContent value="withdrawals">
                         {withdrawals.length > 0 ? (
                            <div className="space-y-3 mt-4">
                                {withdrawals.map(tx => <TransactionRow key={tx.id} transaction={tx} />)}
                            </div>
                        ) : (
                           <Card className="bg-card/50 mt-4"><CardContent className="p-10 text-center text-muted-foreground">No debits found.</CardContent></Card>
                        )}
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}
