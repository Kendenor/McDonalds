import { db } from './firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  serverTimestamp,
  getDocs 
} from 'firebase/firestore';

// Helper function to check if we're on client side
function isClientSide() {
  return typeof window !== 'undefined';
}

export interface AppUser {
  id: string;
  email: string;
  phone: string;
  regDate: string;
  investment: string;
  status: 'Active' | 'Suspended';
  balance?: number;
  totalDeposits?: number;
  totalWithdrawals?: number;
  lastCheckIn?: string;
  referralCode?: string;
  referredBy?: string;
  referralEarnings?: number;
  totalReferrals?: number;
  hasDeposited?: boolean;
  firstDepositDate?: string;
  hasBasicPlan?: boolean;
  totalInvested?: number;
}

export interface Transaction {
  id: string;
  userId: string;
  userEmail: string;
  type: 'Deposit' | 'Withdrawal' | 'Investment' | 'Admin_Add' | 'Admin_Deduct' | 'Referral_Bonus';
  amount: number;
  status: 'Completed' | 'Pending' | 'Failed';
  date: string;
  description?: string;
  bankAccount?: string;
  proofImage?: string;
  transactionRef?: string;
  referralUserId?: string;
}

export interface PurchasedProduct {
  id: string;
  userId: string;
  productId: string;
  name: string;
  imageUrl: string;
  price: number;
  dailyEarning: number;
  totalEarning: number;
  daysCompleted: number;
  totalDays: number;
  purchaseDate: string;
  status: 'Active' | 'Completed';
  planType: 'Basic' | 'Special' | 'Premium';
  cycleDays: number;
  dailyROI: number;
  startDate: string;
  endDate: string;
  totalEarned: number;
  lastPayoutDate?: string;
  isLocked: boolean;
}

export interface Claim {
  id: string;
  userId: string;
  productId: string;
  amount: number;
  claimDate: string;
  dateKey: string; // Format: YYYY-MM-DD for daily tracking
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  isActive: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  date: string;
  read: boolean;
  type?: 'announcement' | 'system' | 'referral' | 'transaction';
}

export interface AdminNotification {
  id: string;
  message: string;
  date: string;
  read: boolean;
  type: 'deposit' | 'withdrawal' | 'user_suspension' | 'fund_adjustment' | 'system';
}

// User Service
export class UserService {
  private static COLLECTION = 'users';

  // Get all users
  static async getAllUsers(): Promise<AppUser[]> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, returning empty array');
      return [];
    }
    try {
      const q = query(collection(db, this.COLLECTION), orderBy('regDate', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AppUser[];
    } catch (error) {
      console.error('Error getting users:', error);
      return [];
    }
  }

  // Get user by ID
  static async getUserById(userId: string): Promise<AppUser | null> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, returning null');
      return null;
    }
    try {
      const userDoc = await getDoc(doc(db, this.COLLECTION, userId));
      if (userDoc.exists()) {
        return { id: userDoc.id, ...userDoc.data() } as AppUser;
      }
      return null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  // Create or update user
  static async saveUser(user: AppUser): Promise<void> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot save user');
      throw new Error('Firebase not initialized');
    }
    try {
      const userDoc = doc(db, this.COLLECTION, user.id);
      await setDoc(userDoc, {
        ...user,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error saving user:', error);
      throw error;
    }
  }

  // Update user status
  static async updateUserStatus(userId: string, status: 'Active' | 'Suspended'): Promise<void> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot update user status');
      throw new Error('Firebase not initialized');
    }
    try {
      const userDoc = doc(db, this.COLLECTION, userId);
      await updateDoc(userDoc, {
        status,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating user status:', error);
      throw error;
    }
  }

  // Listen to users changes
  static onUsersChange(callback: (users: AppUser[]) => void) {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot listen to users changes');
      return;
    }
    const q = query(collection(db, this.COLLECTION), orderBy('regDate', 'desc'));
    return onSnapshot(q, (querySnapshot) => {
      const users = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AppUser[];
      callback(users);
    });
  }
}

// Transaction Service
export class TransactionService {
  private static COLLECTION = 'transactions';

  // Get all transactions
  static async getAllTransactions(): Promise<Transaction[]> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, returning empty array');
      return [];
    }
    try {
      const q = query(collection(db, this.COLLECTION), orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
    } catch (error) {
      console.error('Error getting transactions:', error);
      return [];
    }
  }

  // Get transactions by user
  static async getTransactionsByUser(userId: string): Promise<Transaction[]> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, returning empty array');
      return [];
    }
    try {
      const q = query(
        collection(db, this.COLLECTION), 
        orderBy('date', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Transaction))
        .filter(transaction => transaction.userId === userId);
    } catch (error) {
      console.error('Error getting user transactions:', error);
      return [];
    }
  }

  // Create transaction
  static async createTransaction(transaction: Omit<Transaction, 'id'>): Promise<string> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot create transaction');
      throw new Error('Firebase not initialized');
    }
    try {
      const docRef = await addDoc(collection(db, this.COLLECTION), {
        ...transaction,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  }

  // Update transaction status
  static async updateTransactionStatus(transactionId: string, status: 'Completed' | 'Pending' | 'Failed'): Promise<void> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot update transaction status');
      throw new Error('Firebase not initialized');
    }
    try {
      const transactionDoc = doc(db, this.COLLECTION, transactionId);
      await updateDoc(transactionDoc, {
        status,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating transaction status:', error);
      throw error;
    }
  }

  // Listen to transactions changes
  static onTransactionsChange(callback: (transactions: Transaction[]) => void) {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot listen to transactions changes');
      return;
    }
    const q = query(collection(db, this.COLLECTION), orderBy('date', 'desc'));
    return onSnapshot(q, (querySnapshot) => {
      const transactions = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
      callback(transactions);
    });
  }
}

