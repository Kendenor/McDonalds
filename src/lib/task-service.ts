import { db } from './firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  updateDoc,
  serverTimestamp,
  getDocs,
  query,
  where
} from 'firebase/firestore';

// Helper function to check if we're on client side
function isClientSide() {
  return typeof window !== 'undefined';
}

// Task Service
export class TaskService {
  private static COLLECTION = 'tasks';

  // Get user's daily tasks
  static async getUserTasks(userId: string): Promise<any[]> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot get user tasks');
      return [];
    }
    try {
      const today = new Date().toISOString().split('T')[0];
      const q = query(collection(db, this.COLLECTION), where('userId', '==', userId), where('dateKey', '==', today));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting user tasks:', error);
      return [];
    }
  }

  // Create or update daily tasks for user
  static async createDailyTasks(userId: string): Promise<void> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot create daily tasks');
      return;
    }
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Check if tasks already exist for today
      const existingTasks = await this.getUserTasks(userId);
      if (existingTasks.length > 0) return;

      // Create default daily tasks
      const dailyTasks = [
        {
          userId,
          dateKey: today,
          taskType: 'daily_checkin',
          title: 'Daily Check-in',
          description: 'Check in to earn daily bonus',
          reward: 50,
          completed: false,
          maxCompletions: 1,
          completionsToday: 0,
          createdAt: serverTimestamp()
        },
        {
          userId,
          dateKey: today,
          taskType: 'claim_earnings',
          title: 'Claim Daily Earnings',
          description: 'Claim earnings from your active investments',
          reward: 25,
          completed: false,
          maxCompletions: 1,
          completionsToday: 0,
          createdAt: serverTimestamp()
        },
        {
          userId,
          dateKey: today,
          taskType: 'refer_friend',
          title: 'Refer a Friend',
          description: 'Share your referral link with friends',
          reward: 100,
          completed: false,
          maxCompletions: 1,
          completionsToday: 0,
          createdAt: serverTimestamp()
        },
        {
          userId,
          dateKey: today,
          taskType: 'product_daily_task',
          title: 'Product Daily Task',
          description: 'Complete daily task for your purchased products (5 times daily)',
          reward: 200,
          completed: false,
          maxCompletions: 5,
          completionsToday: 0,
          createdAt: serverTimestamp()
        }
      ];

      // Add tasks to Firestore
      for (const task of dailyTasks) {
        await addDoc(collection(db, this.COLLECTION), task);
      }
    } catch (error) {
      console.error('Error creating daily tasks:', error);
    }
  }

  // Complete a task
  static async completeTask(taskId: string): Promise<void> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot complete task');
      return;
    }
    try {
      const taskDoc = doc(db, this.COLLECTION, taskId);
      await updateDoc(taskDoc, {
        completed: true,
        completedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error completing task:', error);
    }
  }

  // Complete a task with multiple completions allowed
  static async completeTaskWithCount(taskId: string): Promise<boolean> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot complete task');
      return false;
    }
    try {
      const taskDoc = doc(db, this.COLLECTION, taskId);
      const taskData = (await getDoc(taskDoc)).data();
      
      if (!taskData) return false;
      
      const currentCompletions = taskData.completionsToday || 0;
      const maxCompletions = taskData.maxCompletions || 1;
      
      if (currentCompletions >= maxCompletions) {
        return false; // Already completed maximum times
      }
      
      const newCompletions = currentCompletions + 1;
      const isFullyCompleted = newCompletions >= maxCompletions;
      
      await updateDoc(taskDoc, {
        completionsToday: newCompletions,
        completed: isFullyCompleted,
        completedAt: isFullyCompleted ? serverTimestamp() : null
      });
      
      return true;
    } catch (error) {
      console.error('Error completing task with count:', error);
      return false;
    }
  }

  // Get task completion status for today
  static async getTodayTaskStatus(userId: string): Promise<{ completed: number; total: number; totalReward: number }> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot get task status');
      return { completed: 0, total: 0, totalReward: 0 };
    }
    try {
      const tasks = await this.getUserTasks(userId);
      const completed = tasks.filter(task => task.completed).length;
      const total = tasks.length;
      const totalReward = tasks.reduce((sum, task) => {
        if (task.completed) {
          return sum + (task.reward * (task.maxCompletions || 1));
        }
        return sum + (task.reward * (task.completionsToday || 0));
      }, 0);
      
      return { completed, total, totalReward };
    } catch (error) {
      console.error('Error getting task status:', error);
      return { completed: 0, total: 0, totalReward: 0 };
    }
  }

  // Check if user has active products for product daily task
  static async hasActiveProducts(userId: string): Promise<boolean> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot check active products');
      return false;
    }
    try {
      // Import ProductService to check for active products
      const { ProductService } = await import('./user-service');
      const userProducts = await ProductService.getUserProducts(userId);
      
      // Check if user has any active products
      const hasActive = userProducts.some(product => product.status === 'Active');
      console.log(`User ${userId} has active products:`, hasActive);
      
      return hasActive;
    } catch (error) {
      console.error('Error checking active products:', error);
      return false;
    }
  }
}
