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
  where,
  Timestamp
} from 'firebase/firestore';

// Helper function to check if we're on client side
function isClientSide() {
  return typeof window !== 'undefined';
}

export interface ProductTask {
  id: string;
  userId: string;
  productId: string;
  productName: string;
  taskType: 'product_daily_task';
  title: string;
  description: string;
  reward: number;
  maxCompletions: number;
  completionsToday: number;
  completed: boolean;
  lastCompletedAt: Timestamp | null;
  cycleDays: number;
  cycleDaysCompleted: number;
  totalEarned: number;
  totalExpected: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Product Task Service
export class ProductTaskService {
  private static COLLECTION = 'product_tasks';

  // Create a product task when user purchases a product
  static async createProductTask(
    userId: string, 
    productId: string, 
    productName: string, 
    cycleDays: number,
    totalExpected: number
  ): Promise<void> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot create product task');
      return;
    }
    try {
      const dailyReward = Math.floor(totalExpected / cycleDays);
      
      const productTask = {
        userId,
        productId,
        productName,
        taskType: 'product_daily_task',
        title: `Daily Task - ${productName}`,
        description: `Complete daily task for ${productName}. Earn ₦${dailyReward} per completion.`,
        reward: dailyReward,
        maxCompletions: 1, // One completion per day
        completionsToday: 0,
        completed: false,
        lastCompletedAt: null,
        cycleDays,
        cycleDaysCompleted: 0,
        totalEarned: 0,
        totalExpected,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, this.COLLECTION), productTask);
      console.log(`Created product task for ${productName} with daily reward: ₦${dailyReward}`);
    } catch (error) {
      console.error('Error creating product task:', error);
    }
  }

  // Get all product tasks for a user
  static async getUserProductTasks(userId: string): Promise<ProductTask[]> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot get product tasks');
      return [];
    }
    try {
      const q = query(collection(db, this.COLLECTION), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ProductTask[];
    } catch (error) {
      console.error('Error getting user product tasks:', error);
      return [];
    }
  }

  // Get a specific product task
  static async getProductTask(taskId: string): Promise<ProductTask | null> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot get product task');
      return null;
    }
    try {
      const taskDoc = doc(db, this.COLLECTION, taskId);
      const taskSnapshot = await getDoc(taskDoc);
      
      if (taskSnapshot.exists()) {
        return {
          id: taskSnapshot.id,
          ...taskSnapshot.data()
        } as ProductTask;
      }
      return null;
    } catch (error) {
      console.error('Error getting product task:', error);
      return null;
    }
  }

  // Complete a product daily task
  static async completeProductTask(taskId: string): Promise<{ success: boolean; message: string; reward?: number }> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot complete product task');
      return { success: false, message: 'Server-side execution not allowed' };
    }
    try {
      const task = await this.getProductTask(taskId);
      if (!task) {
        return { success: false, message: 'Task not found' };
      }

      // Check if product cycle is complete
      if (task.cycleDaysCompleted >= task.cycleDays) {
        return { success: false, message: 'Product cycle completed. No more tasks available.' };
      }

      // Check if already completed today
      const today = new Date().toISOString().split('T')[0];
      const lastCompletedDate = task.lastCompletedAt ? 
        new Date(task.lastCompletedAt.toDate()).toISOString().split('T')[0] : null;

      if (lastCompletedDate === today && task.completionsToday >= task.maxCompletions) {
        return { success: false, message: 'Task already completed today. Try again tomorrow.' };
      }

      // Check if 24 hours have passed since last completion
      if (task.lastCompletedAt) {
        const now = new Date();
        const lastCompleted = task.lastCompletedAt.toDate();
        const hoursSinceLastCompletion = (now.getTime() - lastCompleted.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceLastCompletion < 24) {
          const remainingHours = Math.ceil(24 - hoursSinceLastCompletion);
          return { success: false, message: `Task locked. Available in ${remainingHours} hours.` };
        }
      }

      // Complete the task
      const taskDoc = doc(db, this.COLLECTION, taskId);
      const newCompletionsToday = lastCompletedDate === today ? task.completionsToday + 1 : 1;
      const newTotalEarned = task.totalEarned + task.reward;
      const newCycleDaysCompleted = Math.floor(newTotalEarned / task.reward);

      await updateDoc(taskDoc, {
        completionsToday: newCompletionsToday,
        lastCompletedAt: serverTimestamp(),
        totalEarned: newTotalEarned,
        cycleDaysCompleted: newCycleDaysCompleted,
        completed: newCycleDaysCompleted >= task.cycleDays,
        updatedAt: serverTimestamp()
      });

      // Add reward to user balance
      const { UserService } = await import('./user-service');
      await UserService.addToBalance(task.userId, task.reward, 'Product_Task_Reward');

      return { 
        success: true, 
        message: `Task completed! Earned ₦${task.reward}`,
        reward: task.reward
      };
    } catch (error) {
      console.error('Error completing product task:', error);
      return { success: false, message: 'Error completing task' };
    }
  }

  // Check if user can complete a product task
  static async canCompleteProductTask(taskId: string): Promise<{ canComplete: boolean; message: string; timeRemaining?: number }> {
    if (!isClientSide()) {
      return { canComplete: false, message: 'Server-side execution not allowed' };
    }
    try {
      const task = await this.getProductTask(taskId);
      if (!task) {
        return { canComplete: false, message: 'Task not found' };
      }

      // Check if product cycle is complete
      if (task.cycleDaysCompleted >= task.cycleDays) {
        return { canComplete: false, message: 'Product cycle completed' };
      }

      // Check if already completed today
      const today = new Date().toISOString().split('T')[0];
      const lastCompletedDate = task.lastCompletedAt ? 
        new Date(task.lastCompletedAt.toDate()).toISOString().split('T')[0] : null;

      if (lastCompletedDate === today && task.completionsToday >= task.maxCompletions) {
        return { canComplete: false, message: 'Already completed today' };
      }

      // Check if 24 hours have passed since last completion
      if (task.lastCompletedAt) {
        const now = new Date();
        const lastCompleted = task.lastCompletedAt.toDate();
        const hoursSinceLastCompletion = (now.getTime() - lastCompleted.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceLastCompletion < 24) {
          const remainingHours = Math.ceil(24 - hoursSinceLastCompletion);
          return { 
            canComplete: false, 
            message: `Locked for ${remainingHours} more hours`,
            timeRemaining: remainingHours
          };
        }
      }

      return { canComplete: true, message: 'Task available' };
    } catch (error) {
      console.error('Error checking task completion status:', error);
      return { canComplete: false, message: 'Error checking task status' };
    }
  }

  // Delete product task when product expires or is cancelled
  static async deleteProductTask(taskId: string): Promise<void> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot delete product task');
      return;
    }
    try {
      const taskDoc = doc(db, this.COLLECTION, taskId);
      await taskDoc.delete();
    } catch (error) {
      console.error('Error deleting product task:', error);
    }
  }

  // Get task progress for a specific product
  static async getProductTaskProgress(taskId: string): Promise<{
    totalEarned: number;
    totalExpected: number;
    cycleDaysCompleted: number;
    cycleDays: number;
    progress: number;
  } | null> {
    if (!isClientSide()) {
      return null;
    }
    try {
      const task = await this.getProductTask(taskId);
      if (!task) return null;

      const progress = Math.min((task.totalEarned / task.totalExpected) * 100, 100);

      return {
        totalEarned: task.totalEarned,
        totalExpected: task.totalExpected,
        cycleDaysCompleted: task.cycleDaysCompleted,
        cycleDays: task.cycleDays,
        progress
      };
    } catch (error) {
      console.error('Error getting task progress:', error);
      return null;
    }
  }
}