// Product Service
export class ProductService {
  private static COLLECTION = 'purchased_products';

  // Get user's purchased products
  static async getUserProducts(userId: string): Promise<PurchasedProduct[]> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, returning empty array');
      return [];
    }
    try {
      const q = query(
        collection(db, this.COLLECTION), 
        orderBy('purchaseDate', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as PurchasedProduct))
        .filter(product => product.userId === userId);
    } catch (error) {
      console.error('Error getting user products:', error);
      return [];
    }
  }

  // Add purchased product
  static async addPurchasedProduct(product: Omit<PurchasedProduct, 'id'>): Promise<string> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot add purchased product');
      throw new Error('Firebase not initialized');
    }
    try {
      const docRef = await addDoc(collection(db, this.COLLECTION), {
        ...product,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding purchased product:', error);
      throw error;
    }
  }

  // Get all active products (for daily payout processing)
  static async getAllActiveProducts(): Promise<PurchasedProduct[]> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, returning empty array');
      return [];
    }
    try {
      const q = query(collection(db, this.COLLECTION), where('status', '==', 'Active'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PurchasedProduct[];
    } catch (error) {
      console.error('Error getting active products:', error);
      return [];
    }
  }

  // Update product progress
  static async updateProductProgress(productId: string, daysCompleted: number): Promise<void> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot update product progress');
      throw new Error('Firebase not initialized');
    }
    try {
      const productDoc = doc(db, this.COLLECTION, productId);
      await updateDoc(productDoc, {
        daysCompleted,
        status: daysCompleted >= (await getDoc(productDoc)).data()?.totalDays ? 'Completed' : 'Active',
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating product progress:', error);
      throw error;
    }
  }

  // Update product status
  static async updateProductStatus(productId: string, status: 'Active' | 'Completed'): Promise<void> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot update product status');
      throw new Error('Firebase not initialized');
    }
    try {
      const productDoc = doc(db, this.COLLECTION, productId);
      await updateDoc(productDoc, {
        status,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating product status:', error);
      throw error;
    }
  }

  // Update product payout date
  static async updateProductPayoutDate(productId: string, payoutDate: string): Promise<void> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot update product payout date');
      throw new Error('Firebase not initialized');
    }
    try {
      const productDoc = doc(db, this.COLLECTION, productId);
      await updateDoc(productDoc, {
        lastPayoutDate: payoutDate,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating product payout date:', error);
      throw error;
    }
  }

  // Listen to user products changes
  static onUserProductsChange(userId: string, callback: (products: PurchasedProduct[]) => void) {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot listen to user products changes');
      return;
    }
    const q = query(collection(db, this.COLLECTION), orderBy('purchaseDate', 'desc'));
    return onSnapshot(q, (querySnapshot) => {
      const products = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as PurchasedProduct))
        .filter(product => product.userId === userId);
      callback(products);
    });
  }

  // Check and reset expired products
  static async checkAndResetExpiredProducts(): Promise<void> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot check and reset expired products');
      return;
    }
    try {
      const allProducts = await this.getAllActiveProducts();
      
      for (const product of allProducts) {
        const now = new Date();
        const endDate = new Date(product.endDate);
        
        // If product has expired, mark it as completed
        if (now >= endDate && product.status === 'Active') {
          await this.updateProductStatus(product.id, 'Completed');
          
          // Process final payout if needed
          if (product.planType === 'Basic' || product.planType === 'Premium') {
            // Note: completePlan is handled in InvestmentPlanService
            console.log('Product completed:', product.id);
          }
        }
      }
    } catch (error) {
      console.error('Error checking expired products:', error);
    }
  }

  // Get user's active products with remaining time
  static async getUserActiveProducts(userId: string): Promise<PurchasedProduct[]> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot get user active products');
      return [];
    }
    try {
      const userProducts = await this.getUserProducts(userId);
      const now = new Date();
      
      return userProducts.filter(product => {
        if (product.status !== 'Active') return false;
        
        const endDate = new Date(product.endDate);
        return now < endDate;
      });
    } catch (error) {
      console.error('Error getting user active products:', error);
      return [];
    }
  }
}

// Claim Service
export class ClaimService {
  private static COLLECTION = 'claims';

