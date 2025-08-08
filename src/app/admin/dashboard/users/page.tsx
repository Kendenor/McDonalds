
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MoreHorizontal, Search, UserX, ShieldCheck, PlusCircle, Loader, KeyRound, DollarSign, MinusCircle } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from '@/hooks/use-toast'
import { onAuthStateChanged, User as FirebaseUser, signInWithEmailAndPassword, updatePassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { UserService, NotificationService, TransactionService, AdminNotificationService } from '@/lib/user-service'

interface AppUser {
    id: string;
    email: string;
    phone: string;
    regDate: string;
    investment: string;
    status: 'Active' | 'Suspended';
    balance?: number;
    totalDeposits?: number;
    totalWithdrawals?: number;
}

interface AdminUser {
    id: string;
    email: string;
    role: 'Super Admin' | 'Admin';
}

function AppUsersTab() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showFundsModal, setShowFundsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [fundsAmount, setFundsAmount] = useState('');
  const [fundsType, setFundsType] = useState<'add' | 'deduct'>('add');
  const { toast } = useToast();

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const allUsers = await UserService.getAllUsers();
      
      // If no users exist, create some sample users
      if (allUsers.length === 0) {
        const sampleUsers: AppUser[] = [
          {
            id: `user-${Date.now()}-1`,
            email: 'john@example.com',
            phone: '+2348012345678',
            regDate: new Date().toISOString(),
            investment: '₦50,000',
            status: 'Active',
            balance: 25000,
            totalDeposits: 50000,
            totalWithdrawals: 25000
          },
          {
            id: `user-${Date.now()}-2`,
            email: 'jane@example.com',
            phone: '+2348098765432',
            regDate: new Date(Date.now() - 86400000).toISOString(),
            investment: '₦25,000',
            status: 'Active',
            balance: 15000,
            totalDeposits: 25000,
            totalWithdrawals: 10000
          }
        ];

        for (const user of sampleUsers) {
          await UserService.saveUser(user);
        }
        
        // Fetch users again after creating them
        const updatedUsers = await UserService.getAllUsers();
        setUsers(updatedUsers);
      } else {
      setUsers(allUsers);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch users.' });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, [])

  const filteredUsers = users.filter(user => 
    user.phone.includes(searchTerm) || 
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleUserStatus = async (userId: string) => {
    try {
      const user = users.find((u: AppUser) => u.id === userId);
      if (!user) return;
      
      const newStatus = user.status === 'Active' ? 'Suspended' : 'Active';
      await UserService.updateUserStatus(userId, newStatus);
      
      // Create admin notification
      await AdminNotificationService.createAdminNotification({
        message: `User ${user.email} ${newStatus.toLowerCase()}`,
        date: new Date().toISOString(),
        read: false,
        type: 'user_suspension'
      });
      
      // Update local state immediately for better UX
      setUsers(prevUsers => 
        prevUsers.map(u => 
          u.id === userId ? { ...u, status: newStatus } : u
        )
      );
      
      toast({ title: 'Success', description: `User status changed to ${newStatus}` });
    } catch (error) {
      console.error('Error updating user status:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update user status.' });
    }
  }

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<AppUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const changePassword = async (userId: string) => {
      try {
          // Get user data
          const user = await UserService.getUserById(userId);
          if (!user) {
              toast({ variant: 'destructive', title: 'Error', description: 'User not found.' });
              return;
          }
          
          setSelectedUserForPassword(user);
          setNewPassword('');
          setShowPasswordModal(true);
      } catch (error) {
          console.error('Error getting user data:', error);
          toast({ variant: 'destructive', title: 'Error', description: 'Failed to get user data.' });
      }
  }

  const handlePasswordChange = async () => {
      if (!selectedUserForPassword || !newPassword) {
          toast({ variant: 'destructive', title: 'Error', description: 'Please enter a new password.' });
          return;
      }

      if (newPassword.length < 6) {
          toast({ variant: 'destructive', title: 'Error', description: 'Password must be at least 6 characters long.' });
          return;
      }

      setIsChangingPassword(true);
      try {
          // Store the new password in user data
          const updatedUser = {
              ...selectedUserForPassword,
              adminChangedPassword: newPassword,
              passwordChangedByAdmin: true,
              passwordChangeDate: new Date().toISOString()
          };
          
          await UserService.saveUser(updatedUser);
              
          // Create admin notification for password change
          await AdminNotificationService.createAdminNotification({
              message: `Password changed for ${selectedUserForPassword.email}. New password: ${newPassword}`,
              date: new Date().toISOString(),
              read: false,
              type: 'system'
          });
              
          // Send notification to user
          await NotificationService.createNotification({
              userId: selectedUserForPassword.id,
              message: `Your password has been changed by an administrator. Your new password is: ${newPassword}. Please log in with this password.`,
              date: new Date().toISOString(),
              read: false,
              type: 'system'
          });
              
          toast({ 
              title: 'Password Changed Successfully', 
              description: `Password has been changed for ${selectedUserForPassword.email}. New password: ${newPassword}. IMPORTANT: Please inform the user of their new password. The password is now stored in the system.` 
          });
          
          setShowPasswordModal(false);
          setSelectedUserForPassword(null);
          setNewPassword('');
      } catch (error) {
          console.error('Error changing password:', error);
          toast({ variant: 'destructive', title: 'Error', description: 'Failed to change password.' });
      } finally {
          setIsChangingPassword(false);
      }
  }
  
  const openFundsModal = (user: AppUser, type: 'add' | 'deduct') => {
      setSelectedUser(user);
      setFundsType(type);
      setFundsAmount('');
      setShowFundsModal(true);
  }

  const handleFundsUpdate = async () => {
      if (!selectedUser || !fundsAmount || isNaN(Number(fundsAmount))) {
          toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Please enter a valid number.' });
          return;
      }

      try {
          const amount = parseFloat(fundsAmount);
          const currentBalance = selectedUser.balance || 0;
          const newBalance = fundsType === 'add' ? currentBalance + amount : currentBalance - amount;
          
          await UserService.saveUser({ ...selectedUser, balance: newBalance });
          
          // Create transaction record
          const transactionType = fundsType === 'add' ? 'Admin_Add' : 'Admin_Deduct';
          await TransactionService.createTransaction({
              userId: selectedUser.id,
              userEmail: selectedUser.email,
              type: transactionType,
              amount: amount,
              status: 'Completed',
              date: new Date().toISOString(),
              description: fundsType === 'add' ? 
                  `Admin added ₦${amount.toLocaleString()} to your account` : 
                  `Admin deducted ₦${amount.toLocaleString()} from your account`
          });
          
          // Create notification for funds added
          if (fundsType === 'add') {
              await NotificationService.createNotification({
                  userId: selectedUser.id,
                  message: `You received ₦${amount.toLocaleString()} from McDonald's. Your new balance is ₦${newBalance.toLocaleString()}.`,
                  date: new Date().toISOString(),
                  read: false
              });
          }
          
          // Create admin notification for fund adjustment
          await AdminNotificationService.createAdminNotification({
              message: `Funds ${fundsType === 'add' ? 'added' : 'deducted'}: ₦${amount.toLocaleString()} for ${selectedUser.email}`,
              date: new Date().toISOString(),
              read: false,
              type: 'fund_adjustment'
          });
          
          fetchUsers(); // Re-fetch to update state
          setShowFundsModal(false);
          toast({ title: 'Funds Updated', description: `₦${amount.toLocaleString()} has been ${fundsType === 'add' ? 'added to' : 'deducted from'} user's balance.`});
      } catch (error) {
          console.error('Error updating user balance:', error);
          toast({ variant: 'destructive', title: 'Error', description: 'Failed to update user balance.' });
      }
  }

  if (isLoading) {
      return (
          <div className="flex justify-center items-center h-48">
              <Loader className="h-8 w-8 animate-spin text-primary" />
          </div>
      )
  }

  return (
    <>
      <Card>
          <CardHeader>
              <CardTitle>App Users</CardTitle>
              <CardDescription>View, search, and manage app user accounts.</CardDescription>
          </CardHeader>
          <CardContent>
              <div className="flex justify-between items-center mb-4">
                  <div className="relative w-full max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input placeholder="Search by email or phone..." className="pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  </div>
              </div>
               {filteredUsers.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12">
                      <p>No app users have registered yet.</p>
                  </div>
              ) : (
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone Number</TableHead>
                          <TableHead>Balance</TableHead>
                          <TableHead>Registration Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {filteredUsers.map((user) => (
                          <TableRow key={user.id}>
                              <TableCell className="font-medium">{user.email}</TableCell>
                              <TableCell>{user.phone}</TableCell>
                              <TableCell>₦{(user.balance || 0).toLocaleString()}</TableCell>
                              <TableCell>{new Date(user.regDate).toLocaleDateString()}</TableCell>
                              <TableCell>
                                  <Badge variant={user.status === "Active" ? "default" : "destructive"}
                                      className={user.status === "Active" ? "bg-green-500/20 text-green-400 border-green-500/20" : "bg-red-500/20 text-red-400 border-red-500/20"}>
                                      {user.status}
                                  </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                   <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="icon">
                                              <MoreHorizontal className="h-4 w-4" />
                                          </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                          <DropdownMenuLabel>Manage User</DropdownMenuLabel>
                                          <DropdownMenuItem onClick={() => toggleUserStatus(user.id)} className={user.status === "Active" ? "text-red-500 focus:text-red-500" : "text-green-500 focus:text-green-500"}>
                                              {user.status === "Active" ? (
                                                  <><UserX className="mr-2 h-4 w-4" /> Suspend</>
                                              ) : (
                                                  <><ShieldCheck className="mr-2 h-4 w-4" /> Activate</>
                                              )}
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => changePassword(user.id)}>
                                              <KeyRound className="mr-2 h-4 w-4" />
                                              Change Password
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuLabel>Manage Funds</DropdownMenuLabel>
                                          <DropdownMenuItem onClick={() => openFundsModal(user, 'add')} className="text-green-500 focus:text-green-500">
                                              <DollarSign className="mr-2 h-4 w-4" />
                                              Add Funds
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => openFundsModal(user, 'deduct')} className="text-red-500 focus:text-red-500">
                                              <MinusCircle className="mr-2 h-4 w-4" />
                                              Deduct Funds
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

      {/* Funds Management Modal */}
      <Dialog open={showFundsModal} onOpenChange={setShowFundsModal}>
        <DialogContent className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/40 dark:to-indigo-900/30 text-gray-900 dark:text-gray-100 border border-blue-200 dark:border-blue-700/40 p-6 rounded-lg max-w-md w-full mx-4 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {fundsType === 'add' ? 'Add Funds' : 'Deduct Funds'}
            </DialogTitle>
            <DialogDescription asChild>
              {selectedUser ? (
                <div className="space-y-2">
                  <div>User: <span className="font-semibold">{selectedUser.email}</span></div>
                  <div>Current Balance: <span className="font-semibold text-primary">₦{(selectedUser.balance || 0).toLocaleString()}</span></div>
                </div>
              ) : (
                <div>Select a user to manage funds</div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="amount" className="text-sm font-medium">
                Amount (₦)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₦</span>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount"
                  className="pl-8 text-lg h-12"
                  value={fundsAmount}
                  onChange={(e) => setFundsAmount(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            
            {fundsAmount && !isNaN(Number(fundsAmount)) && selectedUser && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-sm">
                  New Balance: <span className="font-bold text-primary">
                    ₦{((selectedUser.balance || 0) + (fundsType === 'add' ? parseFloat(fundsAmount) : -parseFloat(fundsAmount))).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFundsModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleFundsUpdate}
              disabled={!fundsAmount || isNaN(Number(fundsAmount)) || parseFloat(fundsAmount) <= 0}
              className={fundsType === 'add' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {fundsType === 'add' ? 'Add Funds' : 'Deduct Funds'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Change Modal */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/40 dark:to-indigo-900/30 text-gray-900 dark:text-gray-100 border border-blue-200 dark:border-blue-700/40 p-6 rounded-lg max-w-md w-full mx-4 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Change User Password
            </DialogTitle>
            <DialogDescription asChild>
              {selectedUserForPassword ? (
                <div className="space-y-2">
                  <div>User: <span className="font-semibold">{selectedUserForPassword.email}</span></div>
                  <div className="text-sm text-muted-foreground">
                    Enter a new password for this user. The password will be changed immediately.
                  </div>
                </div>
              ) : (
                <div>Select a user to change password</div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="newPassword" className="text-sm font-medium">
                New Password
              </label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Enter new password"
                className="text-lg h-12"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
              />
              <p className="text-xs text-muted-foreground">
                Password must be at least 6 characters long
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handlePasswordChange}
              disabled={!newPassword || newPassword.length < 6 || isChangingPassword}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isChangingPassword ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Changing Password...
                </>
              ) : (
                'Change Password'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function AdminUsersTab() {
    const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
    const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const fetchAdminUsers = () => {
        setIsLoading(true);
        const admins = JSON.parse(localStorage.getItem('globalAdminUsers') || '[]');
        // Ensure super admin is always present
        const superAdminEmail = "mcdonald@gmail.com";
        if (!admins.some((admin: AdminUser) => admin.email.toLowerCase() === superAdminEmail)) {
            admins.push({ id: 'super-admin-01', email: superAdminEmail, role: 'Super Admin' });
            localStorage.setItem('globalAdminUsers', JSON.stringify(admins));
        }
        setAdminUsers(admins);
        setIsLoading(false);
    }

     useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
        });
        fetchAdminUsers();
        return () => unsubscribe();
    }, []);

    const isSuperAdmin = currentUser?.email?.toLowerCase() === 'mcdonald@gmail.com';

    const removeAdmin = (adminId: string) => {
        if (!isSuperAdmin) {
            toast({ variant: 'destructive', title: 'Permission Denied', description: 'Only Super Admin can remove other admins.' });
            return;
        }
        if (!confirm('Are you sure you want to remove this admin? This action is permanent.')) return;
        
        const updatedAdmins = adminUsers.filter(u => u.id !== adminId);
        localStorage.setItem('globalAdminUsers', JSON.stringify(updatedAdmins));
        setAdminUsers(updatedAdmins);
        toast({ title: 'Success', description: 'Admin user removed.' });
    }

    const addAdmin = () => {
         if (!isSuperAdmin) {
            toast({ variant: 'destructive', title: 'Permission Denied', description: 'Only Super Admin can add new admins.' });
            return;
        }
        const email = prompt("Enter new admin's email:");
        if (email) {
            // In a real app, you'd use Firebase Admin SDK to create the user if they don't exist.
            // Here, we just add them to our "admins" list.
            const newUser: AdminUser = { id: `ADM${Date.now()}`, email, role: 'Admin' };
            const updatedAdmins = [...adminUsers, newUser];
            localStorage.setItem('globalAdminUsers', JSON.stringify(updatedAdmins));
            setAdminUsers(updatedAdmins);
            toast({ title: 'Success', description: `Admin ${email} added. They need to be added to Firebase Auth manually to be able to log in.` });
        }
    }

    if (isLoading) {
      return (
          <div className="flex justify-center items-center h-48">
              <Loader className="h-8 w-8 animate-spin text-primary" />
          </div>
      )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Admin Users</CardTitle>
                <CardDescription>Manage administrator accounts. Only Super Admins can add or remove users.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex justify-end mb-4">
                    <Button onClick={addAdmin} disabled={!isSuperAdmin}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Admin
                    </Button>
                </div>
                {adminUsers.length === 0 ? (
                     <div className="text-center text-muted-foreground py-12">
                        <p>No admin users found.</p>
                    </div>
                ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {adminUsers.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell className="font-medium">{user.email}</TableCell>
                                <TableCell>
                                    <Badge variant={user.role === "Super Admin" ? "default" : "secondary"}>
                                        {user.role}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                     <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" disabled={user.role === 'Super Admin' || !isSuperAdmin}>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem className="text-red-500 focus:text-red-500" onClick={() => removeAdmin(user.id)}>
                                                <UserX className="mr-2 h-4 w-4" />
                                                Remove
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
    )
}

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="appUsers" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="appUsers">App Users</TabsTrigger>
            <TabsTrigger value="adminUsers">Admin Users</TabsTrigger>
        </TabsList>
        <TabsContent value="appUsers">
            <AppUsersTab />
        </TabsContent>
        <TabsContent value="adminUsers">
            <AdminUsersTab />
        </TabsContent>
        </Tabs>
    </div>
  )
}
