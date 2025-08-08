
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
import { MoreHorizontal, Search, CheckCircle, XCircle, Loader, X, ZoomIn, ZoomOut, RotateCw } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from '@/hooks/use-toast'
import { TransactionService, NotificationService, AdminNotificationService, ReferralService, UserService } from '@/lib/user-service';

type TransactionStatus = "Completed" | "Pending" | "Failed";

interface Transaction {
    id: string;
    userId: string;
    userEmail: string;
    amount: number;
    status: TransactionStatus;
    type: 'Deposit' | 'Withdrawal' | 'Investment' | 'Admin_Add' | 'Admin_Deduct' | 'Referral_Bonus';
    date: string;
    transactionRef?: string;
    proofImage?: string;
}

export default function DepositsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageZoom, setImageZoom] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);
  const { toast } = useToast();

  const fetchTransactions = async () => {
      setIsLoading(true);
      const allTransactions = await TransactionService.getAllTransactions();
      const depositTransactions = allTransactions.filter((t: any) => t.type === 'Deposit');
      
      // Remove duplicates based on ID
      const uniqueDeposits = depositTransactions.filter((transaction, index, self) => 
        index === self.findIndex(t => t.id === transaction.id)
      );
      
      const sortedDeposits = uniqueDeposits.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      // Debug: Log deposit transactions to see proofImage data
      console.log('Deposit transactions:', sortedDeposits.map(d => ({
        id: d.id,
        userEmail: d.userEmail,
        amount: d.amount,
        hasProofImage: !!d.proofImage,
        proofImageLength: d.proofImage ? d.proofImage.length : 0
      })));
      
      setTransactions(sortedDeposits);
      setIsLoading(false);
  }

  useEffect(() => {
    fetchTransactions();
    // Optionally, listen for Firestore changes here
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

  const openImageModal = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setImageZoom(1);
    setImageRotation(0);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
    setImageZoom(1);
    setImageRotation(0);
  };

  const zoomIn = () => {
    setImageZoom(prev => Math.min(prev + 0.25, 5));
  };

  const zoomOut = () => {
    setImageZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const rotateImage = () => {
    setImageRotation(prev => (prev + 90) % 360);
  };

  const resetImage = () => {
    setImageZoom(1);
    setImageRotation(0);
  };

  const updateDepositStatus = async (id: string, newStatus: TransactionStatus) => {
    try {
      await TransactionService.updateTransactionStatus(id, newStatus);
      
      // Send notification to user about deposit status
      const transaction = transactions.find(t => t.id === id);
      if (transaction && newStatus === 'Completed') {
        // Update user's balance when deposit is approved
        try {
          const userData = await UserService.getUserById(transaction.userId);
          if (userData) {
            const updatedUser = {
              ...userData,
              balance: (userData.balance || 0) + transaction.amount,
              totalDeposits: (userData.totalDeposits || 0) + transaction.amount,
              hasDeposited: true,
              firstDepositDate: new Date().toISOString()
            };
            await UserService.saveUser(updatedUser);
            console.log('User balance updated successfully');
          }
        } catch (error) {
          console.error('Error updating user balance:', error);
          toast({ variant: 'destructive', title: 'Warning', description: 'Deposit approved but failed to update user balance. Please contact support.' });
        }

        await NotificationService.createNotification({
          userId: transaction.userId,
          message: `Your deposit of ₦${transaction.amount.toLocaleString()} has been approved and credited to your account.`,
          date: new Date().toISOString(),
          read: false
        });
        
        // Process referral bonus for first deposit
        try {
          await ReferralService.processDepositReferralBonus(transaction.userId, transaction.amount);
        } catch (error) {
          console.error('Error processing referral bonus:', error);
        }
        
        // Create admin notification
        await AdminNotificationService.createAdminNotification({
          message: `Deposit approved: ₦${transaction.amount.toLocaleString()} from ${transaction.userEmail}`,
          date: new Date().toISOString(),
          read: false,
          type: 'deposit'
        });
      } else if (transaction && newStatus === 'Failed') {
        await NotificationService.createNotification({
          userId: transaction.userId,
          message: `Your deposit of ₦${transaction.amount.toLocaleString()} was not approved. Please contact support for assistance.`,
          date: new Date().toISOString(),
          read: false
        });
        
        // Create admin notification
        await AdminNotificationService.createAdminNotification({
          message: `Deposit rejected: ₦${transaction.amount.toLocaleString()} from ${transaction.userEmail}`,
          date: new Date().toISOString(),
          read: false,
          type: 'deposit'
        });
      }
      
      toast({ title: 'Success', description: `Deposit status updated to ${newStatus}.` });
      fetchTransactions();
    } catch (error) {
      console.error('Error updating deposit status:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update deposit status.' });
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
                <CardTitle>Manage Deposits</CardTitle>
                <CardDescription>View, search, and manage all deposit transactions.</CardDescription>
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
                        <p>No deposit transactions found.</p>
                    </div>
                 ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Transaction ID</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Ref</TableHead>
                            <TableHead>Proof</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredTransactions.map((d, index) => (
                            <TableRow key={`${d.id}-${index}`}>
                                <TableCell className="font-mono text-xs">{d.id}</TableCell>
                                <TableCell className="font-medium">{d.userEmail}</TableCell>
                                <TableCell>{`₦${d.amount.toLocaleString()}`}</TableCell>
                                <TableCell>{d.date && new Date(d.date).toLocaleDateString()}</TableCell>
                                <TableCell>
                                     <Badge variant={
                                        d.status === "Completed" ? "default" 
                                        : d.status === "Pending" ? "secondary" 
                                        : "destructive"
                                    }
                                    className={
                                        d.status === "Completed" ? "bg-green-500/20 text-green-400 border-green-500/20"
                                        : d.status === "Pending" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/20"
                                        : "bg-red-500/20 text-red-400 border-red-500/20"
                                    }
                                    >{d.status}</Badge>
                                </TableCell>
                                <TableCell>
                                    {d.transactionRef ? (
                                        <div>
                                            <div className="font-semibold">Ref:</div>
                                            <div className="text-xs">{d.transactionRef}</div>
                                        </div>
                                    ) : (
                                        <span className="text-muted-foreground text-xs">N/A</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {d.proofImage ? (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => openImageModal(d.proofImage!)}
                                                className="relative group cursor-pointer bg-gray-100 dark:bg-gray-800 rounded border-2 border-dashed border-gray-300 dark:border-gray-600 p-2 hover:border-primary transition-colors"
                                                style={{ minWidth: '64px', minHeight: '64px' }}
                                            >
                                                {d.proofImage.startsWith('data:image') ? (
                                                <img 
                                                    src={d.proofImage} 
                                                    alt="Proof" 
                                                        className="max-h-16 max-w-16 object-contain rounded" 
                                                        onError={(e) => {
                                                            console.error('Image failed to load');
                                                            const target = e.target as HTMLImageElement;
                                                            target.style.display = 'none';
                                                            // Show fallback
                                                            const parent = target.parentElement;
                                                            if (parent) {
                                                                parent.innerHTML = `
                                                                    <div class="flex items-center justify-center h-full">
                                                                        <div class="text-center">
                                                                            <svg class="w-8 h-8 mx-auto text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                                                            </svg>
                                                                            <div class="text-xs text-gray-500">Image</div>
                                                                        </div>
                                                                    </div>
                                                                `;
                                                            }
                                                        }}
                                                        onLoad={() => {
                                                            console.log('Image loaded successfully');
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="flex items-center justify-center h-full">
                                                        <div className="text-center">
                                                            <svg className="w-8 h-8 mx-auto text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                                            </svg>
                                                            <div className="text-xs text-gray-500">Image</div>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                                                    <ZoomIn className="h-4 w-4 text-white" />
                                                </div>
                                            </button>
                                            <div className="flex flex-col">
                                            <span className="text-xs text-muted-foreground">Click to view</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {d.proofImage?.startsWith('data:image') ? 'Image' : 'File'}
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-muted-foreground text-xs">N/A</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                     <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" disabled={d.status !== 'Pending'}>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                            <DropdownMenuItem onClick={() => updateDepositStatus(d.id, 'Completed')}>
                                                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                                Approve
                                            </DropdownMenuItem>
                                             <DropdownMenuItem onClick={() => updateDepositStatus(d.id, 'Failed')}>
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

        {/* Image Viewer Modal */}
        <Dialog open={!!selectedImage} onOpenChange={closeImageModal}>
            <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 w-full">
                <DialogHeader className="p-4 pb-0">
                    <div className="flex items-center justify-between">
                        <DialogTitle>Deposit Proof Image</DialogTitle>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={zoomOut}
                                disabled={imageZoom <= 0.5}
                            >
                                <ZoomOut className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={zoomIn}
                                disabled={imageZoom >= 5}
                            >
                                <ZoomIn className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={rotateImage}
                            >
                                <RotateCw className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={resetImage}
                            >
                                Reset
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={closeImageModal}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </DialogHeader>
                <div className="p-4 pt-0">
                    <div className="relative overflow-auto max-h-[80vh] bg-gray-100 dark:bg-gray-900 rounded-lg">
                        {selectedImage && (
                            <div className="flex items-center justify-center min-h-[500px]">
                                <img
                                    src={selectedImage}
                                    alt="Deposit Proof"
                                    className="max-w-full max-h-full object-contain"
                                    style={{
                                        transform: `scale(${imageZoom}) rotate(${imageRotation}deg)`,
                                        transition: 'transform 0.2s ease-in-out'
                                    }}
                                    onError={(e) => {
                                        console.error('Modal image failed to load');
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        const parent = target.parentElement;
                                        if (parent) {
                                            parent.innerHTML = `
                                                <div class="flex items-center justify-center h-full">
                                                    <div class="text-center">
                                                        <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                                                        </svg>
                                                        <div class="text-lg font-semibold text-gray-600">Image Failed to Load</div>
                                                        <div class="text-sm text-gray-500 mt-2">The image data may be corrupted or too large</div>
                                                    </div>
                                                </div>
                                            `;
                                        }
                                    }}
                                    onLoad={() => {
                                        console.log('Modal image loaded successfully');
                                    }}
                                />
                            </div>
                        )}
                    </div>
                    <div className="mt-4 text-center text-sm text-muted-foreground">
                        <p>Zoom: {Math.round(imageZoom * 100)}% | Rotation: {imageRotation}°</p>
                        <p className="mt-1">Use the controls above to zoom, rotate, or reset the image</p>
                        <p className="mt-1">Press ESC or click outside to close</p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    </div>
  )
}