  // Get user's claims for a specific date
  static async getUserClaimsForDate(userId: string, dateKey: string): Promise<Claim[]> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot get user claims');
      return [];
    }
    try {
      const q = query(collection(db, this.COLLECTION));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Claim))
        .filter(claim => claim.userId === userId && claim.dateKey === dateKey);
    } catch (error) {
      console.error('Error getting user claims:', error);
      return [];
    }
  }

  // Add claim
  static async addClaim(claim: Omit<Claim, 'id'>): Promise<string> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot add claim');
      throw new Error('Firebase not initialized');
    }
    try {
      const docRef = await addDoc(collection(db, this.COLLECTION), {
        ...claim,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding claim:', error);
      throw error;
    }
  }

  // Check if user has claimed for a product today
  static async hasClaimedToday(userId: string, productId: string): Promise<boolean> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot check claim status');
      return false;
    }
    try {
      const today = new Date().toISOString().split('T')[0];
      const claims = await this.getUserClaimsForDate(userId, today);
      return claims.some(claim => claim.productId === productId);
    } catch (error) {
      console.error('Error checking claim status:', error);
      return false;
    }
  }
}

// Announcement Service
export class AnnouncementService {
  private static COLLECTION = 'announcements';

  // Get all active announcements
  static async getActiveAnnouncements(): Promise<Announcement[]> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot get announcements');
      return [];
    }
    try {
      const q = query(collection(db, this.COLLECTION), orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Announcement))
        .filter(announcement => announcement.isActive !== false);
    } catch (error) {
      console.error('Error getting announcements:', error);
      return [];
    }
  }

  // Add announcement
  static async addAnnouncement(announcement: Omit<Announcement, 'id'>): Promise<string> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot add announcement');
      throw new Error('Firebase not initialized');
    }
    try {
      const docRef = await addDoc(collection(db, this.COLLECTION), {
        ...announcement,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding announcement:', error);
      throw error;
    }
  }

  // Update announcement
  static async updateAnnouncement(id: string, announcement: Partial<Announcement>): Promise<void> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot update announcement');
      throw new Error('Firebase not initialized');
    }
    try {
      const announcementDoc = doc(db, this.COLLECTION, id);
      await updateDoc(announcementDoc, {
        ...announcement,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating announcement:', error);
      throw error;
    }
  }

  // Delete announcement
  static async deleteAnnouncement(id: string): Promise<void> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot delete announcement');
      throw new Error('Firebase not initialized');
    }
    try {
      const announcementDoc = doc(db, this.COLLECTION, id);
      await deleteDoc(announcementDoc);
    } catch (error) {
      console.error('Error deleting announcement:', error);
      throw error;
    }
  }

  // Listen to announcements changes
  static onAnnouncementsChange(callback: (announcements: Announcement[]) => void) {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot listen to announcements changes');
      return;
    }
    const q = query(collection(db, this.COLLECTION), orderBy('date', 'desc'));
    return onSnapshot(q, (querySnapshot) => {
      const announcements = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Announcement))
        .filter(announcement => announcement.isActive !== false);
      callback(announcements);
    });
  }
}

// Notification Service
export class NotificationService {
  private static COLLECTION = 'notifications';

  // Create notification
  static async createNotification(notification: Omit<Notification, 'id'>): Promise<string> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot create notification');
      throw new Error('Firebase not initialized');
    }
    try {
      const docRef = await addDoc(collection(db, this.COLLECTION), {
        ...notification,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Get user notifications
  static async getUserNotifications(userId: string): Promise<Notification[]> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot get user notifications');
      return [];
    }
    try {
      const q = query(collection(db, this.COLLECTION), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
    } catch (error) {
      console.error('Error getting user notifications:', error);
      return [];
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId: string): Promise<void> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot mark notification as read');
      throw new Error('Firebase not initialized');
    }
    try {
      const notificationDoc = doc(db, this.COLLECTION, notificationId);
      await updateDoc(notificationDoc, {
        read: true,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Delete notification
  static async deleteNotification(notificationId: string): Promise<void> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot delete notification');
      throw new Error('Firebase not initialized');
    }
    try {
      const notificationDoc = doc(db, this.COLLECTION, notificationId);
      await deleteDoc(notificationDoc);
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  // Listen to user notifications
  static onUserNotificationsChange(userId: string, callback: (notifications: Notification[]) => void) {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot listen to user notifications changes');
      return;
    }
    const q = query(collection(db, this.COLLECTION), where('userId', '==', userId));
    return onSnapshot(q, (querySnapshot) => {
      const notifications = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      // Sort by date descending in JavaScript
      const sortedNotifications = notifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      callback(sortedNotifications);
    });
  }
}

// Admin Notification Service
export class AdminNotificationService {
  private static COLLECTION = 'admin_notifications';

  // Create admin notification
  static async createAdminNotification(notification: Omit<AdminNotification, 'id'>): Promise<string> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot create admin notification');
      throw new Error('Firebase not initialized');
    }
    try {
      const docRef = await addDoc(collection(db, this.COLLECTION), {
        ...notification,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating admin notification:', error);
      throw error;
    }
  }

  // Get all admin notifications
  static async getAdminNotifications(): Promise<AdminNotification[]> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot get admin notifications');
      return [];
    }
    try {
      const q = query(collection(db, this.COLLECTION), orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AdminNotification[];
    } catch (error) {
      console.error('Error getting admin notifications:', error);
      return [];
    }
  }

  // Mark admin notification as read
  static async markAsRead(notificationId: string): Promise<void> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot mark admin notification as read');
      throw new Error('Firebase not initialized');
    }
    try {
      const notificationDoc = doc(db, this.COLLECTION, notificationId);
      await updateDoc(notificationDoc, {
        read: true,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error marking admin notification as read:', error);
      throw error;
    }
  }

  // Delete admin notification
  static async deleteAdminNotification(notificationId: string): Promise<void> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot delete admin notification');
      throw new Error('Firebase not initialized');
    }
    try {
      const notificationDoc = doc(db, this.COLLECTION, notificationId);
      await deleteDoc(notificationDoc);
    } catch (error) {
      console.error('Error deleting admin notification:', error);
      throw error;
    }
  }

  // Listen to admin notifications changes
  static onAdminNotificationsChange(callback: (notifications: AdminNotification[]) => void) {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot listen to admin notifications changes');
      return;
    }
    const q = query(collection(db, this.COLLECTION), orderBy('date', 'desc'));
    return onSnapshot(q, (querySnapshot) => {
      const notifications = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AdminNotification[];
      // Sort by date descending in JavaScript
      const sortedNotifications = notifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      callback(sortedNotifications);
    });
  }
}

// Data Aggregation Service
export class DataService {
  // Get aggregated data for admin dashboard
  static async getDashboardData() {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, returning default dashboard data');
      return {
        totalUsers: 0,
        totalDeposits: 0,
        totalWithdrawals: 0,
        pendingApprovals: 0,
        recentTransactions: [],
        recentUsers: []
      };
    }
    try {
      const users = await UserService.getAllUsers();
      const transactions = await TransactionService.getAllTransactions();

      const deposits = transactions.filter(t => t.type === 'Deposit');
      const withdrawals = transactions.filter(t => t.type === 'Withdrawal');

      return {
        totalUsers: users.length,
        totalDeposits: deposits
          .filter(d => d.status === 'Completed')
          .reduce((sum, d) => sum + d.amount, 0),
        totalWithdrawals: withdrawals
          .filter(w => w.status === 'Completed')
          .reduce((sum, w) => sum + w.amount, 0),
        pendingApprovals: deposits.filter(d => d.status === 'Pending').length,
        recentTransactions: transactions.slice(0, 10),
        recentUsers: users.slice(0, 10)
      };
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      return {
        totalUsers: 0,
        totalDeposits: 0,
        totalWithdrawals: 0,
        pendingApprovals: 0,
        recentTransactions: [],
        recentUsers: []
      };
    }
  }

  // Initialize default data
  static async initializeDefaultData() {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot initialize default data');
      return;
    }
    try {
      // Check if data already exists
      const usersDoc = await getDoc(doc(db, 'data', 'initialized'));
      if (usersDoc.exists()) {
        return; // Already initialized
      }

      // Create sample data
      const sampleUsers: AppUser[] = [
        {
          id: 'user1',
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
          id: 'user2',
          email: 'jane@example.com',
          phone: '+2348098765432',
          regDate: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          investment: '₦25,000',
          status: 'Active',
          balance: 15000,
          totalDeposits: 25000,
          totalWithdrawals: 10000
        }
      ];

      // Save sample data
      for (const user of sampleUsers) {
        await UserService.saveUser(user);
      }

      // Create sample transactions without hardcoded IDs
      const sampleTransactions = [
        {
          userId: 'user1',
          userEmail: 'john@example.com',
          type: 'Deposit' as const,
          amount: 50000,
          status: 'Completed' as const,
          date: new Date().toISOString(),
          description: 'Initial deposit'
        },
        {
          userId: 'user2',
          userEmail: 'jane@example.com',
          type: 'Deposit' as const,
          amount: 25000,
          status: 'Completed' as const,
          date: new Date(Date.now() - 86400000).toISOString(),
          description: 'Initial deposit'
        }
      ];

      for (const transaction of sampleTransactions) {
        await TransactionService.createTransaction(transaction);
      }

      // Mark as initialized
      await setDoc(doc(db, 'data', 'initialized'), {
        initialized: true,
        date: serverTimestamp()
      });

    } catch (error) {
      console.error('Error initializing default data:', error);
    }
  }
}

// Referral Service
// Investment Plan Service
export class InvestmentPlanService {
  private static COLLECTION = 'investment_plans';

  // Define all investment plans
  static getBasicPlans() {
    return [
      { id: 'basic-1', name: 'Basic 1', price: 2500, dailyROI: 23.5, cycleDays: 30, dailyIncome: 587.50, totalReturn: 17625 },
      { id: 'basic-2', name: 'Basic 2', price: 5000, dailyROI: 23.5, cycleDays: 30, dailyIncome: 1175, totalReturn: 35250 },
      { id: 'basic-3', name: 'Basic 3', price: 10000, dailyROI: 23.5, cycleDays: 30, dailyIncome: 2350, totalReturn: 70500 },
      { id: 'basic-4', name: 'Basic 4', price: 20000, dailyROI: 23.5, cycleDays: 30, dailyIncome: 4700, totalReturn: 141000 },
      { id: 'basic-5', name: 'Basic 5', price: 50000, dailyROI: 23.5, cycleDays: 30, dailyIncome: 11750, totalReturn: 352500 },
      { id: 'basic-6', name: 'Basic 6', price: 100000, dailyROI: 23.5, cycleDays: 30, dailyIncome: 23500, totalReturn: 705000 },
      { id: 'basic-7', name: 'Basic 7', price: 150000, dailyROI: 23.5, cycleDays: 30, dailyIncome: 35250, totalReturn: 1057500 },
      { id: 'basic-8', name: 'Basic 8', price: 200000, dailyROI: 23.5, cycleDays: 30, dailyIncome: 47000, totalReturn: 1410000 },
      { id: 'basic-9', name: 'Basic 9', price: 300000, dailyROI: 23.5, cycleDays: 30, dailyIncome: 70500, totalReturn: 2115000 },
      { id: 'basic-10', name: 'Basic 10', price: 400000, dailyROI: 23.5, cycleDays: 30, dailyIncome: 94000, totalReturn: 2820000 },
      { id: 'basic-11', name: 'Basic 11', price: 500000, dailyROI: 23.5, cycleDays: 30, dailyIncome: 117500, totalReturn: 3525000 }
    ];
  }

  static getSpecialPlans() {
    return [
      { id: 'special-1', name: 'Special 1', price: 5000, dailyROI: 19.5, cycleDays: 50, dailyIncome: 975, totalReturn: 48750 },
      { id: 'special-2', name: 'Special 2', price: 10000, dailyROI: 19.5, cycleDays: 50, dailyIncome: 1950, totalReturn: 97500 },
      { id: 'special-3', name: 'Special 3', price: 20000, dailyROI: 19.5, cycleDays: 50, dailyIncome: 3900, totalReturn: 195000 },
      { id: 'special-4', name: 'Special 4', price: 30000, dailyROI: 19.5, cycleDays: 50, dailyIncome: 5850, totalReturn: 292500 },
      { id: 'special-5', name: 'Special 5', price: 50000, dailyROI: 19.5, cycleDays: 50, dailyIncome: 9750, totalReturn: 487500 },
      { id: 'special-6', name: 'Special 6', price: 100000, dailyROI: 19.5, cycleDays: 50, dailyIncome: 19500, totalReturn: 975000 },
      { id: 'special-7', name: 'Special 7', price: 150000, dailyROI: 19.5, cycleDays: 50, dailyIncome: 29250, totalReturn: 1462500 },
      { id: 'special-8', name: 'Special 8', price: 200000, dailyROI: 19.5, cycleDays: 50, dailyIncome: 39000, totalReturn: 1950000 },
      { id: 'special-9', name: 'Special 9', price: 300000, dailyROI: 19.5, cycleDays: 50, dailyIncome: 58500, totalReturn: 2925000 },
      { id: 'special-10', name: 'Special 10', price: 500000, dailyROI: 19.5, cycleDays: 50, dailyIncome: 97500, totalReturn: 4875000 }
    ];
  }

  static getPremiumPlans() {
    return [
      { id: 'premium-1', name: 'Premium 1', price: 5000, dailyROI: 19.9, cycleDays: 7, dailyIncome: 995, totalReturn: 6965 },
      { id: 'premium-2', name: 'Premium 2', price: 10000, dailyROI: 19.9, cycleDays: 7, dailyIncome: 1990, totalReturn: 13930 },
      { id: 'premium-3', name: 'Premium 3', price: 20000, dailyROI: 19.9, cycleDays: 7, dailyIncome: 3980, totalReturn: 27860 },
      { id: 'premium-4', name: 'Premium 4', price: 30000, dailyROI: 19.9, cycleDays: 7, dailyIncome: 5970, totalReturn: 41790 },
      { id: 'premium-5', name: 'Premium 5', price: 50000, dailyROI: 19.9, cycleDays: 7, dailyIncome: 9950, totalReturn: 69650 },
      { id: 'premium-6', name: 'Premium 6', price: 100000, dailyROI: 19.9, cycleDays: 7, dailyIncome: 19900, totalReturn: 139300 },
      { id: 'premium-7', name: 'Premium 7', price: 150000, dailyROI: 19.9, cycleDays: 7, dailyIncome: 29850, totalReturn: 208950 },
      { id: 'premium-8', name: 'Premium 8', price: 200000, dailyROI: 19.9, cycleDays: 7, dailyIncome: 39800, totalReturn: 278600 },
      { id: 'premium-9', name: 'Premium 9', price: 300000, dailyROI: 19.9, cycleDays: 7, dailyIncome: 59700, totalReturn: 417900 }
    ];
  }

  // Check if user can access Special/Premium plans
  static async canAccessSpecialPlans(userId: string): Promise<boolean> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot check special plan access');
      return false;
    }
    try {
      const userProducts = await ProductService.getUserProducts(userId);
      return userProducts.some(product => product.planType === 'Basic' && product.status === 'Active');
    } catch (error) {
      console.error('Error checking special plan access:', error);
      return false;
    }
  }

  // Process daily payouts for all active plans
  static async processDailyPayouts(): Promise<void> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot process daily payouts');
      return;
    }
    try {
      const allProducts = await ProductService.getAllActiveProducts();
      
      for (const product of allProducts) {
        const now = new Date();
        const startDate = new Date(product.startDate);
        const endDate = new Date(product.endDate);
        
        // Skip if plan is completed or not started
        if (product.status === 'Completed' || now < startDate) continue;
        
        // Check if plan cycle is complete
        if (now >= endDate) {
          await this.completePlan(product);
        } else {
          // Process daily payout based on plan type
          await this.processDailyPayout(product);
        }
      }
    } catch (error) {
      console.error('Error processing daily payouts:', error);
    }
  }

  // Process daily payout for a specific plan
  private static async processDailyPayout(product: PurchasedProduct): Promise<void> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot process daily payout');
      return;
    }
    const now = new Date();
    const lastPayout = product.lastPayoutDate ? new Date(product.lastPayoutDate) : new Date(product.startDate);
    const daysSinceLastPayout = Math.floor((now.getTime() - lastPayout.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceLastPayout >= 1) {
      let payoutAmount = 0;
      
      if (product.planType === 'Special') {
        // Special plans: Daily payout to main balance
        payoutAmount = product.dailyEarning;
        await this.addToUserBalance(product.userId, payoutAmount);
        
        // Create transaction record
        await TransactionService.createTransaction({
          userId: product.userId,
          userEmail: '', // Will be filled by service
          type: 'Investment',
          amount: payoutAmount,
          status: 'Completed',
          date: now.toISOString(),
          description: `Daily payout from ${product.name}`
        });
      }
      
      // Update product with new payout date
      await ProductService.updateProductPayoutDate(product.id, now.toISOString());
    }
  }

  // Complete a plan cycle
  private static async completePlan(product: PurchasedProduct): Promise<void> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot complete plan');
      return;
    }
    const now = new Date();
    let finalPayout = 0;
    
    if (product.planType === 'Basic') {
      // Basic plans: Full payout at end (principal + profit)
      finalPayout = product.totalEarning;
    } else if (product.planType === 'Premium') {
      // Premium plans: Full payout at end (principal + profit)
      finalPayout = product.totalEarning;
    } else if (product.planType === 'Special') {
      // Special plans: Only remaining principal (profit already paid daily)
      finalPayout = product.price;
    }
    
    // Add to user balance
    await this.addToUserBalance(product.userId, finalPayout);
    
    // Create transaction record
    await TransactionService.createTransaction({
      userId: product.userId,
      userEmail: '', // Will be filled by service
      type: 'Investment',
      amount: finalPayout,
      status: 'Completed',
      date: now.toISOString(),
      description: `Plan completion payout from ${product.name}`
    });
    
    // Mark plan as completed
    await ProductService.updateProductStatus(product.id, 'Completed');
  }

  // Add amount to user's main balance
  private static async addToUserBalance(userId: string, amount: number): Promise<void> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot update user balance');
      return;
    }
    try {
      const user = await UserService.getUserById(userId);
      if (user) {
        const newBalance = (user.balance || 0) + amount;
        await UserService.saveUser({ ...user, balance: newBalance });
      }
    } catch (error) {
      console.error('Error updating user balance:', error);
    }
  }
}

export class ReferralService {
  private static COLLECTION = 'referrals';

  // Generate referral code
  static generateReferralCode(): string {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot generate referral code');
      return '';
    }
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    return code;
  }

  // Get user by referral code
  static async getUserByReferralCode(referralCode: string): Promise<AppUser | null> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, returning null');
      return null;
    }
    try {
      console.log('Looking up referral code:', referralCode);
      const q = query(collection(db, 'users'), where('referralCode', '==', referralCode));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const user = { id: doc.id, ...doc.data() } as AppUser;
        console.log('Found user with referral code:', user.email, user.phone);
        return user;
      }
      console.log('No user found with referral code:', referralCode);
      return null;
    } catch (error) {
      console.error('Error getting user by referral code:', error);
      throw error;
    }
  }

  // Ensure all users have referral codes (utility function)
  static async ensureAllUsersHaveReferralCodes(): Promise<void> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot ensure referral codes');
      return;
    }
    try {
      const allUsers = await UserService.getAllUsers();
      for (const user of allUsers) {
        if (!user.referralCode) {
          const newReferralCode = this.generateReferralCode();
          await UserService.saveUser({ ...user, referralCode: newReferralCode });
          console.log(`Generated referral code ${newReferralCode} for user ${user.email}`);
        }
      }
    } catch (error) {
      console.error('Error ensuring referral codes:', error);
    }
  }

  // Process referral bonus (now only called when user makes first deposit)
  static async processReferralBonus(newUserId: string, referrerId: string): Promise<void> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot process referral bonus');
      return;
    }
    try {
      // Get referrer user
      const referrer = await UserService.getUserById(referrerId);
      if (!referrer) {
        return;
      }

      // Calculate bonus (24% of welcome bonus)
      const welcomeBonus = 300; // Updated to match new welcome bonus
      const referralBonus = Math.round(welcomeBonus * 0.24); // 24% of welcome bonus

      // Update referrer's balance and referral stats
      const updatedReferrer = {
        ...referrer,
        balance: (referrer.balance || 0) + referralBonus,
        referralEarnings: (referrer.referralEarnings || 0) + referralBonus,
        totalReferrals: (referrer.totalReferrals || 0) + 1
      };
      
      try {
        await UserService.saveUser(updatedReferrer);
      } catch (error) {
        console.error('Failed to update referrer balance:', error);
        // Don't throw error, continue with other operations
      }

      // Create transaction for referrer
      try {
        await TransactionService.createTransaction({
          userId: referrerId,
          userEmail: referrer.email,
          type: 'Referral_Bonus',
          amount: referralBonus,
          status: 'Completed',
          date: new Date().toISOString(),
          description: `Referral bonus for user's first deposit`,
          referralUserId: newUserId
        });
      } catch (error) {
        console.error('Failed to create referral transaction:', error);
        // Don't throw error, continue with other operations
      }

      // Create notification for referrer
      try {
        await NotificationService.createNotification({
          userId: referrerId,
          message: `You earned ₦${referralBonus} referral bonus! Your referred user made their first deposit.`,
          date: new Date().toISOString(),
          read: false,
          type: 'referral'
        });
      } catch (error) {
        console.error('Failed to create referral notification:', error);
        // Don't throw error, continue with other operations
      }

      // Create admin notification
      try {
        await AdminNotificationService.createAdminNotification({
          message: `Referral bonus paid: ₦${referralBonus} to ${referrer.email} for user's first deposit`,
          date: new Date().toISOString(),
          read: false,
          type: 'system'
        });
      } catch (error) {
        console.error('Failed to create admin notification:', error);
        // Don't throw error, this is not critical
      }
    } catch (error) {
      console.error('Error processing referral bonus:', error);
      // Don't throw the error to avoid failing registration
      // Just log it and continue
    }
  }

  // Process deposit referral bonus with multi-level support
  static async processDepositReferralBonus(userId: string, depositAmount: number): Promise<void> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot process deposit referral bonus');
      return;
    }
    try {
      const user = await UserService.getUserById(userId);
      if (!user || !user.referredBy) return;

      // Process level 1 referral (direct referrer)
      await this.processLevel1ReferralBonus(user, depositAmount);
      
      // Process level 2 referral (referrer's referrer)
      await this.processLevel2ReferralBonus(user, depositAmount);
      
      // Process level 3 referral (referrer's referrer's referrer)
      await this.processLevel3ReferralBonus(user, depositAmount);
      
    } catch (error) {
      console.error('Error processing deposit referral bonus:', error);
      throw error;
    }
  }

  // Process level 1 referral bonus (24% of welcome bonus for first deposit, 5% of deposit amount)
  private static async processLevel1ReferralBonus(user: AppUser, depositAmount: number): Promise<void> {
    const referrer = await UserService.getUserById(user.referredBy!);
    if (!referrer) return;

    const isFirstDeposit = !user.hasDeposited;
    const welcomeBonus = 300;
    const registrationBonus = isFirstDeposit ? Math.round(welcomeBonus * 0.24) : 0; // 24% of welcome bonus
    const depositBonus = Math.round(depositAmount * 0.05); // 5% of deposit amount
    const totalBonus = registrationBonus + depositBonus;

    if (totalBonus > 0) {
      // Update referrer's balance and stats
      const updatedReferrer = {
        ...referrer,
        balance: (referrer.balance || 0) + totalBonus,
        referralEarnings: (referrer.referralEarnings || 0) + totalBonus
      };
      await UserService.saveUser(updatedReferrer);

      // Create transaction
      await TransactionService.createTransaction({
        userId: referrer.id,
        userEmail: referrer.email,
        type: 'Referral_Bonus',
        amount: totalBonus,
        status: 'Completed',
        date: new Date().toISOString(),
        description: isFirstDeposit 
          ? `Level 1 referral bonus for first deposit (Registration + Deposit bonus)`
          : `Level 1 referral bonus for deposit`,
        referralUserId: user.id
      });

      // Create notification
      const bonusMessage = isFirstDeposit 
        ? `You earned ₦${totalBonus} Level 1 referral bonus! Your referred user made their first deposit.`
        : `You earned ₦${totalBonus} Level 1 referral bonus! Your referred user made a deposit.`;
      
      await NotificationService.createNotification({
        userId: referrer.id,
        message: bonusMessage,
        date: new Date().toISOString(),
        read: false,
        type: 'referral'
      });
    }
  }

  // Process level 2 referral bonus (3% of deposit amount)
  private static async processLevel2ReferralBonus(user: AppUser, depositAmount: number): Promise<void> {
    const level1Referrer = await UserService.getUserById(user.referredBy!);
    if (!level1Referrer || !level1Referrer.referredBy) return;

    const level2Referrer = await UserService.getUserById(level1Referrer.referredBy);
    if (!level2Referrer) return;

    const level2Bonus = Math.round(depositAmount * 0.03); // 3% of deposit amount

    if (level2Bonus > 0) {
      // Update level 2 referrer's balance
      const updatedLevel2Referrer = {
        ...level2Referrer,
        balance: (level2Referrer.balance || 0) + level2Bonus,
        referralEarnings: (level2Referrer.referralEarnings || 0) + level2Bonus
      };
      await UserService.saveUser(updatedLevel2Referrer);

      // Create transaction
      await TransactionService.createTransaction({
        userId: level2Referrer.id,
        userEmail: level2Referrer.email,
        type: 'Referral_Bonus',
        amount: level2Bonus,
        status: 'Completed',
        date: new Date().toISOString(),
        description: `Level 2 referral bonus for user deposit`,
        referralUserId: user.id
      });

      // Create notification
      await NotificationService.createNotification({
        userId: level2Referrer.id,
        message: `You earned ₦${level2Bonus} Level 2 referral bonus! Your level 2 referred user made a deposit.`,
        date: new Date().toISOString(),
        read: false,
        type: 'referral'
      });
    }
  }

  // Process level 3 referral bonus (2% of deposit amount)
  private static async processLevel3ReferralBonus(user: AppUser, depositAmount: number): Promise<void> {
    const level1Referrer = await UserService.getUserById(user.referredBy!);
    if (!level1Referrer || !level1Referrer.referredBy) return;

    const level2Referrer = await UserService.getUserById(level1Referrer.referredBy);
    if (!level2Referrer || !level2Referrer.referredBy) return;

    const level3Referrer = await UserService.getUserById(level2Referrer.referredBy);
    if (!level3Referrer) return;

    const level3Bonus = Math.round(depositAmount * 0.02); // 2% of deposit amount

    if (level3Bonus > 0) {
      // Update level 3 referrer's balance
      const updatedLevel3Referrer = {
        ...level3Referrer,
        balance: (level3Referrer.balance || 0) + level3Bonus,
        referralEarnings: (level3Referrer.referralEarnings || 0) + level3Bonus
      };
      await UserService.saveUser(updatedLevel3Referrer);

      // Create transaction
      await TransactionService.createTransaction({
        userId: level3Referrer.id,
        userEmail: level3Referrer.email,
        type: 'Referral_Bonus',
        amount: level3Bonus,
        status: 'Completed',
        date: new Date().toISOString(),
        description: `Level 3 referral bonus for user deposit`,
        referralUserId: user.id
      });

      // Create notification
      await NotificationService.createNotification({
        userId: level3Referrer.id,
        message: `You earned ₦${level3Bonus} Level 3 referral bonus! Your level 3 referred user made a deposit.`,
        date: new Date().toISOString(),
        read: false,
        type: 'referral'
      });
    }
  }

  // Get referral tree (3 levels)
  static async getReferralTree(userId: string): Promise<{
    level1: AppUser[];
    level2: AppUser[];
    level3: AppUser[];
  }> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot get referral tree');
      return { level1: [], level2: [], level3: [] };
    }
    try {
      const level1 = await this.getDirectReferrals(userId);
      const level2: AppUser[] = [];
      const level3: AppUser[] = [];

      // Get level 2 referrals
      for (const user of level1) {
        const userLevel2 = await this.getDirectReferrals(user.id);
        level2.push(...userLevel2);
      }

      // Get level 3 referrals
      for (const user of level2) {
        const userLevel3 = await this.getDirectReferrals(user.id);
        level3.push(...userLevel3);
      }

      return { level1, level2, level3 };
    } catch (error) {
      console.error('Error getting referral tree:', error);
      throw error;
    }
  }

  // Get direct referrals
  private static async getDirectReferrals(userId: string): Promise<AppUser[]> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot get direct referrals');
      return [];
    }
    try {
      const q = query(collection(db, 'users'), where('referredBy', '==', userId));
      const querySnapshot = await getDocs(q);
      const referrals = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AppUser[];
      return referrals;
    } catch (error) {
      console.error('Error getting direct referrals:', error);
      throw error;
    }
  }

  // Get referral details with deposit status
  static async getReferralDetails(userId: string): Promise<{
    referrals: AppUser[];
    totalReferrals: number;
    totalEarnings: number;
    referralsWithDeposits: number;
    referralsWithoutDeposits: number;
  }> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot get referral details');
      return { referrals: [], totalReferrals: 0, totalEarnings: 0, referralsWithDeposits: 0, referralsWithoutDeposits: 0 };
    }
    try {
      const referrals = await this.getDirectReferrals(userId);
      const referralsWithDeposits = referrals.filter(user => user.hasDeposited).length;
      const referralsWithoutDeposits = referrals.filter(user => !user.hasDeposited).length;

      // Calculate total earnings from all referral levels
      const totalEarnings = await this.getTotalReferralEarnings(userId);

      return {
        referrals,
        totalReferrals: referrals.length,
        totalEarnings,
        referralsWithDeposits,
        referralsWithoutDeposits
      };
    } catch (error) {
      console.error('Error getting referral details:', error);
      throw error;
    }
  }

  // Get total referral earnings from transactions
  private static async getTotalReferralEarnings(userId: string): Promise<number> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot get referral earnings');
      return 0;
    }
    try {
      const userTransactions = await TransactionService.getTransactionsByUser(userId);
      const referralTransactions = userTransactions.filter(
        transaction => transaction.type === 'Referral_Bonus' && transaction.status === 'Completed'
      );
      
      return referralTransactions.reduce((total, transaction) => total + transaction.amount, 0);
    } catch (error) {
      console.error('Error getting referral earnings:', error);
      return 0;
    }
  }
}